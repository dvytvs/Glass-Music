
import React, { useState } from 'react';
import { ArrowRight, User, Palette, Droplet } from './Icons';
import { ThemeConfig, UserProfile } from '../types';
import { TranslationKey } from '../translations';

interface OnboardingModalProps {
  onComplete: (profile: Partial<UserProfile>, theme: Partial<ThemeConfig>) => void;
  accentColor: string;
  t: (key: TranslationKey) => string;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete, accentColor, t }) => {
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

  return (
    <div className="fixed inset-0 z-[300] flex bg-[var(--bg-main)]">
      {/* Left side: GIF / Image Cover */}
      <div className="hidden md:flex w-1/2 h-full relative overflow-hidden bg-black">
        <div className="absolute inset-0 z-10 bg-gradient-to-r from-transparent to-[var(--bg-main)]"></div>
        <img 
          src="./gif/rem.gif" 
          alt="Rem Background" 
          className="w-full h-full object-cover opacity-80"
        />
        {step === 1 && (
            <div className="absolute bottom-12 left-12 z-20 animate-fade-in-view">
                <h1 className="text-6xl font-black text-white drop-shadow-lg mb-4">Glass<br/>Music.</h1>
                <p className="text-white/80 text-xl max-w-sm drop-shadow-md">Новый уровень твоего музыкального опыта.</p>
            </div>
        )}
      </div>

      {/* Right side: Onboarding Form */}
      <div className="w-full md:w-1/2 h-full flex flex-col justify-center items-center p-8 lg:p-24 relative overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center text-center animate-zoom-in">
          
          <div className="w-full space-y-8">
              {step === 1 && (
                  <div className="animate-fade-in-view space-y-4">
                      <h2 className="text-4xl font-black text-[var(--text-main)]">{t('onboarding_welcome')}!</h2>
                      <p className="text-[var(--text-muted)] text-lg leading-relaxed">
                          Давай настроим твой новый музыкальный плеер Glass Music. Это займет всего пару минут!
                      </p>
                  </div>
              )}

              {step === 2 && (
                  <div className="animate-fade-in-view space-y-6">
                      <h2 className="text-3xl font-bold text-[var(--text-main)] flex items-center justify-center gap-3"><User className="w-8 h-8"/> Как тебя зовут?</h2>
                      <input 
                          type="text" 
                          value={tempProfile.name}
                          onChange={e => setTempProfile({ ...tempProfile, name: e.target.value })}
                          className="w-full bg-[var(--card-bg)] border-2 border-[var(--glass-border)] rounded-2xl px-6 py-4 text-center text-2xl font-bold text-[var(--text-main)] outline-none focus:border-[var(--text-main)]/50 transition-all shadow-inner"
                          placeholder={t('nickname') + "..."}
                      />
                  </div>
              )}

              {step === 3 && (
                  <div className="animate-fade-in-view space-y-8">
                      <h2 className="text-3xl font-bold text-[var(--text-main)] flex items-center justify-center gap-3"><Palette className="w-8 h-8"/> Выбери свой стиль</h2>
                      <div className="flex justify-center gap-4 flex-wrap">
                          {['#db2777', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#14b8a6'].map(color => (
                              <button 
                                  key={color}
                                  onClick={() => setTempTheme({ ...tempTheme, accentColor: color })}
                                  className={`w-14 h-14 rounded-full transition-all shadow-md ${tempTheme.accentColor === color ? 'ring-4 ring-offset-4 ring-offset-[var(--bg-main)] scale-110' : 'hover:scale-110'}`}
                                  style={{ backgroundColor: color, '--tw-ring-color': color } as React.CSSProperties}
                              />
                          ))}
                      </div>
                  </div>
              )}

              {step === 4 && (
                  <div className="animate-fade-in-view space-y-8">
                      <h2 className="text-3xl font-bold text-[var(--text-main)] flex items-center justify-center gap-3"><Droplet className="w-8 h-8"/> Тип фона</h2>
                      <div className="grid grid-cols-2 gap-6">
                          <button 
                              onClick={() => setTempTheme({ ...tempTheme, backgroundType: 'liquid' })}
                              className={`p-8 rounded-3xl border-2 transition-all shadow-lg ${tempTheme.backgroundType === 'liquid' ? 'bg-[var(--card-bg)] border-[var(--text-main)]' : 'bg-[var(--card-bg)]/50 border-[var(--glass-border)]'}`}
                          >
                              <span className="font-bold text-xl text-[var(--text-main)]">Liquid</span>
                              <p className="text-sm text-[var(--text-muted)] mt-2">Живой градиент</p>
                          </button>
                          <button 
                              onClick={() => setTempTheme({ ...tempTheme, backgroundType: 'image' })}
                              className={`p-8 rounded-3xl border-2 transition-all shadow-lg ${tempTheme.backgroundType === 'image' ? 'bg-[var(--card-bg)] border-[var(--text-main)]' : 'bg-[var(--card-bg)]/50 border-[var(--glass-border)]'}`}
                          >
                              <span className="font-bold text-xl text-[var(--text-main)]">Static</span>
                              <p className="text-sm text-[var(--text-muted)] mt-2">Обычный фон</p>
                          </button>
                      </div>
                  </div>
              )}

              {step === 5 && (
                  <div className="animate-fade-in-view space-y-6">
                      <h2 className="text-4xl font-black text-[var(--text-main)]">{t('done')}!</h2>
                      <p className="text-[var(--text-muted)] text-xl leading-relaxed">
                          Приятного прослушивания, {tempProfile.name || t('nickname')}! <br/> Помни: твоя музыка — твои правила.
                      </p>
                  </div>
              )}
          </div>

          <div className="mt-16 flex gap-4 w-full">
              {step > 1 && (
                  <button onClick={prevStep} className="flex-1 py-4 rounded-2xl bg-[var(--card-bg)] border border-[var(--glass-border)] font-bold text-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg-hover)] transition-all">
                      {t('back')}
                  </button>
              )}
              <button 
                  onClick={step === 5 ? handleFinish : nextStep}
                  className="flex-[2] py-4 rounded-2xl font-bold text-white text-lg shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                  style={{ backgroundColor: tempTheme.accentColor }}
              >
                  {step === 5 ? t('onboarding_start') : 'Далее'} <ArrowRight className="w-6 h-6" />
              </button>
          </div>

          <div className="mt-12 flex gap-3">
              {[1,2,3,4,5].map(s => (
                  <div key={s} className={`h-2 rounded-full transition-all duration-300 ${s === step ? 'w-10' : 'w-2 bg-[var(--text-muted)]/20'}`} style={s === step ? {backgroundColor: tempTheme.accentColor} : {}} />
              ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
