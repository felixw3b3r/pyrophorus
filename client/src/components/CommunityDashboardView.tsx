import React from 'react';
import { Layers, Compass, Plus, Zap, Activity, Clock, Upload, UserPlus } from 'lucide-react';
import { Server } from '../types';

interface CommunityDashboardViewProps {
  onSelectExplore: () => void;
  onCreateServer: () => void;
}

export const CommunityDashboardView: React.FC<CommunityDashboardViewProps> = ({
  onSelectExplore,
  onCreateServer,
}) => {
  return (
    <div className="flex-1 flex h-full bg-midnight-darkest select-none overflow-hidden">
      {/* Middle DISCOVER Panel matching image copy 7.png */}
      <div className="w-64 bg-midnight-dark border-r border-white/[0.06] flex flex-col justify-between h-full">
        <div className="p-3 space-y-4">
          <div className="h-10 border-b border-white/[0.06] flex items-center justify-between px-2 font-bold text-white text-xs">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="truncate">Pyrophorus Dev...</span>
            </div>
            <span className="text-midnight-muted">ˇ</span>
          </div>

          <div>
            <span className="text-[10px] font-bold text-midnight-muted uppercase tracking-wider px-2 block mb-2">DISCOVER</span>
            <div className="space-y-1">
              <button className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-midnight-accent text-white font-bold text-xs shadow-lg shadow-midnight-accent/20">
                <Layers className="w-4 h-4" />
                <span>Servers</span>
              </button>
              <button
                onClick={onSelectExplore}
                className="w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-midnight-muted hover:bg-white/5 hover:text-white font-semibold text-xs transition-all"
              >
                <Compass className="w-4 h-4" />
                <span>Explore</span>
              </button>
              <button
                onClick={onCreateServer}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl border border-white/10 text-midnight-text hover:bg-white/5 font-semibold text-xs transition-all mt-3"
              >
                <Plus className="w-4 h-4" />
                <span>Create Server</span>
              </button>
            </div>
          </div>
        </div>

        {/* User Footer */}
        <div className="h-16 bg-midnight-darkest/90 flex items-center justify-between px-3 border-t border-white/[0.06]">
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
              U
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">User Profile ...</span>
              <span className="text-[10px] text-midnight-muted truncate">Status: Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Area matching image copy 7.png */}
      <div className="flex-1 p-8 space-y-6 overflow-y-auto">
        {/* Welcome Hero Banner */}
        <div className="rounded-3xl bg-midnight-dark border border-white/10 p-8 shadow-2xl space-y-4">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Welcome to Pyrophorus Servers</h2>
          <p className="text-sm text-midnight-muted max-w-xl leading-relaxed">
            Experience the next generation of community interaction. High-performance, low-latency communication built for power users and creative communities.
          </p>
          <div className="flex items-center space-x-4 pt-2">
            <button className="px-6 py-2.5 rounded-full bg-midnight-accent hover:bg-midnight-accentHover text-white font-bold text-xs shadow-lg shadow-midnight-accent/30 transition-all">
              Get Started
            </button>
            <button className="px-6 py-2.5 rounded-full border border-white/20 text-white font-bold text-xs hover:bg-white/5 transition-all">
              Documentation
            </button>
          </div>
        </div>

        {/* Stats Cards Grid matching image copy 7.png */}
        <div className="grid grid-cols-3 gap-6">
          {/* Card 1: Latency */}
          <div className="rounded-2xl bg-midnight-dark border border-white/10 p-6 space-y-2 shadow-xl">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-2">
              <Zap className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white block">Latency</span>
            <div className="text-3xl font-extrabold text-white">12ms</div>
            <span className="text-[10px] text-midnight-muted font-mono block">Global edge routing active</span>
          </div>

          {/* Card 2: Active Nodes */}
          <div className="rounded-2xl bg-midnight-dark border border-white/10 p-6 space-y-2 shadow-xl">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
              <Activity className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white block">Active Nodes</span>
            <div className="text-3xl font-extrabold text-white">2.4k</div>
            <span className="text-[10px] text-emerald-400 font-mono block">+15% from last week</span>
          </div>

          {/* Card 3: Activity Feed */}
          <div className="rounded-2xl bg-midnight-dark border border-white/10 p-6 space-y-3 shadow-xl">
            <span className="text-xs font-bold text-white flex items-center">
              <Clock className="w-4 h-4 mr-2 text-midnight-muted" /> Activity Feed
            </span>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 text-xs">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
                  <Upload className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-white">System Core deployed new update</div>
                  <div className="text-[10px] text-midnight-muted">10 mins ago</div>
                </div>
              </div>

              <div className="flex items-start space-x-3 text-xs">
                <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 mt-0.5">
                  <UserPlus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold text-white">DevTeam joined the server</div>
                  <div className="text-[10px] text-midnight-muted">1 hr ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
