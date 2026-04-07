import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ExternalLink } from 'lucide-react';
import { TranslationKey } from '../translations';

interface YouTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  t: (key: TranslationKey) => string;
  accentColor: string;
}

const YouTubeModal: React.FC<YouTubeModalProps> = ({ isOpen, onClose, t, accentColor }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--bg-main)] border border-[var(--glass-border)] rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col"
          style={{ height: '80vh' }}
        >
          <div className="p-4 border-b border-[var(--glass-border)] flex items-center justify-between bg-[var(--card-bg)]">
            <div>
              <h2 className="text-xl font-bold text-[var(--text-main)]">YouTube Downloader</h2>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Скачайте трек, а затем импортируйте его в плеер вручную.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a 
                href="https://media.ytmp3.gg/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-[var(--card-hover)] text-[var(--text-muted)] transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-[var(--card-hover)] text-[var(--text-muted)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative bg-white">
            <iframe 
              src="https://media.ytmp3.gg/" 
              className="w-full h-full border-none"
              title="YouTube Downloader"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
            />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default YouTubeModal;
