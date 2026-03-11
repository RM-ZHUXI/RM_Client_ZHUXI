import dgram from 'dgram';
import { BrowserWindow } from 'electron';

let udpServer: dgram.Socket | null = null;
let isRunning = false;

// UDP包头结构
interface UDPPacketHeader {
  frameNumber: number;    // 帧编号 (2 bytes)
  packetIndex: number;    // 分片序号 (2 bytes)
  totalBytes: number;     // 总字节数 (4 bytes)
}

// 帧重组缓冲区
const frameBuffers = new Map<number, {
  totalBytes: number;
  packets: Map<number, Buffer>;
  receivedAt: number;
}>();

// 清理超时的帧缓冲（超过5秒未完成的帧）
function cleanupStaleFrames() {
  const now = Date.now();
  const timeout = 5000; // 5秒超时

  for (const [frameNum, frame] of frameBuffers.entries()) {
    if (now - frame.receivedAt > timeout) {
      console.log(`[UDP] 清理超时帧: ${frameNum}`);
      frameBuffers.delete(frameNum);
    }
  }
}

// 解析UDP包头（Big Endian）
function parsePacketHeader(data: Buffer): UDPPacketHeader | null {
  if (data.length < 8) {
    console.error('[UDP] 包太小，无法解析包头');
    return null;
  }

  return {
    frameNumber: data.readUInt16BE(0),     // 偏移0: 帧编号
    packetIndex: data.readUInt16BE(2),     // 偏移2: 分片序号
    totalBytes: data.readUInt32BE(4),      // 偏移4: 总字节数
  };
}

// 处理UDP数据包
function processUDPPacket(data: Buffer, mainWindow: BrowserWindow | null) {
  // 解析包头
  const header = parsePacketHeader(data);
  if (!header) return;

  const payload = data.slice(8); // 跳过8字节包头

  // 获取或创建帧缓冲区
  let frameBuffer = frameBuffers.get(header.frameNumber);
  if (!frameBuffer) {
    frameBuffer = {
      totalBytes: header.totalBytes,
      packets: new Map(),
      receivedAt: Date.now(),
    };
    frameBuffers.set(header.frameNumber, frameBuffer);
  }

  // 存储分片
  frameBuffer.packets.set(header.packetIndex, payload);

  // 检查是否收齐所有分片
  const payloadSize = 1400 - 8; // 最大包大小 - 包头
  const expectedPackets = Math.ceil(header.totalBytes / payloadSize);

  if (frameBuffer.packets.size === expectedPackets) {
    // 重组完整帧
    const frameData = assembleFrame(frameBuffer, header.totalBytes);

    if (frameData) {
      // 发送完整帧到渲染进程
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('video:frame', frameData);
      }
    }

    // 清理已完成的帧
    frameBuffers.delete(header.frameNumber);
  }

  // 定期清理超时帧
  if (Math.random() < 0.01) { // 1%概率清理
    cleanupStaleFrames();
  }
}

// 重组帧数据
function assembleFrame(frameBuffer: { packets: Map<number, Buffer>; totalBytes: number }, totalBytes: number): Buffer | null {
  try {
    // 按分片序号排序
    const sortedPackets = Array.from(frameBuffer.packets.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([_, payload]) => payload);

    // 合并所有分片
    const completeFrame = Buffer.concat(sortedPackets, totalBytes);

    return completeFrame;
  } catch (error) {
    console.error('[UDP] 帧重组失败:', error);
    return null;
  }
}

export function startUdpVideoServer(port: number, mainWindow: BrowserWindow | null) {
  if (isRunning) {
    console.log('[UDP] 服务器已在运行');
    return;
  }

  try {
    udpServer = dgram.createSocket('udp4');

    udpServer.on('error', (err) => {
      console.error('[UDP] 服务器错误:', err);
      mainWindow?.webContents.send('video:error', err.message);
      stopUdpVideoServer();
    });

    udpServer.on('message', (msg, rinfo) => {
      // 处理UDP包（包含包头解析和分片重组）
      processUDPPacket(msg, mainWindow);
    });

    udpServer.on('listening', () => {
      const address = udpServer?.address();
      console.log(`[UDP] ✅ 视频服务器监听: ${address?.address}:${address?.port}`);
      mainWindow?.webContents.send('video:started', { port: address?.port });
      isRunning = true;
    });

    udpServer.bind(port);
  } catch (error) {
    console.error('[UDP] 启动失败:', error);
    mainWindow?.webContents.send('video:error', (error as Error).message);
  }
}

export function stopUdpVideoServer() {
  if (udpServer) {
    udpServer.close(() => {
      console.log('[UDP] ⏹️ 视频服务器已停止');
      isRunning = false;
    });
    udpServer = null;
  }

  // 清理帧缓冲区
  frameBuffers.clear();
}

export function isUdpServerRunning(): boolean {
  return isRunning;
}
