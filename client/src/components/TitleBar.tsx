import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';

export const TitleBar: React.FC = () => {
  const handleMinimize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const appWin = getCurrentWindow();
      await appWin.minimize();
    } catch (err) {
      console.warn('TitleBar minimize error:', err);
    }
  };

  const handleMaximize = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const appWin = getCurrentWindow();
      const isMax = await appWin.isMaximized();
      if (isMax) {
        await appWin.unmaximize();
      } else {
        await appWin.maximize();
      }
    } catch (err) {
      console.warn('TitleBar maximize error:', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const appWin = getCurrentWindow();
      await appWin.close();
    } catch (err) {
      console.warn('TitleBar close error:', err);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-8 bg-midnight-rail border-b border-white/[0.06] flex items-center justify-between px-3 select-none text-xs z-50 text-midnight-muted cursor-default"
    >
      <div className="flex items-center space-x-2 pointer-events-none" data-tauri-drag-region>
        <img src="/logo.png" alt="Pyrophorus Logo" className="w-4 h-4 rounded-full object-cover shadow" />
        <span className="font-bold text-white text-[11px] tracking-wide" data-tauri-drag-region>
          Pyrophorus | Uçtan Uca Şifreli İletişim
        </span>
      </div>

      <div
        className="flex items-center space-x-1 relative z-[9999]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleMinimize}
          className="w-7 h-6 flex items-center justify-center hover:bg-white/10 text-midnight-muted hover:text-white transition-colors rounded-sm cursor-pointer"
          title="Simge Durumuna Küçült"
        >
          <Minus className="w-3 h-3 pointer-events-none" />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleMaximize}
          className="w-7 h-6 flex items-center justify-center hover:bg-white/10 text-midnight-muted hover:text-white transition-colors rounded-sm cursor-pointer"
          title="Ekranı Kapla / Tam Ekran"
        >
          <Square className="w-2.5 h-2.5 pointer-events-none" />
        </button>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={handleClose}
          className="w-7 h-6 flex items-center justify-center hover:bg-rose-600 text-midnight-muted hover:text-white transition-colors rounded-sm cursor-pointer"
          title="Kapat"
        >
          <X className="w-3 h-3 pointer-events-none" />
        </button>
      </div>
    </div>
  );
};
