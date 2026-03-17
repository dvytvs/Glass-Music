
import React, { useState } from 'react';
import { Music, LayoutGrid, Mic2, Disc, ListMusic, Search, Play, Settings, Heart, User, Plus, ChevronDown, ChevronRight } from './Icons';
import { ViewType, UserProfile, Playlist } from '../types';
import { TranslationKey } from '../translations';

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
  t: (key: TranslationKey) => string;
  playlists: Playlist[];
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  selectedPlaylist: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onImportClick, onSettingsClick, onProfileClick, currentView, onChangeView, isOpen, accentColor,
  searchQuery, onSearchChange, enableGlass, user, t, playlists, onSelectPlaylist, onCreatePlaylist, selectedPlaylist
}) => {
  const [playlistsExpanded, setPlaylistsExpanded] = useState(true);
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchChange(val);
    if (val.trim().length > 0 && currentView !== 'search') {
        onChangeView('search');
    }
  };

  return (
    <div 
      className={`h-full flex flex-col ${enableGlass ? 'glass-sidebar' : 'bg-[var(--sidebar-bg)] border-r border-[var(--glass-border)]'} z-20 relative transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
        isOpen ? 'w-64 pt-6 pb-4 px-4 opacity-100' : 'w-0 pt-6 pb-4 px-0 opacity-0'
      }`}
    >
      <div className="w-56 flex flex-col h-full">
        
        {/* User Profile Block */}
        <button 
          onClick={onProfileClick}
          className="flex items-center gap-3 px-3 py-2.5 mb-8 rounded-2xl hover:bg-[var(--card-hover)] active:scale-95 transition-all group border border-transparent hover:border-[var(--glass-border)]"
        >
          <div className="w-10 h-10 rounded-full bg-[var(--card-bg)] flex-shrink-0 overflow-hidden border border-[var(--glass-border)] shadow-xl relative">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                <User className="w-5 h-5" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Settings className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex flex-col items-start min-w-0">
            <span className="text-sm font-bold text-[var(--text-main)] truncate group-hover:text-[var(--text-main)] transition-all animate-fade-in" key={user.name}>
              {user.name || t('nickname')}
            </span>
            <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-black">{t('premium')}</span>
          </div>
        </button>

        <div className="px-1 mb-8">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] group-focus-within:text-[var(--text-main)] transition-colors" />
            <input 
              type="text" 
              placeholder={t('search_placeholder')} 
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl py-2 pl-9 pr-4 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:bg-[var(--card-hover)] focus:border-[var(--glass-border)] transition-all outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-8 overflow-y-auto custom-scrollbar pr-2">
          <div>
            <h3 className="px-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-4">{t('listen_now')}</h3>
            <div className="space-y-1">
              <NavItem 
                icon={<Play className="w-4 h-4 fill-current" />} 
                label={t('listen_now')} 
                active={currentView === 'listen_now'} 
                onClick={() => onChangeView('listen_now')}
                accentColor={accentColor}
              />
            </div>
          </div>

          <div>
            <div className="space-y-1">
              <NavItem 
                icon={<Heart className="w-4 h-4" />} 
                label={t('favorites')} 
                active={currentView === 'favorites'}
                onClick={() => onChangeView('favorites')}
                accentColor={accentColor}
              />
              <NavItem 
                icon={<Disc className="w-4 h-4" />} 
                label={t('albums')} 
                active={currentView === 'albums'}
                onClick={() => onChangeView('albums')}
                accentColor={accentColor}
              />
              <NavItem 
                icon={<Mic2 className="w-4 h-4" />} 
                label={t('artists')} 
                active={currentView === 'artists'}
                onClick={() => onChangeView('artists')}
                accentColor={accentColor}
              />
              <NavItem 
                icon={<ListMusic className="w-4 h-4" />} 
                label={t('songs')} 
                active={currentView === 'songs'}
                onClick={() => onChangeView('songs')}
                accentColor={accentColor}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between px-4 mb-4 group cursor-pointer" onClick={() => setPlaylistsExpanded(!playlistsExpanded)}>
              <h3 className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] group-hover:text-[var(--text-main)] transition-colors">{t('playlists')}</h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onCreatePlaylist(); }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1">
                  {playlistsExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${playlistsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              {playlists.length === 0 ? (
                <div className="px-4 py-3 text-xs text-[var(--text-muted)] text-center">
                  {t('no_playlists')}
                  <button onClick={onCreatePlaylist} className="block w-full mt-2 py-1.5 rounded-lg border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-colors">
                    {t('create_playlist')}
                  </button>
                </div>
              ) : (
                playlists.map(p => (
                  <NavItem 
                    key={p.id}
                    icon={<ListMusic className="w-4 h-4" />} 
                    label={p.name} 
                    active={currentView === 'playlist_detail' && p.id === selectedPlaylist}
                    onClick={() => onSelectPlaylist(p.id)}
                    accentColor={accentColor}
                    coverUrl={p.coverUrl}
                  />
                ))
              )}
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
            <span>{t('import_tracks')}</span>
          </button>
          <button 
            onClick={onSettingsClick}
            className="w-full py-2.5 px-4 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-[var(--card-hover)]"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{t('settings')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; accentColor: string; coverUrl?: string }> = ({ icon, label, active, onClick, accentColor, coverUrl }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all duration-300 group ${
    active 
      ? 'bg-[var(--card-hover)] text-[var(--text-main)] shadow-lg shadow-black/5' 
      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)]'
  }`}
  >
    <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'} flex items-center justify-center`} style={{ color: active ? accentColor : 'inherit' }}>
      {coverUrl ? <img src={coverUrl} alt={label} className="w-4 h-4 rounded-sm object-cover" /> : icon}
    </span>
    <span className="truncate">{label}</span>
  </button>
);

export default Sidebar;
