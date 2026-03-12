import React from 'react';
import { useAppStore } from '../store/appStore';
import { connectMqtt, disconnectMqtt } from '../services/mqttService';

interface ControlPanelProps {
  visible: boolean;
  onClose: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ visible, onClose }) => {
  const { mqttStatus, videoStatus, messages, setMqttStatus, addMessage } = useAppStore();
  const [mqttServer, setMqttServer] = React.useState('127.0.0.1');
  const [mqttPort, setMqttPort] = React.useState(3333);
  const [udpPort, setUdpPort] = React.useState(3334);

  React.useEffect(() => {
    window.electronAPI.config.get().then((config) => {
      setMqttServer(config.mqttServer);
      setMqttPort(config.mqttPort);
      setUdpPort(config.udpVideoPort);
    });
  }, []);

  const handleMqttConnect = async () => {
    if (mqttStatus === 'connected') {
      await disconnectMqtt();
      return;
    }

    await window.electronAPI.config.set({ mqttServer, mqttPort });
    await connectMqtt(
      mqttServer,
      mqttPort,
      (msg) => addMessage(msg),
      (status, error) => {
        setMqttStatus(status);
        if (error) console.error(error);
      }
    );
  };

  const handleVideoToggle = async () => {
    if (videoStatus === 'connected') {
      await window.electronAPI.video.stop();
    } else {
      await window.electronAPI.config.set({ udpVideoPort: udpPort });
      await window.electronAPI.video.start(udpPort);
    }
  };

  return (
    <div
      style={{
        ...styles.panel,
        transform: visible ? 'translateX(0)' : 'translateX(-100%)',
      }}
      onMouseLeave={onClose}
    >
      <div style={styles.header}>
        <h2 style={styles.title}>控制面板</h2>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>MQTT 连接</h3>
        <input
          style={styles.input}
          value={mqttServer}
          onChange={(e) => setMqttServer(e.target.value)}
          placeholder="服务器地址"
        />
        <input
          style={styles.input}
          type="number"
          value={mqttPort}
          onChange={(e) => setMqttPort(Number(e.target.value))}
          placeholder="端口"
        />
        <button
          style={{
            ...styles.button,
            backgroundColor: mqttStatus === 'connected' ? '#f44336' : '#4CAF50',
          }}
          onClick={handleMqttConnect}
        >
          {mqttStatus === 'connected' ? '断开' : '连接'}
        </button>
        <div style={styles.status}>
          状态: {mqttStatus === 'connected' ? '✅ 已连接' : '⭕ 未连接'}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>视频流</h3>
        <input
          style={styles.input}
          type="number"
          value={udpPort}
          onChange={(e) => setUdpPort(Number(e.target.value))}
          placeholder="UDP 端口"
        />
        <button
          style={{
            ...styles.button,
            backgroundColor: videoStatus === 'connected' ? '#f44336' : '#2196F3',
          }}
          onClick={handleVideoToggle}
        >
          {videoStatus === 'connected' ? '停止接收' : '开始接收'}
        </button>
        <div style={styles.status}>
          状态: {videoStatus === 'connected' ? '✅ 运行中' : '⭕ 已停止'}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>消息 ({messages.length})</h3>
        <div style={styles.messageList}>
          {messages.slice(-5).reverse().map((msg, i) => (
            <div key={i} style={styles.message}>
              <div style={styles.messageTopic}>{msg.topic}</div>
              <div style={styles.messageTime}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '320px',
    height: '100vh',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    padding: '20px',
    boxShadow: '2px 0 20px rgba(0,0,0,0.5)',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
    overflowY: 'auto',
  },
  header: {
    marginBottom: '30px',
    borderBottom: '2px solid rgba(255,255,255,0.1)',
    paddingBottom: '15px',
  },
  title: {
    margin: 0,
    fontSize: '24px',
    fontWeight: 600,
  },
  section: {
    marginBottom: '30px',
  },
  sectionTitle: {
    margin: '0 0 15px 0',
    fontSize: '16px',
    fontWeight: 500,
    color: '#aaa',
  },
  input: {
    width: '100%',
    padding: '10px',
    marginBottom: '10px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
  },
  button: {
    width: '100%',
    padding: '12px',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: '10px',
  },
  status: {
    fontSize: '14px',
    color: '#aaa',
  },
  messageList: {
    maxHeight: '200px',
    overflowY: 'auto',
  },
  message: {
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '4px',
    fontSize: '12px',
  },
  messageTopic: {
    fontWeight: 600,
    marginBottom: '4px',
  },
  messageTime: {
    color: '#888',
    fontSize: '11px',
  },
};

export default ControlPanel;
