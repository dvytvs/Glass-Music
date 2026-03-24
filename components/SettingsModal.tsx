
import React, { useRef, useMemo, useState } from 'react';
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-md animate-fade-in">
      <div 
        className={`w-full max-w-2xl bg-[var(--panel-bg)] border border-[var(--glass-border)] rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.2)] overflow-hidden animate-scale-in ${config.enableGlass ? 'backdrop-blur-3xl' : ''} relative flex flex-col max-h-[85vh]`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-[var(--glass-border)] shrink-0">
          <div className="flex items-center gap-4">
              {view === 'about' && (
                  <button onClick={() => setView('settings')} className="p-2 hover:bg-[var(--card-hover)] rounded-2xl transition-all active:scale-90">
                      <ArrowLeft className="w-5 h-5 text-[var(--text-main)]" />
                  </button>
              )}
              <h2 className="text-3xl font-black text-[var(--text-main)] tracking-tighter">
                {view === 'about' ? t('original') : t('settings')}
              </h2>
          </div>
          <div className="flex items-center gap-3">
              {view === 'settings' && (
                <button 
                    onClick={() => setView('about')} 
                    className="p-3 hover:bg-[var(--card-hover)] rounded-2xl transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    title={t('about')}
                >
                    <AlertCircle className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-3 hover:bg-[var(--card-hover)] rounded-2xl transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]">
                <X className="w-5 h-5" />
              </button>
          </div>
        </div>

        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 relative">
          
          {/* VIEW: SETTINGS */}
          {view === 'settings' && (
            <div className="space-y-12 animate-fade-in">
                {/* Theme Mode */}
                <section>
                     <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <Sliders className="w-4 h-4"/> {t('theme')}
                     </h3>
                     <div className="grid grid-cols-3 gap-4">
                         <button 
                            onClick={() => onUpdate({ themeMode: 'dark' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${config.themeMode === 'dark' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-2xl scale-105' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-transparent hover:bg-[var(--card-hover)]'}`}
                         >
                             {t('dark')}
                         </button>
                         <button 
                            onClick={() => onUpdate({ themeMode: 'light' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${config.themeMode === 'light' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-2xl scale-105' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-transparent hover:bg-[var(--card-hover)]'}`}
                         >
                             {t('light')}
                         </button>
                         <button 
                            onClick={() => onUpdate({ themeMode: 'system' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${config.themeMode === 'system' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-2xl scale-105' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-transparent hover:bg-[var(--card-hover)]'}`}
                         >
                             {t('system')}
                         </button>
                     </div>
                </section>

                {/* Language */}
                <section>
                     <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <LayoutGrid className="w-4 h-4"/> {t('language')}
                     </h3>
                     <div className="grid grid-cols-3 gap-4">
                         <button 
                            onClick={() => onUpdateProfile({ language: 'ru' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${userProfile.language === 'ru' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-2xl scale-105' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-transparent hover:bg-[var(--card-hover)]'}`}
                         >
                             Русский
                         </button>
                         <button 
                            onClick={() => onUpdateProfile({ language: 'en' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${userProfile.language === 'en' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-2xl scale-105' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-transparent hover:bg-[var(--card-hover)]'}`}
                         >
                             English
                         </button>
                         <button 
                            onClick={() => onUpdateProfile({ language: 'system' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${userProfile.language === 'system' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-2xl scale-105' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-transparent hover:bg-[var(--card-hover)]'}`}
                         >
                             {t('system')}
                         </button>
                     </div>
                </section>

                {/* Player Style Toggle */}
                <section>
                     <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <LayoutGrid className="w-4 h-4"/> {t('player_style')}
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                         <button 
                            onClick={() => onUpdate({ playerStyle: 'floating' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${config.playerStyle === 'floating' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-2xl scale-105' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-transparent hover:bg-[var(--card-hover)]'}`}
                         >
                             {t('player_style')} (Floating)
                         </button>
                         <button 
                            onClick={() => onUpdate({ playerStyle: 'classic' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${config.playerStyle === 'classic' ? 'bg-[var(--text-main)] text-[var(--bg-main)] border-[var(--text-main)] shadow-2xl scale-105' : 'bg-[var(--card-bg)] text-[var(--text-muted)] border-transparent hover:bg-[var(--card-hover)]'}`}
                         >
                             {t('player_style')} (Classic)
                         </button>
                     </div>
                </section>

                {/* Equalizer */}
                <section>
                     <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <Music className="w-4 h-4"/> Эквалайзер
                     </h3>
                     <div className="bg-[var(--card-bg)] p-6 rounded-[32px] border border-[var(--glass-border)]">
                        <div className="flex items-end justify-between h-48 gap-2">
                            {([32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]).map((freq, i) => {
                                const gain = config.eqBands?.[i] || 0;
                                return (
                                    <div key={freq} className="flex flex-col items-center gap-4 h-full flex-1">
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
                                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-2 -rotate-90 appearance-none bg-[var(--glass-border)] rounded-full outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--text-main)] [&::-webkit-slider-thumb]:cursor-pointer"
                                            />
                                        </div>
                                        <span className="text-[9px] font-bold text-[var(--text-muted)]">{freq >= 1000 ? `${freq/1000}k` : freq}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-between mt-6 px-2">
                            <span className="text-[10px] font-bold text-[var(--text-muted)]">-12dB</span>
                            <button 
                                onClick={() => onUpdate({ eqBands: new Array(10).fill(0) })}
                                className="text-[10px] font-bold text-[var(--text-main)] hover:underline"
                            >
                                Сбросить
                            </button>
                            <span className="text-[10px] font-bold text-[var(--text-muted)]">+12dB</span>
                        </div>
                     </div>
                </section>

                {/* Glass Toggle */}
                <section className="flex items-center justify-between bg-[var(--card-bg)] p-8 rounded-[32px] border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-all group">
                    <div>
                        <h3 className="text-[var(--text-main)] font-black text-lg tracking-tight flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                            <Droplet className="w-5 h-5" style={{ color: config.accentColor }}/> {t('glass_effect')}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] font-medium mt-1">{t('glass_effect')}</p>
                    </div>
                    <button 
                        onClick={() => onUpdate({ enableGlass: !config.enableGlass })}
                        className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 relative`}
                        style={{ backgroundColor: config.enableGlass ? 'var(--text-main)' : 'rgba(128, 128, 128, 0.3)' }}
                    >
                        <div className={`w-6 h-6 rounded-full shadow-2xl transition-all duration-500 ${config.enableGlass ? 'translate-x-7 bg-[var(--bg-main)]' : 'translate-x-0'}`}
                             style={!config.enableGlass ? { backgroundColor: 'var(--text-main)', opacity: 0.5 } : {}}></div>
                    </button>
                </section>

                {/* Animate Background Toggle */}
                <section className="flex items-center justify-between bg-[var(--card-bg)] p-8 rounded-[32px] border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-all group">
                    <div>
                        <h3 className="text-[var(--text-main)] font-black text-lg tracking-tight flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                            <Activity className="w-5 h-5" style={{ color: config.accentColor }}/> {t('animate_background')}
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] font-medium mt-1">{t('animate_background')}</p>
                    </div>
                    <button 
                        onClick={() => onUpdate({ animateBackground: !config.animateBackground })}
                        className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 relative`}
                        style={{ backgroundColor: config.animateBackground ? 'var(--text-main)' : 'rgba(128, 128, 128, 0.3)' }}
                    >
                        <div className={`w-6 h-6 rounded-full shadow-2xl transition-all duration-500 ${config.animateBackground ? 'translate-x-7 bg-[var(--bg-main)]' : 'translate-x-0'}`}
                             style={!config.animateBackground ? { backgroundColor: 'var(--text-main)', opacity: 0.5 } : {}}></div>
                    </button>
                </section>

                {/* Background Playback Toggle (Electron Only) */}
                {(window as any).require && (window as any).require('electron') && (
                    <section className="flex items-center justify-between bg-[var(--card-bg)] p-8 rounded-[32px] border border-[var(--glass-border)] hover:bg-[var(--card-hover)] transition-all group">
                        <div>
                            <h3 className="text-[var(--text-main)] font-black text-lg tracking-tight flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                                <Music className="w-5 h-5" style={{ color: config.accentColor }}/> {t('background_playback')}
                            </h3>
                            <p className="text-sm text-[var(--text-muted)] font-medium mt-1">{t('background_playback_desc')}</p>
                        </div>
                        <button 
                            onClick={() => onUpdate({ enableBackgroundPlayback: !config.enableBackgroundPlayback })}
                            className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 relative`}
                            style={{ backgroundColor: config.enableBackgroundPlayback ? 'var(--text-main)' : 'rgba(128, 128, 128, 0.3)' }}
                        >
                            <div className={`w-6 h-6 rounded-full shadow-2xl transition-all duration-500 ${config.enableBackgroundPlayback ? 'translate-x-7 bg-[var(--bg-main)]' : 'translate-x-0'}`}
                                 style={!config.enableBackgroundPlayback ? { backgroundColor: 'var(--text-main)', opacity: 0.5 } : {}}></div>
                        </button>
                    </section>
                )}
                
                {/* Seasonal Theme (Visible only in winter) */}
                {isWinterSeason && (
                    <section className="flex items-center justify-between bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-8 rounded-[32px] border border-blue-500/20 hover:scale-[1.02] transition-all">
                        <div>
                            <h3 className="text-white font-black text-lg tracking-tight flex items-center gap-3">
                                <Snowflake className="w-5 h-5 text-blue-400 animate-spin-slow"/> {t('seasonal_theme')}
                            </h3>
                            <p className="text-sm text-blue-200/40 font-medium mt-1">{t('seasonal_theme')}</p>
                        </div>
                        <button 
                            onClick={() => onUpdate({ seasonalTheme: !config.seasonalTheme })}
                            className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 relative ${config.seasonalTheme ? 'bg-blue-400' : 'bg-white/10'}`}
                        >
                            <div className={`w-6 h-6 rounded-full shadow-2xl transition-all duration-500 ${config.seasonalTheme ? 'translate-x-7 bg-white' : 'translate-x-0 bg-white/40'}`}></div>
                        </button>
                    </section>
                )}

                {/* Accent Color */}
                <section>
                    <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6">{t('accent_color')}</h3>
                    <div className="flex items-center gap-8 bg-[var(--card-bg)] p-8 rounded-[32px] border border-[var(--glass-border)]">
                        <div className="relative group">
                            <input 
                                type="color" 
                                value={config.accentColor}
                                onChange={(e) => onUpdate({ accentColor: e.target.value })}
                                className="w-20 h-20 rounded-[24px] overflow-hidden cursor-pointer border-none p-0 bg-transparent transition-all hover:scale-110 active:scale-90 shadow-2xl"
                            />
                            <div className="absolute inset-0 rounded-[24px] border-4 border-[var(--glass-border)] pointer-events-none group-hover:border-[var(--text-main)]/20 transition-colors"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-[var(--text-main)] tracking-tight">{t('accent_color')}</span>
                            <span className="text-[var(--text-muted)] font-medium text-sm mt-1">{t('personalization')}</span>
                        </div>
                    </div>
                </section>

                {/* Background Source */}
                <div className="space-y-12 transition-all duration-500">
                    <section>
                        <h3 className="text-[11px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em] mb-6">{t('background')}</h3>
                        <div className="grid grid-cols-2 gap-6">
                        
                        {/* Liquid (Default) */}
                        <button 
                            onClick={() => onUpdate({ backgroundType: 'liquid' })}
                            className={`h-40 rounded-[32px] border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                            config.backgroundType === 'liquid' 
                                ? 'border-[var(--text-main)] bg-[var(--text-main)]/10 shadow-2xl scale-105' 
                                : 'border-transparent bg-[var(--card-bg)] hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]/60'
                            }`}
                        >
                            <Droplet className={`w-10 h-10 ${config.backgroundType === 'liquid' ? 'text-[var(--text-main)]' : 'opacity-40'}`} />
                            <span className="text-sm font-black uppercase tracking-widest">{t('liquid_bg')}</span>
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
                            className={`h-40 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden ${
                                config.backgroundType !== 'liquid' ? 'border-[var(--text-main)] bg-[var(--text-main)]/10 shadow-2xl scale-105' : 'border-[var(--glass-border)] bg-[var(--card-bg)] hover:border-[var(--text-main)]/30 hover:bg-[var(--card-hover)]'
                            }`}
                        >
                            {config.backgroundType !== 'liquid' && config.backgroundSource ? (
                                <>
                                    {config.backgroundType === 'video' ? (
                                        <video src={config.backgroundSource} className="absolute inset-0 w-full h-full object-cover opacity-40" autoPlay muted loop />
                                    ) : (
                                        <img src={config.backgroundSource} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                                    )}
                                    <div className="relative z-10 bg-[var(--text-main)] text-[var(--bg-main)] px-5 py-2 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-2xl">
                                        <Check className="w-4 h-4" />
                                        <span>{t('done')}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-[var(--text-muted)]/20" />
                                    <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]/40">{t('custom_bg')}</span>
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
                    <section className="space-y-10 bg-[var(--card-bg)] p-10 rounded-[40px] border border-[var(--glass-border)] transition-all duration-500">
                        <div className={`transition-all duration-500 ${config.enableGlass ? 'opacity-100' : 'opacity-20 grayscale pointer-events-none'}`}>
                            <div className="flex justify-between mb-4 items-end">
                                <span className="text-lg font-black text-[var(--text-main)] tracking-tight">{t('blur')}</span>
                                <span className="text-sm font-bold text-[var(--text-muted)]">{config.blurLevel}px</span>
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
                             className="block w-full py-5 bg-[var(--text-main)] text-[var(--bg-main)] text-center font-black rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-2xl"
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
                    className="px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest text-white shadow-2xl hover:scale-105 active:scale-95 transition-all border-0"
                    style={{ backgroundColor: config.accentColor }}
                >
                    {t('save')}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
