import React, { useState } from 'react';
import { UserPlus, X, Copy, Check, Hash } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface AddFriendModalProps {
  currentUser: User | null;
  onClose: () => void;
  onFriendAdded: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ currentUser, onClose, onFriendAdded }) => {
  const [tagInput, setTagInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const myTag = currentUser?.user_tag || 'AA00A';

  const handleCopyTag = () => {
    navigator.clipboard.writeText(myTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const friend = await api.addFriend(tagInput.trim());
      setSuccessMsg(`${friend.username} (${friend.user_tag}) başarıyla arkadaş olarak eklendi!`);
      setTagInput('');
      onFriendAdded();
    } catch (err: any) {
      setErrorMsg(err.message || 'Kullanıcı bulunamadı');
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
            <UserPlus className="w-4 h-4 text-emerald-400" />
            <span>Arkadaş Ekle</span>
          </span>
          <X className="w-4 h-4 text-slate-400 hover:text-white cursor-pointer" onClick={onClose} />
        </div>

        <div className="p-6 space-y-6">
          {/* User's Own Unique Tag Card */}
          <div className="p-4 rounded-xl bg-[#0e111a] border border-white/10 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Sizin Benzersiz Kodunuz</span>
              <span className="text-base font-mono font-bold text-emerald-400 tracking-widest flex items-center space-x-1 mt-0.5">
                <Hash className="w-4 h-4" />
                <span>{myTag}</span>
              </span>
            </div>
            <button
              onClick={handleCopyTag}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center space-x-1.5 transition-all"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
            </button>
          </div>

          {/* Add Friend Input Form */}
          <form onSubmit={handleAddFriend} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">
                Arkadaşının Kodunu Gir (Örn: AB48Z)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value.replace('#', '').trim().toUpperCase())}
                  placeholder="AB48Z"
                  maxLength={10}
                  className="w-full px-4 py-3 bg-[#0e111a] border border-white/10 rounded-xl text-sm font-mono font-bold text-white uppercase placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            {errorMsg && <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>}
            {successMsg && <p className="text-xs text-emerald-400 font-semibold">{successMsg}</p>}

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full border border-white/20 text-xs font-semibold text-white hover:bg-white/5 transition-colors"
              >
                Kapat
              </button>
              <button
                type="submit"
                disabled={loading || !tagInput.trim()}
                className="px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all"
              >
                {loading ? 'Ekleniyor...' : 'Arkadaşlık İsteği Gönder'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
