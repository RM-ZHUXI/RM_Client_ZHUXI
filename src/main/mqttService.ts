import mqtt, { MqttClient } from 'mqtt';
import { BrowserWindow } from 'electron';

let client: MqttClient | null = null;

export function connectMqtt(server: string, port: number, mainWindow: BrowserWindow): void {
  if (client) {
    client.end(true);
  }

  const cleanServer = server.replace(/^mqtt:\/\//, '').replace(/^ws:\/\//, '');
  const url = `mqtt://${cleanServer}:${port}`;

  console.log('[MQTT Main] 连接到:', url);

  client = mqtt.connect(url, {
    reconnectPeriod: 5000,
    connectTimeout: 10000,
    clientId: `robomaster_client_${Date.now()}`,
    clean: true,
    keepalive: 60,
  });

  client.on('connect', () => {
    console.log('[MQTT Main] ✅ 连接成功');
    mainWindow.webContents.send('mqtt:status', 'connected');

    // 订阅主题
    const topics = [
      'GameStatus', 'GlobalUnitStatus', 'GlobalLogisticsStatus', 'GlobalSpecialMechanism',
      'RobotDynamicStatus', 'RobotStaticStatus', 'RobotModuleStatus', 'RobotPosition',
      'RobotInjuryStat', 'RobotRespawnStatus', 'RobotPathPlanInfo', 'Event', 'Buff',
      'PenaltyInfo', 'MapClickInfoNotify', 'RaderInfoToClient', 'CustomByteBlock',
      'TechCoreMotionStateSync', 'RobotPerformanceSelectionSync', 'DeployModeStatusSync',
      'RuneStatusSync', 'SentinelStatusSync', 'DartSelectTargetStatusSync',
      'GuardCtrlResult', 'AirSupportStatusSync',
    ];

    topics.forEach((topic) => {
      client?.subscribe(topic, { qos: 1 }, (err) => {
        if (!err) {
          console.log(`[MQTT Main] ✅ 已订阅: ${topic}`);
        }
      });
    });
  });

  client.on('message', (topic, payload) => {
    mainWindow.webContents.send('mqtt:message', { topic, payload: Array.from(payload) });
  });

  client.on('error', (error) => {
    console.error('[MQTT Main] ❌ 错误:', error);
    mainWindow.webContents.send('mqtt:status', 'error', error.message);
  });

  client.on('close', () => {
    console.log('[MQTT Main] 连接关闭');
    mainWindow.webContents.send('mqtt:status', 'disconnected');
  });
}

export function disconnectMqtt(): void {
  if (client) {
    client.end(true);
    client = null;
  }
}
