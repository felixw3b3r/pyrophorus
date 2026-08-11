import React, { useState } from 'react';
import { X, Copy, Upload, Check } from 'lucide-react';
import { Server } from '../types';

interface ServerSettingsModalProps {
  server: Server | null;
  onClose: () => void;
}

export const ServerSettingsModal: React.FC<ServerSettingsModalProps> = ({ server, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [serverName, setServerName] = useState(server?.name || 'Project Aether');
  const [description, setDescription] = useState('The main development hub for Project Aether.');

  const inviteUrl = `https://pyrophorus.app/invite/${server?.id?.slice(0, 8) || 'x7Q9kVp'}`;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none">
      <div className="w-full max-w-xl bg-midnight-darkest border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Top Window Titlebar matching image copy 5.png */}
        <div className="h-10 bg-midnight-dark flex items-center justify-between px-4 border-b border-white/[0.06] text-xs font-mono text-midnight-muted">
          <span>Pyrophorus</span>
          <div className="flex items-center space-x-3">
            <span className="hover:text-white cursor-pointer">—</span>
            <span className="hover:text-white cursor-pointer">□</span>
            <X className="w-3.5 h-3.5 hover:text-white cursor-pointer" onClick={onClose} />
          </div>
        </div>

        {/* Modal Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-white/5">
          <h3 className="text-xl font-bold text-white">Server Settings</h3>
          <X className="w-5 h-5 text-midnight-muted hover:text-white cursor-pointer" onClick={onClose} />
        </div>

        {/* Modal Body matching image copy 5.png */}
        <div className="p-6 space-y-6">
          {/* Invite Link Section */}
          <div className="space-y-3">
            <span className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider block">INVITE LINK</span>
            <p className="text-xs text-midnight-muted">Share this link with others to grant them access to this server.</p>

            <div className="flex space-x-2">
              <div className="flex-1 bg-midnight-dark border border-white/10 rounded-lg px-3 py-2.5 font-mono text-xs text-white">
                <div className="text-[9px] text-midnight-muted uppercase">URL</div>
                <div className="truncate">{inviteUrl}</div>
              </div>
              <button
                onClick={handleCopy}
                className="px-5 bg-midnight-accent hover:bg-midnight-accentHover text-white text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-lg shadow-midnight-accent/20 transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-xs text-midnight-muted font-mono">Expires in: <span className="text-white">24 Hours ˇ</span></div>
          </div>

          <div className="h-[1px] bg-white/5" />

          {/* Server Profile Section */}
          <div className="space-y-4">
            <span className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider block">SERVER PROFILE</span>
            <p className="text-xs text-midnight-muted">Update the visual identity of your community.</p>

            <div className="flex space-x-4 items-start">
              <div className="w-24 h-24 rounded-2xl bg-midnight-dark border-2 border-dashed border-white/20 flex flex-col items-center justify-center text-midnight-muted hover:border-midnight-accent cursor-pointer transition-colors p-2 text-center">
                <Upload className="w-6 h-6 mb-1 text-midnight-accent" />
                <span className="text-[10px] font-bold text-white">Upload Icon</span>
                <span className="text-[8px] text-midnight-muted mt-0.5">Max 2MB (PNG, JPG)</span>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-midnight-muted uppercase mb-1">SERVER NAME</label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-midnight-dark border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-midnight-accent"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-midnight-muted uppercase mb-1">DESCRIPTION (OPTIONAL)</label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-midnight-dark border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-midnight-accent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/10 flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-midnight-text hover:underline"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-midnight-accent hover:bg-midnight-accentHover text-white text-xs font-bold rounded-lg shadow-lg shadow-midnight-accent/20 transition-all"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
