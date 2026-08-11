import React, { useState, useEffect, useRef } from 'react';
import { Monitor, Check, X, Share2, MonitorUp } from 'lucide-react';

interface ScreenShareModalProps {
  onClose: () => void;
  onStartShare: (monitorId: string, quality: string) => void;
}

export const ScreenShareModal: React.FC<ScreenShareModalProps> = ({ onClose, onStartShare }) => {
  const [activeTab, setActiveTab] = useState<'screens' | 'applications'>('screens');
  const [selectedMonitor, setSelectedMonitor] = useState<string>('screen1');
  const [quality, setQuality] = useState<string>('1080p60');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const previewVideoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [previewStream]);

  useEffect(() => {
    if (previewVideoRef.current && previewStream) {
      previewVideoRef.current.srcObject = previewStream;
      previewVideoRef.current.play().catch(console.error);
    }
  }, [previewStream]);

  const handleRequestLivePreview = async () => {
    try {
      if (previewStream) {
        previewStream.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      setPreviewStream(stream);
    } catch (e) {
      console.warn('Live preview request cancelled:', e);
    }
  };

  const handleShare = () => {
    onStartShare(selectedMonitor, quality);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none">
      <div className="w-full max-w-3xl bg-[#141724] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Modal Window Header */}
        <div className="h-10 bg-[#0e111a] flex items-center justify-between px-4 border-b border-white/[0.06] text-xs font-mono text-slate-400">
          <span className="flex items-center space-x-2">
            <MonitorUp className="w-4 h-4 text-indigo-400" />
            <span>Ekran Paylaşımı Seçimi</span>
          </span>
          <X className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" onClick={onClose} />
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Tabs */}
          <div className="flex items-center space-x-6 border-b border-white/10 pb-3 font-semibold text-sm">
            <button
              onClick={() => setActiveTab('screens')}
              className={`transition-colors relative pb-3 -mb-3 ${
                activeTab === 'screens' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ekranlar (Tüm Ekran)
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`transition-colors relative pb-3 -mb-3 ${
                activeTab === 'applications' ? 'text-white border-b-2 border-indigo-500' : 'text-slate-400 hover:text-white'
              }`}
            >
              Uygulamalar & Pencereler
            </button>
          </div>

          {/* Screens Option */}
          <div className="grid grid-cols-2 gap-4">
            {/* Live Windows Display Option */}
            <div
              onClick={() => {
                setSelectedMonitor('screen1');
                if (!previewStream) handleRequestLivePreview();
              }}
              className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-[#0e111a] h-48 flex flex-col justify-between ${
                selectedMonitor === 'screen1' ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-white/10 hover:border-white/20'
              }`}
            >
              {previewStream ? (
                <video
                  ref={previewVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-36 object-contain bg-black"
                />
              ) : (
                <div className="w-full h-36 flex flex-col items-center justify-center text-slate-400 space-y-2">
                  <Monitor className="w-10 h-10 text-indigo-400" />
                  <span className="text-xs">Canlı Ekran Önizlemesi Al</span>
                </div>
              )}

              {selectedMonitor === 'screen1' && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="p-2.5 bg-[#141724] flex items-center justify-between text-xs text-slate-300 font-mono border-t border-white/5">
                <span>Ana Monitör (Canlı Akış)</span>
                <span className="text-[10px] text-emerald-400 font-bold">1080p 60fps</span>
              </div>
            </div>

            {/* Application Window Option */}
            <div
              onClick={() => {
                setSelectedMonitor('app1');
                handleRequestLivePreview();
              }}
              className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all bg-[#0e111a] h-48 flex flex-col justify-between ${
                selectedMonitor === 'app1' ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="w-full h-36 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Share2 className="w-10 h-10 text-purple-400" />
                <span className="text-xs">Uygulama Penceresi Seç</span>
              </div>

              {selectedMonitor === 'app1' && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-white shadow">
                  <Check className="w-3.5 h-3.5" />
                </div>
              )}

              <div className="p-2.5 bg-[#141724] flex items-center justify-between text-xs text-slate-300 font-mono border-t border-white/5">
                <span>Özel Pencere Paylaşımı</span>
                <span className="text-[10px] text-purple-400 font-bold">Pencere Modu</span>
              </div>
            </div>
          </div>

          {/* Quality & Actions */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs text-slate-400 font-mono">
              <span>Yayın Kalitesi:</span>
              <button
                onClick={() => setQuality('720p30')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  quality === '720p30' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'border-white/10 hover:border-white/20'
                }`}
              >
                720p 30fps
              </button>
              <button
                onClick={() => setQuality('1080p60')}
                className={`px-3 py-1.5 rounded-lg border transition-all ${
                  quality === '1080p60' ? 'bg-indigo-500/20 border-indigo-500 text-white' : 'border-white/10 hover:border-white/20'
                }`}
              >
                1080p 60fps
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-5 py-2 rounded-full border border-white/20 text-xs font-semibold text-white hover:bg-white/5 transition-colors"
              >
                İptal
              </button>
              <button
                onClick={handleShare}
                className="px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-indigo-500/30 transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Paylaşımı Başlat</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
