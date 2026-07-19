import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Search, Download, CheckCircle2, AlertCircle, Loader2, Music, FolderOpen, Play, SearchIcon } from 'lucide-react';

interface SpotifyModalProps {
  onDownloadSuccess?: (folder: string) => void;
  isOpen: boolean;
  onClose: () => void;
  t: any;
  accentColor: string;
}

const SpotifyModal: React.FC<SpotifyModalProps> = ({ isOpen, onClose, onDownloadSuccess, t, accentColor }) => {
  const [url, setUrl] = useState('');
  const [status, setStatus] = useState<'idle' | 'resolving' | 'searching' | 'downloading' | 'processing' | 'done' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [metadata, setMetadata] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [downloadFolder, setDownloadFolder] = useState<string | null>(null);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  // Search state
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      setUrl('');
      setStatus('idle');
      setStatusMessage('');
      setProgress(0);
      setMetadata(null);
      setIsDownloading(false);
      setSearchResults([]);
      setSelectedResult(null);
      
      const loadConfig = async () => {
        try {
          const ipcRenderer = (window as any).require('electron').ipcRenderer;
          const config = await ipcRenderer.invoke('get-local-data', { key: 'spotiflac-config' });
          if (config && config.downloadFolder) {
            setDownloadFolder(config.downloadFolder);
          }
        } catch (e) {
          console.error('Failed to load config', e);
        } finally {
          setIsLoadingConfig(false);
        }
      };
      loadConfig();
    }
  }, [isOpen]);

  useEffect(() => {
    const ipcRenderer = (window as any).require('electron').ipcRenderer;
    
    const onProgress = (_: any, data: any) => {
      setStatus(data.status);
      setStatusMessage(data.message);
      if (data.progress !== undefined) {
        setProgress(data.progress);
      }
    };
    const onMetadata = (_: any, data: any) => {
      setMetadata(data);
    };

    ipcRenderer.on('spotiflac-progress', onProgress);
    ipcRenderer.on('spotiflac-metadata', onMetadata);

    return () => {
      ipcRenderer.removeListener('spotiflac-progress', onProgress);
      ipcRenderer.removeListener('spotiflac-metadata', onMetadata);
    };
  }, []);

  const handleSelectFolder = async () => {
    try {
      const ipcRenderer = (window as any).require('electron').ipcRenderer;
      const folderPath = await ipcRenderer.invoke('select-folder');
      if (folderPath) {
        setDownloadFolder(folderPath);
        await ipcRenderer.invoke('save-local-data', { 
          key: 'spotiflac-config', 
          data: { downloadFolder: folderPath } 
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async () => {
    if (!url.trim()) return;
    setIsSearching(true);
    setSelectedResult(null);
    setSearchResults([]);
    
    try {
      const ipcRenderer = (window as any).require('electron').ipcRenderer;
      const res = await ipcRenderer.invoke('spotiflac-search', { query: url });
      if (res.success) {
        setSearchResults(res.results);
      } else {
        setStatus('error');
        setStatusMessage('Failed to search: ' + res.error);
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMessage('Search error: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async () => {
    let target = url;
    if (selectedResult) {
      target = selectedResult.url;
    }

    if (!target.trim()) return;
    
    setIsDownloading(true);
    setStatus('resolving');
    setStatusMessage('Starting download process...');
    setProgress(0);
    if (!selectedResult) setMetadata(null);
    else setMetadata({ title: selectedResult.title, artist: selectedResult.artist, coverUrl: selectedResult.coverUrl });
    
    try {
      const ipcRenderer = (window as any).require('electron').ipcRenderer;
      const result = await ipcRenderer.invoke('spotiflac-download', { 
        urlOrQuery: target, 
        customPath: downloadFolder 
      });
      
      if (result.success) {
        setStatus('done');
        setStatusMessage('Track successfully downloaded to your library!');
        if (onDownloadSuccess && result.folder) onDownloadSuccess(result.folder);
      } else {
        setStatus('error');
        setStatusMessage(`Error: ${result.error}`);
      }
    } catch (err: any) {
      setStatus('error');
      setStatusMessage(`System Error: ${err.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#121212] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-6 h-6 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.54.659.301 1.02zm1.44-3.3c-.301.42-.84.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.08 9.3C15.24 7.02 8.88 6.84 5.16 7.98c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.2-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.54-.959.72-1.559.24z"/>
                </svg>
                {t("spotiflac_download")}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {t("spotiflac_desc")}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 flex flex-col gap-6 bg-[#121212] overflow-y-auto">
            {isLoadingConfig ? (
              <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 text-[#1DB954] animate-spin" /></div>
            ) : !downloadFolder ? (
              <div className="flex flex-col items-center text-center gap-4 py-8">
                <div className="w-16 h-16 bg-[#1a1a1a] rounded-full flex items-center justify-center border border-white/10">
                  <FolderOpen className="w-8 h-8 text-[#1DB954]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white mb-2">{t("spotiflac_choose_folder")}</h3>
                  <p className="text-gray-400 text-sm">
                    {t("spotiflac_choose_folder_desc")}
                  </p>
                </div>
                <button
                  onClick={handleSelectFolder}
                  className="mt-2 font-bold px-6 py-3 rounded-full bg-white text-black hover:scale-105 transition-all"
                >
                  {t("spotiflac_select_folder")}
                </button>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center px-1">
                    <p className="text-xs text-gray-500 truncate mr-2" title={downloadFolder}>
                        {t("spotiflac_saving_to")}: {downloadFolder}
                    </p>
                    <button onClick={handleSelectFolder} className="text-xs text-[#1DB954] hover:underline whitespace-nowrap">
                        {t("spotiflac_change_folder")}
                    </button>
                </div>

                {/* Input Section */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-500" />
                    </div>
                    <input 
                      type="text" 
                      placeholder={t("spotiflac_input_placeholder")}
                      className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl pl-11 pr-4 py-4 text-white focus:outline-none focus:border-[#1DB954] focus:ring-1 focus:ring-[#1DB954] transition-all"
                      value={url}
                      onChange={e => {
                        setUrl(e.target.value);
                        setSelectedResult(null);
                        setStatus('idle');
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !isDownloading && !isSearching) {
                           if (url.includes('spotify.com') || url.includes('youtube.com') || url.includes('soundcloud.com')) {
                               handleDownload();
                           } else {
                               handleSearch();
                           }
                        }
                      }}
                      disabled={status !== 'idle' && status !== 'error' && status !== 'done'}
                    />
                  </div>
                  <button 
                    onClick={() => {
                        if (url.includes('spotify.com') || url.includes('youtube.com') || url.includes('soundcloud.com')) {
                            handleDownload();
                        } else {
                            handleSearch();
                        }
                    }}
                    disabled={isSearching || isDownloading || !url.trim() || status === 'downloading' || status === 'resolving'}
                    className="bg-[#282828] hover:bg-[#333] border border-white/10 rounded-xl px-4 flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin text-gray-400" /> : <SearchIcon className="w-5 h-5 text-gray-300" />}
                  </button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && status === 'idle' && (
                  <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {searchResults.map((res, i) => (
                      <div 
                        key={i}
                        onClick={() => setSelectedResult(res)}
                        className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors border ${selectedResult?.id === res.id ? 'bg-[#282828] border-[#1DB954]' : 'hover:bg-[#1a1a1a] border-transparent'}`}
                      >
                        {res.coverUrl ? (
                          <img src={res.coverUrl} className="w-12 h-12 rounded object-cover" alt="" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-[#333] flex items-center justify-center"><Music className="w-5 h-5 text-gray-500" /></div>
                        )}
                        <div className="flex-1 overflow-hidden">
                          <p className="text-white font-medium text-sm truncate">{res.title}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-400 text-xs truncate">{res.artist}</p>
                            <span className="text-xs text-gray-600">•</span>
                            <span className="text-xs text-gray-500">{res.duration}</span>
                          </div>
                        </div>
                        <div className="px-2">
                           {res.source === 'youtube' ? (
                               <span className="text-[10px] uppercase font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">YT</span>
                           ) : (
                               <span className="text-[10px] uppercase font-bold text-orange-500 bg-orange-500/10 px-2 py-1 rounded">SC</span>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Status & Metadata View */}
                <AnimatePresence mode="wait">
                  {status !== 'idle' && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center justify-center p-6 bg-[#181818] rounded-xl border border-white/5"
                    >
                      {/* Track Info (if available) */}
                      {metadata && (
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex flex-col items-center mb-6 text-center"
                        >
                          {metadata.coverUrl ? (
                            <img 
                              src={metadata.coverUrl} 
                              alt="Cover" 
                              className="w-32 h-32 rounded-lg shadow-xl mb-4 object-cover border border-white/10"
                            />
                          ) : (
                            <div className="w-32 h-32 rounded-lg shadow-xl mb-4 bg-[#282828] flex items-center justify-center">
                              <Music className="w-12 h-12 text-gray-500" />
                            </div>
                          )}
                          <h3 className="text-lg font-bold text-white line-clamp-1">{metadata.title}</h3>
                          <p className="text-gray-400 text-sm line-clamp-1">{metadata.artist}</p>
                        </motion.div>
                      )}

                      {/* Progress / Status indicator */}
                      <div className="w-full flex flex-col items-center gap-4">
                        {status === 'error' ? (
                          <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                        ) : status === 'done' ? (
                          <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                        ) : (
                          <Loader2 className="w-8 h-8 text-[#1DB954] animate-spin mb-2" />
                        )}
                        
                        <p className={`text-sm text-center ${status === 'error' ? 'text-red-400' : status === 'done' ? 'text-green-400' : 'text-gray-300'}`}>
                          {statusMessage}
                        </p>

                        {status === 'downloading' && (
                          <div className="w-full h-2 bg-[#282828] rounded-full overflow-hidden mt-2">
                            <motion.div 
                              className="h-full bg-[#1DB954]"
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ ease: "linear" }}
                            />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button 
                  className={`w-full font-bold px-6 py-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                    isDownloading 
                      ? 'bg-[#282828] text-gray-500 cursor-not-allowed' 
                      : (selectedResult || (url.trim() && searchResults.length === 0))
                        ? 'bg-[#1DB954] hover:bg-[#1ed760] text-black active:scale-[0.98]' 
                        : 'bg-[#1a1a1a] text-gray-500 cursor-not-allowed'
                  }`}
                  onClick={handleDownload}
                  disabled={isDownloading || (!selectedResult && (!url.trim() || searchResults.length > 0))}
                >
                  <Download className="w-5 h-5" />
                  {isDownloading ? t('spotiflac_processing') : (selectedResult ? t('spotiflac_download_selected') : t('spotiflac_download_url'))}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SpotifyModal;
