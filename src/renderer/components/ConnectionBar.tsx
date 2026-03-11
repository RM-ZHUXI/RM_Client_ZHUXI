import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { connectMqtt, disconnectMqtt } from '../services/mqttService';

const ConnectionBar: React.FC = () => {
  const {
    config,
    setConfig,
    mqttStatus,
    setMqttStatus,
    videoStatus,
    setVideoStatus,
    addMessage,
  } = useAppStore();

  const [mqttServer, setMqttServer] = useState(config.mqttServer);
  const [mqttPort, setMqttPort] = useState(config.mqttPort.toString());
  const [udpPort, setUdpPort] = useState(config.udpVideoPort.toString());

  // 加载保存的配置
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const savedConfig = await window.electronAPI.config.get();
        setMqttServer(savedConfig.mqttServer);
        setMqttPort(savedConfig.mqttPort.toString());
        setUdpPort(savedConfig.udpVideoPort.toString());
        setConfig(savedConfig);
      } catch (error) {
        console.error('Failed to load config:', error);
      }
    };
    loadConfig();
  }, [setConfig]);

  const handleMqttConnect = async () => {
    const port = parseInt(mqttPort);
    if (isNaN(port)) {
      alert('Invalid MQTT port');
      return;
    }

    const newConfig = { mqttServer, mqttPort: port };
    setConfig(newConfig);

    // 保存配置
    await window.electronAPI.config.set(newConfig);

    // 显示连接信息
    console.log(`[MQTT] 尝试连接到: ${mqttServer}:${port}`);

    await connectMqtt(
      mqttServer,
      port,
      (message) => {
        console.log('[MQTT] 收到消息:', message.messageType);
        addMessage(message);
      },
      (status, error) => {
        console.log(`[MQTT] 状态变更: ${status}`, error || '');
        setMqttStatus(status);
        if (error) {
          console.error('[MQTT] 错误详情:', error);
          // 显示详细错误信息
          if (status === 'error') {
            alert(`MQTT 连接失败:\n\n${error}\n\n请检查:\n1. SharkDataSever 是否运行\n2. 服务器地址是否正确\n3. 端口号是否正确\n4. 防火墙设置`);
          }
        }
      }
    );
  };

  const handleMqttDisconnect = () => {
    disconnectMqtt();
    setMqttStatus('disconnected');
  };

  const handleVideoStart = async () => {
    const port = parseInt(udpPort);
    if (isNaN(port)) {
      alert('Invalid UDP port');
      return;
    }

    const newConfig = { udpVideoPort: port };
    setConfig(newConfig);

    // 保存配置
    await window.electronAPI.config.set(newConfig);

    setVideoStatus('connecting');

    try {
      const result = await window.electronAPI.video.start(port);
      if (result.success) {
        setVideoStatus('connected');
      } else {
        setVideoStatus('error');
        alert(`Failed to start video server: ${result.error}`);
      }
    } catch (error) {
      setVideoStatus('error');
      console.error('Failed to start video:', error);
    }
  };

  const handleVideoStop = async () => {
    try {
      await window.electronAPI.video.stop();
      setVideoStatus('disconnected');
    } catch (error) {
      console.error('Failed to stop video:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return '#4caf50';
      case 'connecting':
        return '#ff9800';
      case 'error':
        return '#f44336';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return '已连接';
      case 'connecting':
        return '连接中...';
      case 'error':
        return '错误';
      default:
        return '未连接';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <h3 style={styles.title}>MQTT 连接</h3>
        <div style={styles.inputGroup}>
          <label>服务器:</label>
          <input
            type="text"
            value={mqttServer}
            onChange={(e) => setMqttServer(e.target.value)}
            placeholder="localhost"
            style={styles.input}
            disabled={mqttStatus === 'connected'}
          />
        </div>
        <div style={styles.inputGroup}>
          <label>端口:</label>
          <input
            type="number"
            value={mqttPort}
            onChange={(e) => setMqttPort(e.target.value)}
            placeholder="3333"
            style={styles.input}
            disabled={mqttStatus === 'connected'}
          />
        </div>
        <div style={styles.statusRow}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: getStatusColor(mqttStatus),
            }}
          />
          <span style={styles.statusText}>{getStatusText(mqttStatus)}</span>
          {mqttStatus === 'connected' ? (
            <button onClick={handleMqttDisconnect} style={styles.button}>
              断开连接
            </button>
          ) : (
            <button
              onClick={handleMqttConnect}
              style={styles.button}
              disabled={mqttStatus === 'connecting'}
            >
              连接
            </button>
          )}
        </div>
      </div>

      <div style={styles.divider} />

      <div style={styles.section}>
        <h3 style={styles.title}>UDP 视频流</h3>
        <div style={styles.inputGroup}>
          <label>端口:</label>
          <input
            type="number"
            value={udpPort}
            onChange={(e) => setUdpPort(e.target.value)}
            placeholder="3334"
            style={styles.input}
            disabled={videoStatus === 'connected'}
          />
        </div>
        <div style={styles.statusRow}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: getStatusColor(videoStatus),
            }}
          />
          <span style={styles.statusText}>{getStatusText(videoStatus)}</span>
          {videoStatus === 'connected' ? (
            <button onClick={handleVideoStop} style={styles.button}>
              停止接收
            </button>
          ) : (
            <button
              onClick={handleVideoStart}
              style={styles.button}
              disabled={videoStatus === 'connecting'}
            >
              开始接收
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    padding: '16px',
    backgroundColor: '#2c2c2c',
    borderBottom: '1px solid #444',
    gap: '32px',
  },
  section: {
    flex: 1,
  },
  title: {
    margin: '0 0 12px 0',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  inputGroup: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '6px 8px',
    backgroundColor: '#1e1e1e',
    border: '1px solid #444',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '13px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    marginTop: '12px',
    gap: '8px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  statusText: {
    flex: 1,
    fontSize: '13px',
    color: '#fff',
  },
  button: {
    padding: '6px 16px',
    backgroundColor: '#0078d4',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
  },
  divider: {
    width: '1px',
    backgroundColor: '#444',
  },
};

export default ConnectionBar;
