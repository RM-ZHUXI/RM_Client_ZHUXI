import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/appStore';

interface CommandPanelProps {
  visible: boolean;
  onClose: () => void;
  onRemoteEnabledChange?: (enabled: boolean) => void;
}

const CommandPanel: React.FC<CommandPanelProps> = ({ visible, onClose, onRemoteEnabledChange }) => {
  const { mqttStatus } = useAppStore();
  const [showMap, setShowMap] = useState(false);

  // RemoteControl state
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const mouseState = useRef({ x: 0, y: 0, z: 0, left: false, right: false, mid: false });
  const keyboardState = useRef(0);

  // 通知父组件键鼠模式状态变化
  useEffect(() => {
    onRemoteEnabledChange?.(remoteEnabled);
  }, [remoteEnabled, onRemoteEnabledChange]);

  // Other commands state
  const [assemblyOp, setAssemblyOp] = useState(1);
  const [assemblyDiff, setAssemblyDiff] = useState(1);
  const [shooterPerf, setShooterPerf] = useState(1);
  const [chassisPerf, setChassisPerf] = useState(1);
  const [heroMode, setHeroMode] = useState(1);
  const [dartTarget, setDartTarget] = useState(1);
  const [dartOpen, setDartOpen] = useState(true);
  const [guardCmd, setGuardCmd] = useState(1);
  const [airCmd, setAirCmd] = useState(1);

  // RemoteControl 75Hz sender
  useEffect(() => {
    if (!remoteEnabled || mqttStatus !== 'connected') return;

    console.log('[RemoteControl] 🎮 启动75Hz发送器');
    let frameCount = 0;

    const interval = setInterval(() => {
      const data = {
        mouseX: mouseState.current.x,
        mouseY: mouseState.current.y,
        mouseZ: mouseState.current.z,
        leftButtonDown: mouseState.current.left,
        rightButtonDown: mouseState.current.right,
        keyboardValue: keyboardState.current,
        midButtonDown: mouseState.current.mid,
        data: new Uint8Array(0)
      };

      frameCount++;
      if (frameCount % 75 === 0) {
        console.log(`[RemoteControl] 📊 已发送 ${frameCount} 帧`);
        console.log(`[RemoteControl] 📝 当前状态:`, data);
      }

      window.electronAPI.mqtt.publish('RemoteControl', data).catch((err) => {
        console.error('[RemoteControl] ❌ 发送失败:', err);
      });
    }, 1000 / 75);

    return () => {
      console.log('[RemoteControl] 🛑 停止75Hz发送器');
      clearInterval(interval);
    };
  }, [remoteEnabled, mqttStatus]);

  // 监听 cursorVisible 变化，更新鼠标显示
  useEffect(() => {
    if (remoteEnabled) {
      document.body.style.cursor = cursorVisible ? 'default' : 'none';
    }
  }, [cursorVisible, remoteEnabled]);

  // Mouse and keyboard listeners
  useEffect(() => {
    if (!remoteEnabled) {
      document.body.style.cursor = 'default';
      return;
    }

    // 进入键鼠模式时隐藏鼠标
    setCursorVisible(false);
    document.body.style.cursor = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      mouseState.current.x = e.movementX;
      mouseState.current.y = e.movementY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) mouseState.current.left = true;
      if (e.button === 1) mouseState.current.mid = true;
      if (e.button === 2) mouseState.current.right = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) mouseState.current.left = false;
      if (e.button === 1) mouseState.current.mid = false;
      if (e.button === 2) mouseState.current.right = false;
    };

    const handleWheel = (e: WheelEvent) => {
      mouseState.current.z = e.deltaY > 0 ? -1 : 1;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc 退出键鼠模式
      if (e.key === 'Escape') {
        setRemoteEnabled(false);
        e.preventDefault();
        return;
      }

      // Ctrl+Shift+P 切换鼠标显示
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        setCursorVisible(prev => !prev);
        e.preventDefault();
        return;
      }

      const keyMap: Record<string, number> = {
        'w': 1, 's': 2, 'a': 4, 'd': 8,
        'Shift': 16, 'Control': 32, 'q': 64, 'e': 128,
        'r': 256, 'f': 512, 'g': 1024, 'z': 2048,
        'x': 4096, 'c': 8192, 'v': 16384, 'b': 32768
      };
      if (keyMap[e.key]) keyboardState.current |= keyMap[e.key];
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const keyMap: Record<string, number> = {
        'w': 1, 's': 2, 'a': 4, 'd': 8,
        'Shift': 16, 'Control': 32, 'q': 64, 'e': 128,
        'r': 256, 'f': 512, 'g': 1024, 'z': 2048,
        'x': 4096, 'c': 8192, 'v': 16384, 'b': 32768
      };
      if (keyMap[e.key]) keyboardState.current &= ~keyMap[e.key];
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      console.log('[RemoteControl] 🛑 停止监听器');
      setCursorVisible(true);
      document.body.style.cursor = 'default'; // 退出时恢复鼠标
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [remoteEnabled]);

  const sendCommand = async (topic: string, data: any) => {
    if (mqttStatus !== 'connected') {
      console.error('[CommandPanel] ❌ MQTT未连接，无法发送');
      alert('MQTT未连接');
      return;
    }
    console.log(`[CommandPanel] 📤 发送指令: ${topic}`);
    console.log(`[CommandPanel] 📝 数据:`, data);
    try {
      const result = await window.electronAPI.mqtt.publish(topic, data);
      console.log(`[CommandPanel] ✅ 发送结果:`, result);
    } catch (error) {
      console.error(`[CommandPanel] ❌ 发送失败:`, error);
      alert(`发送失败: ${error}`);
    }
  };

  return (
    <div
      style={{
        ...styles.panel,
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
      }}
      onMouseLeave={onClose}
    >
      <div style={styles.header}>
        <h2 style={styles.title}>指令发送</h2>
        <div style={styles.status}>
          {mqttStatus === 'connected' ? '✅ 已连接' : '⭕ 未连接'}
        </div>
      </div>

      <div style={styles.scrollContainer}>
        {/* RemoteControl */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>RemoteControl (75Hz)</h3>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={remoteEnabled}
              onChange={(e) => setRemoteEnabled(e.target.checked)}
            />
            启用实时键鼠控制
          </label>
          <div style={styles.hint}>WASD移动 鼠标控制视角</div>
        </div>

        {/* MapClickInfoNotify */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>地图标记 (触发)</h3>
          <button
            style={styles.button}
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? '关闭地图' : '打开地图'}
          </button>
        </div>

        {/* AssemblyCommand */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>工程装配 (1Hz)</h3>
          <select style={styles.select} value={assemblyOp} onChange={(e) => setAssemblyOp(Number(e.target.value))}>
            <option value={1}>确认装配</option>
            <option value={2}>取消装配</option>
          </select>
          <input
            style={styles.input}
            type="number"
            placeholder="难度"
            value={assemblyDiff}
            onChange={(e) => setAssemblyDiff(Number(e.target.value))}
          />
          <button
            style={styles.button}
            onClick={() => sendCommand('AssemblyCommand', { operation: assemblyOp, difficulty: assemblyDiff })}
          >
            发送
          </button>
        </div>

        {/* RobotPerformanceSelectionCommand */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>性能体系 (1Hz)</h3>
          <input
            style={styles.input}
            type="number"
            placeholder="发射机构"
            value={shooterPerf}
            onChange={(e) => setShooterPerf(Number(e.target.value))}
          />
          <input
            style={styles.input}
            type="number"
            placeholder="底盘"
            value={chassisPerf}
            onChange={(e) => setChassisPerf(Number(e.target.value))}
          />
          <button
            style={styles.button}
            onClick={() => sendCommand('RobotPerformanceSelectionCommand', { shooter: shooterPerf, chassis: chassisPerf })}
          >
            发送
          </button>
        </div>

        {/* HeroDeployModeEventCommand */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>英雄部署 (1Hz)</h3>
          <select style={styles.select} value={heroMode} onChange={(e) => setHeroMode(Number(e.target.value))}>
            <option value={0}>退出</option>
            <option value={1}>进入</option>
          </select>
          <button
            style={styles.button}
            onClick={() => sendCommand('HeroDeployModeEventCommand', { mode: heroMode })}
          >
            发送
          </button>
        </div>

        {/* RuneActivateCommand */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>能量机关 (1Hz)</h3>
          <button
            style={styles.button}
            onClick={() => sendCommand('RuneActivateCommand', { activate: 1 })}
          >
            激活
          </button>
        </div>

        {/* DartCommand */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>飞镖控制 (1Hz)</h3>
          <select style={styles.select} value={dartTarget} onChange={(e) => setDartTarget(Number(e.target.value))}>
            <option value={1}>前哨站</option>
            <option value={2}>基地固定</option>
            <option value={3}>基地随机固定</option>
            <option value={4}>基地随机移动</option>
            <option value={5}>基地末端移动</option>
          </select>
          <label style={styles.label}>
            <input
              type="checkbox"
              checked={dartOpen}
              onChange={(e) => setDartOpen(e.target.checked)}
            />
            闸门开启
          </label>
          <button
            style={styles.button}
            onClick={() => sendCommand('DartCommand', { targetId: dartTarget, open: dartOpen })}
          >
            发送
          </button>
        </div>

        {/* GuardCtrlCommand */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>哨兵控制 (1Hz)</h3>
          <input
            style={styles.input}
            type="number"
            placeholder="指令ID (1-10)"
            value={guardCmd}
            onChange={(e) => setGuardCmd(Number(e.target.value))}
          />
          <button
            style={styles.button}
            onClick={() => sendCommand('GuardCtrlCommand', { commandId: guardCmd })}
          >
            发送
          </button>
        </div>

        {/* AirSupportCommand */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>空中支援 (1Hz)</h3>
          <select style={styles.select} value={airCmd} onChange={(e) => setAirCmd(Number(e.target.value))}>
            <option value={1}>免费呼叫</option>
            <option value={2}>花费金币</option>
            <option value={3}>中断</option>
          </select>
          <button
            style={styles.button}
            onClick={() => sendCommand('AirSupportCommand', { commandId: airCmd })}
          >
            发送
          </button>
        </div>
      </div>

      {/* Map overlay */}
      {showMap && (
        <MapOverlay onClose={() => setShowMap(false)} onSend={sendCommand} />
      )}
    </div>
  );
};

// Map overlay component
const MapOverlay: React.FC<{ onClose: () => void; onSend: (topic: string, data: any) => void }> = ({ onClose, onSend }) => {
  const [mapImage, setMapImage] = useState<string>('');

  useEffect(() => {
    // Try to load map image
    const img = 'resources/map.png';
    setMapImage(img);
  }, []);

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert to map coordinates (example: 28m x 15m field)
    const mapX = (x / rect.width) * 28;
    const mapY = (y / rect.height) * 15;

    onSend('MapClickInfoNotify', {
      isSendAll: 1,
      robotId: new Uint8Array(7),
      mode: 1,
      enemyId: 0,
      ascii: 65,
      type: 1,
      screenX: Math.floor(x),
      screenY: Math.floor(y),
      mapX: mapX,
      mapY: mapY
    });
  };

  return (
    <div style={styles.mapOverlay}>
      <div style={styles.mapContainer}>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>
        <h3 style={styles.mapTitle}>点击地图发送标记</h3>
        <div style={styles.mapHint}>
          将地图图片放置于: resources/map.png
        </div>
        <div
          style={{
            ...styles.mapArea,
            backgroundImage: mapImage ? `url(${mapImage})` : 'none',
            backgroundColor: mapImage ? 'transparent' : '#333'
          }}
          onClick={handleMapClick}
        >
          {!mapImage && <div style={styles.mapPlaceholder}>点击此处发送标记</div>}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    position: 'fixed',
    right: 0,
    top: 0,
    width: '320px',
    height: '100vh',
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    backdropFilter: 'blur(10px)',
    color: '#fff',
    padding: '20px',
    boxShadow: '-2px 0 20px rgba(0,0,0,0.5)',
    transition: 'transform 0.3s ease',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    marginBottom: '20px',
    borderBottom: '2px solid rgba(255,255,255,0.1)',
    paddingBottom: '15px',
  },
  title: {
    margin: '0 0 8px 0',
    fontSize: '24px',
    fontWeight: 600,
  },
  status: {
    fontSize: '12px',
    color: '#aaa',
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    fontWeight: 500,
    color: '#aaa',
  },
  input: {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '13px',
  },
  select: {
    width: '100%',
    padding: '8px',
    marginBottom: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '4px',
    color: '#fff',
    fontSize: '13px',
  },
  button: {
    width: '100%',
    padding: '10px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#2196F3',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontSize: '13px',
  },
  hint: {
    fontSize: '11px',
    color: '#888',
    marginTop: '4px',
  },
  mapOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  mapContainer: {
    position: 'relative',
    backgroundColor: 'rgba(40,40,40,0.95)',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '80vw',
    maxHeight: '80vh',
  },
  closeBtn: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '24px',
    cursor: 'pointer',
  },
  mapTitle: {
    margin: '0 0 10px 0',
    fontSize: '18px',
    color: '#fff',
  },
  mapHint: {
    fontSize: '12px',
    color: '#aaa',
    marginBottom: '15px',
  },
  mapArea: {
    width: '700px',
    height: '400px',
    backgroundSize: 'contain',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    cursor: 'crosshair',
    border: '2px solid rgba(255,255,255,0.3)',
    borderRadius: '4px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    color: '#666',
    fontSize: '16px',
  },
};

export default CommandPanel;
