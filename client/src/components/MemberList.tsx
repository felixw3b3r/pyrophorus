import React, { useState, useEffect } from 'react';
import { Shield, Hash } from 'lucide-react';
import { Server, User } from '../types';
import { api } from '../services/api';

interface MemberListProps {
  server: Server | null;
  currentUser: User | null;
}

export const MemberList: React.FC<MemberListProps> = ({ server, currentUser }) => {
  const [members, setMembers] = useState<User[]>([]);

  useEffect(() => {
    if (server) {
      api.getServerMembers(server.id)
        .then(setMembers)
        .catch(console.error);
    } else {
      setMembers([]);
    }
  }, [server]);

  if (!server) return null;

  return (
    <div className="w-60 bg-discord-dark flex flex-col h-full border-l border-white/5 p-4 select-none">
      <div className="text-xs font-semibold text-discord-muted uppercase mb-3 tracking-wider">
        SUNUCU ÜYELERİ — {members.length}
      </div>
      <div className="space-y-1 overflow-y-auto">
        {members.map((member) => {
          const isOwner = member.id === server.owner_id;
          return (
            <div
              key={member.id}
              className="flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-discord-hover/50 transition-all group"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow">
                    {member.username[0].toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-discord-green border-2 border-discord-dark" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate flex items-center space-x-1">
                    <span>{member.username}</span>
                    {isOwner && <Shield className="w-3 h-3 text-amber-400 fill-amber-400/20" />}
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono flex items-center">
                    <Hash className="w-2.5 h-2.5 mr-0.5" />
                    {member.user_tag || 'AB89X'}
                  </span>
                </div>
              </div>

              {isOwner && (
                <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
                  Kurucu
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
