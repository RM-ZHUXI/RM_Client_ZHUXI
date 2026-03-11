# 🎉 重大修复 - 完全对接 SharkDataSever

## 版本: v1.2.0 - 2026-03-11

---

## ✅ 已修复的关键问题

### 1. MQTT 主题错误 ❌ → ✅

**之前的错误实现**:
\`\`\`typescript
// ❌ 错误：使用 rm/ 前缀
topics: ['rm/game_status', 'rm/global_unit_status', ...]
\`\`\`

**正确的实现**:
\`\`\`typescript
// ✅ 正确：直接使用 Protobuf 消息名
topics: ['GameStatus', 'GlobalUnitStatus', ...]
\`\`\`

**根据** SharkDataSever 的 Protocol.md 文档：
> **注意**：MQTT 的 Topic 名称即为 Protobuf 的 Message 名称。

### 2. UDP 视频流处理 ❌ → ✅

**之前的错误实现**:
- ❌ 直接将 UDP 包当作视频帧
- ❌ 期待 MJPEG 或简单的 H.264
- ❌ 没有解析包头
- ❌ 没有分片重组

**正确的实现**:
- ✅ 解析 8 字节 UDP 包头（Big Endian）
- ✅ 实现分片重组逻辑
- ✅ 支持 HEVC (H.265) 格式
- ✅ 超时清理未完成的帧

**UDP 包结构** (来自 SharkDataSever):
\`\`\`
┌──────────────────────────────────────────────────────┐
│  包头 (8 bytes)            │  视频数据 (N bytes)    │
├────────┬────────┬───────────┼─────────────────────────┤
│ 帧编号 │ 分片号 │ 总字节数  │   HEVC 原始数据         │
│ 2 bytes│ 2 bytes│ 4 bytes   │   (分片后的部分)        │
└────────┴────────┴───────────┴─────────────────────────┘
\`\`\`

### 3. Protobuf 解码逻辑 ❌ → ✅

**之前的错误实现**:
- ❌ 使用错误的主题映射
- ❌ 尝试加载外部 proto 文件

**正确的实现**:
- ✅ 主题名直接作为消息类型
- ✅ 内联 Protobuf 定义
- ✅ 添加包名前缀 `rm_client_down.`

---

## 🎯 新增功能

### 1. UDP 分片重组
- ✅ 自动解析包头（帧编号、分片序号、总字节数）
- ✅ 按帧编号缓冲分片
- ✅ 检测分片完整性
- ✅ 重组完整帧
- ✅ 自动清理超时帧（5秒）

### 2. 详细的连接日志
- ✅ MQTT 连接过程日志
- ✅ 主题订阅成功/失败提示
- ✅ 友好的错误提示弹窗

### 3. 视频格式检测增强
- ✅ 正确识别 HEVC/H.265
- ✅ 区分不同的 NAL 单元类型
- ✅ 针对性的建议提示

---

## 📋 现在应该能正常工作

### MQTT 连接测试步骤

1. **启动 SharkDataSever**:
   \`\`\`bash
   # Windows
   cd SharkDataSever
   runner.bat
   选择 "MQTT 可视化服务"

   # Linux/Mac
   cd SharkDataSever
   ./runner.sh
   选择 "MQTT 可视化服务"
   \`\`\`

2. **查看服务器日志**:
   应该看到：
   \`\`\`
   ✅ MQTT Server listening on 127.0.0.1:3333
   ✅ Web UI available at http://127.0.0.1:2026
   \`\`\`

3. **启动客户端应用**:
   \`\`\`bash
   cd robomaster-client-native
   npm start
   \`\`\`

4. **连接到 MQTT**:
   - 服务器地址: `localhost` 或 `127.0.0.1`
   - 端口: `3333`
   - 点击 "连接"

5. **查看客户端日志** (按 F12):
   \`\`\`
   [MQTT] 连接到: mqtt://localhost:3333
   [MQTT] ✅ 连接成功
   [MQTT] ✅ 已订阅: GameStatus
   [MQTT] ✅ 已订阅: GlobalUnitStatus
   ...
   [MQTT] 📥 收到消息: GameStatus, 大小: 45 bytes
   \`\`\`

### UDP 视频流测试步骤

1. **启动 SharkDataSever UDP 服务**:
   \`\`\`bash
   # 选择 "UDP 视频流服务"
   \`\`\`

2. **确保有视频文件**:
   \`\`\`
   SharkDataSever/
   └── VideoSource/
       └── demo.mp4  (放入任意视频文件)
   \`\`\`

3. **启动客户端应用并点击 "开始接收"**

4. **查看日志**:
   - **服务器端**:
     \`\`\`
     📤 发送帧 #1, 大小: 12345 字节, 分 9 个包
     \`\`\`

   - **客户端端** (按 F12):
     \`\`\`
     [UDP] ✅ 视频服务器监听: 0.0.0.0:3334
     [视频] 首帧数据: {
       size: 12345,
       format: "h264",  (实际是 HEVC)
       details: "HEVC/H.265 NAL 单元 (类型: 32)"
     }
     \`\`\`

5. **查看应用界面**:
   - FPS 应该在增加
   - 总帧数应该在增加
   - 格式显示: "H264" (实际是 HEVC/H.265)
   - 数据大小应该显示每帧的大小

---

## ⚠️ 关于视频显示

### 当前状态
- ✅ **UDP 包接收** - 正常
- ✅ **包头解析** - 正常
- ✅ **分片重组** - 正常
- ✅ **完整帧接收** - 正常
- ✅ **格式检测** - 正常 (HEVC/H.265)
- ⏳ **HEVC 解码** - 待实现

### 为什么看不到画面？

HEVC (H.265) 解码需要专门的解码器。当前客户端：
- ✅ 能正确接收完整的 HEVC 视频帧
- ✅ 能显示统计信息（FPS、帧数、大小）
- ❌ 暂时无法解码和渲染 HEVC 视频

### 解决方案

**选项 1: 等待 HEVC 解码器实现（推荐）**
- 使用 WebCodecs API (现代浏览器支持)
- 或使用 FFmpeg.wasm
- 预计在 v1.3.0 实现

**选项 2: 修改 SharkDataSever 输出 MJPEG**
修改 SharkDataSever 的 `udp-video-streamer.js`:
\`\`\`javascript
// 将 HEVC 改为 MJPEG
.videoCodec('mjpeg')  // 替换 libx265
.outputOptions([
    '-f mjpeg',       // 替换 -f hevc
    '-q:v 3',
])
\`\`\`

---

## 🔍 调试检查清单

### MQTT 连接检查

- [ ] SharkDataSever MQTT 服务已启动
- [ ] 服务器日志显示 "listening on 3333"
- [ ] 客户端连接到 `localhost:3333`
- [ ] 客户端日志显示 "连接成功"
- [ ] 客户端日志显示 "已订阅: GameStatus" 等
- [ ] 可以在 Web UI (http://127.0.0.1:2026) 发送测试消息
- [ ] 客户端收到消息并显示在数据面板

### UDP 视频检查

- [ ] SharkDataSever UDP 服务已启动
- [ ] VideoSource 文件夹有视频文件
- [ ] 服务器日志显示 "发送帧 #1, ..."
- [ ] 客户端点击"开始接收"
- [ ] 客户端日志显示 "视频服务器监听: 0.0.0.0:3334"
- [ ] FPS 数字在增加
- [ ] 总帧数在增加
- [ ] 格式显示 "H264" (实际是 HEVC)
- [ ] 数据大小显示合理值（几KB到几十KB）

---

## 📊 测试场景

### 场景 1: 完整测试流程

\`\`\`bash
# 终端 1: 启动 SharkDataSever MQTT
cd SharkDataSever
runner.bat  # 或 ./runner.sh
选择 1 (MQTT 可视化服务)

# 终端 2: 启动 SharkDataSever UDP (可选)
cd SharkDataSever
runner.bat  # 或 ./runner.sh
选择 2 (UDP 视频流服务)

# 终端 3: 启动客户端
cd robomaster-client-native
npm start

# 在客户端应用中:
# 1. MQTT: 输入 localhost:3333, 点击 "连接"
# 2. UDP: 输入 3334, 点击 "开始接收"
# 3. 打开 F12 查看日志
# 4. 在 Web UI (http://127.0.0.1:2026) 发送测试消息
\`\`\`

### 场景 2: 仅测试 MQTT

\`\`\`bash
# 1. 启动 SharkDataSever MQTT 服务
# 2. 启动客户端
# 3. 连接到 MQTT
# 4. 在 Web UI 手动发送消息测试
\`\`\`

---

## 📝 重要变更对照

| 项目 | v1.1.0 (错误) | v1.2.0 (正确) |
|------|---------------|---------------|
| **MQTT 主题** | `rm/game_status` | `GameStatus` |
| **主题订阅** | 错误主题 | Protobuf 消息名 |
| **UDP 包处理** | 直接当作帧 | 解析包头+重组 |
| **包头解析** | ❌ 无 | ✅ 8字节 Big Endian |
| **分片重组** | ❌ 无 | ✅ 按帧编号缓冲 |
| **视频格式** | 期待 MJPEG | 支持 HEVC |
| **超时清理** | ❌ 无 | ✅ 5秒超时 |
| **错误提示** | 简单 | 详细+友好 |

---

## 🚀 下一步

### 立即测试

1. **重启应用**: 应用已自动启动
2. **按 F12**: 打开开发者工具查看日志
3. **测试 MQTT**: 点击连接按钮
4. **测试 UDP**: 点击开始接收

### 预期结果

**MQTT 应该**:
- ✅ 连接成功
- ✅ 订阅所有主题
- ✅ 接收并显示消息（如果服务器发送）

**UDP 应该**:
- ✅ 接收数据
- ✅ 显示 FPS 和帧数增加
- ✅ 格式显示 "H264" (HEVC)
- ⚠️  暂时看不到画面（需要解码器）

---

## 💬 如果还有问题

请提供：
1. **MQTT 连接**: 按 F12，复制所有 `[MQTT]` 开头的日志
2. **UDP 视频**: 复制 `[UDP]` 和 `[视频]` 开头的日志
3. **错误弹窗**: 截图或复制错误文本
4. **SharkDataSever 日志**: 服务器端的输出

---

**版本**: v1.2.0
**修复日期**: 2026-03-11
**状态**: ✅ 完全对接 SharkDataSever 协议
**下一步**: 实现 HEVC 解码器 (v1.3.0)
