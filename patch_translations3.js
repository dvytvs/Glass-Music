const fs = require('fs');

let code = fs.readFileSync('translations.ts', 'utf8');

code = code.replace(
  "| 'changelog_207_5'",
  "| 'changelog_207_5' | 'changelog_208_1' | 'changelog_208_2' | 'changelog_208_3'"
);

code = code.replace(
  "changelog_207_5: 'Починена запись метаданных (ID3) напрямую в mp3 файлы.',",
  "changelog_207_5: 'Починена запись метаданных (ID3) напрямую в mp3 файлы.',\n    changelog_208_1: 'Исправлены баги с вылетом приложения на NixOS.',\n    changelog_208_2: 'Исправлена ошибка с установкой фона и аватарки в профиле. Теперь всё работает корректно!',\n    changelog_208_3: 'Добавлен SpotiFLAC! Огромная от души благодарность разработчикам SpotiFLAC (https://github.com/spotiflacapp/SpotiFLAC-Extension), а именно Zarz Eleutherius (https://github.com/zarzet) и Amonoman (https://github.com/Amonoman). Прям от всех пользователей Glass Music спасибо!',"
);

code = code.replace(
  "changelog_207_5: 'Fixed ID3 tag writing directly to mp3 files.',",
  "changelog_207_5: 'Fixed ID3 tag writing directly to mp3 files.',\n    changelog_208_1: 'Fixed app crashes on NixOS.',\n    changelog_208_2: 'Fixed issue with setting profile background and avatar. It works correctly now!',\n    changelog_208_3: 'Added SpotiFLAC! Huge heartfelt thanks to the SpotiFLAC developers (https://github.com/spotiflacapp/SpotiFLAC-Extension), specifically Zarz Eleutherius (https://github.com/zarzet) and Amonoman (https://github.com/Amonoman). A big thank you from all Glass Music users!',"
);

fs.writeFileSync('translations.ts', code);
