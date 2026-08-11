import React, { useState, useEffect } from 'react';
import { Users, Search, UserPlus, MessageSquare, Inbox, HelpCircle, Headphones, Mic, Settings, Hash, Check, X, Shield, UserMinus } from 'lucide-react';
import { ServerInvite, User } from '../types';
import { api } from '../services/api';
import { AddFriendModal } from './AddFriendModal';

interface FriendsViewProps {
  currentUser: User | null;
  onlineUserIds?: Set<string>;
  onOpenDM: (friend: User) => void;
  onOpenSettings: () => void;
  onServerJoined?: () => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({
  currentUser,
  onlineUserIds = new Set(),
  onOpenDM,
  onOpenSettings,
  onServerJoined,
}) => {
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'blocked'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [pendingInvites, setPendingInvites] = useState<ServerInvite[]>([]);
  const [showAddFriendModal, setShowAddFriendModal] = useState(false);

  const loadData = () => {
    api.getFriends().then(setFriends).catch(console.error);
    api.getPendingInvites().then(setPendingInvites).catch(console.error);
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('dc_refresh_data', handleRefresh);
    const interval = setInterval(loadData, 3000);
    return () => {
      window.removeEventListener('dc_refresh_data', handleRefresh);
      clearInterval(interval);
    };
  }, []);

  const handleRespondInvite = async (inviteId: string, accept: boolean) => {
    try {
      await api.respondServerInvite(inviteId, accept);
      loadData();
      if (accept && onServerJoined) {
        onServerJoined();
      }
    } catch (err) {
      console.error('Failed to respond to invite:', err);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await api.removeFriend(friendId);
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (err) {
      console.error('Failed to remove friend:', err);
    }
  };

  const onlineFriends = friends.filter((f) => onlineUserIds.has(f.id));

  const baseList = activeTab === 'online' ? onlineFriends : friends;
  const filteredFriends = baseList.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (f.user_tag && f.user_tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex-1 flex h-full bg-midnight-darkest select-none overflow-hidden relative">
      {showAddFriendModal && (
        <AddFriendModal
          currentUser={currentUser}
          onClose={() => setShowAddFriendModal(false)}
          onFriendAdded={() => {
            loadData();
          }}
        />
      )}

      {/* Middle Direct Messages Panel */}
      <div className="w-64 bg-midnight-dark border-r border-white/[0.06] flex flex-col justify-between h-full">
        <div className="p-3 space-y-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Sohbet ara veya başlat"
              className="w-full px-3 py-2 bg-midnight-darkest border border-white/5 rounded-lg text-xs text-white placeholder-midnight-muted focus:outline-none"
            />
          </div>

          <div>
            <span className="text-[10px] font-bold text-midnight-muted uppercase tracking-wider px-2 block mb-2">DİREKT MESAJLAR</span>
            {friends.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-midnight-muted">
                Henüz mesaj geçmişi yok.
              </div>
            ) : (
              <div className="space-y-1">
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => onOpenDM(friend)}
                    className="w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-left transition-all text-midnight-muted hover:bg-white/5 hover:text-white"
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                        {friend.username[0].toUpperCase()}
                      </div>
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-midnight-dark" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-semibold text-white truncate">{friend.username}</span>
                      <span className="text-[10px] text-emerald-400 font-mono flex items-center">
                        <Hash className="w-2.5 h-2.5 mr-0.5" />
                        {friend.user_tag || 'AB89X'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Footer */}
        <div className="h-16 bg-midnight-darkest/90 flex items-center justify-between px-3 border-t border-white/[0.06]">
          <div className="flex items-center space-x-2.5 min-w-0 cursor-pointer" onClick={onOpenSettings}>
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                {currentUser?.username?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-midnight-darkest" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{currentUser?.username || 'Kullanıcı'}</span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center">
                <Hash className="w-2.5 h-2.5 mr-0.5" />
                {currentUser?.user_tag || 'AA00A'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Mic className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
            <Headphones className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
            <Settings className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" onClick={onOpenSettings} />
          </div>
        </div>
      </div>

      {/* Main Friends Roster */}
      <div className="flex-1 flex flex-col h-full bg-midnight-darkest overflow-hidden">
        {/* Top Friends Nav Tabs */}
        <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-6 bg-midnight-darkest z-10">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-white font-bold text-sm mr-2">
              <Users className="w-5 h-5 text-midnight-muted" />
              <span>Arkadaşlar</span>
            </div>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'all' ? 'bg-midnight-hover text-white' : 'text-midnight-muted hover:bg-white/5'
              }`}
            >
              Hepsi ({friends.length})
            </button>
            <button
              onClick={() => setActiveTab('online')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'online' ? 'bg-midnight-hover text-white' : 'text-midnight-muted hover:bg-white/5'
              }`}
            >
              Çevrimiçi ({onlineFriends.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                activeTab === 'pending' ? 'bg-midnight-hover text-white' : 'text-midnight-muted hover:bg-white/5'
              }`}
            >
              <span>Bekleyen İstekler</span>
              {pendingInvites.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {pendingInvites.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'blocked' ? 'bg-midnight-hover text-white' : 'text-midnight-muted hover:bg-white/5'
              }`}
            >
              Engellenenler
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowAddFriendModal(true)}
              className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Arkadaş Ekle</span>
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <MessageSquare className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
            <Inbox className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
            <HelpCircle className="w-4 h-4 text-midnight-muted hover:text-white cursor-pointer" />
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {activeTab === 'pending' ? (
            <div>
              <span className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider block mb-4">
                GELEN SUNUCU DAVETLERİ — {pendingInvites.length}
              </span>
              {pendingInvites.length === 0 ? (
                <div className="text-center py-16 text-xs text-midnight-muted">
                  Bekleyen sunucu davetiniz bulunmuyor.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="p-4 rounded-2xl bg-midnight-dark border border-white/5 flex items-center justify-between shadow-md"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                          <Shield className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{invite.server_name}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Davet Eden: <span className="font-semibold text-emerald-400">{invite.inviter_name}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRespondInvite(invite.id, true)}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1 shadow-lg shadow-emerald-500/20 transition-all"
                        >
                          <Check className="w-4 h-4" />
                          <span>Kabul Et</span>
                        </button>
                        <button
                          onClick={() => handleRespondInvite(invite.id, false)}
                          className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-xs font-bold flex items-center space-x-1 transition-all"
                        >
                          <X className="w-4 h-4" />
                          <span>Reddet</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Arkadaş ara..."
                  className="w-full px-4 py-2.5 bg-midnight-dark border border-white/5 rounded-xl text-xs text-white placeholder-midnight-muted focus:outline-none"
                />
                <Search className="w-4 h-4 text-midnight-muted absolute right-3.5 top-3" />
              </div>

              {filteredFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center pt-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4 text-midnight-muted">
                    <Users className="w-10 h-10" />
                  </div>
                  <h3 className="font-bold text-white text-base mb-1">Henüz Arkadaş Eklenmedi</h3>
                  <p className="text-xs text-midnight-muted max-w-sm mb-4">
                    "Arkadaş Ekle" butonuna tıklayıp arkadaşınızın 5 haneli kodunu girerek istek gönderebilirsiniz.
                  </p>
                  <button
                    onClick={() => setShowAddFriendModal(true)}
                    className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-full shadow-lg shadow-emerald-500/20 transition-all flex items-center space-x-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Arkadaş Kodu Gir</span>
                  </button>
                </div>
              ) : (
                <div>
                  <span className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider block mb-3">
                    ARKADAŞLAR — {filteredFriends.length}
                  </span>
                  <div className="space-y-3">
                    {filteredFriends.map((friend) => {
                      const isOnline = onlineUserIds.has(friend.id);

                      return (
                        <div
                          key={friend.id}
                          className="p-4 rounded-2xl bg-midnight-dark border border-white/5 flex items-center justify-between hover:bg-midnight-hover/60 transition-all shadow-md group cursor-pointer"
                          onClick={() => onOpenDM(friend)}
                        >
                          <div className="flex items-center space-x-4">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-lg">
                                {friend.username[0].toUpperCase()}
                              </div>
                              <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-midnight-dark ${
                                isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                              }`} />
                            </div>
                            <div>
                              <h4 className="font-bold text-white text-sm flex items-center space-x-2">
                                <span>{friend.username}</span>
                                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                                  #{friend.user_tag || 'AB89X'}
                                </span>
                              </h4>
                              <p className={`text-xs flex items-center mt-0.5 ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                                <span className={`w-2 h-2 rounded-full mr-1.5 ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                                <span>{isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenDM(friend);
                              }}
                              className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-lg shadow-emerald-500/30"
                              title="Özel Mesajlaşmayı Başlat"
                            >
                              <MessageSquare className="w-5 h-5" />
                            </button>

                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm(`${friend.username} kullanıcısını arkadaş listenizden çıkarmak istediğinize emin misiniz?`)) {
                                  await handleRemoveFriend(friend.id);
                                }
                              }}
                              className="p-3 rounded-full bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 transition-all"
                              title="Arkadaşlıktan Çıkar"
                            >
                              <UserMinus className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
