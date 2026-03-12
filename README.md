# RoboMaster 2026 客户端 (RM_Client_ZHUXI)

一个原生桌面客户端，用于对接 SharkDataSever 服务端，实时接收、解析并显示比赛数据与视频流。

## 功能特性

- ✅ **MQTT 连接管理** - 连接到 SharkDataSever MQTT 服务器，接收 Protobuf 格式的比赛数据
- ✅ **实时数据展示** - 解析并显示各类比赛消息（GameStatus、RobotStatus、Event等）
- ✅ **UDP 视频流** - 通过主进程接收 UDP 视频流数据
- ✅ **连接状态监控** - 实时显示 MQTT 和视频流的连接状态
- ✅ **配置持久化** - 保存用户配置，下次启动自动加载

## 技术栈

- **主框架**: Electron + electron-builder
- **打包工具**: Webpack 5
- **前端**: React 19 + TypeScript
- **状态管理**: Zustand
- **数据通信**:
  - MQTT: mqtt.js (主进程)
  - UDP: Node.js dgram (主进程)
- **数据解析**: protobuf.js
- **进程通信**: IPC (contextBridge + preload)

## 环境要求

- Node.js >= 18.x
- npm >= 9.x

## 安装与运行

### 1. 安装依赖

```bash
npm install
```

### 2. 开发模式运行

```bash
npm start
```

这将编译代码并启动 Electron 应用。

### 3. 打包构建

构建 Windows 安装包：

```bash
npm run dist:win
```

生成的安装包位于 `out` 目录：
- `RoboMaster 2026 Client-Setup-1.0.0.exe` - NSIS 安装程序
  - 支持自定义安装路径
  - 自动创建桌面和开始菜单快捷方式
- `RoboMaster 2026 Client-1.0.0-win.zip` - ZIP 便携版
  - 解压即用，无需安装

## 使用说明

### 连接配置

1. **MQTT 连接**
   - 默认服务器：`localhost`
   - 默认端口：`3333`
   - 点击"连接"按钮建立 MQTT 连接

2. **UDP 视频流**
   - 默认端口：`3334`
   - 点击"开始接收"启动 UDP 视频服务器

### 数据查看

- **数据面板** - 实时显示接收到的消息
  - 点击消息条目可展开查看完整 JSON 数据
  - 支持清空历史消息

- **视频区域** - 显示视频流状态和帧数统计
  - FPS 计数器
  - 总帧数统计

## 项目结构

```
robomaster-client-native/
├── src/
│   ├── main/                    # 主进程
│   │   ├── index.ts             # 主入口
│   │   ├── udpVideoServer.ts    # UDP 视频服务器
│   │   ├── mqttService.ts       # MQTT 客户端
│   │   ├── ipcHandlers.ts       # IPC 处理器
│   │   └── configStore.ts       # 配置存储
│   ├── preload/                 # 预加载脚本
│   │   └── index.ts             # 安全 API 暴露
│   └── renderer/                # 渲染进程 (React)
│       ├── components/          # React 组件
│       │   ├── ConnectionBar.tsx
│       │   ├── VideoArea.tsx
│       │   └── DataPanel.tsx
│       ├── services/            # 服务层
│       │   ├── mqttService.ts
│       │   └── protoDecoder.ts
│       ├── store/               # 状态管理
│       │   └── appStore.ts
│       ├── types/               # 类型定义
│       │   ├── electron.d.ts
│       │   └── messages.ts
│       ├── App.tsx
│       ├── index.tsx
│       └── index.css
├── resources/                   # 静态资源
│   ├── messages.proto           # Protobuf 定义文件
│   └── ZHUXI.ico                # 应用图标
├── dist/                        # 编译输出
│   ├── main/
│   ├── preload/
│   └── renderer/
├── package.json
├── tsconfig.json
├── webpack.main.config.ts       # Main 进程 webpack 配置
├── webpack.preload.config.ts    # Preload webpack 配置
├── webpack.renderer.config.ts   # Renderer 进程 webpack 配置
└── README.md
```

## 支持的消息类型

客户端支持解析以下 Protobuf 消息类型（来自 SharkDataSever）：

- `GameStatus` - 比赛全局状态
- `GlobalUnitStatus` - 基地、前哨站和机器人状态
- `RobotDynamicStatus` - 机器人实时数据
- `RobotStaticStatus` - 机器人固定属性
- `RobotPosition` - 机器人位置坐标
- `Event` - 全局事件通知
- `Buff` - Buff 效果信息
- `PenaltyInfo` - 判罚信息
- 以及其他 20+ 种消息类型

详细消息定义请参考 `resources/messages.proto`

## 开发注意事项

### 安全性

- ✅ 主进程禁用了 `nodeIntegration`
- ✅ 启用了 `contextIsolation`
- ✅ 通过 `preload.ts` 安全暴露 API

### UDP 视频流

当前实现接收原始 UDP 数据包，需要根据实际视频编码格式进行解码：

- **H.264**: 建议使用 `broadway.js` 或 `ffmpeg.wasm`
- **MJPEG**: 可直接创建 Blob URL 显示

### MQTT 自动重连

MQTT 客户端配置了自动重连机制：
- 重连间隔：5000ms
- 连接超时：10000ms

## 故障排查

### 连接失败

1. 检查 SharkDataSever 是否正在运行
2. 确认 MQTT 服务器地址和端口正确
3. 检查防火墙设置

### 视频流无法显示

1. 确认 UDP 端口未被占用
2. 检查视频数据格式是否匹配
3. 查看开发者控制台的错误信息

### Proto 解析失败

1. 确认 `resources/messages.proto` 文件存在
2. 检查 proto 文件与服务端版本一致

## License

MIT

## 参考资料

- [SharkDataSever](https://github.com/JNU-SHARK/SharkDataSever)
- [Electron 官方文档](https://www.electronjs.org/docs)
- [electron-builder 文档](https://www.electron.build/)
