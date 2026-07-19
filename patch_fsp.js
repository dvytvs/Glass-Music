const fs = require('fs');
let code = fs.readFileSync('components/FullScreenPlayer.tsx', 'utf8');

code = code.replace(
  '<div className="relative group">',
  '<div className="relative group" onMouseLeave={() => setShowVolumeSlider(false)}>'
);

code = code.replace(
  'onMouseLeave={() => setShowVolumeSlider(false)}\n                                className="absolute bottom-full',
  'className="absolute bottom-full'
);

fs.writeFileSync('components/FullScreenPlayer.tsx', code);
