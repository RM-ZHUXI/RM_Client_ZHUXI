import { decodeMessage, initProtoDecoder } from './protoDecoder';
import { MqttMessage } from '../types/messages';

let isProtoInitialized = false;

/**
 * 连接到 MQTT 服务器（通过 main 进程）
 */
export async function connectMqtt(
  server: string,
  port: number,
  onMessage: (message: MqttMessage) => void,
  onStatusChange: (status: 'connecting' | 'connected' | 'disconnected' | 'error', error?: string) => void
): Promise<void> {
  // 初始化 Protobuf 解析器
  if (!isProtoInitialized) {
    try {
      await initProtoDecoder();
      isProtoInitialized = true;
    } catch (error) {
      const errMsg = `Failed to initialize protobuf: ${(error as Error).message}`;
      console.error('[MQTT]', errMsg);
      onStatusChange('error', errMsg);
      return;
    }
  }

  console.log('[MQTT] 通过 main 进程连接到:', server, port);
  onStatusChange('connecting');

  // 监听状态变化
  window.electronAPI.mqtt.onStatus((status, error) => {
    console.log('[MQTT] 状态变更:', status, error || '');
    onStatusChange(status as any, error);
  });

  // 监听消息
  window.electronAPI.mqtt.onMessage((data: { topic: string; payload: number[] }) => {
    try {
      const payload = new Uint8Array(data.payload);
      console.log(`[MQTT] 📥 收到消息: ${data.topic}, 大小: ${payload.length} bytes`);

      const decoded = decodeMessage(data.topic, payload);
      if (decoded) {
        const message: MqttMessage = {
          topic: data.topic,
          messageType: data.topic,
          timestamp: Date.now(),
          payload: decoded,
        };
        onMessage(message);
      }
    } catch (error) {
      console.error('[MQTT] ❌ 消息处理失败:', error);
    }
  });

  // 调用 main 进程连接
  await window.electronAPI.mqtt.connect(server, port);
}

/**
 * 断开 MQTT 连接
 */
export async function disconnectMqtt(): Promise<void> {
  console.log('[MQTT] 主动断开连接');
  await window.electronAPI.mqtt.disconnect();
}

/**
 * 检查是否已连接（暂不支持）
 */
export function isMqttConnected(): boolean {
  return false;
}
