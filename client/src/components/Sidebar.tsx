import React, { useState } from 'react';
import { Home, Gamepad2, Tv, Palette, Music, Plus, ShieldCheck } from 'lucide-react';
import { Server, User } from '../types';

interface SidebarProps {
  servers: Server[];
  activeServerId: string | null;
  currentUser: User | null;
  onSelectServer: (id: string | null) => void;
  onCreateServer: (name: string) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  servers,
  activeServerId,
  currentUser,
  onSelectServer,
  onCreateServer,
  onOpenSettings,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [serverName, setServerName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (serverName.trim()) {
      onCreateServer(serverName.trim());
      setServerName('');
      setShowModal(false);
    }
  };

  return (
    <div className="w-[72px] bg-midnight-rail flex flex-col items-center justify-between py-4 border-r border-white/[0.06] z-20 select-none">
      {/* Top Icons */}
      <div className="flex flex-col items-center space-y-3 w-full">
        {/* Home Button */}
        <button
          onClick={() => onSelectServer(null)}
          className={`relative group w-12 h-12 rounded-2xl transition-all duration-200 flex items-center justify-center p-1 overflow-hidden ${
            activeServerId === null
              ? 'bg-midnight-accent shadow-lg shadow-midnight-accent/30 ring-2 ring-indigo-500'
              : 'bg-white/[0.04] hover:bg-midnight-accent'
          }`}
        >
          <img src="/logo.png" alt="Pyrophorus Logo" className="w-full h-full object-cover rounded-xl" />
          <span className="absolute left-[80px] bg-black/90 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
            Pyrophorus Ana Sayfa
          </span>
        </button>

        {/* Static Feature Icons matching exampleul UI */}
        <button className="w-12 h-12 rounded-2xl bg-white/[0.04] text-midnight-muted hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center justify-center">
          <Gamepad2 className="w-5 h-5" />
        </button>
        <button className="w-12 h-12 rounded-2xl bg-white/[0.04] text-midnight-muted hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center justify-center">
          <Tv className="w-5 h-5" />
        </button>
        <button className="w-12 h-12 rounded-2xl bg-white/[0.04] text-midnight-muted hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center justify-center">
          <Palette className="w-5 h-5" />
        </button>
        <button className="w-12 h-12 rounded-2xl bg-white/[0.04] text-midnight-muted hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center justify-center">
          <Music className="w-5 h-5" />
        </button>

        <div className="w-8 h-[1px] bg-white/10 my-1" />

        {/* Server Icons List */}
        <div className="w-full space-y-2 max-h-[30vh] overflow-y-auto flex flex-col items-center">
          {servers.map((server) => {
            const isActive = activeServerId === server.id;
            const initials = server.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2);

            return (
              <button
                key={server.id}
                onClick={() => onSelectServer(server.id)}
                className={`relative group w-12 h-12 rounded-2xl transition-all duration-200 flex items-center justify-center font-bold text-sm ${
                  isActive
                    ? 'bg-midnight-accent text-white shadow-lg shadow-midnight-accent/30'
                    : 'bg-white/[0.04] text-midnight-text hover:bg-midnight-accent hover:text-white'
                }`}
              >
                {initials}
                <span className="absolute left-[80px] bg-black/90 text-white text-xs font-semibold px-2.5 py-1.5 rounded-md shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                  {server.name}
                </span>
              </button>
            );
          })}

          {/* Plus Add Server Button */}
          <button
            onClick={() => setShowModal(true)}
            className="w-12 h-12 rounded-2xl bg-white/[0.04] text-midnight-muted hover:bg-midnight-green hover:text-white transition-all duration-200 flex items-center justify-center"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom User Avatar */}
      <button
        onClick={onOpenSettings}
        className="relative group w-10 h-10 rounded-full bg-gradient-to-tr from-midnight-accent to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-lg hover:scale-105 transition-transform"
      >
        {currentUser?.username?.[0]?.toUpperCase() || 'U'}
        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-midnight-rail" />
      </button>

      {/* Create Server Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-midnight-dark border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white text-center mb-1">Sunucunu Oluştur</h3>
            <p className="text-xs text-midnight-muted text-center mb-5">Sunucun, arkadaşlarınla takılacağın yerdir.</p>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-midnight-muted uppercase mb-1">SUNUCU ADI</label>
                <input
                  type="text"
                  required
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-midnight-darkest border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-midnight-accent"
                  placeholder="Dev Community"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-midnight-text hover:underline"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-midnight-accent hover:bg-midnight-accentHover text-white text-xs font-semibold rounded-lg shadow-lg shadow-midnight-accent/20 transition-all"
                >
                  Oluştur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
