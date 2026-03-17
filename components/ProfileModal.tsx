
import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Check, User, Image as ImageIcon } from './Icons';
import { UserProfile } from '../types';
import { TranslationKey } from '../translations';
import { fileToDataURL } from '../utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdate: (data: Partial<UserProfile>) => void;
  accentColor: string;
  t: (key: TranslationKey) => string;
  enableGlass?: boolean;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profile, onUpdate, accentColor, t, enableGlass = true }) => {
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  // Sync temp profile when modal opens
  useEffect(() => {
    if (isOpen) {
      setTempProfile(profile);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await fileToDataURL(file);
      setTempProfile(prev => ({ 
        ...prev, 
        [type === 'avatar' ? 'avatarUrl' : 'bannerUrl']: url 
      }));
    }
  };

  const handleSave = () => {
    onUpdate(tempProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 backdrop-blur-md p-4 animate-fade-in">
      <div 
        className={`w-full max-w-lg bg-[var(--panel-bg)] border border-[var(--glass-border)] rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.4)] overflow-hidden animate-scale-in ${enableGlass ? 'backdrop-blur-3xl' : ''} flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {/* Banner Section */}
        <div className="h-40 w-full relative group bg-[var(--card-bg)]">
          {tempProfile.bannerUrl ? (
            <img src={tempProfile.bannerUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--card-bg)] via-[var(--card-hover)] to-[var(--card-bg)]" />
          )}
          <div 
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
            onClick={() => bannerRef.current?.click()}
          >
            <div className="bg-white/10 p-4 rounded-2xl border border-white/10 shadow-2xl">
                <ImageIcon className="w-6 h-6 text-white" />
            </div>
          </div>
          <input type="file" ref={bannerRef} className="hidden" accept="image/*" onChange={e => handleFile(e, 'banner')} />
        </div>

        <div className="px-10 pb-10 -mt-16 relative z-10">
          {/* Avatar Section */}
          <div className="flex justify-center mb-8">
            <div className="w-32 h-32 rounded-[40px] border-8 border-[var(--bg-main)] bg-[var(--card-bg)] overflow-hidden relative group shadow-2xl">
              {tempProfile.avatarUrl ? (
                <img src={tempProfile.avatarUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]/10">
                  <User className="w-12 h-12" />
                </div>
              )}
              <div 
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center cursor-pointer backdrop-blur-[2px]"
                onClick={() => avatarRef.current?.click()}
              >
                <Upload className="w-6 h-6 text-white" />
              </div>
              <input type="file" ref={avatarRef} className="hidden" accept="image/*" onChange={e => handleFile(e, 'avatar')} />
            </div>
          </div>

          <div className="space-y-8">
            <div className="text-center">
                <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter">{t('profile')}</h2>
                <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest mt-2">{t('personalization')}</p>
            </div>
            
            <div className="bg-[var(--card-bg)] p-8 rounded-[32px] border border-[var(--glass-border)]">
              <label className="block text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-4">{t('nickname')}</label>
              <input 
                type="text" 
                value={tempProfile.name}
                onChange={e => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-transparent border-b-2 border-[var(--glass-border)] py-4 text-2xl text-[var(--text-main)] font-black focus:border-[var(--text-main)] transition-colors outline-none placeholder-[var(--text-muted)]/10"
                placeholder={t('nickname') + "..."}
              />
            </div>

            <div className="flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-5 rounded-3xl text-[var(--text-muted)] font-black text-sm uppercase tracking-widest hover:text-[var(--text-main)] hover:bg-[var(--card-hover)] transition-all"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-5 rounded-3xl text-white font-black text-sm uppercase tracking-widest transition-all shadow-2xl hover:scale-105 active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
