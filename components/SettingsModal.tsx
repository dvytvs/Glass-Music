
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in-view">
      <div 
        className="w-full max-w-2xl bg-[#1c1c1e]/80 border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-zoom-in backdrop-blur-xl glass-panel relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
              {view === 'about' && (
                  <button onClick={() => setView('settings')} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                      <ArrowLeft className="w-5 h-5 text-white" />
                  </button>
              )}
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                {view === 'about' ? 'О проекте Glass Music' : 'Настройки'}
              </h2>
          </div>
          <div className="flex items-center gap-2">
              {view === 'settings' && (
                <button 
                    onClick={() => setView('about')} 
                    className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-[var(--accent)]"
                    style={{ color: config.accentColor }}
                    title="О проекте"
                >
                    <AlertCircle className="w-5 h-5" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white">
                <X className="w-5 h-5" />
              </button>
          </div>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 relative">
          
          {/* VIEW: SETTINGS */}
          {view === 'settings' && (
            <div className="space-y-8 animate-fade-in-view">
                {/* Player Style Toggle */}
                <section className="bg-white/5 p-4 rounded-2xl border border-white/10">
                     <h3 className="text-white font-medium flex items-center gap-2 mb-3"><LayoutGrid className="w-4 h-4"/> Стиль плеера</h3>
                     <div className="flex gap-2">
                         <button 
                            onClick={() => onUpdate({ playerStyle: 'floating' })}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${config.playerStyle === 'floating' ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                         >
                             Floating (Островок)
                         </button>
                         <button 
                            onClick={() => onUpdate({ playerStyle: 'classic' })}
                            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${config.playerStyle === 'classic' ? 'bg-white text-black shadow-lg' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                         >
                             Classic (Классика)
                         </button>
                     </div>
                </section>

                {/* Glass Toggle */}
                <section className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div>
                        <h3 className="text-white font-medium flex items-center gap-2"><Droplet className="w-4 h-4"/> Liquid Glass</h3>
                        <p className="text-sm text-white/40">Отключите для повышения производительности</p>
                    </div>
                    <button 
                        onClick={() => onUpdate({ enableGlass: !config.enableGlass })}
                        className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${config.enableGlass ? 'bg-green-500' : 'bg-white/10'}`}
                        style={{ backgroundColor: config.enableGlass ? config.accentColor : undefined }}
                    >
                        <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${config.enableGlass ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                </section>
                
                {/* Seasonal Theme (Visible only in winter) */}
                {isWinterSeason && (
                    <section className="flex items-center justify-between bg-gradient-to-r from-blue-900/40 to-indigo-900/40 p-4 rounded-2xl border border-blue-500/30">
                        <div>
                            <h3 className="text-white font-medium flex items-center gap-2"><Snowflake className="w-4 h-4 text-blue-300"/> Праздничное настроение</h3>
                            <p className="text-sm text-blue-200/60">Включить снег и гирлянды</p>
                        </div>
                        <button 
                            onClick={() => onUpdate({ seasonalTheme: !config.seasonalTheme })}
                            className={`w-14 h-8 rounded-full p-1 transition-colors duration-300 relative ${config.seasonalTheme ? 'bg-blue-500' : 'bg-white/10'}`}
                        >
                            <div className={`w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${config.seasonalTheme ? 'translate-x-6' : 'translate-x-0'}`}></div>
                        </button>
                    </section>
                )}

                {/* Accent Color */}
                <section>
                    <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">Акцентный цвет</h3>
                    <div className="flex items-center gap-4">
                    <div className="relative group">
                        <input 
                        type="color" 
                        value={config.accentColor}
                        onChange={(e) => onUpdate({ accentColor: e.target.value })}
                        className="w-16 h-16 rounded-full overflow-hidden cursor-pointer border-none p-0 bg-transparent transition-transform hover:scale-105 active:scale-95 shadow-lg"
                        />
                        <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none ring-4 ring-white/5"></div>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-white font-medium">Основной цвет</span>
                        <span className="text-white/40 text-sm">Влияет на кнопки, иконки и выделение</span>
                    </div>
                    </div>
                </section>

                {/* Background Source */}
                <div className={`space-y-8 transition-all duration-300 ${config.enableGlass ? 'opacity-100 max-h-[1000px]' : 'opacity-30 max-h-[100px] grayscale pointer-events-none'}`}>
                    <section>
                        <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">Задний фон</h3>
                        <div className="grid grid-cols-3 gap-4">
                        
                        {/* Liquid (Default) */}
                        <button 
                            onClick={() => onUpdate({ backgroundType: 'liquid' })}
                            className={`h-32 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all glass-button ${
                            config.backgroundType === 'liquid' 
                                ? 'border-[var(--accent-color)] bg-white/10' 
                                : 'border-white/10 hover:bg-white/5'
                            }`}
                            style={{ borderColor: config.backgroundType === 'liquid' ? config.accentColor : '' }}
                        >
                            <Droplet className={`w-8 h-8 ${config.backgroundType === 'liquid' ? 'text-[var(--accent-color)]' : 'text-white/40'}`} style={{ color: config.backgroundType === 'liquid' ? config.accentColor : '' }} />
                            <span className="text-sm font-medium text-white">Стандарт</span>
                        </button>

                        {/* Image/Video Upload */}
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className={`h-32 rounded-2xl border border-dashed border-white/20 flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-white/40 hover:bg-white/5 relative overflow-hidden glass-button ${
                                config.backgroundType !== 'liquid' ? 'border-solid border-[var(--accent-color)]' : ''
                            }`}
                            style={{ borderColor: config.backgroundType !== 'liquid' ? config.accentColor : '' }}
                        >
                            {config.backgroundType !== 'liquid' && config.backgroundSource ? (
                                <>
                                    {config.backgroundType === 'video' ? (
                                        <video src={config.backgroundSource} className="absolute inset-0 w-full h-full object-cover opacity-50" autoPlay muted loop />
                                    ) : (
                                        <img src={config.backgroundSource} className="absolute inset-0 w-full h-full object-cover opacity-50" />
                                    )}
                                    <div className="relative z-10 bg-black/50 px-3 py-1 rounded-full flex items-center gap-2 backdrop-blur-md">
                                        <Check className="w-4 h-4 text-white" />
                                        <span className="text-sm text-white">Загружено</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <Upload className="w-8 h-8 text-white/40" />
                                    <span className="text-sm font-medium text-white/60">Загрузить Файл</span>
                                    <span className="text-xs text-white/40">Фото или Видео</span>
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
                    <section className="space-y-6">
                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-white">Размытие (Blur)</span>
                                <span className="text-sm text-white/40">{config.blurLevel}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={config.blurLevel}
                                onChange={(e) => onUpdate({ blurLevel: parseInt(e.target.value) })}
                                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all shadow-lg"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-medium text-white">Затемнение</span>
                                <span className="text-sm text-white/40">{Math.round(config.brightness * 100)}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="90" 
                                value={config.brightness * 100}
                                onChange={(e) => onUpdate({ brightness: parseInt(e.target.value) / 100 })}
                                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full hover:[&::-webkit-slider-thumb]:scale-110 transition-all shadow-lg"
                            />
                        </div>
                    </section>
                </div>

                {/* DELETE ZONE */}
                <section className="pt-8 mt-12 border-t border-white/5">
                    <button 
                        onClick={onClearLibrary}
                        className="w-full py-4 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-medium transition-all flex items-center justify-center gap-2 group"
                    >
                        <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        Удалить все треки и данные
                    </button>
                    <p className="text-center text-xs text-white/20 mt-2">Это действие необратимо и удалит всю локальную медиатеку.</p>
                </section>
            </div>
          )}

          {/* VIEW: ABOUT */}
          {view === 'about' && (
              <div className="space-y-6 animate-zoom-in text-white/80 leading-relaxed">
                  <div className="flex flex-col items-center justify-center mb-8 pt-4">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500 to-violet-600 shadow-[0_0_40px_rgba(219,39,119,0.3)] flex items-center justify-center mb-4">
                          <span className="text-4xl">🎵</span>
                      </div>
                      <h3 className="text-2xl font-bold text-white">Glass Music</h3>
                      <p className="text-white/40 font-mono text-sm mt-1">v1.8.2 (Liquid Glass)</p>
                  </div>

                  <div className="space-y-4">
                      <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-white font-bold mb-2 flex items-center gap-2">✨ Философия</h4>
                          <p className="text-sm">
                              Glass Music — это экспериментальный музыкальный плеер, созданный с упором на эстетику и приватность. 
                              Вдохновлен концептами "Liquid Metal" и "Glassmorphism".
                          </p>
                      </div>

                      <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20">
                          <h4 className="text-red-200 font-bold mb-3 flex items-center gap-2">🚫 МАНИФЕСТ О ПРИВАТНОСТИ</h4>
                          <p className="text-sm text-red-100/90 leading-relaxed">
                              Мы считаем, что продажа пользовательских данных корпорациями — это низкий и недостойный поступок. Это фундаментальное нарушение прав человека на цифровую анонимность. 
                              <br/><br/>
                              Glass Music **гарантирует**, что ваши данные остаются только на вашем устройстве. Мы не собираем статистику, не отслеживаем прослушивания и не передаем информацию третьим лицам.
                          </p>
                      </div>

                      <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                          <h4 className="text-white font-bold mb-2 flex items-center gap-2">⚖️ Open Source</h4>
                          <p className="text-sm mb-4">
                              Проект полностью открыт. Вы можете проверить каждую строчку кода и убедиться в нашей честности.
                          </p>
                          <a 
                             href="https://github.com/dvytvs/Glass-Music.git" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="block w-full py-3 bg-white text-black text-center font-bold rounded-xl hover:bg-white/90 transition-colors"
                          >
                              Открыть репозиторий GitHub
                          </a>
                      </div>

                      <div className="text-center pt-8 pb-4">
                          <p className="text-xs text-white/20">Designed with ❤️ by Glass Music Team</p>
                      </div>
                  </div>
              </div>
          )}

        </div>
        
        {view === 'settings' && (
            <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end shrink-0">
                <button 
                    onClick={onClose}
                    className="px-8 py-3 rounded-xl font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all glass-button border-0"
                    style={{ backgroundColor: config.accentColor }}
                >
                    Готово
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
