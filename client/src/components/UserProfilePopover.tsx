import React, { useState, useEffect } from 'react';
import { Shield, Monitor, MessageSquare, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface UserProfilePopoverProps {
  username?: string;
  identityKey?: string;
  onClose: () => void;
  onDirectMessage: () => void;
}

export const UserProfilePopover: React.FC<UserProfilePopoverProps> = ({
  username = 'AetherUser',
  identityKey = 'aether-public-key-ed25519-2026',
  onClose,
  onDirectMessage,
}) => {
  const [fingerprint, setFingerprint] = useState<string>('A1B2 C3D4 E5F6 G7H8');

  useEffect(() => {
    try {
      invoke<string>('get_e2ee_fingerprint', { publicKey: identityKey })
        .then((fp) => setFingerprint(fp))
        .catch(() => setFingerprint('A1B2 C3D4 E5F6 G7H8'));
    } catch (e) {
      setFingerprint('A1B2 C3D4 E5F6 G7H8');
    }
  }, [identityKey]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none">
      <div className="w-80 bg-midnight-dark border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 text-white/70 hover:text-white rounded-full bg-black/40 z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Top Gradient Banner matching image copy 6.png */}
        <div className="h-20 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-400 relative" />

        {/* Profile Card Body */}
        <div className="p-5 pt-0 relative">
          <div className="-mt-10 mb-3 flex justify-between items-end">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-midnight-accent to-purple-600 p-0.5 border-4 border-midnight-dark">
                <div className="w-full h-full rounded-full bg-midnight-dark flex items-center justify-center font-bold text-white text-lg">
                  {username[0]?.toUpperCase()}
                </div>
              </div>
              <div className="absolute bottom-1 right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-midnight-dark" />
            </div>

            <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[10px] text-midnight-muted flex items-center space-x-1">
              <Monitor className="w-3 h-3" />
              <span>Windows Desktop</span>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-lg font-bold text-white">{username}</h4>
            <span className="text-xs text-midnight-muted font-mono">#0001</span>
          </div>

          {/* E2EE Fingerprint Box */}
          <div className="p-3 bg-midnight-darkest border border-white/5 rounded-xl mb-4 space-y-1">
            <div className="flex items-center space-x-1.5 text-xs font-bold text-white">
              <Shield className="w-3.5 h-3.5 text-midnight-accent" />
              <span>Vodozemac E2EE Fingerprint</span>
            </div>
            <div className="font-mono text-[10px] text-emerald-400 tracking-widest pl-5 font-semibold">
              {fingerprint}
            </div>
          </div>

          {/* Direct Message Button matching image copy 6.png */}
          <button
            onClick={onDirectMessage}
            className="w-full py-2.5 bg-midnight-accent hover:bg-midnight-accentHover text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg shadow-midnight-accent/30 transition-all"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Direct Message</span>
          </button>
        </div>
      </div>
    </div>
  );
};
