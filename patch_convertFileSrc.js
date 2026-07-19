const fs = require('fs');
let code = fs.readFileSync('App.tsx', 'utf8');

code = code.replace(
  /const convertFileSrc = \(path: string\) => \`file:\/\/\$\{path\.replace\(\/\\\\\/g, '\/'\)\}\`;/g,
  "const convertFileSrc = (path: string) => `file://${encodeURI(path.replace(/\\\\/g, '/'))}`;"
);

// We should also look at other places where `file://` + path is used
code = code.replace(
  /src = \`file:\/\/\$\{track\.path\.replace\(\/\\\\\/g, '\/'\)\}\`;/g,
  "src = `file://${encodeURI(track.path.replace(/\\\\/g, '/'))}`;"
);

code = code.replace(
  /fileUrl = \`file:\/\/\$\{filePath\.replace\(\/\\\\\/g, '\/'\)\}\`;/g,
  "fileUrl = `file://${encodeURI(filePath.replace(/\\\\/g, '/'))}`;"
);

code = code.replace(
  /const fileUrl = \`file:\/\/\$\{file\.path\.replace\(\/\\\\\/g, '\/'\)\}\`;/g,
  "const fileUrl = `file://${encodeURI(file.path.replace(/\\\\/g, '/'))}`;"
);

fs.writeFileSync('App.tsx', code);
