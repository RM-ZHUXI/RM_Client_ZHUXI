import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { startUdpVideoServer, stopUdpVideoServer } from './udpVideoServer';
import { registerIpcHandlers } from './ipcHandlers';

// 修复 Windows 控制台中文乱码
if (process.platform === 'win32') {
  process.stdout.setDefaultEncoding('utf8');
}

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  registerIpcHandlers(mainWindow);
});

app.on('window-all-closed', () => {
  stopUdpVideoServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('before-quit', () => {
  stopUdpVideoServer();
});
