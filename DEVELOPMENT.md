# RoboMaster 2026 客户端 - 开发指南

## 快速开始

### 安装依赖
\`\`\`bash
npm install
\`\`\`

### 开发模式
\`\`\`bash
npm start
\`\`\`

### 打包构建
\`\`\`bash
npm run make
\`\`\`

## 项目架构

### 主进程 (Main Process)

位于 `src/main/`，负责：
- 窗口管理
- UDP 视频服务器
- IPC 通信处理

#### 核心文件：
- `index.ts` - 主进程入口，创建窗口
- `udpVideoServer.ts` - UDP 视频数据接收
- `ipcHandlers.ts` - 处理渲染进程的 IPC 请求

### 预加载脚本 (Preload)

位于 `src/preload/index.ts`

- 使用 `contextBridge` 安全地暴露 API
- 遵循最小权限原则
- 类型安全的接口定义

### 渲染进程 (Renderer Process)

位于 `src/renderer/`，React 应用：

#### 组件结构：
- `ConnectionBar.tsx` - 连接管理界面
- `VideoArea.tsx` - 视频流显示
- `DataPanel.tsx` - 数据消息列表

#### 服务层：
- `mqttService.ts` - MQTT 连接与消息处理
- `protoDecoder.ts` - Protobuf 消息解码

#### 状态管理：
- `store/appStore.ts` - Zustand 全局状态

## MQTT 通信

### 连接流程

1. 用户配置服务器地址和端口
2. 调用 `connectMqtt()` 建立连接
3. 自动订阅所有相关主题
4. 接收到消息后自动解码并更新状态

### 支持的主题

所有主题定义在 `mqttService.ts` 中：

\`\`\`typescript
const topics = [
  'rm/game_status',
  'rm/global_unit_status',
  'rm/robot_dynamic_status',
  // ... 等 20+ 个主题
];
\`\`\`

### 消息解码

使用 `protobufjs` 动态加载 `.proto` 文件：

\`\`\`typescript
// 初始化
await initProtoDecoder();

// 解码
const decoded = decodeMessage(topic, buffer);
\`\`\`

## UDP 视频流

### 架构设计

UDP 接收必须在主进程完成：

1. **主进程** - 使用 Node.js `dgram` 创建 UDP Socket
2. **IPC 传输** - 通过 `webContents.send()` 发送帧数据
3. **渲染进程** - 接收并渲染视频

### 视频解码

当前实现接收原始数据，需要根据实际编码格式解码：

#### H.264 解码示例
\`\`\`bash
npm install broadway
\`\`\`

\`\`\`typescript
import Broadway from 'broadway';

const player = new Broadway.Player({
  canvas: canvasRef.current
});

window.electronAPI.video.onFrame((data) => {
  player.decode(new Uint8Array(data));
});
\`\`\`

#### MJPEG 解码示例
\`\`\`typescript
window.electronAPI.video.onFrame((data) => {
  const blob = new Blob([data], { type: 'image/jpeg' });
  const url = URL.createObjectURL(blob);
  imgRef.current.src = url;
});
\`\`\`

## 状态管理

使用 Zustand 进行状态管理：

\`\`\`typescript
// 使用 store
const { config, setConfig } = useAppStore();

// 更新状态
setConfig({ mqttServer: 'localhost' });
\`\`\`

### 状态结构

\`\`\`typescript
interface AppState {
  config: ConnectionConfig;
  mqttStatus: ConnectionStatus;
  videoStatus: ConnectionStatus;
  messages: MqttMessage[];
  isVideoReceiving: boolean;
}
\`\`\`

## 类型定义

### Electron API 类型

定义在 `src/renderer/types/electron.d.ts`：

\`\`\`typescript
interface ElectronAPI {
  video: {
    start: (port: number) => Promise<Result>;
    stop: () => Promise<Result>;
    // ...
  };
}
\`\`\`

### Protobuf 消息类型

定义在 `src/renderer/types/messages.ts`，与 `.proto` 文件对应。

## 调试技巧

### 主进程调试

\`\`\`bash
# 启动时自动打开 DevTools
npm start
\`\`\`

主进程日志会输出到终端。

### 渲染进程调试

在开发模式下自动打开 Chrome DevTools。

### IPC 通信调试

\`\`\`typescript
// 主进程
ipcMain.handle('video:start', async (_event, port) => {
  console.log('Received video:start', port);
  // ...
});

// 渲染进程
const result = await window.electronAPI.video.start(3334);
console.log('Video start result:', result);
\`\`\`

## 性能优化

### MQTT 消息处理

- 限制消息列表最大长度（当前1000条）
- 使用虚拟滚动处理大量消息

### 视频流处理

- 主进程接收，避免阻塞 UI
- 使用缓冲区管理帧数据
- 控制帧率避免内存溢出

## 常见问题

### Q: MQTT 无法连接？
A:
1. 检查 SharkDataSever 是否运行
2. 确认防火墙设置
3. 查看控制台错误信息

### Q: UDP 端口被占用？
A:
\`\`\`bash
# Windows
netstat -ano | findstr :3334
taskkill /PID <pid> /F

# Linux/Mac
lsof -i :3334
kill -9 <pid>
\`\`\`

### Q: Proto 解析失败？
A:
1. 确认 `resources/messages.proto` 存在
2. 检查 proto 文件版本与服务端一致
3. 清理缓存重新构建

### Q: 打包后无法运行？
A:
1. 检查 `forge.config.ts` 中的 `asar` 配置
2. 确保 proto 文件被正确打包
3. 查看打包日志

## 扩展开发

### 添加新的消息类型

1. 更新 `resources/messages.proto`
2. 在 `protoDecoder.ts` 中添加主题映射
3. 在 `types/messages.ts` 中添加 TypeScript 类型
4. 在 `mqttService.ts` 中订阅新主题

### 添加新的 IPC 接口

1. 在 `ipcHandlers.ts` 中注册处理器
2. 在 `preload/index.ts` 中暴露 API
3. 在 `types/electron.d.ts` 中添加类型定义

## 部署

### Windows

\`\`\`bash
npm run make
\`\`\`

生成 `.exe` 安装包在 `out/make/squirrel.windows/`

### macOS

\`\`\`bash
npm run make -- --platform=darwin
\`\`\`

生成 `.dmg` 安装包在 `out/make/`

### Linux

\`\`\`bash
npm run make -- --platform=linux
\`\`\`

生成 `.deb` 和 `.rpm` 包在 `out/make/`

## 相关资源

- [Electron 文档](https://www.electronjs.org/docs)
- [Electron Forge](https://www.electronforge.io/)
- [Protobuf.js](https://github.com/protobufjs/protobuf.js)
- [MQTT.js](https://github.com/mqttjs/MQTT.js)
- [Zustand](https://github.com/pmndrs/zustand)
