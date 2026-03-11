const mqtt = require('mqtt');
const protobuf = require('protobufjs');
const path = require('path');

async function test() {
  // 加载proto
  const root = await protobuf.load(path.join(__dirname, '../resources/messages_up.proto'));
  const GuardCtrlCommand = root.lookupType('rm_client_up.GuardCtrlCommand');

  // 连接MQTT
  const client = mqtt.connect('mqtt://127.0.0.1:3333', {
    clientId: 'test_client_' + Date.now()
  });

  client.on('connect', () => {
    console.log('✅ 已连接');

    // 测试不同的主题格式
    const data = { command_id: 1 };
    const message = GuardCtrlCommand.create(data);
    const buffer = GuardCtrlCommand.encode(message).finish();

    console.log('📝 编码数据:', Buffer.from(buffer).toString('hex'));

    // 尝试多种主题格式
    const topics = [
      'GuardCtrlCommand',
      'rm/client/up/GuardCtrlCommand',
      'rm_client_up/GuardCtrlCommand',
      'client/up/GuardCtrlCommand'
    ];

    topics.forEach((topic, i) => {
      setTimeout(() => {
        console.log(`📤 发送到主题: ${topic}`);
        client.publish(topic, Buffer.from(buffer), { qos: 1 }, (err) => {
          if (err) console.error('❌ 失败:', err);
          else console.log('✅ 成功:', topic);
        });
      }, i * 1000);
    });

    setTimeout(() => {
      client.end();
      console.log('🛑 测试完成');
    }, 5000);
  });

  client.on('error', (err) => {
    console.error('❌ 错误:', err);
  });
}

test().catch(console.error);
