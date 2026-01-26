
import React from 'react';
import { Music, LayoutGrid, Mic2, Disc, ListMusic, Search, Play, Settings, Heart } from './Icons';
import { ViewType } from '../types';

interface SidebarProps {
  onImportClick: () => void;
  onSettingsClick: () => void;
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
  accentColor: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  enableGlass: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onImportClick, onSettingsClick, currentView, onChangeView, isOpen, accentColor,
  searchQuery, onSearchChange, enableGlass
}) => {
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchChange(val);
    if (val.trim().length > 0 && currentView !== 'search') {
        onChangeView('search');
    }
  };

  return (
    <div 
      className={`h-full flex flex-col glass-sidebar z-20 relative transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
        isOpen ? 'w-64 pt-8 pb-4 px-4 opacity-100 translate-x-0' : 'w-0 pt-8 pb-4 px-0 opacity-0 -translate-x-10'
      }`}
    >
      <div className="w-56 flex flex-col h-full min-w-[14rem]">
        <div className="flex items-center gap-3 px-4 mb-8">
          <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">Музыка</h1>
        </div>

        <div className="px-4 mb-6">
          <div className="relative group">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-white/50 group-focus-within:text-white/90 transition-colors" />
            <input 
              type="text" 
              placeholder="Поиск" 
              value={searchQuery}
              onChange={handleSearch}
              className="w-full glass-input rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-white/40"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="mb-6">
            <h3 className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Glass Music</h3>
            <NavItem 
              icon={<Play className="w-4 h-4 fill-current" />} 
              label="Слушать" 
              active={currentView === 'listen_now'} 
              onClick={() => onChangeView('listen_now')}
              accentColor={accentColor}
            />
            <NavItem 
              icon={<LayoutGrid className="w-4 h-4" />} 
              label="Обзор" 
              active={currentView === 'browse'}
              onClick={() => onChangeView('browse')}
              accentColor={accentColor}
            />
            <NavItem 
              icon={<Mic2 className="w-4 h-4" />} 
              label="Радио" 
              active={currentView === 'radio'}
              onClick={() => onChangeView('radio')}
              accentColor={accentColor}
            />
          </div>

          <div className="mb-6">
            <h3 className="px-4 text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Медиатека</h3>
            <NavItem 
              icon={<Heart className="w-4 h-4" />} 
              label="Избранное" 
              active={currentView === 'favorites'}
              onClick={() => onChangeView('favorites')}
              accentColor={accentColor}
            />
            <NavItem 
              icon={<Music className="w-4 h-4" />} 
              label="Недавно" 
              active={currentView === 'recent'}
              onClick={() => onChangeView('recent')}
              accentColor={accentColor}
            />
            <NavItem 
              icon={<Disc className="w-4 h-4" />} 
              label="Альбомы" 
              active={currentView === 'albums'}
              onClick={() => onChangeView('albums')}
              accentColor={accentColor}
            />
            <NavItem 
              icon={<Mic2 className="w-4 h-4" />} 
              label="Артисты" 
              active={currentView === 'artists'}
              onClick={() => onChangeView('artists')}
              accentColor={accentColor}
            />
            <NavItem 
              icon={<ListMusic className="w-4 h-4" />} 
              label="Песни" 
              active={currentView === 'songs'}
              onClick={() => onChangeView('songs')}
              accentColor={accentColor}
            />
          </div>
        </nav>

        <div className="mt-auto px-2 space-y-3">
          <button 
            onClick={onImportClick}
            className="w-full py-3 px-4 rounded-xl text-white font-medium text-sm flex items-center justify-center gap-2 transition-all glass-button"
            style={enableGlass ? { backgroundColor: `${accentColor}40`, borderColor: `${accentColor}60` } : {}}
          >
            <span>Импорт файлов</span>
          </button>
          <button 
            onClick={onSettingsClick}
            className="w-full py-2.5 px-4 rounded-xl text-white/60 hover:text-white font-medium text-sm flex items-center justify-center gap-2 transition-all glass-button"
          >
            <Settings className="w-4 h-4" />
            <span>Настройки</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; accentColor: string }> = ({ icon, label, active, onClick, accentColor }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
    active 
      ? 'active-nav-glass text-white scale-[1.02]' 
      : 'text-white/60 hover:text-white hover:bg-white/5'
  }`}
  >
    <span style={{ color: active ? accentColor : 'currentColor' }}>{icon}</span>
    {label}
  </button>
);

export default Sidebar;
