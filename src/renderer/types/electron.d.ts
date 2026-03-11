import { ConnectionConfig } from './messages';

// Electron API 类型定义
export interface ElectronAPI {
  video: {
    start: (port: number) => Promise<{ success: boolean; error?: string }>;
    stop: () => Promise<{ success: boolean; error?: string }>;
    status: () => Promise<{ isRunning: boolean }>;
    onFrame: (callback: (data: Buffer) => void) => () => void;
    onStarted: (callback: (info: { port: number }) => void) => () => void;
    onError: (callback: (error: string) => void) => () => void;
  };
  config: {
    get: () => Promise<ConnectionConfig>;
    set: (config: Partial<ConnectionConfig>) => Promise<{ success: boolean; error?: string }>;
  };
  mqtt: {
    connect: (server: string, port: number) => Promise<{ success: boolean; error?: string }>;
    disconnect: () => Promise<{ success: boolean; error?: string }>;
    onStatus: (callback: (status: string, error?: string) => void) => () => void;
    onMessage: (callback: (data: { topic: string; payload: number[] }) => void) => () => void;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
