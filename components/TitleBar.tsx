import React, { useEffect, useState } from 'react';
import { Minus, Square, X } from 'lucide-react';

const TitleBar: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const checkDesktop = () => (window as any).require !== undefined;
    setIsDesktop(checkDesktop());
    
    // Check if macOS (to hide titlebar buttons since mac has native traffic lights when transparent=true combined with titleBarStyle)
    setIsMac(navigator.platform.toUpperCase().indexOf('MAC') >= 0);
  }, []);

  if (!isDesktop || isMac) return null;

  const getIpc = () => {
    try {
      return (window as any).require('electron').ipcRenderer;
    } catch(e) {
      return null;
    }
  };

  const handleMinimize = () => {
    getIpc()?.send('window-minimize');
  };

  const handleMaximize = () => {
    getIpc()?.send('window-maximize');
  };

  const handleClose = () => {
    getIpc()?.send('window-close');
  };

  return (
    <div className="fixed top-0 left-0 right-0 h-8 z-[9999] flex justify-between items-center select-none" style={{ WebkitAppRegion: 'drag' } as any}>
      {/* Draggable Area */}
      <div className="flex-1 h-full cursor-default" />
      {/* Window Controls */}
      <div className="flex h-full bg-black/20 backdrop-blur-md rounded-bl-lg border-b border-l border-white/5" style={{ WebkitAppRegion: 'no-drag' } as any}>
        <button 
          onClick={handleMinimize} 
          className="w-11 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Minus size={16} />
        </button>
        <button 
          onClick={handleMaximize} 
          className="w-11 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <Square size={13} strokeWidth={2.5} />
        </button>
        <button 
          onClick={handleClose} 
          className="w-11 h-8 flex items-center justify-center text-white/50 hover:text-white hover:bg-red-500 transition-colors rounded-bl-lg"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
