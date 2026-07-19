const fs = require('fs');

let code = fs.readFileSync('translations.ts', 'utf8');

code = code.replace(
  "changelog_208_3: 'Добавлен SpotiFLAC! Огромная от души благодарность разработчикам SpotiFLAC (https://github.com/spotiflacapp/SpotiFLAC-Extension), а именно Zarz Eleutherius (https://github.com/zarzet) и Amonoman (https://github.com/Amonoman). Прям от всех пользователей Glass Music спасибо!',",
  "changelog_208_3: 'Добавлен SpotiFLAC! Огромная от души благодарность разработчикам SpotiFLAC (<a href=\"https://github.com/spotiflacapp/SpotiFLAC-Extension\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-[var(--accent-color)] hover:underline\">SpotiFLAC-Extension</a>), а именно <a href=\"https://github.com/zarzet\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-[var(--accent-color)] hover:underline\">Zarz Eleutherius</a> и <a href=\"https://github.com/Amonoman\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-[var(--accent-color)] hover:underline\">Amonoman</a>. Прям от всех пользователей Glass Music спасибо!',"
);

code = code.replace(
  "changelog_208_3: 'Added SpotiFLAC! Huge heartfelt thanks to the SpotiFLAC developers (https://github.com/spotiflacapp/SpotiFLAC-Extension), specifically Zarz Eleutherius (https://github.com/zarzet) and Amonoman (https://github.com/Amonoman). A big thank you from all Glass Music users!',",
  "changelog_208_3: 'Added SpotiFLAC! Huge heartfelt thanks to the SpotiFLAC developers (<a href=\"https://github.com/spotiflacapp/SpotiFLAC-Extension\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-[var(--accent-color)] hover:underline\">SpotiFLAC-Extension</a>), specifically <a href=\"https://github.com/zarzet\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-[var(--accent-color)] hover:underline\">Zarz Eleutherius</a> and <a href=\"https://github.com/Amonoman\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"text-[var(--accent-color)] hover:underline\">Amonoman</a>. A big thank you from all Glass Music users!',"
);

fs.writeFileSync('translations.ts', code);

let settingsCode = fs.readFileSync('components/SettingsModal.tsx', 'utf8');
settingsCode = settingsCode.replace(
  "<li>{t('changelog_208_3')}</li>",
  "<li dangerouslySetInnerHTML={{ __html: t('changelog_208_3') }} />"
);

fs.writeFileSync('components/SettingsModal.tsx', settingsCode);
