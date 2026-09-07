
import React, { useState } from 'react';
import { Music, LayoutGrid, Mic2, Disc, ListMusic, Search, Play, Settings, Heart, User, Plus, ChevronDown, ChevronRight } from './Icons';
import { ViewType, UserProfile, Playlist } from '../types';
import { TranslationKey } from '../translations';

interface SidebarProps {
  onImportClick: () => void;
  onImportFolderClick?: () => void;
  onYouTubeImportClick?: () => void;
  onSpotiFLACImportClick?: () => void;
  onSettingsClick: () => void;
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
  accentColor: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  enableGlass: boolean;
  isVideoBg?: boolean;
  user: UserProfile;
  t: (key: TranslationKey) => string;
  playlists: Playlist[];
  onSelectPlaylist: (id: string) => void;
  onCreatePlaylist: () => void;
  selectedPlaylist: string | null;
}

const Sidebar: React.FC<SidebarProps> = React.memo(({ 
  onImportClick, onImportFolderClick, onYouTubeImportClick, onSpotiFLACImportClick, onSettingsClick, currentView, onChangeView, isOpen, accentColor,
  searchQuery, onSearchChange, enableGlass, isVideoBg, user, t, playlists, onSelectPlaylist, onCreatePlaylist, selectedPlaylist
}) => {
  const [playlistsExpanded, setPlaylistsExpanded] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('glass_playlists_expanded');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [toolsExpanded, setToolsExpanded] = useState(false);

  const togglePlaylistsExpanded = () => {
    setPlaylistsExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem('glass_playlists_expanded', String(next));
      } catch {}
      return next;
    });
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onSearchChange(val);
    if (val.trim().length > 0 && currentView !== 'search') {
        onChangeView('search');
    }
  };

  const sidebarGlassClass = enableGlass
    ? (isVideoBg ? 'bg-black/50 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]' : 'bg-black/30 backdrop-blur-2xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.5)]')
    : 'bg-[var(--sidebar-bg)] border border-[var(--glass-border)] shadow-2xl';

  return (
    <div 
      className={`h-full flex flex-col ${sidebarGlassClass} z-20 relative transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden rounded-[2rem] md:rounded-[3rem] ${
        isOpen ? 'w-64 pt-8 pb-6 px-5 opacity-100' : 'w-0 pt-8 pb-6 px-0 opacity-0'
      }`}
    >
      <div className="w-56 flex flex-col h-full mx-auto">
        
         
        <div className="px-1 mb-6">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] group-focus-within:text-[var(--text-main)] transition-colors" />
            <input 
              type="text" 
              placeholder={t('search_placeholder')} 
              value={searchQuery}
              onChange={handleSearch}
              className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-2xl py-2.5 pl-10 pr-4 text-sm font-medium text-[var(--text-main)] placeholder-[var(--text-muted)] focus:bg-[var(--card-hover)] focus:border-white/20 transition-all outline-none shadow-inner"
            />
          </div>
        </div>

        <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2 pb-6">
           
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

           
          <div>
            <div className="flex items-center justify-between px-4 mb-3 group cursor-pointer" onClick={togglePlaylistsExpanded}>
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

         
        <div className="mt-auto pt-3 border-t border-[var(--glass-border)] transition-all duration-300 flex flex-col">
           
          <button 
            onClick={() => setToolsExpanded(!toolsExpanded)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--card-bg)]/40 hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all mb-2 border border-[var(--glass-border)] group select-none"
            title={t('import_and_tools')}
          >
            <div className="flex items-center gap-2 text-xs font-bold tracking-wide">
              <Plus className={`w-3.5 h-3.5 transition-transform duration-300 ${toolsExpanded ? 'rotate-45' : ''}`} />
              <span>{t('import_and_tools')}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${toolsExpanded ? 'rotate-180 text-[var(--text-main)]' : ''}`} />
          </button>

           
          <div className={`overflow-hidden transition-all duration-300 ease-in-out flex flex-col ${toolsExpanded ? 'max-h-72 opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0 pointer-events-none'}`}>
            <button 
              onClick={onImportClick}
              className="w-full py-2 px-3 mb-1.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-md shrink-0"
              style={{ background: accentColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('import_tracks')}</span>
            </button>

            {onImportFolderClick && (
              <button 
                onClick={onImportFolderClick}
                className="w-full py-2 px-3 mb-1.5 rounded-xl border border-[var(--glass-border)] text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-[var(--card-hover)] shadow-sm shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('import_folder')}</span>
              </button>
            )}

            {onYouTubeImportClick && (
              <button 
                onClick={onYouTubeImportClick}
                className="w-full py-2 px-3 mb-1.5 rounded-xl bg-[var(--card-bg)] border border-[var(--glass-border)] text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-[var(--card-hover)] shadow-sm shrink-0"
              >
                <svg className="w-3.5 h-3.5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
                <span>YouTube MP3</span>
              </button>
            )}

            {onSpotiFLACImportClick && (
              <button 
                onClick={onSpotiFLACImportClick}
                className="w-full py-2 px-3 mb-1 rounded-xl bg-[var(--card-bg)] border border-[var(--glass-border)] text-[var(--text-main)] font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-[var(--card-hover)] shadow-sm shrink-0"
              >
                <svg className="w-3.5 h-3.5 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.08 9.3C15.24 7.02 8.88 6.84 5.16 7.98c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.2-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.54-.959.72-1.559.24z"/>
                </svg>
                <span>SpotiFLAC</span>
              </button>
            )}
          </div>
          
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
});

const NavItem: React.FC<{ icon: React.ReactNode; label: string; active?: boolean; onClick: () => void; accentColor: string; coverUrl?: string }> = ({ icon, label, active, onClick, accentColor, coverUrl }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-200 group relative ${
    active 
      ? 'bg-[var(--card-hover)] text-[var(--text-main)] shadow-sm border border-[var(--glass-border)]' 
      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)] border border-transparent'
  }`}
  >
    {active && (
      <div 
        className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-5 rounded-full"
        style={{ 
          backgroundColor: accentColor || 'var(--text-main)',
          boxShadow: `0 0 8px ${accentColor || 'rgba(255,255,255,0.6)'}`
        }}
      />
    )}
    <span 
      className={`flex items-center justify-center transition-all ${active ? 'scale-105' : 'opacity-70 group-hover:opacity-100 group-hover:scale-105'}`} 
      style={{ color: active ? accentColor : 'inherit' }}
    >
      {coverUrl ? <img src={coverUrl} alt={label} className="w-5 h-5 rounded-lg object-cover shadow-sm" /> : icon}
    </span>
    <span className="truncate tracking-tight">{label}</span>
  </button>
);

export default Sidebar;
