# HEVC 解码器诊断指南

## 📅 日期: 2026-03-11
## 🎯 目的: 诊断 HEVC 解码器"已就绪"但无画面的问题

---

## 🔍 问题描述

- ✅ HEVC 解码器初始化成功
- ✅ 解码器状态显示"就绪"
- ✅ UDP 视频帧正常接收
- ✅ 格式检测显示 HEVC
- ❌ **Canvas 上没有显示视频画面**

---

## 🛠️ 已添加的诊断日志

### 1. 解码器初始化日志
```
[HEVC] 🔍 检查 HEVC 支持...
[HEVC] HEVC 支持检查结果: { supported: true, ... }
[HEVC] 🔧 初始化解码器...
[HEVC] 配置解码器: { codec: 'hev1.1.6.L93.B0', ... }
[HEVC] ✅ 解码器已准备好, state: configured
```

### 2. 视频帧接收日志
```
[视频] 📥 首帧数据: { size: ..., format: 'hevc', ... }
[视频] 检测到 HEVC，初始化解码器...
[视频] 🎞️ 发送帧到解码器, 帧数: 1, 大小: 12345
[视频] 🎞️ 发送帧到解码器, 帧数: 2, 大小: 8765
...
```

### 3. NAL 单元类型检测日志
```
[HEVC] NAL 单元类型: 32, 帧类型: key, 数据大小: 1234
[HEVC] NAL 单元类型: 1, 帧类型: delta, 数据大小: 5678
```

HEVC NAL 单元类型说明：
- **32** = VPS (Video Parameter Set) - 视频参数集
- **33** = SPS (Sequence Parameter Set) - 序列参数集
- **34** = PPS (Picture Parameter Set) - 图像参数集
- **16-21** = IDR/CRA 关键帧
- **0-9** = 非关键帧 (P帧、B帧)

### 4. 解码过程日志
```
[HEVC] 开始解码帧: { type: 'key', size: 1234, timestamp: ... }
[HEVC] decode() 调用成功
```

### 5. 帧输出日志（关键！）
```
[HEVC] 📤 output 回调被触发!
[HEVC] 🎬 收到解码后的帧! { width: 1920, height: 1080, ... }
[HEVC] ✅ 绘制帧到 canvas: 1920 x 1080
```

**如果看不到这些日志，说明解码器没有输出帧！**

### 6. 可能的错误日志
```
[HEVC] ❌ Canvas 引用为空!
[HEVC] ❌ 无法获取 canvas 2d context
[HEVC] ❌ 解码错误: ...
[HEVC] ❌ 初始化失败: ...
```

---

## 📋 诊断步骤

### 步骤 1: 启动应用并开启开发者工具

```bash
cd robomaster-client-native
npm start
```

**重要**: 按 `F12` 打开开发者工具，切换到 Console 标签页

### 步骤 2: 启动 SharkDataSever UDP 服务

```bash
cd SharkDataSever
runner.bat  # 或 ./runner.sh
选择 "UDP 视频流服务"
```

### 步骤 3: 在客户端点击"开始接收"

观察控制台输出

### 步骤 4: 分析日志

#### ✅ 正常流程应该看到：

1. **视频帧接收**:
   ```
   [视频] 📥 首帧数据: ...
   [视频] 检测到 HEVC，初始化解码器...
   ```

2. **解码器初始化**:
   ```
   [HEVC] 🔍 检查 HEVC 支持...
   [HEVC] HEVC 支持检查结果: { supported: true }
   [HEVC] ✅ 解码器已准备好, state: configured
   ```

3. **持续接收帧**:
   ```
   [视频] 🎞️ 发送帧到解码器, 帧数: 1, 大小: ...
   [HEVC] NAL 单元类型: 32, 帧类型: key, ...
   [HEVC] 开始解码帧: { type: 'key', ... }
   [HEVC] decode() 调用成功
   ```

4. **🎯 关键: 解码器输出**:
   ```
   [HEVC] 📤 output 回调被触发!
   [HEVC] 🎬 收到解码后的帧! { width: ..., height: ... }
   [HEVC] ✅ 绘制帧到 canvas: 1920 x 1080
   ```

#### ❌ 如果缺少第 4 步（解码器输出），说明问题在于：

**可能原因 A**: 解码器配置不匹配
- HEVC 流的实际 profile/level 与 'hev1.1.6.L93.B0' 不匹配
- 需要从流中提取 VPS/SPS/PPS 并配置解码器

**可能原因 B**: 帧类型错误
- 所有帧被标记为 'delta' 但解码器需要先收到 'key' 帧
- 需要确保 VPS/SPS/PPS/IDR 被正确标记为 'key'

**可能原因 C**: 数据格式问题
- 流中包含 Annex B start codes (00 00 00 01) 但解码器期待其他格式
- 或者流不是标准的 HEVC bitstream

---

## 🔧 可能的修复方案

### 修复 1: 提取配置数据（VPS/SPS/PPS）

如果日志显示收到了 NAL 类型 32、33、34，但解码器没有输出，可能需要：

```typescript
// 收集配置 NAL 单元
const configNALs: Uint8Array[] = [];

// 当收到 VPS (32)、SPS (33)、PPS (34)
if (nalUnitType === 32 || nalUnitType === 33 || nalUnitType === 34) {
  configNALs.push(data);
}

// 重新配置解码器
if (configNALs.length >= 3) {
  const description = concatenateNALs(configNALs);
  decoder.configure({
    codec: 'hev1.1.6.L93.B0',
    description: description,
    optimizeForLatency: true,
  });
}
```

### 修复 2: 等待关键帧

```typescript
let receivedKeyFrame = false;

// 只有收到关键帧后才开始解码
if (frameType === 'key') {
  receivedKeyFrame = true;
}

if (receivedKeyFrame) {
  decoder.decode(chunk);
}
```

### 修复 3: 使用更通用的 codec 字符串

```typescript
// 尝试不同的 codec 配置
const configs = [
  'hev1.1.6.L93.B0',     // Main Profile
  'hev1.2.4.L93.B0',     // Main 10 Profile
  'hvc1.1.6.L93.B0',     // hvc1 格式
];
```

### 修复 4: 检查 Electron 版本和 Chromium 支持

```bash
# 在应用内执行
process.versions.electron  // 应该是 40.8.0
process.versions.chrome    // 应该是 132+
```

---

## 📊 预期的日志示例

### 成功场景的完整日志：

```
[视频] 📥 首帧数据: { size: 1234, format: 'hevc', details: 'HEVC/H.265 NAL 单元 (类型: 32)', hex: '00 00 00 01 40 01 ...' }
[视频] 检测到 HEVC，初始化解码器...
[HEVC] 🔍 检查 HEVC 支持...
[HEVC] HEVC 支持检查结果: { config: {…}, supported: true }
[HEVC] 🔧 初始化解码器...
[HEVC] 配置解码器: { codec: 'hev1.1.6.L93.B0', optimizeForLatency: true }
[HEVC] ✅ 解码器已准备好, state: configured

[视频] 🎞️ 发送帧到解码器, 帧数: 1, 大小: 1234
[HEVC] NAL 单元类型: 32, 帧类型: key, 数据大小: 1234
[HEVC] 开始解码帧: { type: 'key', size: 1234, timestamp: 1234567890000 }
[HEVC] decode() 调用成功

[视频] 🎞️ 发送帧到解码器, 帧数: 2, 大小: 5678
[HEVC] NAL 单元类型: 33, 帧类型: key, 数据大小: 5678
[HEVC] 开始解码帧: { type: 'key', size: 5678, timestamp: 1234567890033 }
[HEVC] decode() 调用成功

[视频] 🎞️ 发送帧到解码器, 帧数: 3, 大小: 234
[HEVC] NAL 单元类型: 34, 帧类型: key, 数据大小: 234
[HEVC] 开始解码帧: { type: 'key', size: 234, timestamp: 1234567890066 }
[HEVC] decode() 调用成功

[视频] 🎞️ 发送帧到解码器, 帧数: 4, 大小: 45678
[HEVC] NAL 单元类型: 19, 帧类型: key, 数据大小: 45678
[HEVC] 开始解码帧: { type: 'key', size: 45678, timestamp: 1234567890099 }
[HEVC] decode() 调用成功

👉 这里是关键！如果配置正确，现在应该开始输出帧：

[HEVC] 📤 output 回调被触发!
[HEVC] 🎬 收到解码后的帧! { width: 1920, height: 1080, timestamp: 1234567890099, duration: null }
[HEVC] ✅ 绘制帧到 canvas: 1920 x 1080

[视频] 🎞️ 发送帧到解码器, 帧数: 5, 大小: 12345
[HEVC] NAL 单元类型: 1, 帧类型: delta, 数据大小: 12345
[HEVC] 开始解码帧: { type: 'delta', size: 12345, timestamp: 1234567890132 }
[HEVC] decode() 调用成功
[HEVC] 📤 output 回调被触发!
[HEVC] 🎬 收到解码后的帧! { width: 1920, height: 1080, timestamp: 1234567890132, duration: null }
[HEVC] ✅ 绘制帧到 canvas: 1920 x 1080

... (持续输出帧) ...
```

---

## 🚨 需要反馈的信息

请重新启动应用，然后按 F12 打开控制台，并提供以下信息：

1. **首帧数据**：
   - 找到 `[视频] 📥 首帧数据:` 这一行，复制完整信息

2. **解码器初始化**：
   - 找到所有 `[HEVC]` 开头的初始化日志
   - 特别是 "HEVC 支持检查结果" 和 "解码器已准备好"

3. **NAL 单元类型**：
   - 找到前 10 条 `[HEVC] NAL 单元类型:` 日志
   - 记录都有哪些类型（32, 33, 34, 19, 1, 等）

4. **关键问题**：
   - **是否看到** `[HEVC] 📤 output 回调被触发!`？
   - **如果没有**，这是问题的核心！

5. **错误信息**：
   - 是否有任何 `❌` 标记的错误日志？

---

## 📝 代码改动说明

### 改动 1: NAL 单元类型检测

现在会检测 HEVC NAL 单元类型，并正确标记帧类型：
- VPS/SPS/PPS/IDR → `'key'`
- 其他帧 → `'delta'`

### 改动 2: 详细日志

添加了详细的日志输出，帮助诊断每个步骤：
- 解码器初始化
- 帧接收
- NAL 类型检测
- 解码过程
- 帧输出（最关键！）

### 改动 3: 错误处理

增强了错误日志，包括：
- Canvas 引用检查
- Context 获取检查
- 解码器状态检查

---

## 🎯 下一步

1. **重启应用**
2. **开启开发者工具** (F12)
3. **开始接收视频**
4. **观察日志**
5. **反馈是否看到 "📤 output 回调被触发!"**

如果看不到 output 回调，问题很可能是：
- 解码器需要 description (VPS/SPS/PPS 配置数据)
- 或 HEVC 流格式与 WebCodecs 不兼容

---

**日期**: 2026-03-11
**版本**: v1.3.1 (调试版)
**状态**: 🔍 诊断中
