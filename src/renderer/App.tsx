import React from 'react';
import ConnectionBar from './components/ConnectionBar';
import VideoArea from './components/VideoArea';
import DataPanel from './components/DataPanel';

const App: React.FC = () => {
  return (
    <div style={styles.container}>
      <ConnectionBar />
      <VideoArea />
      <DataPanel />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

export default App;
