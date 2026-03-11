import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';

const DataPanel: React.FC = () => {
  const { messages, clearMessages } = useAppStore();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleToggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const timeStr = date.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${timeStr}.${ms}`;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>数据流 ({messages.length})</h3>
        <button onClick={clearMessages} style={styles.clearButton}>
          清空
        </button>
      </div>
      <div style={styles.messageList}>
        {messages.length === 0 ? (
          <div style={styles.emptyMessage}>暂无数据</div>
        ) : (
          messages.map((message, index) => (
            <div key={index} style={styles.messageItem}>
              <div
                style={styles.messageHeader}
                onClick={() => handleToggleExpand(index)}
              >
                <span style={styles.timestamp}>
                  {formatTimestamp(message.timestamp)}
                </span>
                <span style={styles.messageType}>{message.messageType}</span>
                <span style={styles.expandIcon}>
                  {expandedIndex === index ? '▼' : '▶'}
                </span>
              </div>
              {expandedIndex === index && (
                <pre style={styles.messageContent}>
                  {JSON.stringify(message.payload, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '300px',
    backgroundColor: '#1e1e1e',
    borderTop: '1px solid #444',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #444',
  },
  title: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    padding: '6px 12px',
    backgroundColor: '#d32f2f',
    border: 'none',
    borderRadius: '4px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
  },
  messageList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#888',
    padding: '32px',
    fontSize: '14px',
  },
  messageItem: {
    marginBottom: '8px',
    backgroundColor: '#2c2c2c',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  messageHeader: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 12px',
    cursor: 'pointer',
    gap: '12px',
  },
  timestamp: {
    color: '#888',
    fontSize: '12px',
    fontFamily: 'monospace',
    minWidth: '100px',
  },
  messageType: {
    flex: 1,
    color: '#4caf50',
    fontSize: '13px',
    fontWeight: 'bold',
  },
  expandIcon: {
    color: '#888',
    fontSize: '12px',
  },
  messageContent: {
    margin: 0,
    padding: '12px',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    fontSize: '12px',
    fontFamily: 'monospace',
    overflowX: 'auto',
    borderTop: '1px solid #444',
  },
};

export default DataPanel;
