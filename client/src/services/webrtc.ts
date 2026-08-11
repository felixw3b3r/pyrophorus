export interface WebRTCConfig {
  myUserId?: string;
  stunServer?: string;
  onRemoteStream?: (peerId: string, stream: MediaStream) => void;
  onVolumeChange?: (volume: number) => void;
  onSignalNeeded?: (signal: { targetUserId?: string; signalType: string; payload: string }) => void;
  onCameraStream?: (stream: MediaStream | null) => void;
  onScreenShareStream?: (stream: MediaStream | null) => void;
}

export interface MediaDeviceInfoSimple {
  deviceId: string;
  label: string;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:global.stun.twilio.com:3478' },
];

export class WebRTCService {
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private localAudioStream: MediaStream | null = null;

  public getLocalAudioStream(): MediaStream | null {
    return this.localAudioStream;
  }
  private localVideoStream: MediaStream | null = null;
  private localScreenStream: MediaStream | null = null;

  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrameId: number | null = null;

  public isMuted: boolean = false;
  public isDeafened: boolean = false;
  public pttMode: boolean = false; // Voice Activity (default)
  public pttKey: string = 'Space';
  public isPttPressed: boolean = false;
  public sensitivity: number = 3; // Noise Gate Threshold

  public selectedAudioDeviceId: string = '';
  public selectedVideoDeviceId: string = '';

  private config: WebRTCConfig;

  constructor(config: WebRTCConfig) {
    this.config = {
      stunServer: 'stun:stun.l.google.com:19302',
      ...config,
    };

    this.setupPttListeners();
    this.setupAutoplayUnlock();
  }

  private setupAutoplayUnlock() {
    const unlock = () => {
      if (this.audioContext && this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(console.error);
      }
      this.remoteAudioElements.forEach((audioEl) => {
        if (audioEl.paused) {
          audioEl.play().catch(() => {});
        }
      });
    };

    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    window.addEventListener('touchstart', unlock);
  }

  private setupPttListeners() {
    const isEditingText = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    window.addEventListener('keydown', (e) => {
      if (isEditingText(e.target)) return;
      if (e.code === this.pttKey || e.key === ' ') {
        if (!this.isPttPressed && this.pttMode) {
          this.isPttPressed = true;
          this.updateAudioTrackState();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      if (isEditingText(e.target)) return;
      if (e.code === this.pttKey || e.key === ' ') {
        if (this.isPttPressed && this.pttMode) {
          this.isPttPressed = false;
          this.updateAudioTrackState();
        }
      }
    });
  }

  public async getAudioDevices(): Promise<MediaDeviceInfoSimple[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const rawInputs = devices.filter((d) => d.kind === 'audioinput' && d.deviceId);
      
      const result: MediaDeviceInfoSimple[] = [];
      const seenLabels = new Set<string>();

      for (const d of rawInputs) {
        // Filter out Windows communications virtual endpoints that cause zero volume silence
        if (d.deviceId === 'communications' || d.label.startsWith('İletişim') || d.label.startsWith('Communications')) {
          continue;
        }

        let cleanLabel = d.label || `Mikrofon ${result.length + 1}`;
        if (d.deviceId === 'default') {
          cleanLabel = 'Varsayılan Sistem Mikrofonu';
        } else {
          // Remove ugly USB hardware vendor IDs like (1038:12e0) for clean readable names
          cleanLabel = cleanLabel.replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)\s*/g, '').trim();
          if (cleanLabel.startsWith('Varsayılan - ')) {
            cleanLabel = cleanLabel.replace('Varsayılan - ', '').trim();
          }
        }

        if (!seenLabels.has(cleanLabel)) {
          seenLabels.add(cleanLabel);
          result.push({
            deviceId: d.deviceId,
            label: cleanLabel,
          });
        }
      }
      return result;
    } catch (e) {
      console.error('Failed to list audio devices:', e);
      return [];
    }
  }

  public async getVideoDevices(): Promise<MediaDeviceInfoSimple[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const rawVideos = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);

      const result: MediaDeviceInfoSimple[] = [];
      const seenLabels = new Set<string>();

      for (const d of rawVideos) {
        let cleanLabel = d.label || `Kamera ${result.length + 1}`;
        if (d.deviceId === 'default') {
          cleanLabel = 'Varsayılan Sistem Kamerası';
        } else {
          cleanLabel = cleanLabel.replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)\s*/g, '').trim();
        }

        if (!seenLabels.has(cleanLabel)) {
          seenLabels.add(cleanLabel);
          result.push({
            deviceId: d.deviceId,
            label: cleanLabel,
          });
        }
      }
      return result;
    } catch (e) {
      console.error('Failed to list video devices:', e);
      return [];
    }
  }

  public async startLocalAudio(deviceId?: string): Promise<MediaStream | null> {
    if (deviceId) this.selectedAudioDeviceId = deviceId;
    try {
      if (this.localAudioStream) {
        this.localAudioStream.getTracks().forEach((t) => t.stop());
        this.localAudioStream = null;
      }

      let stream: MediaStream;
      try {
        const audioConstraints: boolean | MediaTrackConstraints =
          this.selectedAudioDeviceId && this.selectedAudioDeviceId !== 'default'
            ? { deviceId: { exact: this.selectedAudioDeviceId } }
            : true;

        stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: false,
        });
      } catch (e) {
        console.warn('Falling back to default audio constraint:', e);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      }

      this.localAudioStream = stream;
      this.setupVolumeAnalyzer(stream);
      this.updateAudioTrackState();

      // Attach audio track to any existing peer connection missing audio senders
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        this.peerConnections.forEach((pc, peerId) => {
          const senders = pc.getSenders();
          const hasAudioSender = senders.some((s) => s.track && s.track.kind === 'audio');
          if (!hasAudioSender) {
            pc.addTrack(audioTrack, stream);
            this.renegotiate(peerId);
          }
        });
      }

      // Announce join to voice channel peers
      if (this.config.onSignalNeeded) {
        this.config.onSignalNeeded({
          signalType: 'join',
          payload: JSON.stringify({ action: 'join' }),
        });
      }

      return stream;
    } catch (err) {
      console.error('Failed to access microphone:', err);
      return null;
    }
  }

  public async startCamera(deviceId?: string): Promise<MediaStream | null> {
    if (deviceId) this.selectedVideoDeviceId = deviceId;
    try {
      if (this.localVideoStream) {
        this.localVideoStream.getTracks().forEach((t) => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(this.selectedVideoDeviceId ? { deviceId: { exact: this.selectedVideoDeviceId } } : {}),
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.localVideoStream = stream;

      const videoTrack = stream.getVideoTracks()[0];
      this.peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        const existingVideoSender = senders.find((s) => s.track && s.track.kind === 'video');
        if (existingVideoSender) {
          existingVideoSender.replaceTrack(videoTrack).catch(console.error);
        } else {
          pc.addTrack(videoTrack, stream);
        }
        this.renegotiate(peerId);
      });

      if (this.config.onCameraStream) {
        this.config.onCameraStream(stream);
      }

      return stream;
    } catch (err) {
      console.error('Failed to access camera:', err);
      return null;
    }
  }

  public stopCamera() {
    if (this.localVideoStream) {
      const tracks = this.localVideoStream.getTracks();
      tracks.forEach((track) => track.stop());
      this.peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        senders.forEach((sender) => {
          if (sender.track && (tracks.includes(sender.track) || sender.track.kind === 'video')) {
            try { pc.removeTrack(sender); } catch (e) {}
          }
        });
        this.renegotiate(peerId);
      });
      this.localVideoStream = null;
    }
    if (this.config.onCameraStream) {
      this.config.onCameraStream(null);
    }
  }

  public async startScreenShare(quality: string = '1080p60'): Promise<MediaStream | null> {
    try {
      const is4k = quality === '4k60';
      const constraints: DisplayMediaStreamOptions = {
        video: {
          width: { ideal: is4k ? 3840 : 1920, max: 3840 },
          height: { ideal: is4k ? 2160 : 1080, max: 2160 },
          frameRate: { ideal: 60, max: 60 },
        },
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      };

      const stream = await navigator.mediaDevices.getDisplayMedia(constraints);
      this.localScreenStream = stream;

      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        // Enforce maximum detail & crisp text resolution over motion degradation
        if ('contentHint' in videoTrack) {
          (videoTrack as any).contentHint = 'detail';
        }

        stream.getVideoTracks()[0].onended = () => {
          this.stopScreenShare();
        };

        this.peerConnections.forEach((pc, peerId) => {
          const senders = pc.getSenders();
          const existingVideoSender = senders.find((s) => s.track && s.track.kind === 'video');
          let sender: RTCRtpSender;
          if (existingVideoSender) {
            existingVideoSender.replaceTrack(videoTrack).catch(console.error);
            sender = existingVideoSender;
          } else {
            sender = pc.addTrack(videoTrack, stream);
          }

          if (sender && sender.track) {
            try {
              const params = sender.getParameters();
              if (!params.encodings) params.encodings = [{}];
              params.encodings[0].maxBitrate = 8_000_000; // 8 Mbps high quality
              params.degradationPreference = 'maintain-resolution';
              sender.setParameters(params).catch(console.error);
            } catch (e) {
              console.error('Failed to set RTP sender params:', e);
            }
          }
          this.renegotiate(peerId);
        });
      }

      if (this.config.onScreenShareStream) {
        this.config.onScreenShareStream(stream);
      }

      return stream;
    } catch (err) {
      console.error('Failed to start Windows Graphics Capture screen share:', err);
      return null;
    }
  }

  public stopScreenShare() {
    if (this.localScreenStream) {
      const tracks = this.localScreenStream.getTracks();
      tracks.forEach((track) => track.stop());
      this.peerConnections.forEach((pc, peerId) => {
        const senders = pc.getSenders();
        senders.forEach((sender) => {
          if (sender.track && (tracks.includes(sender.track) || sender.track.kind === 'video')) {
            try { pc.removeTrack(sender); } catch (e) {}
          }
        });
        this.renegotiate(peerId);
      });
      this.localScreenStream = null;
    }
    if (this.config.onScreenShareStream) {
      this.config.onScreenShareStream(null);
    }
  }

  public updateAudioTrackState() {
    if (!this.localAudioStream) return;

    const audioTracks = this.localAudioStream.getAudioTracks();
    audioTracks.forEach((track) => {
      if (this.isMuted || this.isDeafened) {
        track.enabled = false;
      } else if (this.pttMode) {
        track.enabled = this.isPttPressed;
      } else {
        track.enabled = true;
      }
    });
  }

  private setupVolumeAnalyzer(stream: MediaStream) {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (e) {}
      this.audioContext = null;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      this.audioContext = new AudioCtx();
      
      const resumeAudio = () => {
        if (this.audioContext && this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(console.error);
        }
      };
      if (this.audioContext.state === 'suspended') {
        resumeAudio();
      }
      window.addEventListener('click', resumeAudio, { once: true });
      window.addEventListener('keydown', resumeAudio, { once: true });
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.4;
      source.connect(this.analyser);

      // Connect to destination via silent gain node (0 gain) so Chromium WebAudio engine processes PCM audio frames
      const silentGain = this.audioContext.createGain();
      silentGain.gain.value = 0;
      this.analyser.connect(silentGain);
      silentGain.connect(this.audioContext.destination);

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!this.analyser || !this.audioContext) return;
        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume().catch(console.error);
        }
        this.analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedVolume = Math.min(100, Math.round((average / 128) * 100));

        if (this.config.onVolumeChange) {
          this.config.onVolumeChange(normalizedVolume);
        }

        this.animFrameId = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.error('Failed to setup WebAudio analyser:', e);
    }
  }

  public async renegotiate(peerId: string) {
    const pc = this.peerConnections.get(peerId);
    if (!pc) return;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      if (this.config.onSignalNeeded) {
        this.config.onSignalNeeded({
          targetUserId: peerId,
          signalType: 'offer',
          payload: JSON.stringify(offer),
        });
      }
    } catch (e) {
      console.error('Renegotiate error:', e);
    }
  }

  private remoteAudioNodes: Map<string, { gainNode: GainNode; audioContext: AudioContext; stream: MediaStream }> = new Map();
  private peerVolumes: Map<string, number> = new Map();

  public setPeerVolume(peerId: string, volumePercent: number) {
    this.peerVolumes.set(peerId, volumePercent);
    const node = this.remoteAudioNodes.get(peerId);
    if (node) {
      node.gainNode.gain.value = volumePercent / 100;
    }
    const audioEl = this.remoteAudioElements.get(peerId);
    if (audioEl) {
      audioEl.volume = Math.min(1, volumePercent / 100);
    }
  }

  public getPeerVolume(peerId: string): number {
    return this.peerVolumes.get(peerId) ?? 100;
  }

  public createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
    });

    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localAudioStream!);
      });
    }

    if (this.localVideoStream) {
      this.localVideoStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localVideoStream!);
      });
    }

    if (this.localScreenStream) {
      this.localScreenStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localScreenStream!);
      });
    }

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE Connection State [${peerId}]:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        console.warn(`ICE state ${pc.iceConnectionState} for peer ${peerId}. Restarting ICE...`);
        try {
          pc.restartIce();
        } catch (e) {
          console.error('Failed to restart ICE:', e);
        }
      }
    };

    pc.ontrack = (event) => {
      console.log(`[WebRTC] Received remote track from peer ${peerId}:`, event.track.kind);

      if (event.track.kind === 'audio') {
        const audioStream = new MediaStream([event.track]);

        let audioEl = this.remoteAudioElements.get(peerId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          this.remoteAudioElements.set(peerId, audioEl);
        }
        audioEl.srcObject = audioStream;

        try {
          const oldNode = this.remoteAudioNodes.get(peerId);
          if (oldNode) {
            try { oldNode.audioContext.close(); } catch (e) {}
          }

          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtx) {
            const ctx = new AudioCtx();
            const source = ctx.createMediaStreamSource(audioStream);
            const gainNode = ctx.createGain();
            const initialVol = this.getPeerVolume(peerId);
            gainNode.gain.value = initialVol / 100;

            source.connect(gainNode);
            gainNode.connect(ctx.destination);
            if (ctx.state === 'suspended') {
              ctx.resume().catch(console.error);
            }

            this.remoteAudioNodes.set(peerId, { gainNode, audioContext: ctx, stream: audioStream });
            audioEl.volume = 0; // Mute HTMLAudioElement as WebAudio destination handles playback with gain boost
          }
        } catch (e) {
          console.warn(`Fallback to HTMLAudioElement for peer ${peerId}:`, e);
          const initialVol = this.getPeerVolume(peerId);
          audioEl.volume = Math.min(1, initialVol / 100);
          audioEl.play().catch(console.error);
        }
      }

      if (this.config.onRemoteStream) {
        const receivers = pc.getReceivers();
        const activeTracks = receivers.map((r) => r.track).filter(Boolean);
        const combinedStream = new MediaStream(activeTracks);
        this.config.onRemoteStream(peerId, combinedStream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.config.onSignalNeeded) {
        this.config.onSignalNeeded({
          targetUserId: peerId,
          signalType: 'candidate',
          payload: JSON.stringify(event.candidate),
        });
      }
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  private pendingCandidates: Map<string, RTCIceCandidateInit[]> = new Map();

  public async handleSignal(senderId: string, signalType: string, payloadStr: string, senderName?: string) {
    if (signalType === 'leave') {
      const pc = this.peerConnections.get(senderId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(senderId);
      }
      const audioEl = this.remoteAudioElements.get(senderId);
      if (audioEl) {
        audioEl.pause();
        audioEl.srcObject = null;
        this.remoteAudioElements.delete(senderId);
      }
      const audioNode = this.remoteAudioNodes.get(senderId);
      if (audioNode) {
        try { audioNode.audioContext.close(); } catch (e) {}
        this.remoteAudioNodes.delete(senderId);
      }
      this.pendingCandidates.delete(senderId);
      return;
    }

    if (signalType === 'join') {
      const pc = this.createPeerConnection(senderId);
      const myId = this.config.myUserId || '';
      if (!myId || myId < senderId) {
        this.renegotiate(senderId);
      }
      return;
    }

    let pc = this.peerConnections.get(senderId);
    if (!pc) {
      pc = this.createPeerConnection(senderId);
    }

    try {
      if (signalType === 'offer') {
        const offer = JSON.parse(payloadStr);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const queued = this.pendingCandidates.get(senderId) || [];
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
        }
        this.pendingCandidates.delete(senderId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (this.config.onSignalNeeded) {
          this.config.onSignalNeeded({
            targetUserId: senderId,
            signalType: 'answer',
            payload: JSON.stringify(answer),
          });
        }
      } else if (signalType === 'answer') {
        const answer = JSON.parse(payloadStr);
        await pc.setRemoteDescription(new RTCSessionDescription(answer));

        const queued = this.pendingCandidates.get(senderId) || [];
        for (const cand of queued) {
          await pc.addIceCandidate(new RTCIceCandidate(cand)).catch(console.error);
        }
        this.pendingCandidates.delete(senderId);
      } else if (signalType === 'candidate') {
        const candidate = JSON.parse(payloadStr);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        } else {
          const queued = this.pendingCandidates.get(senderId) || [];
          queued.push(candidate);
          this.pendingCandidates.set(senderId, queued);
        }
      }
    } catch (err) {
      console.error('Signal handling error:', err);
    }
  }

  public stopAll() {
    if (this.config.onSignalNeeded) {
      this.config.onSignalNeeded({
        signalType: 'leave',
        payload: JSON.stringify({ action: 'leave' }),
      });
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.stopCamera();
    this.stopScreenShare();
    if (this.localAudioStream) {
      this.localAudioStream.getTracks().forEach((t) => t.stop());
      this.localAudioStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.remoteAudioElements.forEach((el) => {
      el.pause();
      el.srcObject = null;
    });
    this.remoteAudioElements.clear();
    this.remoteAudioNodes.forEach((node) => {
      try { node.audioContext.close(); } catch (e) {}
    });
    this.remoteAudioNodes.clear();
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    this.pendingCandidates.clear();
  }
}
