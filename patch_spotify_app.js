const fs = require('fs');

// Patch App.tsx
let appCode = fs.readFileSync('App.tsx', 'utf8');

// We need to pass onDownloadSuccess to SpotifyModal
if (!appCode.includes('onDownloadSuccess={handleDownloadSuccess}')) {
    const fnCode = `
  const handleDownloadSuccess = (folderPath: string) => {
      if (folderPath) {
          const newSyncFolders = Array.from(new Set([...(userProfile.syncFolders || []), folderPath]));
          if (newSyncFolders.length !== (userProfile.syncFolders || []).length) {
              handleUpdateProfile({ syncFolders: newSyncFolders });
          }
          scanFolders([folderPath]);
      }
  };
`;
    // Insert handleDownloadSuccess right before handleImportFolderClick
    appCode = appCode.replace('const handleImportFolderClick = async () => {', fnCode + '\n  const handleImportFolderClick = async () => {');
    
    // Pass it to SpotifyModal
    appCode = appCode.replace(
        '<SpotifyModal\n        isOpen={isSpotifyModalOpen}',
        '<SpotifyModal\n        isOpen={isSpotifyModalOpen}\n        onDownloadSuccess={handleDownloadSuccess}'
    );
    fs.writeFileSync('App.tsx', appCode);
}

// Patch SpotifyModal.tsx
let modalCode = fs.readFileSync('components/SpotifyModal.tsx', 'utf8');
if (!modalCode.includes('onDownloadSuccess')) {
    modalCode = modalCode.replace(
        'interface SpotifyModalProps {',
        'interface SpotifyModalProps {\n  onDownloadSuccess?: (folder: string) => void;'
    );
    modalCode = modalCode.replace(
        'const SpotifyModal: React.FC<SpotifyModalProps> = ({ isOpen, onClose, t, accentColor }) => {',
        'const SpotifyModal: React.FC<SpotifyModalProps> = ({ isOpen, onClose, onDownloadSuccess, t, accentColor }) => {'
    );
    modalCode = modalCode.replace(
        "setStatusMessage('Track successfully downloaded to your library!');\n      } else {",
        "setStatusMessage('Track successfully downloaded to your library!');\n        if (onDownloadSuccess) onDownloadSuccess(downloadFolder || '');\n      } else {"
    );
    fs.writeFileSync('components/SpotifyModal.tsx', modalCode);
}
