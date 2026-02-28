
import React from 'react';
import { Music, LayoutGrid, Mic2, Disc, ListMusic, Search, Play, Settings, Heart, User } from './Icons';
import { ViewType, UserProfile } from '../types';

interface SidebarProps {
  onImportClick: () => void;
  onSettingsClick: () => void;
  onProfileClick: () => void;
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
  accentColor: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  enableGlass: boolean;
  user: UserProfile;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onImportClick, onSettingsClick, onProfileClick, currentView, onChangeView, isOpen, accentColor,
  searchQuery, onSearchChange, enableGlass, user
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
      className={`h-full flex flex-col ${enableGlass ? 'glass-sidebar' : 'bg-black border-r border-white/10'} z-20 relative transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
        isOpen ? 'w-64 pt-6 pb-4 px-4 opacity-100 translate-x-0' : 'w-0 pt-6 pb-4 px-0 opacity-0 -translate-x-10'
      }`}
    >
      <div className="w-56 flex flex-col h-full min-w-[14rem]">
        
        {/* User Profile Block */}
        <button 
          onClick={onProfileClick}
          className="flex items-center gap-3 px-3 py-2.5 mb-8 rounded-2xl hover:bg-white/5 active:scale-95 transition-all group border border-transparent hover:border-white/5"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex-shrink-0 overflow-hidden border border-white/10 shadow-xl relative">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/20">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Settings className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-bold text-white/90 truncate group-hover:text-white transition-all animate-fade-in" key={user.name}>
              {user.name || 'Слушатель'}
            </span>
            <span className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-black">Premium</span>
          </div>
        </button>

        <div className="px-1 mb-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 group-focus-within:text-white/70 transition-colors" />
            <input 
              type="text" 
              placeholder="Поиск музыки..." 
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-white/[0.03] border border-white/5 rounded-xl py-2 pl-9 pr-4 text-xs text-white placeholder-white/20 focus:bg-white/[0.06] focus:border-white/10 transition-all outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
          <div>
            <h3 className="px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Главная</h3>
            <div className="space-y-1">
              <NavItem 
                icon={<Play className="w-4 h-4 fill-current" />} 
                label="Слушать" 
                active={currentView === 'listen_now'} 
                onClick={() => onChangeView('listen_now')}
                accentColor={accentColor}
              />
            </div>
          </div>

          <div>
            <h3 className="px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-4">Медиатека</h3>
            <div className="space-y-1">
              <NavItem 
                icon={<Heart className="w-4 h-4" />} 
                label="Избранное" 
                active={currentView === 'favorites'}
                onClick={() => onChangeView('favorites')}
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
          </div>
        </nav>

        <div className="mt-auto pt-6 space-y-2">
          <button 
            onClick={onImportClick}
            className="w-full py-3 px-4 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all glass-button border-white/5 hover:border-white/10"
            style={{ background: `linear-gradient(135deg, ${accentColor}30, ${accentColor}10)` }}
          >
            <Music className="w-3.5 h-3.5" />
            <span>Импорт файлов</span>
          </button>
          <button 
            onClick={onSettingsClick}
            className="w-full py-2.5 px-4 rounded-xl text-white/40 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-white/5"
          >
            <Settings className="w-3.5 h-3.5" />
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
    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-300 group ${
    active 
      ? 'bg-white/10 text-white shadow-lg shadow-black/20' 
      : 'text-white/40 hover:text-white/80 hover:bg-white/[0.03]'
  }`}
  >
    <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`} style={{ color: active ? accentColor : 'inherit' }}>{icon}</span>
    {label}
  </button>
);

export default Sidebar;
