# RoboMaster 2026 Client - Quick Reference

## 快速命令

### 开发
\`\`\`bash
# 安装依赖
npm install

# 启动开发模式
npm start

# 代码检查
npm run lint
\`\`\`

### 打包
\`\`\`bash
# 打包所有平台
npm run make

# 仅打包当前平台
npm run package
\`\`\`

## 默认配置

| 项目 | 默认值 | 说明 |
|------|--------|------|
| MQTT 服务器 | localhost | SharkDataSever 地址 |
| MQTT 端口 | 3333 | MQTT 协议端口 |
| UDP 视频端口 | 3334 | 视频流接收端口 |

## 项目结构速查

\`\`\`
src/
├── main/           # 主进程（Node.js）
│   ├── index.ts           # 应用入口
│   ├── udpVideoServer.ts  # UDP 服务器
│   ├── ipcHandlers.ts     # IPC 处理
│   └── configStore.ts     # 配置存储
├── preload/        # 预加载（安全桥接）
│   └── index.ts           # API 暴露
└── renderer/       # 渲染进程（React）
    ├── components/        # UI 组件
    ├── services/          # 业务逻辑
    ├── store/             # 状态管理
    └── types/             # 类型定义
\`\`\`

## 常用 API

### 视频控制
\`\`\`typescript
// 启动视频接收
await window.electronAPI.video.start(3334);

// 停止视频接收
await window.electronAPI.video.stop();

// 监听视频帧
const unsubscribe = window.electronAPI.video.onFrame((data) => {
  console.log('Received frame:', data.byteLength);
});
\`\`\`

### 配置管理
\`\`\`typescript
// 获取配置
const config = await window.electronAPI.config.get();

// 保存配置
await window.electronAPI.config.set({
  mqttServer: 'localhost',
  mqttPort: 3333,
});
\`\`\`

### MQTT 连接
\`\`\`typescript
import { connectMqtt, disconnectMqtt } from './services/mqttService';

// 连接
await connectMqtt(
  'localhost',
  3333,
  (message) => console.log('Received:', message),
  (status) => console.log('Status:', status)
);

// 断开
disconnectMqtt();
\`\`\`

## 消息类型速查

| 主题 | 消息类型 | 频率 | 说明 |
|------|----------|------|------|
| rm/game_status | GameStatus | 5Hz | 比赛状态 |
| rm/global_unit_status | GlobalUnitStatus | 1Hz | 全局单位状态 |
| rm/robot_dynamic_status | RobotDynamicStatus | 10Hz | 机器人实时数据 |
| rm/robot_static_status | RobotStaticStatus | 1Hz | 机器人固定属性 |
| rm/robot_position | RobotPosition | 1Hz | 机器人位置 |
| rm/event | Event | 触发式 | 事件通知 |
| rm/buff | Buff | 触发式 | Buff 效果 |
| rm/penalty_info | PenaltyInfo | 触发式 | 判罚信息 |

详细消息定义见 `resources/messages.proto`

## 故障排查速查

### MQTT 连接失败
1. 检查 SharkDataSever 是否运行
2. 确认端口号正确
3. 检查防火墙设置

### UDP 端口占用
\`\`\`bash
# Windows
netstat -ano | findstr :3334

# Linux/Mac
lsof -i :3334
\`\`\`

### Proto 解析错误
1. 确认 `resources/messages.proto` 存在
2. 检查文件版本与服务端一致

### 应用无法启动
1. 删除 `node_modules` 和 `package-lock.json`
2. 重新运行 `npm install`
3. 清理构建缓存：删除 `.webpack` 目录

## 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| F12 | 开发者工具 |
| Ctrl+R | 刷新应用 |
| Ctrl+Q | 退出应用 |

## 开发建议

### 调试技巧
- 主进程日志：查看终端输出
- 渲染进程日志：按 F12 打开 DevTools
- IPC 通信：在两端都添加 console.log

### 性能监控
\`\`\`typescript
// 监控消息处理性能
console.time('decode');
const decoded = decodeMessage(topic, buffer);
console.timeEnd('decode');
\`\`\`

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 添加有意义的注释
- 保持函数简短（<50行）

## 相关链接

- 📚 [项目 README](README.md)
- 🔧 [开发指南](DEVELOPMENT.md)
- 📊 [项目总结](PROJECT_SUMMARY.md)
- 🐙 [SharkDataSever](https://github.com/JNU-SHARK/SharkDataSever)
