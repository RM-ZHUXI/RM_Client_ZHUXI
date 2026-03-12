import { contextBridge, ipcRenderer } from 'electron';

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld('electronAPI', {
  // 视频流相关 API
  video: {
    start: (port: number) => ipcRenderer.invoke('video:start', port),
    stop: () => ipcRenderer.invoke('video:stop'),
    status: () => ipcRenderer.invoke('video:status'),
    onFrame: (callback: (data: Buffer) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: Buffer) => callback(data);
      ipcRenderer.on('video:frame', listener);
      return () => ipcRenderer.removeListener('video:frame', listener);
    },
    onStarted: (callback: (info: { port: number }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, info: { port: number }) => callback(info);
      ipcRenderer.on('video:started', listener);
      return () => ipcRenderer.removeListener('video:started', listener);
    },
    onError: (callback: (error: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, error: string) => callback(error);
      ipcRenderer.on('video:error', listener);
      return () => ipcRenderer.removeListener('video:error', listener);
    },
  },

  // 配置管理 API
  config: {
    get: () => ipcRenderer.invoke('config:get'),
    set: (config: any) => ipcRenderer.invoke('config:set', config),
  },

  // MQTT API
  mqtt: {
    connect: (server: string, port: number) => ipcRenderer.invoke('mqtt:connect', server, port),
    disconnect: () => ipcRenderer.invoke('mqtt:disconnect'),
    publish: (topic: string, data: any) => ipcRenderer.invoke('mqtt:publish', topic, data),
    onStatus: (callback: (status: string, error?: string) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, status: string, error?: string) => callback(status, error);
      ipcRenderer.on('mqtt:status', listener);
      return () => ipcRenderer.removeListener('mqtt:status', listener);
    },
    onMessage: (callback: (data: { topic: string; payload: number[] }) => void) => {
      const listener = (_event: Electron.IpcRendererEvent, data: { topic: string; payload: number[] }) => callback(data);
      ipcRenderer.on('mqtt:message', listener);
      return () => ipcRenderer.removeListener('mqtt:message', listener);
    },
  },

  // 应用控制 API
  app: {
    quit: () => ipcRenderer.invoke('app:quit'),
  },
});
