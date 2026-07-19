const fs = require('fs');
let code = fs.readFileSync('components/SpotifyModal.tsx', 'utf8');

code = code.replace(
  'SpotiFLAC Download',
  '{t("spotiflac_download")}'
);
code = code.replace(
  'Download high quality tracks for offline play',
  '{t("spotiflac_desc")}'
);
code = code.replace(
  'Choose Download Folder',
  '{t("spotiflac_choose_folder")}'
);
code = code.replace(
  'For your convenience, please select a folder where your downloaded tracks will be saved. \n                    Otherwise, they will be downloaded to a hidden app directory.',
  '{t("spotiflac_choose_folder_desc")}'
);
code = code.replace(
  'Select Folder\n                </button>',
  '{t("spotiflac_select_folder")}\n                </button>'
);
code = code.replace(
  'Saving to:',
  '{t("spotiflac_saving_to")}:'
);
code = code.replace(
  'Change folder\n                    </button>',
  '{t("spotiflac_change_folder")}\n                    </button>'
);
code = code.replace(
  'placeholder="Spotify URL or search query..."',
  'placeholder={t("spotiflac_input_placeholder")}'
);
code = code.replace(
  "{isDownloading ? 'Processing...' : (selectedResult ? 'Download Selected' : 'Download URL')}",
  "{isDownloading ? t('spotiflac_processing') : (selectedResult ? t('spotiflac_download_selected') : t('spotiflac_download_url'))}"
);

fs.writeFileSync('components/SpotifyModal.tsx', code);
