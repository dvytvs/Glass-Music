
import React, { useState } from 'react';
import { X, ArrowRight, User, Palette, Droplet, Check } from './Icons';
import { ThemeConfig, UserProfile } from '../types';

interface OnboardingModalProps {
  onComplete: (profile: Partial<UserProfile>, theme: Partial<ThemeConfig>) => void;
  accentColor: string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, accentColor }) => {
  const [step, setStep] = useState(1);
  const [tempProfile, setTempProfile] = useState<Partial<UserProfile>>({ name: '' });
  const [tempTheme, setTempTheme] = useState<Partial<ThemeConfig>>({
    accentColor: '#db2777',
    backgroundType: 'liquid'
  });

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

  const handleFinish = () => {
    onComplete({ ...tempProfile, onboardingDone: true }, tempTheme);
  };

  const renderRemAvatar = () => (
    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 shadow-2xl flex items-center justify-center relative overflow-hidden animate-bounce-slow border-4 border-white/20">
        <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="48" fill="#60a5fa" />
            <path d="M20 40 Q 50 10 80 40" stroke="#1e40af" strokeWidth="4" fill="none" />
            <circle cx="35" cy="45" r="5" fill="white" />
            <circle cx="65" cy="45" r="5" fill="white" />
            <circle cx="35" cy="45" r="2" fill="black" />
            <circle cx="65" cy="45" r="2" fill="black" />
            <path d="M40 65 Q 50 75 60 65" stroke="white" strokeWidth="3" fill="none" />
            <path d="M10 50 Q 0 30 20 20 Q 50 0 80 20 Q 100 30 90 50" fill="#2563eb" opacity="0.8" />
        </svg>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4">
      <div className="w-full max-w-xl bg-[#1c1c1e]/90 border border-white/10 rounded-[40px] shadow-2xl overflow-hidden flex flex-col items-center p-12 text-center animate-zoom-in">
        
        <div className="mb-8">{renderRemAvatar()}</div>

        <div className="w-full space-y-6">
            {step === 1 && (
                <div className="animate-fade-in-view">
                    <h2 className="text-3xl font-black text-white mb-4">Привет! Я Рэм.</h2>
                    <p className="text-white/60 text-lg leading-relaxed">
                        Я помогу тебе настроить твой новый музыкальный плеер Glass Music. <br/> Это займет всего пару минут!
                    </p>
                </div>
            )}

            {step === 2 && (
                <div className="animate-fade-in-view space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><User className="w-6 h-6"/> Как тебя зовут?</h2>
                    <input 
                        type="text" 
                        value={tempProfile.name}
                        onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })}
                        className="w-full glass-input rounded-2xl px-6 py-4 text-center text-xl font-bold"
                        placeholder="Твое имя..."
                    />
                </div>
            )}

            {step === 3 && (
                <div className="animate-fade-in-view space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><Palette className="w-6 h-6"/> Выбери свой стиль</h2>
                    <div className="flex justify-center gap-4">
                        {['#db2777', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6'].map(color => (
                            <button 
                                key={color}
                                onClick={() => setTempTheme({ ...tempTheme, accentColor: color })}
                                className={`w-12 h-12 rounded-full border-4 transition-all ${tempTheme.accentColor === color ? 'border-white scale-125' : 'border-transparent'}`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                </div>
            )}

            {step === 4 && (
                <div className="animate-fade-in-view space-y-6">
                    <h2 className="text-2xl font-bold text-white flex items-center justify-center gap-2"><Droplet className="w-6 h-6"/> Тип фона</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <button 
                            onClick={() => setTempTheme({ ...tempTheme, backgroundType: 'liquid' })}
                            className={`p-6 rounded-3xl border transition-all ${tempTheme.backgroundType === 'liquid' ? 'bg-white/10 border-white' : 'bg-white/5 border-white/10'}`}
                        >
                            <span className="font-bold">Liquid</span>
                            <p className="text-xs text-white/40 mt-1">Живой градиент</p>
                        </button>
                        <button 
                            onClick={() => setTempTheme({ ...tempTheme, backgroundType: 'image' })}
                            className={`p-6 rounded-3xl border transition-all ${tempTheme.backgroundType === 'image' ? 'bg-white/10 border-white' : 'bg-white/5 border-white/10'}`}
                        >
                            <span className="font-bold">Static</span>
                            <p className="text-xs text-white/40 mt-1">Обычный фон</p>
                        </button>
                    </div>
                </div>
            )}

            {step === 5 && (
                <div className="animate-fade-in-view space-y-6">
                    <h2 className="text-3xl font-black text-white">Готово к запуску!</h2>
                    <p className="text-white/60 text-lg">
                        Приятного прослушивания, {tempProfile.name || 'Слушатель'}! <br/> Помни: твоя музыка — твои правила.
                    </p>
                </div>
            )}
        </div>

        <div className="mt-12 flex gap-4 w-full">
            {step > 1 && (
                <button onClick={prevStep} className="flex-1 py-4 rounded-2xl glass-button font-bold text-white/60 hover:text-white transition-all">Назад</button>
            )}
            <button 
                onClick={step === 5 ? handleFinish : nextStep}
                className="flex-1 py-4 rounded-2xl font-bold text-white shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: tempTheme.accentColor }}
            >
                {step === 5 ? 'Завершить' : 'Далее'} <ArrowRight className="w-5 h-5" />
            </button>
        </div>

        <div className="mt-8 flex gap-2">
            {[1,2,3,4,5].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-8 bg-white' : 'w-2 bg-white/10'}`} />
            ))}
        </div>

      </div>
    </div>
  );
};

export default OnboardingModal;
