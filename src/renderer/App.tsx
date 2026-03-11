import React, { useState } from 'react';
import VideoArea from './components/VideoArea';
import ControlPanel from './components/ControlPanel';

const App: React.FC = () => {
  const [showPanel, setShowPanel] = useState(false);

  return (
    <div style={styles.container}>
      <VideoArea />
      <div
        style={styles.trigger}
        onMouseEnter={() => setShowPanel(true)}
      />
      <ControlPanel visible={showPanel} onClose={() => setShowPanel(false)} />
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
  trigger: {
    position: 'fixed',
    left: 0,
    top: 0,
    width: '20px',
    height: '100vh',
    zIndex: 999,
  },
};

export default App;
