import React, { useState, useEffect, useRef } from 'react';
import { Hash, Search, Bell, Pin, Users, HelpCircle, Plus, Gift, FileText, Smile, Image as ImageIcon, Send } from 'lucide-react';
import { Channel, Message, User } from '../types';

interface ChatViewProps {
  channel: Channel | null;
  messages: Message[];
  currentUser: User | null;
  onSendMessage: (text: string) => void;
  onToggleMembers: () => void;
}

export const ChatView: React.FC<ChatViewProps> = ({
  channel,
  messages,
  currentUser,
  onSendMessage,
  onToggleMembers,
}) => {
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() && channel) {
      onSendMessage(text.trim());
      setText('');
    }
  };

  if (!channel) {
    return (
      <div className="flex-1 bg-midnight-darkest flex flex-col items-center justify-center text-midnight-muted p-8 select-none">
        <div className="w-20 h-20 rounded-3xl bg-midnight-accent/10 border border-midnight-accent/20 flex items-center justify-center mb-4">
          <Hash className="w-10 h-10 text-midnight-accent" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">Hoş Geldiniz!</h3>
        <p className="text-sm text-center max-w-sm text-midnight-muted">
          Sohbet etmeye başlamak için sol panelden bir kanal seçin. Tüm mesajlarınız uçtan uca şifrelenir.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-midnight-darkest flex flex-col h-full overflow-hidden select-none">
      {/* Top Header Bar matching exampleul mockup */}
      <div className="h-14 border-b border-white/[0.06] flex items-center justify-between px-4 bg-midnight-darkest z-10">
        <div className="flex items-center space-x-3 min-w-0">
          <Hash className="w-5 h-5 text-midnight-muted" />
          <span className="font-bold text-white text-sm tracking-wide truncate">{channel.name}</span>
          <div className="w-[1px] h-4 bg-white/10" />
          <span className="text-xs text-midnight-muted truncate hidden sm:inline">
            General discussion and daily chatter.
          </span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="w-36 lg:w-48 pl-3 pr-8 py-1 bg-midnight-dark border border-white/5 rounded-md text-xs text-white placeholder-midnight-muted focus:outline-none focus:w-56 transition-all"
            />
            <Search className="w-3.5 h-3.5 text-midnight-muted absolute right-2.5 top-2" />
          </div>

          <button className="text-midnight-muted hover:text-white transition-colors">
            <Bell className="w-4 h-4" />
          </button>
          <button className="text-midnight-muted hover:text-white transition-colors">
            <Pin className="w-4 h-4" />
          </button>
          <button onClick={onToggleMembers} className="text-midnight-muted hover:text-white transition-colors">
            <Users className="w-4 h-4" />
          </button>
          <button className="text-midnight-muted hover:text-white transition-colors">
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Feed matching exampleul mockup */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Welcome Banner */}
        <div className="pt-8 pb-4">
          <div className="w-16 h-16 rounded-3xl bg-midnight-panel border border-white/10 flex items-center justify-center mb-4 shadow-lg">
            <Hash className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">#{channel.name} kanalına hoş geldiniz!</h2>
          <p className="text-sm text-midnight-muted mt-1">Bu, #{channel.name} kanalının başlangıcıdır.</p>
          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-white/10" />
            <span className="px-3 text-[11px] font-bold text-midnight-muted uppercase">
              {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
            <div className="flex-1 h-[1px] bg-white/10" />
          </div>
        </div>

        {/* Message Items */}
        {messages.map((msg) => {
          const isMe = msg.sender_id === currentUser?.id;
          const dateStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const isCodeBlock = msg.ciphertext.includes('.glass-panel') || msg.ciphertext.includes('function') || msg.ciphertext.includes('{');

          return (
            <div key={msg.id} className="flex items-start space-x-3.5 group hover:bg-white/[0.015] -mx-6 px-6 py-1.5 rounded-lg transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-midnight-accent to-purple-600 flex items-center justify-center font-bold text-white text-sm shadow">
                {msg.sender_name?.[0]?.toUpperCase() || 'C'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`font-bold text-sm ${isMe ? 'text-midnight-accent' : 'text-white'}`}>
                    {msg.sender_name}
                  </span>
                  {msg.sender_name === 'NeoCoder' && (
                    <span className="px-1.5 py-0.5 rounded bg-midnight-accent/20 border border-midnight-accent/40 text-[10px] font-semibold text-midnight-accent">
                      Admin
                    </span>
                  )}
                  <span className="text-[10px] text-midnight-muted">{dateStr}</span>
                </div>

                {/* Plaintext or Code Block Rendering */}
                {isCodeBlock ? (
                  <div className="mt-2 glass-panel p-4 rounded-xl text-xs font-mono text-indigo-200 overflow-x-auto">
                    <pre>{msg.decryptedText || msg.ciphertext}</pre>
                  </div>
                ) : (
                  <p className="text-sm text-midnight-text leading-relaxed mt-1 break-words">
                    {msg.decryptedText || msg.ciphertext}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Bar matching exampleul mockup */}
      <div className="px-6 pb-6 pt-2 bg-midnight-darkest">
        <form onSubmit={handleSubmit} className="relative flex items-center bg-midnight-dark border border-white/10 rounded-2xl p-1.5 shadow-xl">
          <button
            type="button"
            className="p-2 text-midnight-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors ml-1"
          >
            <Plus className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1 bg-transparent px-3 py-2 text-sm text-white placeholder-midnight-muted focus:outline-none"
            placeholder={`Message #${channel.name}`}
          />

          <div className="flex items-center space-x-1 pr-1">
            <button type="button" className="p-2 text-midnight-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors">
              <Gift className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 text-midnight-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors">
              <FileText className="w-4 h-4" />
            </button>
            <button type="button" className="p-2 text-midnight-muted hover:text-white rounded-xl hover:bg-white/5 transition-colors">
              <Smile className="w-4 h-4" />
            </button>
            <button
              type="submit"
              disabled={!text.trim()}
              className="p-2.5 bg-midnight-accent hover:bg-midnight-accentHover text-white rounded-xl transition-all disabled:opacity-20 shadow-md shadow-midnight-accent/20"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
