const fs = require('fs');
let code = fs.readFileSync('components/SpotifyModal.tsx', 'utf8');

code = code.replace(
  "if (onDownloadSuccess) onDownloadSuccess(downloadFolder || '');",
  "if (onDownloadSuccess && result.folder) onDownloadSuccess(result.folder);"
);

fs.writeFileSync('components/SpotifyModal.tsx', code);
