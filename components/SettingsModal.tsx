
import React, { useRef, useMemo, useState } from 'react';
import { X, Image, Video, Droplet, Upload, Check, Sliders, Snowflake, Trash2, ArrowLeft, LayoutGrid } from './Icons';
// Import AlertCircle directly from lucide if possible, or add it to Icons.tsx. Assuming standard set.
import { AlertCircle } from 'lucide-react'; 
import { ThemeConfig } from '../types';
import { fileToDataURL } from '../utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ThemeConfig;
  onUpdate: (newConfig: Partial<ThemeConfig>) => void;
  onClearLibrary: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, config, onUpdate, onClearLibrary }) => {
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-2xl animate-fade-in">
      <div 
        className="w-full max-w-2xl bg-[#0a0a0a]/80 border border-white/10 rounded-[40px] shadow-[0_40px_80px_rgba(0,0,0,0.8)] overflow-hidden animate-scale-in backdrop-blur-3xl relative flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-4">
              {view === 'about' && (
                  <button onClick={() => setView('settings')} className="p-2 hover:bg-white/10 rounded-2xl transition-all active:scale-90">
                      <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
              )}
              <h2 className="text-3xl font-black text-white tracking-tighter">
                {view === 'about' ? 'О проекте' : 'Настройки'}
              </h2>
          </div>
          <div className="flex items-center gap-3">
              {view === 'settings' && (
                <button 
                    onClick={() => setView('about')} 
                    className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white"
                    title="О проекте"
                >
                    <AlertCircle className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
          </div>
        </div>

        <div className="p-10 overflow-y-auto custom-scrollbar flex-1 relative">
          
          {/* VIEW: SETTINGS */}
          {view === 'settings' && (
            <div className="space-y-12 animate-fade-in">
                {/* Player Style Toggle */}
                <section>
                     <h3 className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                        <LayoutGrid className="w-4 h-4"/> Стиль интерфейса
                     </h3>
                     <div className="grid grid-cols-2 gap-4">
                         <button 
                            onClick={() => onUpdate({ playerStyle: 'floating' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${config.playerStyle === 'floating' ? 'bg-white text-black border-white shadow-2xl scale-105' : 'bg-white/[0.03] text-white/40 border-transparent hover:bg-white/[0.06]'}`}
                         >
                             Островок (Floating)
                         </button>
                         <button 
                            onClick={() => onUpdate({ playerStyle: 'classic' })}
                            className={`py-5 rounded-3xl text-sm font-black transition-all border-2 ${config.playerStyle === 'classic' ? 'bg-white text-black border-white shadow-2xl scale-105' : 'bg-white/[0.03] text-white/40 border-transparent hover:bg-white/[0.06]'}`}
                         >
                             Классика (Classic)
                         </button>
                     </div>
                </section>

                {/* Glass Toggle */}
                <section className="flex items-center justify-between bg-white/[0.03] p-8 rounded-[32px] border border-white/5 hover:bg-white/[0.05] transition-all group">
                    <div>
                        <h3 className="text-white font-black text-lg tracking-tight flex items-center gap-3 group-hover:translate-x-1 transition-transform">
                            <Droplet className="w-5 h-5" style={{ color: config.accentColor }}/> Liquid Glass
                        </h3>
                        <p className="text-sm text-white/30 font-medium mt-1">Эффекты размытия и прозрачности</p>
                    </div>
                    <button 
                        onClick={() => onUpdate({ enableGlass: !config.enableGlass })}
                        className={`w-16 h-9 rounded-full p-1.5 transition-all duration-500 relative ${config.enableGlass ? 'bg-white' : 'bg-white/10'}`}
                    >
                        <div className={`w-6 h-6 rounded-full shadow-2xl transition-all duration-500 ${config.enableGlass ? 'translate-x-7 bg-black' : 'translate-x-0 bg-white/40'}`}></div>
                    </button>
                </section>
                
                {/* Seasonal Theme (Visible only in winter) */}
                {isWinterSeason && (
                    <section className="flex items-center justify-between bg-gradient-to-br from-blue-600/20 to-indigo-600/20 p-8 rounded-[32px] border border-blue-500/20 hover:scale-[1.02] transition-all">
                        <div>
                            <h3 className="text-white font-black text-lg tracking-tight flex items-center gap-3">
                                <Snowflake className="w-5 h-5 text-blue-400 animate-spin-slow"/> Зимняя сказка
                            </h3>
                            <p className="text-sm text-blue-200/40 font-medium mt-1">Снег и праздничное оформление</p>
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
                    <h3 className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">Цветовая палитра</h3>
                    <div className="flex items-center gap-8 bg-white/[0.03] p-8 rounded-[32px] border border-white/5">
                        <div className="relative group">
                            <input 
                                type="color" 
                                value={config.accentColor}
                                onChange={(e) => onUpdate({ accentColor: e.target.value })}
                                className="w-20 h-20 rounded-[24px] overflow-hidden cursor-pointer border-none p-0 bg-transparent transition-all hover:scale-110 active:scale-90 shadow-2xl"
                            />
                            <div className="absolute inset-0 rounded-[24px] border-4 border-white/10 pointer-events-none group-hover:border-white/20 transition-colors"></div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-white tracking-tight">Акцентный цвет</span>
                            <span className="text-white/30 font-medium text-sm mt-1">Персонализируйте интерфейс под свой вкус</span>
                        </div>
                    </div>
                </section>

                {/* Background Source */}
                <div className="space-y-12 transition-all duration-500">
                    <section>
                        <h3 className="text-[11px] font-black text-white/20 uppercase tracking-[0.3em] mb-6">Задний фон</h3>
                        <div className="grid grid-cols-2 gap-6">
                        
                        {/* Liquid (Default) */}
                        <button 
                            onClick={() => onUpdate({ backgroundType: 'liquid' })}
                            className={`h-40 rounded-[32px] border-2 flex flex-col items-center justify-center gap-3 transition-all ${
                            config.backgroundType === 'liquid' 
                                ? 'border-white bg-white/10 shadow-2xl scale-105' 
                                : 'border-transparent bg-white/[0.03] hover:bg-white/[0.06] text-white/40 hover:text-white/60'
                            }`}
                        >
                            <Droplet className={`w-10 h-10 ${config.backgroundType === 'liquid' ? 'text-white' : 'opacity-40'}`} />
                            <span className="text-sm font-black uppercase tracking-widest">Стандарт</span>
                        </button>

                        {/* Image/Video Upload */}
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={`h-40 rounded-[32px] border-2 border-dashed flex flex-col items-center justify-center gap-3 transition-all relative overflow-hidden ${
                                config.backgroundType !== 'liquid' ? 'border-white bg-white/10 shadow-2xl scale-105' : 'border-white/10 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.06]'
                            }`}
                        >
                            {config.backgroundType !== 'liquid' && config.backgroundSource ? (
                                <>
                                    {config.backgroundType === 'video' ? (
                                        <video src={config.backgroundSource} className="absolute inset-0 w-full h-full object-cover opacity-40" autoPlay muted loop />
                                    ) : (
                                        <img src={config.backgroundSource} className="absolute inset-0 w-full h-full object-cover opacity-40" />
                                    )}
                                    <div className="relative z-10 bg-white text-black px-5 py-2 rounded-2xl flex items-center gap-2 font-black text-xs uppercase tracking-widest shadow-2xl">
                                        <Check className="w-4 h-4" />
                                        <span>Готово</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-10 h-10 text-white/20" />
                                    <span className="text-xs font-black uppercase tracking-widest text-white/40">Свой фон</span>
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
                    <section className={`space-y-10 bg-white/[0.03] p-10 rounded-[40px] border border-white/5 transition-all duration-500 ${config.enableGlass ? 'opacity-100' : 'opacity-20 grayscale pointer-events-none scale-95'}`}>
                        <div>
                            <div className="flex justify-between mb-4 items-end">
                                <span className="text-lg font-black text-white tracking-tight">Размытие</span>
                                <span className="text-sm font-bold text-white/20">{config.blurLevel}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={config.blurLevel}
                                onChange={(e) => onUpdate({ blurLevel: parseInt(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all shadow-2xl"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-4 items-end">
                                <span className="text-lg font-black text-white tracking-tight">Затемнение</span>
                                <span className="text-sm font-bold text-white/20">{Math.round(config.brightness * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="90" 
                                value={config.brightness * 100}
                                onChange={(e) => onUpdate({ brightness: parseInt(e.target.value) / 100 })}
                                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-125 transition-all shadow-2xl"
                            />
                        </div>
                    </section>
                </div>

                {/* DELETE ZONE */}
                <section className="pt-12 mt-12 border-t border-white/5">
                    <button 
                        onClick={onClearLibrary}
                        className="w-full py-6 rounded-[32px] border-2 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-500 font-black text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group active:scale-95"
                    >
                        <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Очистить медиатеку
                    </button>
                    <p className="text-center text-[10px] font-bold text-white/10 uppercase tracking-widest mt-4">Это действие удалит все ваши песни и настройки</p>
                </section>
            </div>
          )}

          {/* VIEW: ABOUT */}
          {view === 'about' && (
              <div className="space-y-10 animate-scale-in">
                  <div className="flex flex-col items-center justify-center mb-12 pt-6">
                      <div className="w-28 h-28 rounded-[40px] bg-gradient-to-br from-white/20 to-white/5 shadow-2xl flex items-center justify-center mb-6 border border-white/10">
                          <span className="text-5xl">🎵</span>
                      </div>
                      <h3 className="text-4xl font-black text-white tracking-tighter">Glass Music</h3>
                      <p className="text-white/20 font-black text-xs uppercase tracking-[0.4em] mt-2">v1.9.0 Liquid Edition</p>
                  </div>

                  <div className="space-y-6">
                      <div className="bg-white/[0.03] p-10 rounded-[40px] border border-white/5">
                          <h4 className="text-white font-black text-xl mb-4 tracking-tight">✨ Философия</h4>
                          <p className="text-white/50 font-medium leading-relaxed">
                              Glass Music — это манифест против сложности. Мы верим в чистую эстетику, 
                              плавные линии и музыку, которая не отвлекает. 
                              Вдохновлен концептами "Liquid Metal" и "Glassmorphism".
                          </p>
                      </div>

                      <div className="bg-red-500/10 p-10 rounded-[40px] border border-red-500/20">
                          <h4 className="text-red-400 font-black text-xl mb-4 tracking-tight">🚫 ПРИВАТНОСТЬ</h4>
                          <p className="text-red-200/60 font-medium leading-relaxed">
                              Твои данные — это твоя жизнь. Мы не собираем статистику, не отслеживаем прослушивания 
                              и не передаем информацию третьим лицам. Всё остается только на твоем устройстве.
                          </p>
                      </div>

                      <div className="bg-white/[0.03] p-10 rounded-[40px] border border-white/5">
                          <h4 className="text-white font-black text-xl mb-4 tracking-tight">⚖️ Open Source</h4>
                          <p className="text-white/50 font-medium mb-8">
                              Проект полностью открыт. Вы можете проверить каждую строчку кода и убедиться в нашей честности.
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
                             className="block w-full py-5 bg-white text-black text-center font-black rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-2xl"
                          >
                              GitHub Repository
                          </button>
                      </div>

                      <div className="text-center pt-8 pb-4">
                          <p className="text-[10px] font-black text-white/10 uppercase tracking-[0.4em]">Designed with ❤️ by Glass Music Team</p>
                      </div>
                  </div>
              </div>
          )}

        </div>
        
        {view === 'settings' && (
            <div className="p-10 border-t border-white/5 bg-white/[0.02] flex justify-end shrink-0">
                <button 
                    onClick={onClose}
                    className="px-12 py-5 rounded-3xl font-black text-sm uppercase tracking-widest text-white shadow-2xl hover:scale-105 active:scale-95 transition-all border-0"
                    style={{ backgroundColor: config.accentColor }}
                >
                    Сохранить
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;