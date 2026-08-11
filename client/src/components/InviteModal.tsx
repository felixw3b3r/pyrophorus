import React, { useState, useEffect } from 'react';
import { UserPlus, X, Hash, Send, Check } from 'lucide-react';
import { Server, User } from '../types';
import { api } from '../services/api';

interface InviteModalProps {
  server: Server | null;
  onClose: () => void;
}

export const InviteModal: React.FC<InviteModalProps> = ({ server, onClose }) => {
  const [tagInput, setTagInput] = useState('');
  const [friends, setFriends] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [invitedTags, setInvitedTags] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    api.getFriends().then(setFriends).catch(console.error);
  }, []);

  const handleSendInvite = async (tagToSend: string) => {
    if (!server || !tagToSend.trim()) return;
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.sendServerInvite(server.id, tagToSend.trim());
      setInvitedTags((prev) => new Set(prev).add(tagToSend.toUpperCase()));
      setSuccessMsg(`"${server.name}" sunucusuna davet gönderildi!`);
      setTagInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Davet gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 select-none">
      <div className="w-full max-w-md bg-[#141724] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="h-12 bg-[#0e111a] flex items-center justify-between px-5 border-b border-white/[0.06]">
          <span className="font-bold text-sm text-white flex items-center space-x-2">
            <UserPlus className="w-4 h-4 text-indigo-400" />
            <span>{server?.name || 'Sunucuya'} Arkadaş Davet Et</span>
          </span>
          <X className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" onClick={onClose} />
        </div>

        <div className="p-6 space-y-6">
          {/* Invite Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendInvite(tagInput);
            }}
            className="space-y-3"
          >
            <label className="block text-xs font-semibold text-slate-300 uppercase">
              Arkadaşının Kodunu Gir (Örn: AB48Z)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value.replace('#', '').trim().toUpperCase())}
                placeholder="AB48Z"
                maxLength={10}
                className="flex-1 px-4 py-2.5 bg-[#0e111a] border border-white/10 rounded-xl text-sm font-mono font-bold text-white uppercase placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || !tagInput.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all flex items-center space-x-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Gönder</span>
              </button>
            </div>
          </form>

          {errorMsg && <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>}
          {successMsg && <p className="text-xs text-emerald-400 font-semibold">{successMsg}</p>}

          {/* Quick Select From Friends Roster */}
          <div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
              ARKADAŞ LİSTENDEN HIZLI DAVET ET
            </span>
            {friends.length === 0 ? (
              <div className="text-center py-4 text-xs text-slate-400">Henüz arkadaş eklenmedi.</div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {friends.map((friend) => {
                  const isInvited = invitedTags.has((friend.user_tag || '').toUpperCase());
                  return (
                    <div
                      key={friend.id}
                      className="p-3 rounded-xl bg-[#0e111a] border border-white/5 flex items-center justify-between hover:bg-white/5 transition-all"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                          {friend.username[0].toUpperCase()}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">{friend.username}</span>
                          <span className="text-[10px] text-emerald-400 font-mono flex items-center">
                            <Hash className="w-2.5 h-2.5 mr-0.5" />
                            {friend.user_tag}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendInvite(friend.user_tag || '')}
                        disabled={isInvited || loading}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 ${
                          isInvited
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
                        }`}
                      >
                        {isInvited ? <Check className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{isInvited ? 'Gönderildi' : 'Davet Et'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
