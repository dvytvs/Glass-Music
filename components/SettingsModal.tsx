
import React, { useRef, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Video, Droplet, Upload, Check, Sliders, Snowflake, Trash2, ArrowLeft, LayoutGrid } from './Icons';
// Import AlertCircle directly from lucide if possible, or add it to Icons.tsx. Assuming standard set.
import { AlertCircle, Music, Activity } from 'lucide-react'; 
import { ThemeConfig, UserProfile } from '../types';
import { TranslationKey } from '../translations';
import { fileToDataURL } from '../utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThemeConfig;
  onUpdate: (newConfig: Partial<ThemeConfig>) => void;
  onClearLibrary: () => void;
  userProfile: UserProfile;
  onUpdateProfile: (data: Partial<UserProfile>) => void;
  t: (key: TranslationKey) => string;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, onClose, config, onUpdate, onClearLibrary, userProfile, onUpdateProfile, t 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<'settings' | 'about'>('settings');

  const isWinterSeason = useMemo(() => {
      const now = new Date();
      const month = now.getMonth(); // 0 = Jan, 11 = Dec
      // Winter: Dec (11), Jan (0), Feb (1)
      return month === 11 || month === 0 || month === 1;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const type = file.type.startsWith('video') ? 'video' : 'image';
        // Convert to Base64 (Data URI) for persistence across reloads
        const base64Url = await fileToDataURL(file);
        onUpdate({ backgroundType: type, backgroundSource: base64Url });
      } catch (err) {
        console.error("Failed to load background", err);
      }
    }
  };

  return (
    <AnimatePresence>
    {isOpen && (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className={`w-full max-w-2xl bg-[var(--panel-bg)] border border-[var(--glass-border)] rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.2)] overflow-hidden ${config.enableGlass ? 'backdrop-blur-3xl' : ''} relative flex flex-col max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-[var(--glass-border)] shrink-0 bg-[var(--panel-bg)]/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
              {view === 'about' && (
                  <button onClick={() => setView('settings')} className="p-2 hover:bg-[var(--card-hover)] rounded-full transition-all active:scale-95">
                      <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
                  </button>
              )}
              <h2 className="text-2xl font-black text-[var(--text-main)] tracking-tight">
                {view === 'about' ? t('original') : t('settings')}
              </h2>
          </div>
          <div className="flex items-center gap-2">
              {view === 'settings' && (
                <button 
                    onClick={() => setView('about')} 
                    className="p-2 hover:bg-[var(--card-hover)] rounded-full transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    title={t('about')}
                >
                    <AlertCircle className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-[var(--card-hover)] rounded-full transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X className="w-5 h-5" />
              </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative">
          
          {/* VIEW: SETTINGS */}
          {view === 'settings' && (
            <div className="space-y-10 animate-fade-in">
                {/* Theme Mode */}
                <section>
                     <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Sliders className="w-4 h-4"/> {t('theme')}
                     </h3>
                     <div className="grid grid-cols-3 gap-3">
                         <button 
                            onClick={() => onUpdate({ themeMode: 'dark' })}
                            className={`py-3 rounded-full text-sm font-bold transition-all border ${config.themeMode === 'dark' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-main)]'}`}
                         >
                             {t('dark')}
                         </button>
                         <button 
                            onClick={() => onUpdate({ themeMode: 'light' })}
                            className={`py-3 rounded-full text-sm font-bold transition-all border ${config.themeMode === 'light' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-main)]'}`}
                         >
                             {t('light')}
                         </button>
                         <button 
                            onClick={() => onUpdate({ themeMode: 'system' })}
                            className={`py-3 rounded-full text-sm font-bold transition-all border ${config.themeMode === 'system' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-main)]'}`}
                         >
                             {t('system')}
                         </button>
                     </div>
                </section>

                {/* Language */}
                <section>
                     <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4"/> {t('language')}
                     </h3>
                     <div className="grid grid-cols-3 gap-3">
                         <button 
                            onClick={() => onUpdateProfile({ language: 'ru' })}
                            className={`py-3 rounded-full text-sm font-bold transition-all border ${userProfile.language === 'ru' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-main)]'}`}
                         >
                             Русский
                         </button>
                         <button 
                            onClick={() => onUpdateProfile({ language: 'en' })}
                            className={`py-3 rounded-full text-sm font-bold transition-all border ${userProfile.language === 'en' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-main)]'}`}
                         >
                             English
                         </button>
                         <button 
                            onClick={() => onUpdateProfile({ language: 'system' })}
                            className={`py-3 rounded-full text-sm font-bold transition-all border ${userProfile.language === 'system' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-main)]'}`}
                         >
                             {t('system')}
                         </button>
                     </div>
                </section>

                {/* Player Style Toggle */}
                <section>
                     <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4"/> {t('player_style')}
                     </h3>
                     <div className="grid grid-cols-2 gap-3">
                         <button 
                            onClick={() => onUpdate({ playerStyle: 'floating' })}
                            className={`py-3 rounded-full text-sm font-bold transition-all border ${config.playerStyle === 'floating' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-main)]'}`}
                         >
                             {t('player_style')} (Floating)
                         </button>
                         <button 
                            onClick={() => onUpdate({ playerStyle: 'classic' })}
                            className={`py-3 rounded-full text-sm font-bold transition-all border ${config.playerStyle === 'classic' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-md' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-[var(--glass-border)] hover:bg-[var(--card-hover)] hover:text-[var(--text-main)]'}`}
                         >
                             {t('player_style')} (Classic)
                         </button>
                     </div>
                </section>

                {/* Equalizer */}
                <section>
                     <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Music className="w-4 h-4"/> Эквалайзер
                     </h3>
                     <div className="bg-[var(--card-bg)] p-6 rounded-[2.5rem] border border-[var(--glass-border)] shadow-sm">
                        <div className="flex items-end justify-between h-32 gap-1">
                            {([32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]).map((freq, i) => {
                                const gain = config.eqBands?.[i] || 0;
                                return (
                                    <div key={freq} className="flex flex-col items-center gap-2 h-full flex-1">
                                        <div className="relative w-full h-full flex justify-center">
                                            <input 
                                                type="range" 
                                                min="-12" max="12" step="0.1" 
                                                value={gain}
                                                onChange={(e) => {
                                                    const newBands = [...(config.eqBands || new Array(10).fill(0))];
                                                    newBands[i] = parseFloat(e.target.value);
                                                    onUpdate({ eqBands: newBands });
                                                }}
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-1.5 -rotate-90 appearance-none bg-[var(--glass-border)] rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--text-main)] [&::-webkit-slider-thumb]:cursor-pointer hover:[&::-webkit-slider-thumb]:scale-125 transition-all"
                                            />
                                        </div>
                                        <span className="text-[10px] font-semibold text-[var(--text-muted)]">{freq >= 1000 ? `${freq/1000}k` : freq}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-4 px-1">
                            <span className="text-[10px] font-semibold text-[var(--text-muted)]">-12dB</span>
                            <button 
                                onClick={() => onUpdate({ eqBands: new Array(10).fill(0) })}
                                className="text-[10px] font-semibold text-[var(--text-main)] hover:underline"
                            >
                                Сбросить
                            </button>
                            <span className="text-[10px] font-semibold text-[var(--text-muted)]">+12dB</span>
                        </div>
                     </div>
                </section>
                   {/* Toggles Section */}
                <div className="space-y-3">
                    {/* Glass Toggle */}
                    <motion.section whileTap={{ scale: 0.98 }} className="flex items-center justify-between bg-[var(--card-bg)] p-4 rounded-[2.5rem] border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-all cursor-pointer" onClick={() => onUpdate({ enableGlass: !config.enableGlass })}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--glass-border)] flex items-center justify-center">
                                <Droplet className="w-5 h-5" style={{ color: config.accentColor }}/>
                            </div>
                            <div>
                                <h3 className="text-[var(--text-main)] font-bold text-sm">{t('glass_effect')}</h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('glass_effect')}</p>
                            </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${config.enableGlass ? 'bg-[var(--text-main)]' : 'bg-[var(--glass-border)]'}`}>
                            <div className={`w-4 h-4 rounded-full bg-[var(--bg-main)] shadow-sm transition-all duration-300 ${config.enableGlass ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </motion.section>

                    {/* Animate Background Toggle */}
                    <motion.section whileTap={{ scale: 0.98 }} className="flex items-center justify-between bg-[var(--card-bg)] p-4 rounded-[2.5rem] border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-all cursor-pointer" onClick={() => onUpdate({ animateBackground: !config.animateBackground })}>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[var(--glass-border)] flex items-center justify-center">
                                <Activity className="w-5 h-5" style={{ color: config.accentColor }}/>
                            </div>
                            <div>
                                <h3 className="text-[var(--text-main)] font-bold text-sm">{t('animate_background')}</h3>
                                <p className="text-xs text-[var(--text-muted)] mt-0.5">{t('animate_background')}</p>
                            </div>
                        </div>
                        <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${config.animateBackground ? 'bg-[var(--text-main)]' : 'bg-[var(--glass-border)]'}`}>
                            <div className={`w-4 h-4 rounded-full bg-[var(--bg-main)] shadow-sm transition-all duration-300 ${config.animateBackground ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </div>
                    </motion.section>
                    
                    {/* Seasonal Theme (Visible only in winter) */}
                    {isWinterSeason && (
                        <motion.section whileTap={{ scale: 0.98 }} className="flex items-center justify-between bg-blue-500/10 p-4 rounded-[2.5rem] border border-blue-500/20 hover:bg-blue-500/20 transition-all cursor-pointer" onClick={() => onUpdate({ seasonalTheme: !config.seasonalTheme })}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                    <Snowflake className="w-5 h-5 text-blue-400 animate-spin-slow"/>
                                </div>
                                <div>
                                    <h3 className="text-blue-400 font-bold text-sm">{t('seasonal_theme')}</h3>
                                    <p className="text-xs text-blue-400/70 mt-0.5">{t('seasonal_theme')}</p>
                                </div>
                            </div>
                            <div className={`w-12 h-6 rounded-full p-1 transition-all duration-300 relative ${config.seasonalTheme ? 'bg-blue-500' : 'bg-blue-500/20'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300 ${config.seasonalTheme ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </div>
                        </motion.section>
                    )}
                </div>

                {/* Accent Color */}
                <section>
                    <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">{t('accent_color')}</h3>
                    <div className="flex items-center gap-6 bg-[var(--card-bg)] p-6 rounded-[2.5rem] border border-[var(--glass-border)] shadow-sm">
                        <div className="relative group shrink-0">
                            <input 
                                type="color" 
                                value={config.accentColor}
                                onChange={(e) => onUpdate({ accentColor: e.target.value })}
                                className="w-16 h-16 rounded-full overflow-hidden cursor-pointer border-none p-0 bg-transparent transition-transform hover:scale-105 active:scale-95 shadow-md"
                            />
                            <div className="absolute inset-0 rounded-full border-2 border-[var(--glass-border)] pointer-events-none group-hover:border-[var(--text-main)]/30 transition-colors"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-[var(--text-main)] tracking-tight">{t('accent_color')}</span>
                            <span className="text-[var(--text-muted)] text-xs mt-1">{t('personalization')}</span>
                        </div>
                    </div>
                </section>

                {/* Background Source */}
                <div className="space-y-8 transition-all duration-500">
                    <section>
                        <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">{t('background')}</h3>
                        <div className="grid grid-cols-2 gap-4">
                        
                        {/* Liquid (Default) */}
                        <button 
                            onClick={() => onUpdate({ backgroundType: 'liquid' })}
                            className={`h-32 rounded-[2.5rem] border flex flex-col items-center justify-center gap-2 transition-all ${
                            config.backgroundType === 'liquid' 
                                ? 'border-[var(--text-main)] bg-[var(--text-main)]/5 shadow-md' 
                                : 'border-[var(--glass-border)] bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                        >
                            <Droplet className={`w-8 h-8 ${config.backgroundType === 'liquid' ? 'text-[var(--text-main)]' : 'opacity-50'}`} />
                            <span className="text-xs font-bold uppercase tracking-wider">{t('liquid_bg')}</span>
                        </button>

                        {/* Image/Video Upload */}
                        <button 
                            onClick={() => {
                                if (config.backgroundSource) {
                                    const isVideo = config.backgroundSource.startsWith('data:video');
                                    onUpdate({ backgroundType: isVideo ? 'video' : 'image' });
                                } else {
                                    fileInputRef.current?.click();
                                }
                            }}
                            onDoubleClick={() => {
                                fileInputRef.current?.click();
                            }}
                            className={`h-32 rounded-[2.5rem] border border-dashed flex flex-col items-center justify-center gap-2 transition-all relative overflow-hidden ${
                                config.backgroundType !== 'liquid' ? 'border-[var(--text-main)] bg-[var(--text-main)]/5 shadow-md' : 'border-[var(--glass-border)] bg-[var(--card-bg)] hover:border-[var(--text-main)]/50 hover:bg-[var(--card-hover)]'
                            }`}
                        >
                            {config.backgroundType !== 'liquid' && config.backgroundSource ? (
                                <>
                                    {config.backgroundType === 'video' ? (
                                        <video src={config.backgroundSource} className="absolute inset-0 w-full h-full object-cover opacity-50" autoPlay muted loop />
                                    ) : (
                                        <img src={config.backgroundSource} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                    )}
                                    <div className="relative z-10 bg-[var(--text-main)] text-[var(--bg-main)] px-4 py-1.5 rounded-full flex items-center gap-1.5 font-bold text-[10px] uppercase tracking-wider shadow-md">
                                        <Check className="w-3 h-3" />
                                        <span>{t('done')}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-[var(--text-muted)]/50" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]/70">{t('custom_bg')}</span>
                                </>
                            )}
                        </button>
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*,video/*"
                            onChange={handleFileChange}
                        />
                    </section>

                    {/* Sliders */}
                    <section className="space-y-8 bg-[var(--card-bg)] p-6 rounded-[2.5rem] border border-[var(--glass-border)] shadow-sm transition-all duration-500">
                        <div className={`transition-all duration-500 ${config.enableGlass ? 'opacity-100' : 'opacity-40 grayscale pointer-events-none'}`}>
                            <div className="flex justify-between mb-3 items-end">
                                <span className="text-sm font-bold text-[var(--text-main)] tracking-tight">{t('blur')}</span>
                                <span className="text-xs font-semibold text-[var(--text-muted)]">{config.blurLevel}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={config.blurLevel}
                                onChange={(e) => onUpdate({ blurLevel: parseInt(e.target.value) })}
                                className="w-full h-2 bg-[var(--text-muted)]/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[var(--text-main)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all shadow-2xl"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-4 items-end">
                                <span className="text-lg font-black text-[var(--text-main)] tracking-tight">{t('brightness')}</span>
                                <span className="text-sm font-bold text-[var(--text-muted)]">{Math.round(config.brightness * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="90" 
                                value={config.brightness * 100}
                                onChange={(e) => onUpdate({ brightness: parseInt(e.target.value) / 100 })}
                                className="w-full h-2 bg-[var(--text-muted)]/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[var(--text-main)] [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all shadow-2xl"
                            />
                        </div>
                    </section>
                </div>

                {/* DELETE ZONE */}
                <section className="pt-12 mt-12 border-t border-[var(--glass-border)]">
                    <button 
                        onClick={onClearLibrary}
                        className="w-full py-6 rounded-[32px] border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group active:scale-95"
                    >
                        <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        {t('delete')}
                    </button>
                    <p className="text-center text-[10px] font-bold text-[var(--text-muted)]/10 uppercase tracking-widest mt-4">{t('delete_warning')}</p>
                </section>
            </div>
          )}

          {/* VIEW: ABOUT */}
          {view === 'about' && (
              <div className="space-y-10 animate-scale-in">
                  <div className="flex flex-col items-center justify-center mb-12 pt-6">
                      <div className="w-28 h-28 rounded-[40px] bg-[var(--card-bg)] shadow-2xl flex items-center justify-center mb-6 border border-[var(--glass-border)]">
                          <span className="text-5xl">🎵</span>
                      </div>
                      <h3 className="text-4xl font-black text-[var(--text-main)] tracking-tighter">Glass Music</h3>
                      <p className="text-[var(--text-muted)] font-black text-xs uppercase tracking-[0.4em] mt-2">v1.9.0 Liquid Edition</p>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-[var(--card-bg)] p-10 rounded-[40px] border border-[var(--glass-border)]">
                          <h4 className="text-[var(--text-main)] font-black text-xl mb-4 tracking-tight">✨ {t('philosophy')}</h4>
                          <p className="text-[var(--text-main)]/50 font-medium leading-relaxed">
                              {t('philosophy_text')}
                          </p>
                      </div>

                      <div className="bg-red-500/10 p-10 rounded-[40px] border border-red-500/20">
                          <h4 className="text-red-400 font-black text-xl mb-4 tracking-tight">🚫 {t('privacy')}</h4>
                          <p className="text-red-200/60 font-medium leading-relaxed">
                              {t('privacy_text')}
                          </p>
                      </div>

                      <div className="bg-[var(--card-bg)] p-10 rounded-[40px] border border-[var(--glass-border)]">
                          <h4 className="text-[var(--text-main)] font-black text-xl mb-4 tracking-tight">⚖️ Open Source</h4>
                          <p className="text-[var(--text-main)]/50 font-medium mb-8">
                              {t('opensource_text')}
                          </p>
                          <button 
                             onClick={() => {
                                 const url = "https://github.com/dvytvs/Glass-Music.git";
                                 if ((window as any).require) {
                                     const { shell } = (window as any).require('electron');
                                     shell.openExternal(url);
                                 } else {
                                     window.open(url, '_blank');
                                 }
                             }}
                             className="block w-full py-5 bg-[var(--text-main)] text-[var(--bg-main)] text-center font-black rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
                          >
                              GitHub Repository
                          </button>
                      </div>

                      <div className="text-center pt-8 pb-4">
                          <p className="text-[10px] font-black text-[var(--text-muted)]/10 uppercase tracking-[0.4em]">Designed with ❤️ by Glass Music Team</p>
                      </div>
                  </div>
              </div>
          )}

        </div>
        
        {view === 'settings' && (
            <div className="p-10 border-t border-[var(--glass-border)] bg-[var(--card-bg)]/20 flex justify-end shrink-0">
                <button 
                    onClick={onClose}
                    className="px-12 py-5 rounded-full font-black text-sm uppercase tracking-widest text-white shadow-2xl hover:scale-105 active:scale-95 transition-all border-0"
                    style={{ backgroundColor: config.accentColor }}
                >
                    {t('save')}
                </button>
            </div>
        )}
      </motion.div>
    </motion.div>
    )}
    </AnimatePresence>
  );
};

export default SettingsModal;
