const fs = require('fs');
let code = fs.readFileSync('components/FullScreenPlayer.tsx', 'utf8');

code = code.replace(
  'duration={duration}',
  ''
);

fs.writeFileSync('components/FullScreenPlayer.tsx', code);
