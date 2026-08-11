import React, { useState } from 'react';
import { Lock, Mail, User as UserIcon, ShieldCheck } from 'lucide-react';
import { api, setAuthToken } from '../services/api';
import { User as UserType } from '../types';

interface AuthModalProps {
  onSuccess: (user: UserType) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await api.login({ email, password });
        setAuthToken(res.token);
        onSuccess(res.user);
      } else {
        const res = await api.register({ username, email, password });
        setAuthToken(res.token);
        onSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || (isLogin ? 'Giriş yapılırken hata oluştu' : 'Kayıt olunurken hata oluştu'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="w-full max-w-md bg-[#141724] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">
        
        {/* Top Tab Switcher: [ Giriş Yap | Kayıt Ol ] */}
        <div className="flex bg-[#0e111a] p-1.5 rounded-xl border border-white/5 mb-6">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              isLogin ? 'bg-[#6366f1] text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Giriş Yap
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              !isLogin ? 'bg-[#6366f1] text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Kayıt Ol
          </button>
        </div>

        {/* Header Icon & Title */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#6366f1] to-purple-600 p-0.5 flex items-center justify-center mb-3 shadow-xl shadow-indigo-500/30 overflow-hidden">
            <img src="/logo.png" alt="Pyrophorus" className="w-full h-full object-cover rounded-2xl" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-wide">
            {isLogin ? 'Pyrophorus\'a Hoş Geldin!' : 'Yeni Pyrophorus Hesabı Oluştur'}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {isLogin ? 'Seni yeniden aramızda gördüğümüze sevindik.' : 'Şifreli uçtan uca haberleşmeye hemen katıl.'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Kullanıcı Adı</label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0e111a] border border-white/10 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all"
                  placeholder="Kullanıcı adınız"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">E-Posta Adresi</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0e111a] border border-white/10 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all"
                placeholder="eposta@ornek.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase mb-1.5">Şifre</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-[#0e111a] border border-white/10 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-2 bg-[#6366f1] hover:bg-[#4f46e5] text-white font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition-all disabled:opacity-50 text-sm"
          >
            {loading ? 'İşleniyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-400">
          {isLogin ? 'Bir hesabın yok mu?' : 'Zaten bir hesabın var mı?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-[#6366f1] hover:underline font-bold ml-1"
          >
            {isLogin ? 'Kayıt Ol' : 'Giriş Yap'}
          </button>
        </div>
      </div>
    </div>
  );
};
