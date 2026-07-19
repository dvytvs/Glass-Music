const fs = require('fs');

let code = fs.readFileSync('translations.ts', 'utf8');

code = code.replace(
  "changelog_207_5: 'Починена запись метаданных (ID3) напрямую в mp3 файлы.',",
  "changelog_207_5: 'Починена запись метаданных (ID3) напрямую в mp3 файлы.',\n    spotiflac_download: 'SpotiFLAC Скачивание',\n    spotiflac_desc: 'Скачивайте треки в высоком качестве для офлайн прослушивания',\n    spotiflac_choose_folder: 'Выберите папку для скачивания',\n    spotiflac_choose_folder_desc: 'Для удобства выберите папку, куда будут сохраняться скачанные треки. В противном случае они будут сохраняться в скрытую директорию приложения.',\n    spotiflac_select_folder: 'Выбрать папку',\n    spotiflac_saving_to: 'Сохраняется в',\n    spotiflac_change_folder: 'Изменить',\n    spotiflac_input_placeholder: 'Ссылка на Spotify/YouTube или название трека...',\n    spotiflac_download_selected: 'Скачать выбранное',\n    spotiflac_download_url: 'Скачать по ссылке',\n    spotiflac_processing: 'Обработка...',"
);

code = code.replace(
  "changelog_207_5: 'Fixed ID3 tag writing directly to mp3 files.',",
  "changelog_207_5: 'Fixed ID3 tag writing directly to mp3 files.',\n    spotiflac_download: 'SpotiFLAC Download',\n    spotiflac_desc: 'Download high quality tracks for offline play',\n    spotiflac_choose_folder: 'Choose Download Folder',\n    spotiflac_choose_folder_desc: 'For your convenience, please select a folder where your downloaded tracks will be saved. Otherwise, they will be downloaded to a hidden app directory.',\n    spotiflac_select_folder: 'Select Folder',\n    spotiflac_saving_to: 'Saving to',\n    spotiflac_change_folder: 'Change',\n    spotiflac_input_placeholder: 'Spotify/YouTube URL or search query...',\n    spotiflac_download_selected: 'Download Selected',\n    spotiflac_download_url: 'Download URL',\n    spotiflac_processing: 'Processing...',"
);

fs.writeFileSync('translations.ts', code);
