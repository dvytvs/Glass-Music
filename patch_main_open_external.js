const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

if (!code.includes('setWindowOpenHandler')) {
    code = code.replace(
        'mainWindow.setMenuBarVisibility(false);',
        'mainWindow.setMenuBarVisibility(false);\n    mainWindow.webContents.setWindowOpenHandler(({ url }) => {\n        if (url.startsWith("http")) {\n            require("electron").shell.openExternal(url);\n            return { action: "deny" };\n        }\n        return { action: "allow" };\n    });'
    );
    fs.writeFileSync('main.js', code);
}
