import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Mic, MicOff, Video, VideoOff, Monitor, PhoneOff, Search, Bell, Pin, Users, HelpCircle, Key, MonitorUp, Settings, ChevronDown, RotateCcw, MessageSquare, Music, Youtube, Play, Pause, SkipBack, SkipForward, ListMusic, Plus, Trash2, ShieldAlert, Maximize2, Minimize2 } from 'lucide-react';
import { Channel, User, MusicTrack } from '../types';
import { WebRTCService, MediaDeviceInfoSimple } from '../services/webrtc';

const extractYouTubeVideoId = (url: string): string | null => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface VoiceLoungeViewProps {
  channel: Channel;
  currentUser: User | null;
  onOpenScreenShare: () => void;
  onLeaveVoice: () => void;
  onSendVoiceSignal?: (signal: { targetUserId?: string; signalType: string; payload: string }) => void;
  onBindWebRTCService?: (rtc: WebRTCService | null) => void;
}

export const VoiceLoungeView: React.FC<VoiceLoungeViewProps> = ({
  channel,
  currentUser,
  onOpenScreenShare,
  onLeaveVoice,
  onSendVoiceSignal,
  onBindWebRTCService,
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isPttActive, setIsPttActive] = useState(false);
  const [volume, setVolume] = useState(0);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    peerId: string;
    username: string;
    isSelf: boolean;
  } | null>(null);

  const [peerVolumes, setPeerVolumes] = useState<Map<string, number>>(new Map());

  // Music Player & Shared YouTube Queue State
  const [musicQueue, setMusicQueue] = useState<MusicTrack[]>([
    {
      id: 'demo-1',
      url: 'https://www.youtube.com/watch?v=5qap5aO4i9A',
      videoId: '5qap5aO4i9A',
      title: 'Lofi Hip Hop Radio - Beats to Relax/Study to',
      addedById: currentUser?.id || 'demo_user',
      addedByName: currentUser?.username || 'AetherDJ',
      durationSeconds: 240,
    },
  ]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [songProgressSeconds, setSongProgressSeconds] = useState<number>(0);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState<string>('');
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [showQueueModal, setShowQueueModal] = useState<boolean>(false);
  const [musicBotVolume, setMusicBotVolume] = useState<number>(100);
  const [showBotVolumePopover, setShowBotVolumePopover] = useState<boolean>(false);
  const [focusedTileId, setFocusedTileId] = useState<string | null>(null);

  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);

  const handleMusicBotVolumeChange = (newVol: number) => {
    setMusicBotVolume(newVol);
    if (youtubeIframeRef.current?.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'setVolume', args: [Math.min(100, newVol)] }),
        '*'
      );
    }
  };

  useEffect(() => {
    let timer: any = null;
    if (isPlaying && musicQueue.length > 0) {
      timer = setInterval(() => {
        setSongProgressSeconds((prev) => {
          const currentTrack = musicQueue[currentTrackIndex];
          const maxDur = currentTrack?.durationSeconds || 180;
          if (prev >= maxDur) {
            if (currentTrackIndex < musicQueue.length - 1) {
              setCurrentTrackIndex((idx) => idx + 1);
              return 0;
            } else {
              setIsPlaying(false);
              return 0;
            }
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, musicQueue, currentTrackIndex]);

  const currentTrack = musicQueue[currentTrackIndex] || null;
  const isRequester = currentTrack && (currentTrack.addedById === currentUser?.id);

  const showPermissionWarning = (addedByName: string) => {
    setPermissionError(`Bu şarkıyı @${addedByName} ekledi. Yalnızca şarkı sahibi duraklatabilir veya atlayabilir!`);
    setTimeout(() => setPermissionError(null), 3500);
  };

  const handleSeek = (newSeconds: number) => {
    setSongProgressSeconds(newSeconds);
    if (youtubeIframeRef.current?.contentWindow) {
      youtubeIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: 'seekTo', args: [newSeconds, true] }),
        '*'
      );
    }
  };

  const handleTogglePlay = () => {
    const nextState = !isPlaying;
    setIsPlaying(nextState);
    if (youtubeIframeRef.current?.contentWindow) {
      const command = nextState ? 'playVideo' : 'pauseVideo';
      youtubeIframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
    }
  };

  const handleAddYouTubeTrack = async () => {
    if (!youtubeUrlInput.trim()) return;
    const vId = extractYouTubeVideoId(youtubeUrlInput.trim());
    if (!vId) {
      setPermissionError('Geçersiz YouTube linki! Lütfen geçerli bir YouTube URL girin.');
      setTimeout(() => setPermissionError(null), 3000);
      return;
    }

    let fetchedTitle = `YouTube Şarkısı (${vId})`;
    try {
      const res = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${vId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.title) {
          fetchedTitle = data.title;
        }
      }
    } catch (e) {
      console.warn('oEmbed fetch error:', e);
    }

    const newTrack: MusicTrack = {
      id: 'track_' + Date.now(),
      url: youtubeUrlInput.trim(),
      videoId: vId,
      title: fetchedTitle,
      addedById: currentUser?.id || 'usr_anon',
      addedByName: currentUser?.username || 'Kullanıcı',
      durationSeconds: 210,
    };

    setMusicQueue((prev) => [...prev, newTrack]);
    setYoutubeUrlInput('');
    if (musicQueue.length === 0) {
      setCurrentTrackIndex(0);
      setIsPlaying(true);
      setSongProgressSeconds(0);
    }
  };

  const handlePrevTrack = () => {
    if (currentTrackIndex > 0) {
      setCurrentTrackIndex((idx) => idx - 1);
      setSongProgressSeconds(0);
    } else {
      handleSeek(0);
    }
  };

  const handleNextTrack = () => {
    if (currentTrackIndex < musicQueue.length - 1) {
      setCurrentTrackIndex((idx) => idx + 1);
      setSongProgressSeconds(0);
    } else {
      setIsPlaying(false);
    }
  };

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfoSimple[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfoSimple[]>([]);
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');

  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const webrtcRef = useRef<WebRTCService | null>(null);

  const [remotePeerNames, setRemotePeerNames] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const rtc = new WebRTCService({
      myUserId: currentUser?.id,
      stunServer: 'stun:stun.l.google.com:19302',
      onVolumeChange: (vol) => {
        setVolume(vol);
      },
      onSignalNeeded: (signal) => {
        if (onSendVoiceSignal) {
          onSendVoiceSignal(signal);
        }
      },
      onCameraStream: (stream) => {
        setCameraStream(stream);
        setIsVideoOn(!!stream);
      },
      onScreenShareStream: (stream) => {
        setScreenStream(stream);
        setIsScreenSharing(!!stream);
      },
      onRemoteStream: (peerId, stream) => {
        setRemoteStreams((prev) => {
          const next = new Map(prev);
          next.set(peerId, stream);
          return next;
        });
      },
    });

    webrtcRef.current = rtc;
    if (onBindWebRTCService) {
      onBindWebRTCService(rtc);
    }

    // Initialize audio stream & fetch available hardware devices
    rtc.startLocalAudio().then(() => {
      rtc.getAudioDevices().then((aDevs) => {
        setAudioDevices(aDevs);
        if (aDevs.length > 0) setSelectedAudioId(aDevs[0].deviceId);
      });
      rtc.getVideoDevices().then((vDevs) => {
        setVideoDevices(vDevs);
        if (vDevs.length > 0) setSelectedVideoId(vDevs[0].deviceId);
      });
    });

    // Periodic 5s join ping to guarantee peers connect across networks
    const pingInterval = setInterval(() => {
      if (onSendVoiceSignal) {
        onSendVoiceSignal({
          signalType: 'join',
          payload: JSON.stringify({ action: 'join' }),
        });
      }
    }, 5000);

    const handleVoiceSignal = (e: Event) => {
      const customEvent = e as CustomEvent<{ senderId: string; senderName: string; signalType: string; payload: string }>;
      const { senderId, senderName, signalType } = customEvent.detail;
      if (senderId) {
        if (signalType === 'leave') {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.delete(senderId);
            return next;
          });
          setRemotePeerNames((prev) => {
            const next = new Map(prev);
            next.delete(senderId);
            return next;
          });
        } else if (senderName) {
          setRemotePeerNames((prev) => {
            const next = new Map(prev);
            next.set(senderId, senderName);
            return next;
          });
        }
      }
    };

    const isEditingText = (target: EventTarget | null): boolean => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingText(e.target)) return;
      if (e.code === 'Space' || e.key === ' ') {
        setIsPttActive(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (isEditingText(e.target)) return;
      if (e.code === 'Space' || e.key === ' ') {
        setIsPttActive(false);
      }
    };

    window.addEventListener('dc_voice_signal', handleVoiceSignal);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      clearInterval(pingInterval);
      window.removeEventListener('dc_voice_signal', handleVoiceSignal);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      rtc.stopAll();
      if (onBindWebRTCService) {
        onBindWebRTCService(null);
      }
    };
  }, []);

  // Play Camera Stream when attached
  useEffect(() => {
    if (localVideoRef.current && cameraStream) {
      localVideoRef.current.srcObject = cameraStream;
      localVideoRef.current.play().catch(console.error);
    }
  }, [cameraStream, isVideoOn]);

  // Play Screen Share Stream when attached
  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
      screenVideoRef.current.play().catch(console.error);
    }
  }, [screenStream, isScreenSharing]);

  const toggleMute = () => {
    if (webrtcRef.current) {
      webrtcRef.current.isMuted = !isMuted;
      webrtcRef.current.updateAudioTrackState();
    }
    setIsMuted(!isMuted);
  };

  const toggleCamera = async () => {
    if (!webrtcRef.current) return;

    if (isVideoOn) {
      webrtcRef.current.stopCamera();
    } else {
      await webrtcRef.current.startCamera(selectedVideoId);
    }
  };

  const handleAudioDeviceChange = async (deviceId: string) => {
    setSelectedAudioId(deviceId);
    if (webrtcRef.current) {
      await webrtcRef.current.startLocalAudio(deviceId);
    }
  };

  const handleVideoDeviceChange = async (deviceId: string) => {
    setSelectedVideoId(deviceId);
    if (webrtcRef.current && isVideoOn) {
      await webrtcRef.current.startCamera(deviceId);
    }
  };

  const [isPttMode, setIsPttMode] = useState(false);
  const [sensitivity, setSensitivity] = useState(3);
  const [isTestLoopback, setIsTestLoopback] = useState(false);

  useEffect(() => {
    if (webrtcRef.current) {
      webrtcRef.current.sensitivity = sensitivity;
    }
  }, [sensitivity]);

  const togglePttMode = () => {
    if (webrtcRef.current) {
      const nextMode = !isPttMode;
      webrtcRef.current.pttMode = nextMode;
      webrtcRef.current.updateAudioTrackState();
      setIsPttMode(nextMode);
    }
  };

  const isSpeaking = !isMuted && volume > sensitivity && (!isPttMode || isPttActive);

  return (
    <div className="flex-1 bg-midnight-darkest flex flex-col h-full overflow-hidden select-none relative">
      {/* Top Header Bar */}
      <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4 bg-midnight-darkest z-10">
        <div className="flex items-center space-x-3">
          <Volume2 className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-white text-sm tracking-wide">{channel.name}</span>
          <div className="w-[1px] h-4 bg-white/10" />
          <span className="text-xs text-emerald-400 font-semibold flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse" /> RTC Bağlandı (Google STUN)
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Voice Activity Main Mode Badge */}
          <button
            onClick={togglePttMode}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
              isPttMode
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md'
            }`}
            title="Sohbet Modunu Değiştirmek İçin Tıklayın (Açık Mikrofon / Bas-Konuş)"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>
              {isPttMode
                ? 'BAS-KONUŞ: [SPACE]'
                : 'AÇIK MİKROFON (ANA MOD)'}
            </span>
          </button>

          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="w-36 lg:w-48 pl-3 pr-8 py-1 bg-midnight-dark border border-white/5 rounded-md text-xs text-white placeholder-midnight-muted focus:outline-none"
            />
            <Search className="w-3.5 h-3.5 text-midnight-muted absolute right-2.5 top-2" />
          </div>
          <Bell className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
          <Pin className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
          <Users className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
          <HelpCircle className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
        </div>
      </div>

      {/* Device Settings Selector Popover */}
      {showDeviceSettings && (
        <div className="absolute top-16 right-6 z-40 w-80 bg-[#141724] border border-white/10 rounded-2xl p-4 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-bold text-xs text-white flex items-center space-x-2">
              <Settings className="w-4 h-4 text-indigo-400" />
              <span>Ses & Kamera Cihaz Seçimi</span>
            </span>
            <button onClick={() => setShowDeviceSettings(false)} className="text-xs text-slate-400 hover:text-white">✕</button>
          </div>

          {/* Microphone Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">🎙️ Mikrofon Kaynağı</label>
            <select
              value={selectedAudioId}
              onChange={(e) => handleAudioDeviceChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0e111a] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {audioDevices.length === 0 && <option value="">Varsayılan Mikrofon</option>}
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Sensitivity Slider (Noise Gate Threshold) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[11px] font-semibold text-slate-300 uppercase">🎚️ Ses Algılama Eşiği (Duyarlılık)</label>
              <span className="text-xs font-mono font-bold text-indigo-400">%{sensitivity}</span>
            </div>
            <input
              type="range"
              min="1"
              max="30"
              value={sensitivity}
              onChange={(e) => setSensitivity(Number(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
              <span>Hassas (%1)</span>
              <span>Sert (%30)</span>
            </div>
          </div>

          {/* Mic Loopback Test Button */}
          <div className="pt-1">
            <button
              onClick={() => {
                setIsTestLoopback((prev) => !prev);
              }}
              className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all ${
                isTestLoopback
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <span>🎧 Mikrofon Testi ({isTestLoopback ? 'Açık - Kendi Sesini Duyuyorsun' : 'Kendi Sesini Dinlemek İçin Bas'})</span>
            </button>
            {isTestLoopback && (
              <audio
                ref={(el) => {
                  const stream = webrtcRef.current?.getLocalAudioStream();
                  if (el && stream) {
                    el.srcObject = stream;
                    el.play().catch(console.error);
                  }
                }}
                autoPlay
              />
            )}
          </div>

          {/* Camera Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-300 uppercase mb-1">📷 Kamera Kaynağı</label>
            <select
              value={selectedVideoId}
              onChange={(e) => handleVideoDeviceChange(e.target.value)}
              className="w-full px-3 py-2 bg-[#0e111a] border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {videoDevices.length === 0 && <option value="">Varsayılan Kamera</option>}
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* YouTube Music Link Input Bar */}
      <div className="w-full px-6 pt-4 pb-2 flex items-center space-x-3 z-30">
        <div className="flex-1 relative flex items-center">
          <Youtube className="w-4 h-4 text-rose-500 absolute left-3.5" />
          <input
            type="text"
            placeholder="YouTube Müzik Linki Yapıştırın (örn: https://www.youtube.com/watch?v=...)"
            value={youtubeUrlInput}
            onChange={(e) => setYoutubeUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddYouTubeTrack();
            }}
            className="w-full pl-10 pr-24 py-2.5 bg-[#141724] border border-white/10 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-inner"
          />
          <button
            onClick={handleAddYouTubeTrack}
            className="absolute right-2 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg shadow transition-all flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Sıraya Ekle</span>
          </button>
        </div>

        <button
          onClick={() => setShowQueueModal(!showQueueModal)}
          className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-white flex items-center space-x-1.5 transition-all shadow"
        >
          <ListMusic className="w-4 h-4 text-amber-400" />
          <span>Sıra ({musicQueue.length})</span>
        </button>
      </div>

      {/* Dynamic Stage Area: 16:9 Aspect Ratio Grid with 5+ Participant Auto-Scroll */}
      {(() => {
        const allRemotePeerIds = Array.from(new Set([...remotePeerNames.keys(), ...remoteStreams.keys()]));
        const totalTileCount = 1 /* music_bot */ + (isScreenSharing ? 1 : 0) + 1 /* self */ + allRemotePeerIds.length;
        const isOverflowingGrid = totalTileCount >= 5;

        return (
          <div className="flex-1 p-4 flex flex-col w-full h-full min-h-0 relative overflow-hidden">
            {/* Fullscreen / Focus Mode Stage Header Bar when a tile is focused */}
            {focusedTileId && (
              <div className="mb-3 flex items-center justify-between px-4 py-2 bg-[#141724] border border-white/10 rounded-xl shadow-lg z-30">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-xs font-bold text-white">
                    Tam Ekran Sahne Modu ({focusedTileId === 'music_bot' ? 'Aether Music DJ' : focusedTileId === 'screenshare' ? 'Ekran Paylaşımı' : focusedTileId === 'self' ? (currentUser?.username || 'Siz') : (remotePeerNames.get(focusedTileId) || 'Katılımcı')})
                  </span>
                </div>
                <button
                  onClick={() => setFocusedTileId(null)}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-1.5 shadow transition-all"
                >
                  <Minimize2 className="w-4 h-4" />
                  <span>Tam Ekrandan Çık</span>
                </button>
              </div>
            )}

            <div className={`flex-1 w-full h-full min-h-0 relative ${
              focusedTileId
                ? 'flex flex-col items-center justify-center'
                : isOverflowingGrid
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2 auto-rows-max'
                : 'grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-6xl mx-auto items-center my-auto overflow-hidden'
            }`}>

              {/* 0. Virtual Music Participant Tile (Aether Music / DJ) */}
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    peerId: 'music_bot',
                    username: 'Aether Music DJ',
                    isSelf: false,
                  });
                }}
                className={`relative rounded-3xl overflow-hidden border-2 border-amber-500/30 shadow-2xl bg-gradient-to-br from-[#141724] via-[#1a1728] to-[#22182c] flex flex-col justify-between p-4 text-white transition-all duration-200 w-full ${
                  focusedTileId === 'music_bot'
                    ? 'h-full min-h-0 flex-1 z-20'
                    : focusedTileId !== null
                    ? 'hidden'
                    : 'aspect-video'
                }`}
              >
                {/* Top Header */}
                <div className="w-full flex items-center justify-between z-10">
                  <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold shadow">
                    <Music className="w-3.5 h-3.5 animate-bounce" />
                    <span>Aether Music DJ</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Local Music Bot Volume Control Button */}
                    <div className="relative">
                      <button
                        onClick={() => setShowBotVolumePopover(!showBotVolumePopover)}
                        className="px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 text-xs font-mono text-amber-400 flex items-center space-x-1 shadow transition-colors"
                        title="Kişisel Müzik Ses Seviyesini Ayarla"
                      >
                        {musicBotVolume === 0 ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
                        <span>%{musicBotVolume}</span>
                      </button>

                      {showBotVolumePopover && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute top-8 right-0 z-50 w-48 bg-[#0e111a] border border-white/10 rounded-xl p-3 shadow-2xl space-y-2 animate-in fade-in zoom-in-95"
                        >
                          <div className="flex justify-between items-center text-[10px] text-slate-300 font-bold uppercase">
                            <span>Müzik Sesi</span>
                            <span className="text-amber-400">%{musicBotVolume}</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={musicBotVolume}
                            onChange={(e) => handleMusicBotVolumeChange(Number(e.target.value))}
                            className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                          />
                        </div>
                      )}
                    </div>

                    {currentTrack && (
                      <span className="text-[11px] font-mono text-slate-300 bg-black/60 px-2.5 py-1 rounded-md border border-white/5 hidden sm:inline">
                        Ekleyen: @{currentTrack.addedByName}
                      </span>
                    )}

                    {/* Fullscreen / Focus Toggle Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedTileId(focusedTileId === 'music_bot' ? null : 'music_bot');
                      }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-amber-400 border border-white/10 shadow transition-colors"
                      title={focusedTileId === 'music_bot' ? 'Tam Ekrandan Çık' : 'Tam Ekran Yap (Odaklan)'}
                    >
                      {focusedTileId === 'music_bot' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {currentTrack ? (
                  /* 16:9 Widescreen Horizontal Player Controls Layout */
                  <div className="w-full my-auto flex flex-row items-center justify-center space-x-4 sm:space-x-6 px-2">
                    {/* YouTube Thumbnail Cover */}
                    <div className="relative w-20 h-20 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-amber-500/30 flex-shrink-0 group">
                      <img
                        src={`https://img.youtube.com/vi/${currentTrack.videoId}/hqdefault.jpg`}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                      />
                      {/* YouTube iFrame Player Engine (hidden / audio stream) */}
                      <iframe
                        ref={youtubeIframeRef}
                        src={`https://www.youtube-nocookie.com/embed/${currentTrack.videoId}?autoplay=${isPlaying ? 1 : 0}&enablejsapi=1`}
                        className="hidden"
                        allow="autoplay"
                      />
                    </div>

                    {/* Right Track Information & Player Controls */}
                    <div className="flex-1 min-w-0 w-full flex flex-col justify-center space-y-1.5 sm:space-y-2.5">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm md:text-base text-white truncate leading-snug">{currentTrack.title}</h4>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] sm:text-xs text-amber-400 font-semibold">Parça #{currentTrackIndex + 1} / {musicQueue.length}</span>
                          <span className="text-slate-500">•</span>
                          <span className="text-[10px] sm:text-xs text-slate-400 truncate">Ekleyen: @{currentTrack.addedByName}</span>
                        </div>
                      </div>

                      {/* Progress Slider */}
                      <div className="w-full space-y-1">
                        <input
                          type="range"
                          min="0"
                          max={currentTrack.durationSeconds || 180}
                          value={songProgressSeconds}
                          onChange={(e) => {
                            if (isRequester) {
                              handleSeek(Number(e.target.value));
                            } else {
                              showPermissionWarning(currentTrack.addedByName);
                            }
                          }}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                        />
                        <div className="flex justify-between text-[10px] sm:text-xs text-slate-400 font-mono">
                          <span>{formatTime(songProgressSeconds)}</span>
                          <span>{formatTime(currentTrack.durationSeconds || 180)}</span>
                        </div>
                      </div>

                      {/* Control Buttons */}
                      <div className="flex items-center space-x-2.5 pt-0.5">
                        <button
                          onClick={() => {
                            if (isRequester) {
                              handlePrevTrack();
                            } else {
                              showPermissionWarning(currentTrack.addedByName);
                            }
                          }}
                          className={`p-2 rounded-full transition-all ${
                            isRequester ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/5 text-slate-500 cursor-not-allowed'
                          }`}
                          title={isRequester ? 'Önceki Şarkıya Geç' : `@${currentTrack.addedByName} ekledi (Kilitli)`}
                        >
                          <SkipBack className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (isRequester) {
                              handleTogglePlay();
                            } else {
                              showPermissionWarning(currentTrack.addedByName);
                            }
                          }}
                          className={`p-2.5 rounded-full shadow-lg transition-all ${
                            isRequester
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-amber-500/30 scale-105'
                              : 'bg-white/10 text-slate-400 cursor-not-allowed'
                          }`}
                          title={isRequester ? (isPlaying ? 'Duraklat' : 'Oynat') : `@${currentTrack.addedByName} ekledi (Kilitli)`}
                        >
                          {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
                        </button>

                        <button
                          onClick={() => {
                            if (isRequester) {
                              handleNextTrack();
                            } else {
                              showPermissionWarning(currentTrack.addedByName);
                            }
                          }}
                          className={`p-2 rounded-full transition-all ${
                            isRequester ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-white/5 text-slate-500 cursor-not-allowed'
                          }`}
                          title={isRequester ? 'Sonraki Şarkıya Geç' : `@${currentTrack.addedByName} ekledi (Kilitli)`}
                        >
                          <SkipForward className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center my-auto space-y-2 text-center p-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20 shadow-inner">
                      <Music className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-slate-300">Şu An Çalan Şarkı Yok</span>
                    <span className="text-[11px] text-slate-400 max-w-xs">Üstteki arama çubuğuna bir YouTube müzik linki ekleyin.</span>
                  </div>
                )}

                {/* Requester Permission Warning Toast */}
                {permissionError && (
                  <div className="w-full bg-rose-500/90 text-white text-[11px] font-bold p-1.5 rounded-xl text-center shadow-lg">
                    ⚠️ {permissionError}
                  </div>
                )}
              </div>
              
              {/* 1. Live Screen Share Tile (SHOWN WHEN ACTIVE OR FOCUSED) */}
              {isScreenSharing && (
                <div className={`relative rounded-3xl overflow-hidden border-2 border-indigo-500/80 shadow-2xl bg-black transition-all duration-200 w-full ${
                  focusedTileId === 'screenshare'
                    ? 'h-full min-h-0 flex-1 z-20'
                    : focusedTileId !== null
                    ? 'hidden'
                    : 'aspect-video'
                }`}>
                  <video
                    ref={screenVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-contain [image-rendering:crisp-edges]"
                  />
                  <div className="absolute top-3 right-3 flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFocusedTileId(focusedTileId === 'screenshare' ? null : 'screenshare');
                      }}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-amber-400 border border-white/10 shadow transition-colors"
                      title={focusedTileId === 'screenshare' ? 'Tam Ekrandan Çık' : 'Tam Ekran Yap (Odaklan)'}
                    >
                      {focusedTileId === 'screenshare' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md text-xs font-semibold text-white flex items-center space-x-2 border border-white/10">
                    <span>{currentUser?.username || 'Siz'} (Ekran Paylaşımı)</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                </div>
              )}

              {/* 2. User Camera / Avatar Tile (Current Connected User) */}
              <div
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    peerId: currentUser?.id || 'self',
                    username: currentUser?.username || 'Siz',
                    isSelf: true,
                  });
                }}
                className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-200 shadow-2xl bg-[#141724] flex flex-col items-center justify-between p-4 cursor-pointer w-full ${
                  focusedTileId === 'self'
                    ? 'h-full min-h-0 flex-1 z-20'
                    : focusedTileId !== null
                    ? 'hidden'
                    : 'aspect-video'
                } ${
                  isSpeaking ? 'border-emerald-400 shadow-emerald-500/40 ring-2 ring-emerald-400/50' : 'border-white/10'
                }`}
              >
                {isVideoOn ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover bg-black"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center my-auto p-2">
                    {/* Circular Avatar with Glowing Green Ring when speaking */}
                    <div className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full p-1 shadow-2xl mb-2.5 transition-all duration-200 ${
                      isSpeaking
                        ? 'bg-emerald-400 ring-8 ring-emerald-500/80 shadow-emerald-500/80 scale-105 animate-pulse'
                        : 'bg-gradient-to-tr from-indigo-500 to-purple-600'
                    }`}>
                      <div className="w-full h-full rounded-full bg-[#0e111a] flex items-center justify-center font-bold text-white text-2xl sm:text-3xl border-2 border-white/10">
                        {currentUser?.username?.[0]?.toUpperCase() || 'P'}
                      </div>
                    </div>
                    <span className="font-bold text-white text-base sm:text-lg">{currentUser?.username || 'Kullanıcı'}</span>

                    {/* Real-time Microphone Input Level Meter & Percentage */}
                    <div className="flex flex-col items-center mt-2 space-y-1">
                      <div className="w-32 sm:w-40 h-1.5 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div
                          className={`h-full rounded-full transition-all duration-75 ${
                            volume > sensitivity ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-slate-500'
                          }`}
                          style={{ width: `${Math.min(100, volume)}%` }}
                        />
                      </div>
                      <span className={`text-[10px] sm:text-xs font-mono font-bold ${volume > sensitivity ? 'text-emerald-400' : 'text-slate-400'}`}>
                        Ses Sinyali: %{volume} {volume > sensitivity ? '(SES ALINIYOR)' : '(SESSİZ)'}
                      </span>
                    </div>
                  </div>
                )}

                <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                  <div className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                    {isMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5" />}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setFocusedTileId(focusedTileId === 'self' ? null : 'self');
                    }}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-amber-400 border border-white/10 shadow transition-colors"
                    title={focusedTileId === 'self' ? 'Tam Ekrandan Çık' : 'Tam Ekran Yap (Odaklan)'}
                  >
                    {focusedTileId === 'self' ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </button>
                </div>

                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md text-xs font-semibold text-white flex items-center space-x-2 border border-white/10 z-10">
                  <span>{currentUser?.username || 'Kullanıcı'} (Siz)</span>
                  {isSpeaking && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />}
                </div>
              </div>

              {/* 3. Remote Connected Peer Streams & Room Participants */}
              {allRemotePeerIds.map((peerId) => {
                const stream = remoteStreams.get(peerId);
                const peerUsername = remotePeerNames.get(peerId) || `Katılımcı (${peerId.substring(0, 6)})`;
                const initial = peerUsername[0]?.toUpperCase() || 'U';
                const hasVideo = stream && stream.getVideoTracks().length > 0 && stream.getVideoTracks().some((t) => t.enabled);

                return (
                  <div
                    key={peerId}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setContextMenu({
                        x: e.clientX,
                        y: e.clientY,
                        peerId,
                        username: peerUsername,
                        isSelf: false,
                      });
                    }}
                    className={`relative rounded-3xl overflow-hidden border-2 border-white/10 transition-all duration-200 shadow-2xl bg-[#141724] flex flex-col items-center justify-between p-4 cursor-pointer w-full ${
                      focusedTileId === peerId
                        ? 'h-full min-h-0 flex-1 z-20'
                        : focusedTileId !== null
                        ? 'hidden'
                        : 'aspect-video'
                    }`}
                  >
                    {hasVideo && stream ? (
                      <video
                        ref={(el) => {
                          if (el && el.srcObject !== stream) {
                            el.srcObject = stream;
                            el.play().catch(console.error);
                          }
                        }}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover bg-black"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center my-auto p-2">
                        <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 p-1 shadow-2xl mb-2.5">
                          <div className="w-full h-full rounded-full bg-[#0e111a] flex items-center justify-center font-bold text-white text-2xl sm:text-3xl uppercase border-2 border-white/10">
                            {initial}
                          </div>
                        </div>
                        <span className="font-bold text-white text-base sm:text-lg">{peerUsername}</span>
                      </div>
                    )}

                    <div className="absolute top-3 right-3 flex items-center space-x-2 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setFocusedTileId(focusedTileId === peerId ? null : peerId);
                        }}
                        className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-amber-400 border border-white/10 shadow transition-colors"
                        title={focusedTileId === peerId ? 'Tam Ekrandan Çık' : 'Tam Ekran Yap (Odaklan)'}
                      >
                        {focusedTileId === peerId ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/70 backdrop-blur-md text-xs font-semibold text-white flex items-center space-x-2 border border-white/10 z-10">
                      <span>{peerUsername}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Custom Right-Click Context Menu for User Volume Control & Boosting up to 200% */}
      {contextMenu && (
        <div
          className="fixed z-50 w-72 bg-[#141724]/95 border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl space-y-4 animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: Math.min(contextMenu.y, window.innerHeight - 260),
            left: Math.min(contextMenu.x, window.innerWidth - 300),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs uppercase shadow">
                {contextMenu.username[0] || 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-xs text-white truncate">{contextMenu.username}</span>
                <span className="text-[10px] text-emerald-400 font-mono">
                  {contextMenu.isSelf ? 'Sizin Profiliniz' : 'Sesli Kanal Katılımcısı'}
                </span>
              </div>
            </div>
            <button
              onClick={() => setContextMenu(null)}
              className="text-xs text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
            >
              ✕
            </button>
          </div>

          {contextMenu.peerId === 'music_bot' ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Müzik Botu Sesi (Kişisel)</span>
                  </label>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    %{musicBotVolume}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={musicBotVolume}
                  onChange={(e) => handleMusicBotVolumeChange(Number(e.target.value))}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>Sessiz (%0)</span>
                  <span>Normal (%100)</span>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => handleMusicBotVolumeChange(musicBotVolume === 0 ? 100 : 0)}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
                    musicBotVolume === 0
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>{musicBotVolume === 0 ? 'Sesi Aç' : 'Sustur'}</span>
                </button>

                <button
                  onClick={() => handleMusicBotVolumeChange(100)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Sıfırla</span>
                </button>
              </div>
            </div>
          ) : !contextMenu.isSelf ? (
            <div className="space-y-3">
              {/* User Volume Boost Slider (0% - 200%) */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Kullanıcı Sesi Gücü</span>
                  </label>
                  <span className={`text-xs font-mono font-bold ${
                    (peerVolumes.get(contextMenu.peerId) ?? 100) > 100
                      ? 'text-amber-400 animate-pulse'
                      : (peerVolumes.get(contextMenu.peerId) ?? 100) === 0
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}>
                    %{(peerVolumes.get(contextMenu.peerId) ?? 100)}
                    {(peerVolumes.get(contextMenu.peerId) ?? 100) > 100 ? ' (BOOST 🚀)' : ''}
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="200"
                  step="1"
                  value={peerVolumes.get(contextMenu.peerId) ?? 100}
                  onChange={(e) => {
                    const newVol = Number(e.target.value);
                    setPeerVolumes((prev) => new Map(prev).set(contextMenu.peerId, newVol));
                    if (webrtcRef.current) {
                      webrtcRef.current.setPeerVolume(contextMenu.peerId, newVol);
                    }
                  }}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-400"
                />

                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>Sessiz (%0)</span>
                  <span>Normal (%100)</span>
                  <span className="text-amber-400 font-bold">Boost (%200)</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  onClick={() => {
                    const current = peerVolumes.get(contextMenu.peerId) ?? 100;
                    const nextVol = current === 0 ? 100 : 0;
                    setPeerVolumes((prev) => new Map(prev).set(contextMenu.peerId, nextVol));
                    if (webrtcRef.current) {
                      webrtcRef.current.setPeerVolume(contextMenu.peerId, nextVol);
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all ${
                    (peerVolumes.get(contextMenu.peerId) ?? 100) === 0
                      ? 'bg-rose-500 text-white shadow-md'
                      : 'bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <VolumeX className="w-3.5 h-3.5" />
                  <span>{(peerVolumes.get(contextMenu.peerId) ?? 100) === 0 ? 'Sesi Aç' : 'Sustur'}</span>
                </button>

                <button
                  onClick={() => {
                    setPeerVolumes((prev) => new Map(prev).set(contextMenu.peerId, 100));
                    if (webrtcRef.current) {
                      webrtcRef.current.setPeerVolume(contextMenu.peerId, 100);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center space-x-1"
                  title="Sesi varsayılan %100 seviyesine sıfırla"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Sıfırla</span>
                </button>

                <button
                  onClick={() => {
                    setPeerVolumes((prev) => new Map(prev).set(contextMenu.peerId, 200));
                    if (webrtcRef.current) {
                      webrtcRef.current.setPeerVolume(contextMenu.peerId, 200);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold flex items-center space-x-1 hover:bg-amber-500 hover:text-white transition-all"
                  title="Sesi maksimum %200 seviyesine çıkar"
                >
                  <span>%200 🚀</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-300 text-center py-2">
              Kendi mikrofon duyarlılığınızı sağ üstteki <Settings className="w-3.5 h-3.5 inline text-indigo-400" /> Ayarlar menüsünden düzenleyebilirsiniz.
            </div>
          )}
        </div>
      )}

      {/* Shared Music Queue List Modal */}
      {showQueueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-md bg-[#141724] border border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <ListMusic className="w-5 h-5" />
                <span>Ortak Müzik Sırası ({musicQueue.length})</span>
              </div>
              <button
                onClick={() => setShowQueueModal(false)}
                className="text-xs text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {musicQueue.map((track, idx) => {
                const isCurrent = idx === currentTrackIndex;
                const canDelete = track.addedById === currentUser?.id;

                return (
                  <div
                    key={track.id}
                    className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                      isCurrent
                        ? 'bg-amber-500/20 border-amber-500/40 text-white'
                        : 'bg-white/5 border-white/5 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="font-mono text-xs text-slate-400 w-5">#{idx + 1}</span>
                      <img
                        src={`https://img.youtube.com/vi/${track.videoId}/hqdefault.jpg`}
                        alt={track.title}
                        className="w-10 h-10 rounded-lg object-cover border border-white/10"
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs truncate">{track.title}</span>
                        <span className="text-[10px] text-slate-400">Ekleyen: @{track.addedByName}</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {isCurrent && <span className="text-[10px] font-bold text-amber-400 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">ÇALIYOR</span>}
                      {canDelete && !isCurrent && (
                        <button
                          onClick={() => {
                            setMusicQueue((prev) => prev.filter((_, i) => i !== idx));
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                          title="Sıradan Çıkar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Floating Call Controls Bar matching image.png */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center space-x-3 px-6 py-3 rounded-full glass-panel shadow-2xl z-30">
        <button
          onClick={toggleMute}
          className={`p-3 rounded-full transition-all ${
            isMuted ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title={isMuted ? 'Mikrofonu Aç' : 'Mikrofonu Kapat'}
        >
          {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        <button
          onClick={toggleCamera}
          className={`p-3 rounded-full transition-all ${
            !isVideoOn ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
          }`}
          title={isVideoOn ? 'Kamerayı Kapat' : 'Kamerayı Aç'}
        >
          {isVideoOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>

        <button
          onClick={onOpenScreenShare}
          className={`p-3 rounded-full transition-all ${
            isScreenSharing ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Ekran Paylaş"
        >
          <Monitor className="w-5 h-5" />
        </button>

        <button
          onClick={() => setShowDeviceSettings(!showDeviceSettings)}
          className={`p-3 rounded-full transition-all ${
            showDeviceSettings ? 'bg-indigo-600 text-white' : 'bg-white/10 text-white hover:bg-white/20'
          }`}
          title="Ses ve Kamera Cihaz Ayarları"
        >
          <Settings className="w-5 h-5" />
        </button>

        <button
          onClick={onLeaveVoice}
          className="px-6 py-3 rounded-full bg-rose-500 hover:bg-rose-600 text-white font-bold text-sm flex items-center space-x-2 shadow-lg shadow-rose-500/30 transition-all"
        >
          <PhoneOff className="w-4 h-4" />
          <span>Leave</span>
        </button>
      </div>
    </div>
  );
};
