import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { startUdpVideoServer, stopUdpVideoServer } from './udpVideoServer';
import { registerIpcHandlers } from './ipcHandlers';

// 修复 Windows 控制台中文乱码
if (process.platform === 'win32') {
  process.stdout.setDefaultEncoding('utf8');
}

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // 开发环境下打开开发者工具
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

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
