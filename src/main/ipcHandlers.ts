import { ipcMain, BrowserWindow } from 'electron';
import { startUdpVideoServer, stopUdpVideoServer, isUdpServerRunning } from './udpVideoServer';
import { getConfig, setConfig } from './configStore';
import { connectMqtt, disconnectMqtt } from './mqttService';
import { ConnectionConfig } from '../renderer/types/messages';

export function registerIpcHandlers(mainWindow: BrowserWindow | null) {
  // 启动 UDP 视频服务器
  ipcMain.handle('video:start', async (_event, port: number) => {
    try {
      startUdpVideoServer(port, mainWindow);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 停止 UDP 视频服务器
  ipcMain.handle('video:stop', async () => {
    try {
      stopUdpVideoServer();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // 检查 UDP 服务器状态
  ipcMain.handle('video:status', async () => {
    return { isRunning: isUdpServerRunning() };
  });

  // 获取配置
  ipcMain.handle('config:get', async () => {
    return getConfig();
  });

  // 保存配置
  ipcMain.handle('config:set', async (_event, config: Partial<ConnectionConfig>) => {
    try {
      setConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // MQTT 连接
  ipcMain.handle('mqtt:connect', async (_event, server: string, port: number) => {
    try {
      if (mainWindow) {
        connectMqtt(server, port, mainWindow);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // MQTT 断开
  ipcMain.handle('mqtt:disconnect', async () => {
    try {
      disconnectMqtt();
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}
