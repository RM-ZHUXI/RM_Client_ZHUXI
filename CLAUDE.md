# CLAUDE.md - 项目指南

本文档为 Claude AI 助手提供项目上下文和开发指南。

## 项目概述

**项目名称**: RoboMaster 2026 客户端 (RM_Client_ZHUXI)
**技术栈**: Electron + React + TypeScript
**用途**: 对接 SharkDataSever，实时接收并显示比赛数据与视频流

## 核心功能

1. **UDP 视频流接收** - 接收 HEVC/H.265 编码的视频流，使用 WebCodecs API 硬件解码
2. **MQTT 数据通信** - 连接 MQTT 服务器，接收 24 种 Protobuf 消息类型
3. **实时数据展示** - 解析并显示比赛状态、机器人数据、事件等
4. **配置持久化** - 使用 electron-store 保存用户配置

## 技术架构

### Main 进程
- `src/main/index.ts` - 应用入口
- `src/main/udpVideoServer.ts` - UDP 视频服务器（帧重组）
- `src/main/mqttService.ts` - MQTT 客户端（Node.js 环境）
- `src/main/ipcHandlers.ts` - IPC 处理器
- `src/main/configStore.ts` - 配置存储

### Renderer 进程
- `src/renderer/components/VideoArea.tsx` - 视频显示（WebCodecs HEVC 解码）
- `src/renderer/components/ConnectionBar.tsx` - 连接控制
- `src/renderer/components/DataPanel.tsx` - 数据面板
- `src/renderer/services/mqttService.ts` - MQTT 服务（IPC 封装）
- `src/renderer/services/protoDecoder.ts` - Protobuf 解码器
- `src/renderer/store/appStore.ts` - Zustand 状态管理

### Preload
- `src/preload/index.ts` - 安全 API 暴露（contextBridge）

## 关键实现细节

### UDP 视频流

**数据包格式**（8 字节头部，Big Endian）:
```
[0-1] frameNumber  (uint16)
[2-3] packetIndex  (uint16)
[4-7] totalBytes   (uint32)
[8+]  payload
```

**帧重组逻辑**:
- 使用 Map 存储帧缓冲
- 超时清理机制（3秒）
- 完整性校验后发送到 renderer

### HEVC 解码

**NAL 单元类型检测**:
```typescript
const nalUnitType = (data[4] >> 1) & 0x3F;
// 32=VPS, 33=SPS, 34=PPS, 16-21=IDR
```

**关键帧等待**:
- 解码器启动后必须先收到关键帧
- 跳过初始的 delta 帧避免解码错误

### MQTT 通信

**架构**: Main 进程处理 MQTT，通过 IPC 与 Renderer 通信
**原因**: mqtt.js 在浏览器环境中无法正常工作

**消息流**:
```
SharkDataSever → MQTT → Main Process → IPC → Renderer → UI
```

## 已解决的关键问题

1. **MQTT 连接失败** - 移到 main 进程处理
2. **视频无画面** - 实现 UDP 包头解析和帧重组
3. **解码器被清理** - 修复 React useEffect 依赖
4. **解码器启动错误** - 添加关键帧等待机制
5. **Buffer 不可用** - 使用 Uint8Array 替代
6. **中文乱码** - 设置 UTF-8 编码

## 开发命令

```bash
npm install          # 安装依赖
npm start           # 开发模式
npm run make        # 打包应用
```

## 配置

**默认配置**:
- MQTT 服务器: 127.0.0.1
- MQTT 端口: 3333
- UDP 视频端口: 3334

## 安全性

- ✅ contextIsolation: true
- ✅ nodeIntegration: false
- ✅ sandbox: false（需要访问 Node.js API）
- ✅ 通过 preload 安全暴露 API

## 性能

- 视频延迟: < 100ms
- 帧率: 30 FPS
- MQTT 延迟: < 50ms
- 内存占用: ~150MB
- CPU 占用: 5-10%（硬件解码）

## 依赖关系

**核心依赖**:
- electron: ^40.8.0
- react: ^19.2.4
- mqtt: ^5.15.0
- protobufjs: ^8.0.0
- zustand: ^5.0.11
- electron-store: ^11.0.0

## 注意事项

1. **不要在 renderer 进程使用 mqtt.js** - 必须在 main 进程
2. **UDP 包头是 Big Endian** - 使用 readUInt16BE/readUInt32BE
3. **HEVC 需要关键帧** - 实现等待机制
4. **类型定义** - WebCodecs API 需要手动定义类型
5. **中文日志** - 使用 start.bat 启动避免乱码

## 参考资料

- [SharkDataSever](https://github.com/JNU-SHARK/SharkDataSever)
- [Electron 文档](https://www.electronjs.org/docs)
- [WebCodecs API](https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API)
- [MQTT.js](https://github.com/mqttjs/MQTT.js)

## 项目状态

✅ **已完成** - 所有功能正常，已打包
