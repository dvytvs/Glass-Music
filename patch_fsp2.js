const fs = require('fs');
let code = fs.readFileSync('components/FullScreenPlayer.tsx', 'utf8');

code = code.replace(
  "${viewMode === 'lyrics' ? 'w-[30vh] h-[30vh] md:w-[40vh] md:h-[40vh] lg:w-[45vh] lg:h-[45vh]' : 'w-[40vh] h-[40vh] md:w-[55vh] md:h-[55vh] lg:w-[60vh] lg:h-[60vh]'} max-w-[600px] max-h-[600px]",
  "${viewMode === 'lyrics' ? 'w-[60vw] max-w-[30vh] md:max-w-[40vh] lg:max-w-[45vh]' : 'w-[85vw] max-w-[40vh] md:max-w-[55vh] lg:max-w-[60vh]'} aspect-square"
);

fs.writeFileSync('components/FullScreenPlayer.tsx', code);
