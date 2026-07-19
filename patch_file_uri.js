const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

code = code.replace(
  "return { success: true, url: \`file://\${filePath.replace(/\\\\/g, '/')}\` };",
  "return { success: true, url: 'file://' + encodeURI(filePath.replace(/\\\\/g, '/')) };"
);

fs.writeFileSync('main.js', code);
