import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Shield, Bell, Keyboard, Palette, LogOut, X, Edit3, Lock, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/api';

interface SettingsModalProps {
  currentUser: User | null;
  onClose: () => void;
  onLogout: () => void;
  onUpdateUser?: (updated: User) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentUser,
  onClose,
  onLogout,
  onUpdateUser,
}) => {
  const [activeTab, setActiveTab] = useState<'account' | 'profiles' | 'privacy' | 'appearance'>('account');
  const [showEmail, setShowEmail] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<'midnight' | 'dark' | 'light'>('midnight');

  // Form states for editable fields
  const [username, setUsername] = useState(currentUser?.username || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [about, setAbout] = useState(currentUser?.about || 'Pyrophorus uçtan uca şifreli masaüstü iletişim uygulaması kullanıcısı.');

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);

  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const usernameInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const aboutTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentUser) {
      setUsername(currentUser.username || '');
      setEmail(currentUser.email || '');
      if (currentUser.about) setAbout(currentUser.about);
    }
  }, [currentUser]);

  useEffect(() => {
    if (isEditingUsername) usernameInputRef.current?.focus();
  }, [isEditingUsername]);

  useEffect(() => {
    if (isEditingEmail) emailInputRef.current?.focus();
  }, [isEditingEmail]);

  useEffect(() => {
    if (isEditingAbout) aboutTextareaRef.current?.focus();
  }, [isEditingAbout]);

  const handleSaveProfile = async (field: 'username' | 'email' | 'about') => {
    if (field === 'username' && (!username.trim() || username.trim().length < 2)) {
      setErrorMessage('Kullanıcı adı en az 2 karakter olmalıdır.');
      return;
    }
    if (field === 'email' && (!email.trim() || !email.includes('@'))) {
      setErrorMessage('Geçerli bir e-posta adresi giriniz.');
      return;
    }

    setSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const payload: { username?: string; email?: string; about?: string } = {};
      if (field === 'username') payload.username = username.trim();
      if (field === 'email') payload.email = email.trim();
      if (field === 'about') payload.about = about.trim();

      const updated = await api.updateProfile(payload);
      if (onUpdateUser) {
        onUpdateUser(updated);
      }
      setSuccessMessage('Profil bilginiz başarıyla güncellendi ve tüm kullanıcılara canlı yansıtıldı!');

      if (field === 'username') setIsEditingUsername(false);
      if (field === 'email') setIsEditingEmail(false);
      if (field === 'about') setIsEditingAbout(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Profil güncellenirken hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg p-6 select-none overflow-hidden">
      <div className="w-full max-w-5xl h-[88vh] bg-midnight-darkest border border-white/10 rounded-3xl flex overflow-hidden shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-midnight-muted hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors z-30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left Settings Navigation Bar */}
        <div className="w-64 bg-midnight-dark p-6 flex flex-col justify-between border-r border-white/[0.06] flex-shrink-0">
          <div>
            <div className="flex items-center space-x-3 mb-6 px-2">
              <div className="w-10 h-10 rounded-xl bg-midnight-accent/20 border border-midnight-accent/40 flex items-center justify-center text-midnight-accent">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-white text-sm truncate">Masaüstü Ayarları</span>
                <span className="text-xs text-midnight-muted truncate">{currentUser?.username || 'ProUser'}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <span className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider px-2 block mb-2">HESAP</span>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('account')}
                    className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'account' ? 'bg-midnight-hover text-white' : 'text-midnight-muted hover:bg-white/5'
                    }`}
                  >
                    <UserIcon className="w-4 h-4 mr-2.5" /> Hesabım
                  </button>
                  <button
                    onClick={() => setActiveTab('profiles')}
                    className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'profiles' ? 'bg-midnight-hover text-white' : 'text-midnight-muted hover:bg-white/5'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 mr-2.5" /> Profil Düzenle
                  </button>
                  <button
                    onClick={() => setActiveTab('privacy')}
                    className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'privacy' ? 'bg-midnight-hover text-white' : 'text-midnight-muted hover:bg-white/5'
                    }`}
                  >
                    <Shield className="w-4 h-4 mr-2.5" /> E2EE Şifreleme
                  </button>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider px-2 block mb-2">MASAÜSTÜ AYARLARI</span>
                <div className="space-y-1">
                  <button
                    onClick={() => setActiveTab('appearance')}
                    className={`w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      activeTab === 'appearance' ? 'bg-midnight-hover text-white' : 'text-midnight-muted hover:bg-white/5'
                    }`}
                  >
                    <Palette className="w-4 h-4 mr-2.5" /> Görünüm & Tema
                  </button>
                  <button className="w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-midnight-muted hover:bg-white/5 transition-all">
                    <Bell className="w-4 h-4 mr-2.5" /> Bildirimler
                  </button>
                  <button className="w-full flex items-center px-3 py-2 rounded-xl text-xs font-semibold text-midnight-muted hover:bg-white/5 transition-all">
                    <Keyboard className="w-4 h-4 mr-2.5" /> Kısayol Tuşları
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2.5" /> Çıkış Yap
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 min-w-0">
          <h2 className="text-xl font-bold text-white mb-4">Hesabım</h2>

          {/* Success / Error Alerts */}
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center space-x-2 animate-fade-in">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400 flex items-center space-x-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Profile Banner Card */}
          <div className="rounded-2xl bg-midnight-dark border border-white/10 overflow-hidden shadow-xl">
            <div className="h-32 bg-gradient-to-r from-purple-900 via-indigo-900 to-blue-900 relative p-4 flex items-center justify-center">
              <span className="font-extrabold text-2xl tracking-widest text-white/30 uppercase">KULLANICI AYARLARI</span>
            </div>

            <div className="p-6 pt-0 relative flex justify-between items-start gap-4">
              <div className="flex items-end space-x-4 -mt-12 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-midnight-accent to-purple-600 p-1 border-4 border-midnight-dark shadow-lg">
                    <div className="w-full h-full rounded-full bg-midnight-dark flex items-center justify-center font-bold text-white text-2xl">
                      {currentUser?.username?.[0]?.toUpperCase() || 'P'}
                    </div>
                  </div>
                </div>

                <div className="pb-2 min-w-0">
                  <h3 className="text-2xl font-bold text-white truncate">{currentUser?.username || 'ProUser'}</h3>
                  <span className="text-xs text-midnight-muted font-mono">#{currentUser?.user_tag || '1337'}</span>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-midnight-muted">Windows Desktop</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] text-emerald-400">E2EE Doğrulandı</span>
                  </div>
                </div>
              </div>

              {/* Hakkımda Quick View & Edit Card */}
              <div className="pt-4 flex flex-col items-end min-w-0 max-w-xs flex-1">
                <div className="bg-midnight-darkest border border-white/5 rounded-xl p-3.5 w-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold text-midnight-muted uppercase tracking-wider">HAKKIMDA</span>
                    {!isEditingAbout ? (
                      <button
                        onClick={() => setIsEditingAbout(true)}
                        className="text-[11px] text-midnight-accent hover:text-white transition-colors flex items-center font-semibold"
                      >
                        <Edit3 className="w-3 h-3 mr-1" /> Düzenle
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setAbout(currentUser?.about || '');
                            setIsEditingAbout(false);
                          }}
                          className="text-[10px] text-midnight-muted hover:text-white"
                        >
                          İptal
                        </button>
                        <button
                          onClick={() => handleSaveProfile('about')}
                          disabled={saving}
                          className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center font-bold"
                        >
                          <Check className="w-3 h-3 mr-1" /> Kaydet
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingAbout ? (
                    <textarea
                      ref={aboutTextareaRef}
                      rows={3}
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      className="w-full bg-midnight-dark border border-midnight-accent/60 rounded-lg p-2 text-xs text-white placeholder-midnight-muted focus:outline-none focus:ring-1 focus:ring-midnight-accent"
                      placeholder="Kendiniz hakkında bir şeyler yazın..."
                    />
                  ) : (
                    <p className="text-xs text-midnight-text leading-relaxed break-words">
                      {currentUser?.about || about}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information & Theme Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Personal Information List (Clean stacked card layout without overlapping) */}
            <div className="lg:col-span-2 rounded-2xl bg-midnight-dark border border-white/10 p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h4 className="text-sm font-bold text-white">Kişisel Bilgiler</h4>
                <span className="text-[10px] text-midnight-muted bg-white/5 px-2.5 py-1 rounded-md">
                  Canlı Senkronize Hesap Ayarları
                </span>
              </div>

              <div className="space-y-5">
                {/* 1. Kullanıcı Adı (Editable) */}
                <div className="bg-midnight-darkest/60 border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider flex items-center space-x-1.5">
                      <span>KULLANICI ADI</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-normal border border-emerald-500/20">
                        Değiştirilebilir
                      </span>
                    </label>

                    {!isEditingUsername ? (
                      <button
                        onClick={() => setIsEditingUsername(true)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg border border-white/10 transition-colors flex items-center shadow-sm"
                      >
                        <Edit3 className="w-3.5 h-3.5 mr-1.5 text-midnight-accent" /> Düzenle
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setUsername(currentUser?.username || '');
                            setIsEditingUsername(false);
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-midnight-muted hover:text-white text-xs font-semibold rounded-lg transition-colors"
                        >
                          İptal
                        </button>
                        <button
                          onClick={() => handleSaveProfile('username')}
                          disabled={saving}
                          className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center shadow-lg"
                        >
                          <Check className="w-3.5 h-3.5 mr-1.5" /> Kaydet
                        </button>
                      </div>
                    )}
                  </div>

                  <input
                    ref={usernameInputRef}
                    type="text"
                    disabled={!isEditingUsername}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isEditingUsername
                        ? 'bg-midnight-dark border-2 border-midnight-accent text-white focus:outline-none shadow-inner'
                        : 'bg-midnight-darkest border border-white/5 text-white/90 cursor-default'
                    }`}
                  />
                </div>

                {/* 2. E-Posta Adresi (Editable) */}
                <div className="bg-midnight-darkest/60 border border-white/5 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider flex items-center space-x-1.5">
                      <span>E-POSTA ADRESİ</span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-normal border border-emerald-500/20">
                        Değiştirilebilir
                      </span>
                    </label>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowEmail(!showEmail)}
                        className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-midnight-muted hover:text-white text-xs font-semibold rounded-lg border border-white/10 transition-colors flex items-center"
                        title={showEmail ? 'E-postayı Gizle' : 'E-postayı Göster'}
                      >
                        {showEmail ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                        {showEmail ? 'Gizle' : 'Göster'}
                      </button>

                      {!isEditingEmail ? (
                        <button
                          onClick={() => setIsEditingEmail(true)}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white text-xs font-semibold rounded-lg border border-white/10 transition-colors flex items-center shadow-sm"
                        >
                          <Edit3 className="w-3.5 h-3.5 mr-1.5 text-midnight-accent" /> Düzenle
                        </button>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setEmail(currentUser?.email || '');
                              setIsEditingEmail(false);
                            }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-midnight-muted hover:text-white text-xs font-semibold rounded-lg transition-colors"
                          >
                            İptal
                          </button>
                          <button
                            onClick={() => handleSaveProfile('email')}
                            disabled={saving}
                            className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-lg transition-colors flex items-center shadow-lg"
                          >
                            <Check className="w-3.5 h-3.5 mr-1.5" /> Kaydet
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <input
                    ref={emailInputRef}
                    type={showEmail ? 'text' : 'password'}
                    disabled={!isEditingEmail}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all ${
                      isEditingEmail
                        ? 'bg-midnight-dark border-2 border-midnight-accent text-white focus:outline-none shadow-inner'
                        : 'bg-midnight-darkest border border-white/5 text-white/90 cursor-default'
                    }`}
                  />
                </div>

                {/* 3. Kimlik / ID (Permanently Locked Field) */}
                <div className="bg-midnight-darkest/30 border border-white/5 rounded-xl p-4 space-y-2 opacity-70">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-midnight-muted uppercase tracking-wider flex items-center space-x-1.5">
                      <span>KİMLİK (ID)</span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[9px] font-semibold border border-amber-500/20 flex items-center">
                        <Lock className="w-2.5 h-2.5 mr-1" /> Kilitli
                      </span>
                    </label>
                  </div>

                  <input
                    type="text"
                    readOnly
                    disabled
                    value={currentUser?.id || ''}
                    className="w-full px-3.5 py-2.5 bg-midnight-darkest border border-white/5 rounded-lg text-xs font-mono text-midnight-muted cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Theme & E2EE Info Column */}
            <div className="space-y-6">
              {/* Theme Selector */}
              <div className="rounded-2xl bg-midnight-dark border border-white/10 p-6 space-y-3 shadow-xl">
                <h4 className="text-sm font-bold text-white flex items-center">
                  <Palette className="w-4 h-4 mr-2 text-midnight-accent" /> Tema Seçimi
                </h4>
                <div className="space-y-2">
                  <button
                    onClick={() => setSelectedTheme('midnight')}
                    className={`w-full p-3 rounded-xl border flex flex-col text-left transition-all ${
                      selectedTheme === 'midnight'
                        ? 'border-midnight-accent bg-midnight-accent/10 text-white'
                        : 'border-white/5 bg-midnight-darkest text-midnight-muted'
                    }`}
                  >
                    <span className="text-xs font-bold">Midnight</span>
                    <span className="text-[10px] opacity-70">Derin mor-gece teması</span>
                  </button>
                  <button
                    onClick={() => setSelectedTheme('dark')}
                    className={`w-full p-3 rounded-xl border flex flex-col text-left transition-all ${
                      selectedTheme === 'dark'
                        ? 'border-midnight-accent bg-midnight-accent/10 text-white'
                        : 'border-white/5 bg-midnight-darkest text-midnight-muted'
                    }`}
                  >
                    <span className="text-xs font-bold">Koyu Mod</span>
                    <span className="text-[10px] opacity-70">Standart koyu tema</span>
                  </button>
                </div>
              </div>

              {/* Windows PC E2EE Key Card (Locked Info) */}
              <div className="rounded-2xl bg-midnight-dark border border-white/10 p-6 space-y-3 shadow-xl">
                <h4 className="text-sm font-bold text-white flex items-center justify-between">
                  <span className="flex items-center">
                    <Shield className="w-4 h-4 mr-2 text-emerald-400" /> Vodozemac E2EE
                  </span>
                  <span title="Kilitli Güvenlik Anahtarı"><Lock className="w-3.5 h-3.5 text-amber-400" /></span>
                </h4>
                <div className="space-y-2 text-xs">
                  <div className="text-[11px] text-midnight-muted">
                    Metin mesajlarınız yerel Windows cihazınızda Vodozemac kütüphanesi ile şifrelenir.
                  </div>
                  <div className="p-2.5 bg-midnight-darkest rounded-lg border border-white/5 font-mono text-[10px] text-emerald-400 truncate flex items-center justify-between">
                    <span>ed25519: +K8uA...9fWz2</span>
                    <Lock className="w-3 h-3 text-midnight-muted" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
