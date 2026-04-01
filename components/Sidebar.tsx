
import React, { useState } from 'react';
import { Music, LayoutGrid, Mic2, Disc, ListMusic, Search, Play, Settings, Heart, User, Plus, ChevronDown, ChevronRight } from './Icons';
import { ViewType, UserProfile, Playlist } from '../types';
import { TranslationKey } from '../translations';

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
  user: UserProfile;
  t: (key: TranslationKey) => string;
  playlists: Playlist[];
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  selectedPlaylist: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  onImportClick, onSettingsClick, currentView, onChangeView, isOpen, accentColor,
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
      className={`h-full flex flex-col ${enableGlass ? 'bg-black/40 backdrop-blur-3xl border-r border-white/5' : 'bg-[var(--sidebar-bg)] border-r border-[var(--glass-border)]'} z-20 relative transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden ${
        isOpen ? 'w-64 pt-6 pb-4 px-4 opacity-100' : 'w-0 pt-6 pb-4 px-0 opacity-0'
      }`}
    >
      <div className="w-56 flex flex-col h-full">
        
        {/* Search Bar at Top */}
        <div className="px-1 mb-6">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--text-main)] transition-colors" />
            <input 
              type="text" 
              placeholder={t('search_placeholder')} 
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-full py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--text-main)] placeholder-[var(--text-muted)] focus:bg-[var(--card-hover)] focus:border-[var(--glass-border)] transition-all outline-none"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
          {/* Main Navigation */}
          <div className="space-y-1">
            <NavItem 
              icon={<Play className="w-5 h-5 fill-current" />} 
              label={t('listen_now')} 
              active={currentView === 'listen_now'} 
              onClick={() => onChangeView('listen_now')}
              accentColor={accentColor}
            />
            <NavItem 
              icon={<Heart className="w-5 h-5" />} 
              label={t('favorites')} 
              active={currentView === 'favorites'}
              onClick={() => onChangeView('favorites')}
              accentColor={accentColor}
            />
          </div>

          {/* Library Section */}
          <div>
            <h3 className="px-4 text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-3">{t('your_library')}</h3>
            <div className="space-y-1">
              <NavItem 
                icon={<ListMusic className="w-5 h-5" />} 
                label={t('songs')} 
                active={currentView === 'songs'}
                onClick={() => onChangeView('songs')}
                accentColor={accentColor}
              />
              <NavItem 
                icon={<Disc className="w-5 h-5" />} 
                label={t('albums')} 
                active={currentView === 'albums'}
                onClick={() => onChangeView('albums')}
                accentColor={accentColor}
              />
              <NavItem 
                icon={<Mic2 className="w-5 h-5" />} 
                label={t('artists')} 
                active={currentView === 'artists'}
                onClick={() => onChangeView('artists')}
                accentColor={accentColor}
              />
            </div>
          </div>

          {/* Playlists Section */}
          <div>
            <div className="flex items-center justify-between px-4 mb-3 group cursor-pointer" onClick={() => setPlaylistsExpanded(!playlistsExpanded)}>
              <h3 className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider group-hover:text-[var(--text-main)] transition-colors">{t('playlists')}</h3>
              <div className="flex items-center gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); onCreatePlaylist(); }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1 rounded-full hover:bg-[var(--card-hover)]"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className={`space-y-1 overflow-hidden transition-all duration-300 ${playlistsExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              {playlists.length === 0 ? (
                <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                  {t('no_playlists')}
                  <button onClick={onCreatePlaylist} className="block w-full mt-3 py-2 rounded-full border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-colors font-medium text-[var(--text-main)]">
                    {t('create_playlist')}
                  </button>
                </div>
              ) : (
                playlists.map(p => (
                  <NavItem 
                    key={p.id}
                    icon={<ListMusic className="w-5 h-5" />} 
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

        {/* Bottom Actions & Profile */}
        <div className="mt-auto pt-4 border-t border-[var(--glass-border)]">
          <button 
            onClick={onImportClick}
            className="w-full py-2.5 px-4 mb-2 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-md"
            style={{ background: accentColor }}
          >
            <Plus className="w-4 h-4" />
            <span>{t('import_tracks')}</span>
          </button>
          
          <button 
            onClick={() => onChangeView('profile')}
            className="flex items-center gap-3 px-3 py-2 w-full rounded-xl hover:bg-[var(--card-hover)] transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-[var(--card-bg)] flex-shrink-0 overflow-hidden relative">
              {user.avatarUrl ? (
                user.avatarUrl.includes('video') || user.avatarUrl.endsWith('.mp4') || user.avatarUrl.endsWith('.webm') ? (
                  <video src={user.avatarUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <img src={user.avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=random&size=128`; }} />
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-sm font-bold text-[var(--text-main)] truncate group-hover:underline transition-all">
                {user.name || t('nickname')}
              </span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); onSettingsClick(); }}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-full hover:bg-[var(--card-bg)] transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </button>
        </div>
      </div>
    </div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; accentColor: string; coverUrl?: string }> = ({ icon, label, active, onClick, accentColor, coverUrl }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors group ${
    active 
      ? 'bg-[var(--card-hover)] text-[var(--text-main)]' 
      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
  }`}
  >
    <span className={`flex items-center justify-center ${active ? '' : 'opacity-70 group-hover:opacity-100'}`} style={{ color: active ? accentColor : 'inherit' }}>
      {coverUrl ? <img src={coverUrl} alt={label} className="w-5 h-5 rounded-sm object-cover" /> : icon}
    </span>
    <span className="truncate">{label}</span>
  </button>
);

export default Sidebar;
