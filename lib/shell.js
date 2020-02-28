const { app, BrowserWindow, Menu } = require('electron');

app.on('ready', () => {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu' },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' }
  ]));

  const hwnd = new BrowserWindow({
    height: 1000, width: 1300,
    titleBarStyle: 'hiddenInset',
    webPreferences: { nodeIntegration: true }
  });

  hwnd.loadFile('app.html');
  hwnd.webContents.openDevTools();
});

