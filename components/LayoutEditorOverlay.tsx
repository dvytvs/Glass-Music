import React from 'react';
import { ThemeConfig } from '../types';
import { X, ArrowLeft, ArrowRight, LayoutGrid } from './Icons';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface Props {
  config: ThemeConfig;
  onUpdate: (newConfig: Partial<ThemeConfig>) => void;
  onClose: () => void;
}

const LayoutEditorOverlay: React.FC<Props> = ({ config, onUpdate, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-8">
       <div className="absolute top-8 right-8">
           <button onClick={onClose} className="p-4 bg-white/10 hover:bg-white text-white hover:text-black rounded-full transition-all shadow-xl">
              <X className="w-8 h-8" />
           </button>
       </div>
       
       <div className="text-center mb-12">
           <h1 className="text-4xl font-black text-white drop-shadow-lg flex items-center justify-center gap-4">
              <LayoutGrid className="w-10 h-10" /> Редактор Интерфейса
           </h1>
           <p className="text-white/60 mt-4 text-xl">Настройте расположение блоков под себя</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-12 w-full max-w-4xl">
           {/* Sidebar Config */}
           <div className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-3xl p-8 shadow-2xl flex flex-col items-center relative overflow-hidden">
               <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Сайдбар (Панель)</h3>
               
               <div className="flex gap-4">
                   <button 
                     onClick={() => onUpdate({ sidebarPosition: 'left' })}
                     className={`px-6 py-4 rounded-2xl flex flex-col items-center gap-3 transition-all ${config.sidebarPosition === 'left' || !config.sidebarPosition ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-105' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                   >
                     <ArrowLeft className="w-6 h-6" /> Слева
                   </button>
                   <button 
                     onClick={() => onUpdate({ sidebarPosition: 'right' })}
                     className={`px-6 py-4 rounded-2xl flex flex-col items-center gap-3 transition-all ${config.sidebarPosition === 'right' ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.5)] scale-105' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                   >
                     <ArrowRight className="w-6 h-6" /> Справа
                   </button>
               </div>
           </div>

           {/* Player Config */}
           <div className="bg-[var(--card-bg)] border border-[var(--glass-border)] rounded-3xl p-8 shadow-2xl flex flex-col items-center relative overflow-hidden">
               <h3 className="text-xl font-bold text-[var(--text-main)] mb-6">Плеер</h3>
               
               <div className="grid grid-cols-2 gap-4">
                   <button 
                     onClick={() => onUpdate({ playerDock: 'top' })}
                     className={`px-6 py-4 rounded-2xl flex flex-col items-center gap-3 transition-all ${config.playerDock === 'top' ? 'bg-[var(--accent-color)] text-white shadow-[0_0_20px_var(--accent-color)] scale-105' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                   >
                     <ArrowUp className="w-6 h-6" /> Сверху
                   </button>
                   <button 
                     onClick={() => onUpdate({ playerDock: 'bottom' })}
                     className={`px-6 py-4 rounded-2xl flex flex-col items-center gap-3 transition-all ${config.playerDock === 'bottom' || !config.playerDock ? 'bg-[var(--accent-color)] text-white shadow-[0_0_20px_var(--accent-color)] scale-105' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                   >
                     <ArrowDown className="w-6 h-6" /> Снизу
                   </button>
                   <button 
                     onClick={() => onUpdate({ playerDock: 'left' })}
                     className={`px-6 py-4 rounded-2xl flex flex-col items-center gap-3 transition-all ${config.playerDock === 'left' ? 'bg-[var(--accent-color)] text-white shadow-[0_0_20px_var(--accent-color)] scale-105' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                   >
                     <ArrowLeft className="w-6 h-6" /> Слева
                   </button>
                   <button 
                     onClick={() => onUpdate({ playerDock: 'right' })}
                     className={`px-6 py-4 rounded-2xl flex flex-col items-center gap-3 transition-all ${config.playerDock === 'right' ? 'bg-[var(--accent-color)] text-white shadow-[0_0_20px_var(--accent-color)] scale-105' : 'bg-[var(--bg-main)] text-[var(--text-muted)] hover:bg-[var(--card-hover)]'}`}
                   >
                     <ArrowRight className="w-6 h-6" /> Справа
                   </button>
               </div>
           </div>
       </div>
    </div>
  );
};

export default LayoutEditorOverlay;
