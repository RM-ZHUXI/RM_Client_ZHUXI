import Store from 'electron-store';
import { ConnectionConfig } from '../renderer/types/messages';

interface ConfigStore {
  connection: ConnectionConfig;
}

const store = new Store<ConfigStore>({
  defaults: {
    connection: {
      mqttServer: '127.0.0.1',  // 使用 127.0.0.1 而不是 localhost，避免 IPv6 解析问题
      mqttPort: 3333,
      udpVideoPort: 3334,
    },
  },
}) as any;

export function getConfig(): ConnectionConfig {
  return store.get('connection') as ConnectionConfig;
}

export function setConfig(config: Partial<ConnectionConfig>): void {
  const currentConfig = store.get('connection') as ConnectionConfig;
  store.set('connection', { ...currentConfig, ...config });
}

export default store;
