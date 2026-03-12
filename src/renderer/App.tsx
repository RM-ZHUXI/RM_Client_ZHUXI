import React, { useState, useEffect } from 'react';
import VideoArea from './components/VideoArea';
import ControlPanel from './components/ControlPanel';
import CommandPanel, { MapOverlay } from './components/CommandPanel';

const App: React.FC = () => {
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showCommandPanel, setShowCommandPanel] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [remoteControlActive, setRemoteControlActive] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !remoteControlActive) {
        setShowExitDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [remoteControlActive]);

  const handleExit = () => {
    window.electronAPI.app.quit();
  };

  const sendCommand = async (topic: string, data: any) => {
    try {
      await window.electronAPI.mqtt.publish(topic, data);
    } catch (err) {
      console.error('发送失败:', err);
    }
  };

  return (
    <div style={styles.container}>
      <VideoArea />
      <div
        style={styles.leftTrigger}
        onMouseEnter={() => !remoteControlActive && setShowControlPanel(true)}
      />
      <div
        style={styles.rightTrigger}
        onMouseEnter={() => !remoteControlActive && setShowCommandPanel(true)}
      />
      <ControlPanel visible={showControlPanel} onClose={() => setShowControlPanel(false)} />
      <CommandPanel
        visible={showCommandPanel}
        onClose={() => setShowCommandPanel(false)}
        onRemoteEnabledChange={setRemoteControlActive}
        onMapToggle={setShowMap}
        mapVisible={showMap}
      />

      {showMap && (
        <MapOverlay onClose={() => setShowMap(false)} onSend={sendCommand} />
      )}

      {showExitDialog && (
        <div style={styles.overlay}>
          <div style={styles.dialog}>
            <h2 style={styles.dialogTitle}>退出应用程序</h2>
            <p style={styles.dialogText}>确定要退出吗？</p>
            <div style={styles.dialogButtons}>
              <button style={styles.cancelButton} onClick={() => setShowExitDialog(false)}>
                取消
              </button>
              <button style={styles.exitButton} onClick={handleExit}>
                退出
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    width: '100vw',
    height: '100vh',
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  leftTrigger: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '20px',
    height: '100vh',
    zIndex: 999,
  },
  rightTrigger: {
    position: 'fixed',
    right: 0,
    top: 0,
    width: '20px',
    height: '100vh',
    zIndex: 999,
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.8)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  dialog: {
    backgroundColor: 'rgba(40, 40, 40, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '30px',
    borderRadius: '8px',
    minWidth: '300px',
    textAlign: 'center',
  },
  dialogTitle: {
    margin: '0 0 15px 0',
    fontSize: '20px',
    color: '#fff',
  },
  dialogText: {
    margin: '0 0 25px 0',
    fontSize: '16px',
    color: '#ccc',
  },
  dialogButtons: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
  },
  cancelButton: {
    padding: '10px 30px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#666',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
  exitButton: {
    padding: '10px 30px',
    border: 'none',
    borderRadius: '4px',
    backgroundColor: '#f44336',
    color: '#fff',
    fontSize: '14px',
    cursor: 'pointer',
  },
};

export default App;
