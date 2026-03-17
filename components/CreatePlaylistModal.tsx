import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon } from './Icons';
import { TranslationKey } from '../translations';
import { fileToDataURL } from '../utils';

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, coverUrl?: string) => void;
  accentColor: string;
  enableGlass: boolean;
  t: (key: TranslationKey) => string;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({ isOpen, onClose, onCreate, accentColor, enableGlass, t }) => {
  const [name, setName] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setCoverUrl(undefined);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await fileToDataURL(file);
      setCoverUrl(url);
    }
  };

  const handleCreate = () => {
    if (name.trim()) {
      onCreate(name.trim(), coverUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className={`w-full max-w-md bg-[var(--panel-bg)] border border-[var(--glass-border)] rounded-[32px] shadow-[0_40px_80px_rgba(0,0,0,0.4)] overflow-hidden animate-scale-in ${enableGlass ? 'backdrop-blur-3xl' : ''} flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 flex items-center justify-between border-b border-[var(--glass-border)]">
          <h2 className="text-xl font-bold text-[var(--text-main)]">{t('create_playlist')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--card-hover)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex justify-center">
            <div 
              className="w-40 h-40 rounded-2xl bg-[var(--card-bg)] border-2 border-dashed border-[var(--glass-border)] flex flex-col items-center justify-center cursor-pointer hover:border-[var(--text-main)]/50 transition-colors relative overflow-hidden group"
              onClick={() => fileInputRef.current?.click()}
            >
              {coverUrl ? (
                <>
                  <img src={coverUrl} className="w-full h-full object-cover" alt="Cover" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white" />
                  </div>
                </>
              ) : (
                <>
                  <ImageIcon className="w-10 h-10 text-[var(--text-muted)] mb-2 group-hover:text-[var(--text-main)] transition-colors" />
                  <span className="text-xs font-medium text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors text-center px-2">{t('cover_image')}</span>
                </>
              )}
            </div>
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFile} />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">{t('playlist_name')}</label>
            <input 
              ref={inputRef}
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={t('my_playlist')}
              className="w-full bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-xl px-4 py-3 text-[var(--text-main)] outline-none focus:border-[var(--text-main)]/50 transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
            />
          </div>
        </div>

        <div className="p-6 border-t border-[var(--glass-border)] flex justify-end gap-3 bg-[var(--card-bg)]/30">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-[var(--text-main)] hover:bg-[var(--card-hover)] transition-colors"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={handleCreate}
            disabled={!name.trim()}
            className="px-6 py-2.5 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            style={{ backgroundColor: accentColor }}
          >
            {t('create')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePlaylistModal;
