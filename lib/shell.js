const { app, BrowserWindow, dialog, Menu } = require('electron');

////////////////////////////////////////
// project open / window management

const open = () => {
  dialog.showOpenDialog({ title: 'Open Project', properties: [ 'openDirectory' ] })
    .then(({ filePaths }) => { for (const path of filePaths) load(path); });
};

const hwnds = [];
const load = (path) => {
  const hwnd = new BrowserWindow({
    height: 1000, width: 1300,
    titleBarStyle: 'hiddenInset',
    webPreferences: { nodeIntegration: true }
  });
  hwnds.push(hwnd);

  hwnd.loadFile('app.html');
  hwnd.webContents.on('did-finish-load', () => {
    hwnd.webContents.executeJavaScript(`init(${JSON.stringify(path)})`);
  });
};

////////////////////////////////////////
// set menu

const menu = Menu.buildFromTemplate([
  { role: 'appMenu', label: 'janus studio' },
  { label: 'Project', submenu: [
    { label: 'Open…', click: open, accelerator: 'CmdOrCtrl+O' }
  ]},
  { role: 'editMenu' },
  { role: 'viewMenu' },
  { role: 'windowMenu' }
]);

app.on('ready', () => { Menu.setApplicationMenu(menu); });

