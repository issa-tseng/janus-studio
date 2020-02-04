const { app, BrowserWindow } = require('electron');

app.on('ready', () => {
  const hwnd = new BrowserWindow({
    height: 1000, width: 1300,
    //titleBarStyle: 'hiddenInset',
    webPreferences: { nodeIntegration: true }
  });

  hwnd.loadFile('app.html');
  hwnd.webContents.openDevTools();
});

