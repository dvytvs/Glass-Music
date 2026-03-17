import React, { useState, useMemo } from 'react';
import { X, Search, Check } from './Icons';
import { TranslationKey } from '../translations';
import { Track } from '../types';

interface SelectTracksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  playlistTrackIds: string[];
  onAddTracks: (trackIds: string[]) => void;
  accentColor: string;
  enableGlass: boolean;
  t: (key: TranslationKey) => string;
}

const SelectTracksModal: React.FC<SelectTracksModalProps> = ({ isOpen, onClose, tracks, playlistTrackIds, onAddTracks, accentColor, enableGlass, t }) => {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredTracks = useMemo(() => {
    const q = search.toLowerCase();
    return tracks.filter(t => 
      !playlistTrackIds.includes(t.id) && 
      (t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    );
  }, [tracks, search, playlistTrackIds]);

  if (!isOpen) return null;

  const handleToggle = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleAdd = () => {
    onAddTracks(Array.from(selectedIds));
    setSelectedIds(newSet => { newSet.clear(); return newSet; });
    setSearch('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in" onClick={onClose}>
      <div 
        className={`w-full max-w-2xl h-[80vh] bg-[var(--panel-bg)] border border-[var(--glass-border)] rounded-[32px] shadow-[0_40px_80px_rgba(0,0,0,0.4)] overflow-hidden animate-scale-in ${enableGlass ? 'backdrop-blur-3xl' : ''} flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 flex items-center justify-between border-b border-[var(--glass-border)]">
          <h2 className="text-xl font-bold text-[var(--text-main)]">{t('add_tracks')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--card-hover)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-[var(--glass-border)] bg-[var(--card-bg)]/30">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input 
              type="text" 
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-2xl pl-12 pr-4 py-3 text-[var(--text-main)] outline-none focus:border-[var(--text-main)]/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredTracks.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] py-12">
              {t('no_tracks')}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTracks.map(track => {
                const isSelected = selectedIds.has(track.id);
                return (
                  <div 
                    key={track.id}
                    onClick={() => handleToggle(track.id)}
                    className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-colors ${isSelected ? 'bg-[var(--card-hover)]' : 'hover:bg-[var(--card-bg)]'}`}
                  >
                    <div className="w-10 h-10 rounded-lg bg-[var(--card-bg)] overflow-hidden flex-shrink-0 relative">
                      {track.coverUrl ? (
                        <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                          <span className="text-xs font-bold">{track.title.charAt(0)}</span>
                        </div>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-main)] truncate">{track.title}</p>
                      <p className="text-xs text-[var(--text-muted)] truncate">{track.artist}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors" style={{ 
                      borderColor: isSelected ? accentColor : 'var(--glass-border)',
                      backgroundColor: isSelected ? accentColor : 'transparent'
                    }}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-[var(--glass-border)] flex justify-between items-center bg-[var(--card-bg)]/30">
          <span className="text-sm font-bold text-[var(--text-muted)]">
            {selectedIds.size} {t('songs')}
          </span>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl font-bold text-[var(--text-main)] hover:bg-[var(--card-hover)] transition-colors"
            >
              {t('cancel')}
            </button>
            <button 
              onClick={handleAdd}
              disabled={selectedIds.size === 0}
              className="px-6 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              style={{ backgroundColor: accentColor }}
            >
              {t('add_tracks')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectTracksModal;
