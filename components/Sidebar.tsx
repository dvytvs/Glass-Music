import React from 'react';
import { Music, LayoutGrid, Mic2, Disc, ListMusic, Search, Play } from './Icons';
import { ViewType } from '../types';

interface SidebarProps {
  onImportClick: () => void;
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onImportClick, currentView, onChangeView, isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="w-64 h-full flex flex-col pt-8 pb-4 px-4 glass-panel rounded-r-3xl z-20 relative transition-all duration-300">
      <div className="flex items-center gap-3 px-4 mb-8">
        {/* Removed the icon as requested */}
        <h1 className="text-2xl font-bold text-white tracking-tight">Музыка</h1>
      </div>

      <div className="px-4 mb-6">
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/50 group-focus-within:text-white/90 transition-colors" />
          <input 
            type="text" 
            placeholder="Поиск" 
            className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-white/40 focus:outline-none focus:bg-white/10 focus:border-white/30 transition-all"
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="mb-6">
          <h3 className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Apple Music</h3>
          <NavItem 
            icon={<Play className="w-4 h-4 fill-current" />} 
            label="Слушать" 
            active={currentView === 'listen_now'} 
            onClick={() => onChangeView('listen_now')}
          />
          <NavItem 
            icon={<LayoutGrid className="w-4 h-4" />} 
            label="Обзор" 
            active={currentView === 'browse'}
            onClick={() => onChangeView('browse')}
          />
          <NavItem 
            icon={<Mic2 className="w-4 h-4" />} 
            label="Радио" 
            active={currentView === 'radio'}
            onClick={() => onChangeView('radio')}
          />
        </div>

        <div className="mb-6">
          <h3 className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Медиатека</h3>
          <NavItem 
            icon={<Music className="w-4 h-4" />} 
            label="Недавно" 
            active={currentView === 'recent'}
            onClick={() => onChangeView('recent')}
          />
          <NavItem 
            icon={<Disc className="w-4 h-4" />} 
            label="Альбомы" 
            active={currentView === 'albums'}
            onClick={() => onChangeView('albums')}
          />
          <NavItem 
            icon={<Mic2 className="w-4 h-4" />} 
            label="Артисты" 
            active={currentView === 'artists'}
            onClick={() => onChangeView('artists')}
          />
          <NavItem 
            icon={<ListMusic className="w-4 h-4" />} 
            label="Песни" 
            active={currentView === 'songs'}
            onClick={() => onChangeView('songs')}
          />
        </div>
      </nav>

      <div className="mt-auto px-2">
         <button 
          onClick={onImportClick}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-pink-600/80 to-purple-600/80 hover:from-pink-500 hover:to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-pink-500/20 backdrop-blur-md"
        >
          <span>Импорт файлов</span>
        </button>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
    active 
      ? 'bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)]' 
      : 'text-white/60 hover:text-white hover:bg-white/5'
  }`}>
    <span className={active ? 'text-pink-400' : 'text-current'}>{icon}</span>
    {label}
  </button>
);

export default Sidebar;