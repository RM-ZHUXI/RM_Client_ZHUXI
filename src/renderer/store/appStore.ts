import { create } from 'zustand';
import { ConnectionConfig, ConnectionStatus, MqttMessage } from '../types/messages';

interface AppState {
  // 连接配置
  config: ConnectionConfig;
  setConfig: (config: Partial<ConnectionConfig>) => void;

  // MQTT 连接状态
  mqttStatus: ConnectionStatus;
  setMqttStatus: (status: ConnectionStatus) => void;

  // 视频流状态
  videoStatus: ConnectionStatus;
  setVideoStatus: (status: ConnectionStatus) => void;

  // 接收到的消息列表
  messages: MqttMessage[];
  addMessage: (message: MqttMessage) => void;
  clearMessages: () => void;

  // 视频流控制
  isVideoReceiving: boolean;
  setVideoReceiving: (receiving: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // 默认配置
  config: {
    mqttServer: 'localhost',
    mqttPort: 3333,
    udpVideoPort: 3334,
  },
  setConfig: (config) =>
    set((state) => ({
      config: { ...state.config, ...config },
    })),

  // 连接状态
  mqttStatus: 'disconnected',
  setMqttStatus: (status) => set({ mqttStatus: status }),

  videoStatus: 'disconnected',
  setVideoStatus: (status) => set({ videoStatus: status }),

  // 消息管理
  messages: [],
  addMessage: (message) =>
    set((state) => ({
      messages: [message, ...state.messages].slice(0, 1000), // 最多保留1000条
    })),
  clearMessages: () => set({ messages: [] }),

  // 视频流
  isVideoReceiving: false,
  setVideoReceiving: (receiving) => set({ isVideoReceiving: receiving }),
}));
