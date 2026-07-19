const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

code = code.replace(
  "return await downloadTrack(urlOrQuery, e.sender, downloadsPath);",
  `const res = await downloadTrack(urlOrQuery, e.sender, downloadsPath);
        if (res && res.success) {
            res.folder = downloadsPath;
        }
        return res;`
);

fs.writeFileSync('main.js', code);
