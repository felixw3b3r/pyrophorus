import React, { useState, useEffect } from 'react';
import { Hash, Volume2, Plus, Mic, Headphones, Settings, ChevronDown, UserPlus, PhoneOff, Music } from 'lucide-react';
import { Channel, Server, User } from '../types';
import { api } from '../services/api';
import { InviteModal } from './InviteModal';

interface ChannelListProps {
  server: Server | null;
  channels: Channel[];
  activeChannelId: string | null;
  connectedVoiceChannel?: Channel | null;
  currentUser: User | null;
  onSelectChannel: (id: string) => void;
  onCreateChannel: (name: string, type: 'text' | 'voice') => void;
  onOpenSettings: () => void;
  onDisconnectVoice?: () => void;
}

export const ChannelList: React.FC<ChannelListProps> = ({
  server,
  channels,
  activeChannelId,
  connectedVoiceChannel,
  currentUser,
  onSelectChannel,
  onCreateChannel,
  onOpenSettings,
  onDisconnectVoice,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelType, setChannelType] = useState<'text' | 'voice'>('text');
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    if (server) {
      api.getServerMembers(server.id).then(setMembers).catch(console.error);
    } else {
      setMembers([]);
    }
  }, [server]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (channelName.trim()) {
      onCreateChannel(channelName.trim(), channelType);
      setChannelName('');
      setShowModal(false);
    }
  };

  const musicChannels = channels.filter((c) => c.channel_type === 'music');
  const textChannels = channels.filter((c) => c.channel_type === 'text');
  const voiceChannels = channels.filter((c) => c.channel_type === 'voice');

  return (
    <div className="w-64 bg-midnight-dark flex flex-col h-full select-none border-r border-white/[0.06] relative">
      {showInviteModal && (
        <InviteModal
          server={server}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Server Header */}
      <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4 font-bold text-white hover:bg-white/[0.02] cursor-pointer transition-colors">
        <div className="flex flex-col min-w-0">
          <span className="truncate text-sm tracking-wide">{server ? server.name : 'Topluluk'}</span>
          <span className="text-[11px] font-normal text-emerald-400">
            {server ? `${members.length} Üye` : 'Çevrimiçi Topluluk'}
          </span>
        </div>
        {server && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowInviteModal(true);
            }}
            className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow"
            title="Sunucuya Arkadaş Davet Et"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Channels List */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {server ? (
          <>
            {/* Text Channels Section */}
            <div>
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-midnight-muted uppercase tracking-wider mb-1.5">
                <span>TEXT CHANNELS</span>
                <button
                  onClick={() => {
                    setChannelType('text');
                    setShowModal(true);
                  }}
                  className="hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-0.5">
                {textChannels.map((channel) => {
                  const isActive = activeChannelId === channel.id;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel.id)}
                      className={`w-full flex items-center px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-midnight-hover text-white shadow-sm'
                          : 'text-midnight-muted hover:bg-white/[0.03] hover:text-midnight-text'
                      }`}
                    >
                      <Hash className="w-4 h-4 mr-2.5 text-midnight-muted" />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Voice Channels Section */}
            <div>
              <div className="flex items-center justify-between px-2 text-[11px] font-bold text-midnight-muted uppercase tracking-wider mb-1.5">
                <span>VOICE CHANNELS</span>
                <button
                  onClick={() => {
                    setChannelType('voice');
                    setShowModal(true);
                  }}
                  className="hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-0.5">
                {voiceChannels.map((channel) => {
                  const isActive = activeChannelId === channel.id;
                  return (
                    <button
                      key={channel.id}
                      onClick={() => onSelectChannel(channel.id)}
                      className={`w-full flex items-center px-2.5 py-2 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-midnight-hover text-white shadow-sm'
                          : 'text-midnight-muted hover:bg-white/[0.03] hover:text-midnight-text'
                      }`}
                    >
                      <Volume2 className="w-4 h-4 mr-2.5 text-midnight-muted" />
                      <span className="truncate">{channel.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="px-3 py-2 text-xs text-midnight-muted">
            Sol taraftan bir sunucu seçin.
          </div>
        )}
      </div>

      {/* Voice Connected Status Bar (RTC Bar) */}
      {connectedVoiceChannel && (
        <div className="bg-[#0e111a] border-t border-white/[0.06] p-2.5 px-3 flex items-center justify-between shadow-md">
          <div
            onClick={() => onSelectChannel(connectedVoiceChannel.id)}
            className="flex flex-col min-w-0 cursor-pointer group"
          >
            <div className="flex items-center space-x-1.5 text-[11px] font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>RTC Bağlandı</span>
            </div>
            <span className="text-xs font-bold text-white truncate group-hover:underline flex items-center mt-0.5">
              <Volume2 className="w-3.5 h-3.5 mr-1 text-emerald-400 flex-shrink-0" />
              <span className="truncate">{connectedVoiceChannel.name}</span>
            </span>
          </div>

          {onDisconnectVoice && (
            <button
              onClick={onDisconnectVoice}
              className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-all shadow"
              title="Sesli Kanal Bağlantısını Kes"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* User Profile Footer */}
      <div className="h-16 bg-midnight-darkest/90 flex items-center justify-between px-3 border-t border-white/[0.06]">
        <div className="flex items-center space-x-2.5 min-w-0 cursor-pointer" onClick={onOpenSettings}>
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-midnight-accent to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow">
              {currentUser?.username?.[0]?.toUpperCase() || 'P'}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-midnight-darkest" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-bold text-white truncate">{currentUser?.username || 'Kullanıcı'}</span>
            <span className="text-[10px] text-emerald-400 font-medium truncate">Online</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${isMuted ? 'text-red-400' : 'text-midnight-muted hover:text-white'}`}
          >
            <Mic className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDeafened(!isDeafened)}
            className={`p-1.5 rounded-md hover:bg-white/10 transition-colors ${isDeafened ? 'text-red-400' : 'text-midnight-muted hover:text-white'}`}
          >
            <Headphones className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-md hover:bg-white/10 text-midnight-muted hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-sm bg-midnight-dark border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Kanal Oluştur</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-midnight-muted uppercase mb-1">KANAL ADI</label>
                <input
                  type="text"
                  required
                  value={channelName}
                  onChange={(e) => setChannelName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-midnight-darkest border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-midnight-accent"
                  placeholder="general-chat"
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
