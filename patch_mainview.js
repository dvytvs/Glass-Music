const fs = require('fs');
let code = fs.readFileSync('components/MainView.tsx', 'utf8');

code = code.replace(/finalUrl = \`file:\/\/\$\{res\.url\.replace\(\/\\\\\/g, '\/'\)\}\`;/g, 'finalUrl = res.url;');
code = code.replace(/const convertedUrl = \`file:\/\/\$\{res\.url\.replace\(\/\\\\\/g, '\/'\)\}\`;/g, 'const convertedUrl = res.url;');

fs.writeFileSync('components/MainView.tsx', code);
