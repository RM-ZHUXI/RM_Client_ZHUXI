import mqtt, { MqttClient } from 'mqtt';
import { BrowserWindow } from 'electron';
import protobuf from 'protobufjs';
import path from 'path';

let client: MqttClient | null = null;
let root: protobuf.Root | null = null;

// Load protobuf definitions
async function loadProto() {
  if (root) return root;
  const protoPath = path.join(__dirname, '../../resources/messages_up.proto');
  root = await protobuf.load(protoPath);
  return root;
}

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

    // 添加包监听
    client.on('packetsend', (packet: any) => {
      if (packet.cmd === 'publish') {
        console.log('[MQTT Main] 📤 发送包:', {
          topic: packet.topic,
          qos: packet.qos,
          payloadLength: packet.payload?.length,
          payloadHex: packet.payload?.toString('hex').substring(0, 100)
        });
      }
    });

    client.on('packetreceive', (packet: any) => {
      if (packet.cmd === 'puback') {
        console.log('[MQTT Main] 📥 收到确认:', packet);
      }
    });

    // 订阅主题（下行消息）
    const topics = [
      'GameStatus', 'GlobalUnitStatus', 'GlobalLogisticsStatus', 'GlobalSpecialMechanism',
      'RobotDynamicStatus', 'RobotStaticStatus', 'RobotModuleStatus', 'RobotPosition',
      'RobotInjuryStat', 'RobotRespawnStatus', 'RobotPathPlanInfo', 'Event', 'Buff',
      'PenaltyInfo', 'MapClickInfoNotify', 'RaderInfoToClient', 'CustomByteBlock',
      'TechCoreMotionStateSync', 'RobotPerformanceSelectionSync', 'DeployModeStatusSync',
      'RuneStatusSync', 'SentinelStatusSync', 'DartSelectTargetStatusSync',
      'GuardCtrlResult', 'AirSupportStatusSync',
    ];

    // 同时订阅上行主题用于测试回环
    const upTopics = [
      'RemoteControl', 'AssemblyCommand', 'RobotPerformanceSelectionCommand',
      'HeroDeployModeEventCommand', 'RuneActivateCommand', 'DartCommand',
      'GuardCtrlCommand', 'AirSupportCommand'
    ];

    [...topics, ...upTopics].forEach((topic) => {
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

export function publishMqtt(topic: string, data: any): void {
  if (!client || !client.connected) {
    console.error('[MQTT Main] ❌ 无法发送: MQTT 未连接');
    throw new Error('MQTT 未连接');
  }

  console.log(`[MQTT Main] 📝 准备发送消息到主题: ${topic}`);
  console.log(`[MQTT Main] 📝 原始数据:`, JSON.stringify(data, null, 2));
  console.log(`[MQTT Main] 📝 MQTT 连接状态: ${client.connected ? '已连接' : '未连接'}`);

  loadProto().then((root) => {
    const MessageType = root.lookupType(`rm_client_up.${topic}`);
    console.log(`[MQTT Main] 📝 找到消息类型: rm_client_up.${topic}`);

    const errMsg = MessageType.verify(data);
    if (errMsg) {
      console.error(`[MQTT Main] ❌ 消息验证失败: ${errMsg}`);
      throw Error(errMsg);
    }
    console.log(`[MQTT Main] ✅ 消息验证通过`);

    const message = MessageType.create(data);
    console.log(`[MQTT Main] 📝 创建的消息对象:`, JSON.stringify(MessageType.toObject(message), null, 2));

    const buffer = MessageType.encode(message).finish();
    console.log(`[MQTT Main] 📝 编码后的 Buffer 长度: ${buffer.length} 字节`);
    console.log(`[MQTT Main] 📝 编码后的 Buffer (hex): ${Buffer.from(buffer).toString('hex')}`);

    client!.publish(topic, Buffer.from(buffer), { qos: 1 }, (err, packet) => {
      if (err) {
        console.error(`[MQTT Main] ❌ 发布失败:`, err);
      } else {
        console.log(`[MQTT Main] ✅ 发布成功到主题: ${topic}`);
        if (packet) {
          console.log(`[MQTT Main] 📝 消息包信息:`, packet);
        }
      }
    });
  }).catch((error) => {
    console.error('[MQTT Main] ❌ 编码失败:', error);
    console.error('[MQTT Main] ❌ 错误堆栈:', error.stack);
    throw error;
  });
}
