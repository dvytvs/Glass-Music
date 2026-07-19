const fs = require('fs');
let code = fs.readFileSync('components/FullScreenPlayer.tsx', 'utf8');

const targetStr = "<div className={`relative group transition-all duration-700 ease-out ${viewMode === 'lyrics' ? 'w-[60vw] max-w-[30vh] md:max-w-[40vh] lg:max-w-[45vh]' : 'w-[85vw] max-w-[40vh] md:max-w-[55vh] lg:max-w-[60vh]'} aspect-square rounded-[40px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] ${isPlaying ? 'scale-100' : 'scale-[0.98] grayscale-[0.2]'}`>";

const replacementStr = "<div style={{ width: viewMode === 'lyrics' ? 'min(60vw, 45vh)' : 'min(85vw, 60vh)', height: viewMode === 'lyrics' ? 'min(60vw, 45vh)' : 'min(85vw, 60vh)' }} className={`relative group transition-all duration-700 ease-out rounded-[40px] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.8)] shrink-0 ${isPlaying ? 'scale-100' : 'scale-[0.98] grayscale-[0.2]'}`>";

code = code.replace(targetStr, replacementStr);
fs.writeFileSync('components/FullScreenPlayer.tsx', code);
