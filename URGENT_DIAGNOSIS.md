# 🚨 紧急诊断指南 - MQTT 连接失败 & MP4 视频问题

## 📍 您当前的问题

### 问题 1: MQTT 连接失败 ❌
### 问题 2: UDP 接收到 MP4 数据但无法显示 ⚠️

---

## ⚡ 立即执行的诊断步骤

### 第 1 步: 重启应用查看新的调试功能

应用已更新，现在包含：
- ✅ **详细的视频格式检测**（会显示前16字节的 Hex 数据）
- ✅ **MQTT 连接错误弹窗**（会显示具体错误原因）
- ✅ **调试信息面板**（显示在视频区域）

**操作**:
\`\`\`bash
cd robomaster-client-native
npm start
\`\`\`

---

### 第 2 步: MQTT 连接诊断

#### 检查 1: SharkDataSever 是否运行？

**在 SharkDataSever 的终端查看**:
\`\`\`bash
# 应该看到类似的输出
MQTT Server listening on port 3333
\`\`\`

**如果没有**:
1. 启动 SharkDataSever
2. 检查配置文件中的 MQTT 端口

#### 检查 2: 端口是否被占用？

\`\`\`bash
# Windows
netstat -ano | findstr :3333

# 应该看到 LISTEN 状态
# 如果看到 ESTABLISHED 说明已有连接
\`\`\`

#### 检查 3: 防火墙是否阻止？

\`\`\`bash
# 临时关闭防火墙测试
控制面板 > Windows Defender 防火墙 > 关闭防火墙
\`\`\`

#### 检查 4: 查看应用的错误提示

1. 点击"连接"按钮
2. **会弹出详细的错误信息**
3. 截图错误信息（或复制错误文本）

**常见错误及解决方案**:

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| `ECONNREFUSED` | 服务器未运行 | 启动 SharkDataSever |
| `ETIMEDOUT` | 网络/防火墙问题 | 检查防火墙设置 |
| `ENOTFOUND` | 服务器地址错误 | 检查地址是否正确 |
| `Connection closed` | 服务器主动断开 | 查看服务器日志 |

#### 检查 5: 按 F12 查看详细日志

1. 按 **F12** 打开开发者工具
2. 切换到 **Console** 标签
3. 点击"连接"按钮
4. 查看日志输出：
   \`\`\`
   [MQTT] 尝试连接到: localhost:3333
   [MQTT] 状态变更: connecting
   [MQTT] 错误详情: <详细错误信息>
   \`\`\`

---

### 第 3 步: MP4 视频问题诊断

#### 重要说明 ⚠️

**MP4 不能直接通过 UDP 流式传输！**

MP4 是一个**容器格式**（container format），包含：
- 视频流（通常是 H.264）
- 音频流
- 元数据（时长、码率等）
- 索引信息

**UDP 流式传输只能发送**:
- ✅ MJPEG（一系列 JPEG 图像）
- ✅ H.264 裸流（NAL 单元）
- ✅ MPEG1 视频流
- ❌ **不能**发送 MP4 文件

#### 诊断步骤：

**1. 启动视频接收**:
   - 点击"开始接收"按钮

**2. 查看"格式"显示**:
   - 应该显示在视频区域右上角
   - 如果显示 **"MP4"** = 确实是 MP4 数据（错误配置）
   - 如果显示 **"H264"** = 实际是 H.264 流
   - 如果显示 **"UNKNOWN"** = 数据格式不被识别

**3. 查看调试信息**:
   - 点击"显示调试"按钮
   - 查看屏幕上显示的：
     - **前16字节 Hex** - 数据的二进制表示
     - **详细信息** - 格式检测结果
     - **建议** - 如何解决

**4. 查看控制台日志**:
   - 按 F12
   - 查看：
     \`\`\`
     [视频] 首帧数据: {
       size: 12345,
       format: "mp4" / "h264" / "mjpeg",
       details: "...",
       hex: "00 00 00 18 66 74 79 70 ..."
     }
     \`\`\`

#### 根据检测结果的解决方案：

**如果检测到 MP4**:
\`\`\`
❌ 问题: SharkDataSever 配置错误，正在发送 MP4 文件数据
✅ 解决: 修改 SharkDataSever 配置，改为发送 MJPEG 或 H.264 裸流

# SharkDataSever 配置示例（需要查看实际配置文件）
video_format: "mjpeg"  # 或 "h264"
video_container: "none"  # 不要使用容器格式
\`\`\`

**如果检测到 H.264**:
\`\`\`
⚠️ 问题: H.264 需要专门的解码器
✅ 临时解决: 修改 SharkDataSever 改用 MJPEG 格式
✅ 长期解决: 等待客户端实现 H.264 解码器
\`\`\`

**如果检测到 MJPEG**:
\`\`\`
✅ 应该能正常显示！
如果看不到画面，检查：
1. 浏览器控制台是否有错误
2. 数据大小是否合理（每帧应该 > 1KB）
3. FPS 是否在增加
\`\`\`

---

## 🔧 SharkDataSever 配置建议

### 推荐配置（使用 MJPEG）

找到 SharkDataSever 的配置文件（可能是 `config.json` 或 `settings.yaml`），修改：

\`\`\`json
{
  "video": {
    "format": "mjpeg",      // 使用 MJPEG 格式
    "quality": 85,          // JPEG 质量 (0-100)
    "fps": 30,              // 帧率
    "resolution": "640x480" // 分辨率
  },
  "transport": {
    "protocol": "udp",
    "port": 3334
  }
}
\`\`\`

### 如果使用 FFmpeg 发送视频

\`\`\`bash
# 发送 MJPEG 到 UDP
ffmpeg -re -i input.mp4 \\
  -f mjpeg \\
  -q:v 3 \\
  udp://localhost:3334

# 不要使用 -f mp4 ！
\`\`\`

---

## 📊 实时诊断检查表

在应用运行时，完成以下检查：

### MQTT 连接
- [ ] SharkDataSever 已启动
- [ ] 端口 3333 在监听（netstat）
- [ ] 防火墙已关闭或允许
- [ ] 点击"连接"后出现错误弹窗
- [ ] 记录错误信息：______________________

### UDP 视频
- [ ] 点击"开始接收"
- [ ] FPS 数字在增加
- [ ] "格式"显示为：______(MJPEG/H264/MP4/UNKNOWN)
- [ ] 如果是 MP4，前16字节 Hex 为：______________________
- [ ] 数据大小：________ KB/帧

---

## 🚀 快速修复流程

### 场景 1: MQTT 连接失败

\`\`\`bash
# 1. 检查 SharkDataSever
ps aux | grep SharkDataSever  # Linux/Mac
tasklist | findstr SharkDataSever  # Windows

# 2. 检查端口
netstat -an | grep 3333  # Linux/Mac
netstat -ano | findstr :3333  # Windows

# 3. 测试连接（使用 MQTT 客户端）
mosquitto_sub -h localhost -p 3333 -t "#"

# 4. 如果以上都正常，查看应用错误弹窗
\`\`\`

### 场景 2: MP4 视频无法显示

\`\`\`bash
# 1. 确认视频格式
# 在应用中查看"格式"显示

# 2. 如果是 MP4
# 修改 SharkDataSever 配置为 MJPEG

# 3. 如果是 H.264
# 临时方案：改用 MJPEG
# 长期方案：等待 H.264 解码实现

# 4. 重启 SharkDataSever
# 重新点击"开始接收"
\`\`\`

---

## 📞 需要更多帮助？

### 提供以下信息：

1. **MQTT 错误信息**（应用弹窗内容）
2. **视频格式检测结果**（"格式"显示）
3. **前16字节 Hex**（调试面板显示）
4. **控制台日志**（F12 → Console）
5. **SharkDataSever 日志**

### 截图位置：
- 应用主界面（显示连接状态）
- 错误弹窗
- 调试信息面板
- 浏览器控制台

---

**诊断工具版本**: v1.1.1
**最后更新**: 2026-03-11
**紧急程度**: 🔴 高
