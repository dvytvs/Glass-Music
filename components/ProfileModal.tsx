
import React, { useState, useRef } from 'react';
import { X, Upload, Check, User, Image as ImageIcon } from './Icons';
import { UserProfile } from '../types';
import { fileToDataURL } from '../utils';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdate: (data: Partial<UserProfile>) => void;
  accentColor: string;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, profile, onUpdate, accentColor }) => {
  const [tempProfile, setTempProfile] = useState<UserProfile>(profile);
  const avatarRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

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
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in-view">
      <div 
        className="w-full max-w-lg bg-[#1c1c1e]/90 border border-white/10 rounded-[32px] shadow-2xl overflow-hidden animate-zoom-in backdrop-blur-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Banner Section */}
        <div className="h-32 w-full relative group bg-neutral-800">
          {tempProfile.bannerUrl ? (
            <img src={tempProfile.bannerUrl} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-neutral-800 to-neutral-700" />
          )}
          <div 
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            onClick={() => bannerRef.current?.click()}
          >
            <ImageIcon className="w-6 h-6 text-white" />
          </div>
          <input type="file" ref={bannerRef} className="hidden" accept="image/*" onChange={e => handleFile(e, 'banner')} />
        </div>

        <div className="px-8 pb-8 -mt-12 relative z-10">
          {/* Avatar Section */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 rounded-full border-4 border-[#1c1c1e] bg-neutral-800 overflow-hidden relative group shadow-2xl">
              {tempProfile.avatarUrl ? (
                <img src={tempProfile.avatarUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/20">
                  <User className="w-10 h-10" />
                </div>
              )}
              <div 
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                onClick={() => avatarRef.current?.click()}
              >
                <Upload className="w-5 h-5 text-white" />
              </div>
              <input type="file" ref={avatarRef} className="hidden" accept="image/*" onChange={e => handleFile(e, 'avatar')} />
            </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Ваш профиль</h2>
            
            <div>
              <label className="block text-xs font-bold text-white/30 uppercase tracking-widest mb-2">Никнейм</label>
              <input 
                type="text" 
                value={tempProfile.name}
                onChange={e => setTempProfile(prev => ({ ...prev, name: e.target.value }))}
                className="w-full glass-input rounded-2xl px-5 py-4 text-white font-medium focus:outline-none"
                placeholder="Как вас называть?"
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={onClose}
                className="flex-1 py-3 rounded-2xl text-white/60 font-bold hover:text-white transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={handleSave}
                className="flex-1 py-3 rounded-2xl text-white font-bold transition-all shadow-lg active:scale-95"
                style={{ backgroundColor: accentColor }}
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;