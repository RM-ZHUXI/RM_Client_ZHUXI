import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';

interface FormatInfo {
  type: 'mjpeg' | 'h264' | 'hevc' | 'mpeg1' | 'mp4' | 'raw' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  details: string;
  hexStart: string;
}

const VideoArea: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [formatInfo, setFormatInfo] = useState<FormatInfo>({
    type: 'unknown',
    confidence: 'low',
    details: '等待数据...',
    hexStart: ''
  });
  const [dataSize, setDataSize] = useState(0);
  const [decoderStatus, setDecoderStatus] = useState<'none' | 'initializing' | 'ready' | 'error'>('none');
  const [decoderError, setDecoderError] = useState<string>('');
  const { videoStatus } = useAppStore();

  // WebCodecs VideoDecoder
  const decoderRef = useRef<VideoDecoder | null>(null);
  const frameBufferRef = useRef<Uint8Array>(new Uint8Array(0));
  const receivedKeyFrameRef = useRef<boolean>(false);

  // 详细的格式检测
  const detectDetailedFormat = (data: Buffer): FormatInfo => {
    const arr = new Uint8Array(data);
    const hexStart = Array.from(arr.slice(0, 16))
      .map(b => b.toString(16).padStart(2, '0'))
      .join(' ');

    // HEVC/H.265 NAL 单元检测: 00 00 00 01 或 00 00 01
    if (arr.length > 4) {
      if (arr[0] === 0x00 && arr[1] === 0x00 && arr[2] === 0x00 && arr[3] === 0x01) {
        const nalType = (arr[4] >> 1) & 0x3F;
        return {
          type: 'hevc',
          confidence: 'high',
          details: `HEVC/H.265 NAL 单元 (类型: ${nalType})`,
          hexStart
        };
      }
      if (arr[0] === 0x00 && arr[1] === 0x00 && arr[2] === 0x01) {
        const nalType = (arr[3] >> 1) & 0x3F;
        return {
          type: 'hevc',
          confidence: 'high',
          details: `HEVC/H.265 NAL 单元 (类型: ${nalType})`,
          hexStart
        };
      }
    }

    return {
      type: 'unknown',
      confidence: 'low',
      details: `未识别格式 (大小: ${arr.length} bytes)`,
      hexStart
    };
  };

  // 初始化 WebCodecs HEVC 解码器
  const initHEVCDecoder = async () => {
    try {
      // 检查浏览器是否支持 WebCodecs
      if (typeof VideoDecoder === 'undefined') {
        throw new Error('浏览器不支持 WebCodecs API。需要 Chrome 94+ 或 Edge 94+');
      }

      console.log('[HEVC] 🔍 检查 HEVC 支持...');

      // 检查是否支持 HEVC
      const config: VideoDecoderConfig = {
        codec: 'hev1.1.6.L93.B0', // HEVC Main Profile
        optimizeForLatency: true,
      };

      const support = await VideoDecoder.isConfigSupported(config);
      console.log('[HEVC] HEVC 支持检查结果:', support);

      if (!support.supported) {
        throw new Error('浏览器不支持 HEVC 解码。请尝试使用 Chrome 或 Edge 浏览器');
      }

      setDecoderStatus('initializing');
      console.log('[HEVC] 🔧 初始化解码器...');

      // 创建解码器
      decoderRef.current = new VideoDecoder({
        output: (frame: VideoFrame) => {
          console.log('[HEVC] 📤 output 回调被触发!');
          // 渲染帧到 canvas
          renderFrame(frame);
          frame.close();
        },
        error: (error) => {
          console.error('[HEVC] ❌ 解码错误:', error);
          setDecoderError(error.message);
          setDecoderStatus('error');
        },
      });

      console.log('[HEVC] 配置解码器:', config);
      decoderRef.current.configure(config);

      setDecoderStatus('ready');
      console.log('[HEVC] ✅ 解码器已准备好, state:', decoderRef.current.state);

    } catch (error) {
      console.error('[HEVC] ❌ 初始化失败:', error);
      setDecoderError((error as Error).message);
      setDecoderStatus('error');
    }
  };

  // 渲染视频帧到 canvas
  const renderFrame = (frame: VideoFrame) => {
    console.log('[HEVC] 🎬 收到解码后的帧!', {
      width: frame.displayWidth,
      height: frame.displayHeight,
      timestamp: frame.timestamp,
      duration: frame.duration
    });

    const canvas = canvasRef.current;
    if (!canvas) {
      console.error('[HEVC] ❌ Canvas 引用为空!');
      return;
    }

    // 调整 canvas 尺寸
    canvas.width = frame.displayWidth;
    canvas.height = frame.displayHeight;
    console.log('[HEVC] 📐 Canvas 尺寸设置为:', canvas.width, 'x', canvas.height);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      console.log('[HEVC] ✅ 绘制帧到 canvas');
      ctx.drawImage(frame, 0, 0);
    } else {
      console.error('[HEVC] ❌ 无法获取 canvas 2d context');
    }
  };

  // 解码 HEVC 帧数据
  const decodeHEVCFrame = (data: Uint8Array) => {
    if (!decoderRef.current) {
      console.log('[HEVC] ❌ 解码器未初始化');
      return;
    }

    if (decoderRef.current.state !== 'configured') {
      console.log('[HEVC] ⚠️ 解码器状态:', decoderRef.current.state);
      return;
    }

    try {
      // 检测帧类型（简化：VPS/SPS/PPS/I帧为key，其他为delta）
      let frameType: 'key' | 'delta' = 'delta';

      // HEVC NAL 单元类型检测
      if (data.length > 4) {
        let nalUnitType = 0;
        if (data[0] === 0x00 && data[1] === 0x00 && data[2] === 0x00 && data[3] === 0x01) {
          nalUnitType = (data[4] >> 1) & 0x3F;
        } else if (data[0] === 0x00 && data[1] === 0x00 && data[2] === 0x01) {
          nalUnitType = (data[3] >> 1) & 0x3F;
        }

        // HEVC NAL 类型：32=VPS, 33=SPS, 34=PPS, 19-21=IDR (关键帧)
        if (nalUnitType === 32 || nalUnitType === 33 || nalUnitType === 34 ||
            (nalUnitType >= 16 && nalUnitType <= 21)) {
          frameType = 'key';
          receivedKeyFrameRef.current = true;
        }

        console.log('[HEVC] NAL 单元类型:', nalUnitType, '帧类型:', frameType, '数据大小:', data.length);
      }

      // 如果还没收到关键帧，跳过 delta 帧
      if (!receivedKeyFrameRef.current && frameType === 'delta') {
        console.log('[HEVC] ⏭️ 跳过 delta 帧，等待关键帧');
        return;
      }

      const chunk = new EncodedVideoChunk({
        type: frameType,
        timestamp: Date.now() * 1000, // 微秒
        data: data,
      });

      console.log('[HEVC] 开始解码帧:', { type: frameType, size: data.length, timestamp: chunk.timestamp });
      decoderRef.current.decode(chunk);
      console.log('[HEVC] ✅ decode() 调用成功');
    } catch (error) {
      console.error('[HEVC] 解码失败:', error);
      setDecoderError((error as Error).message);
    }
  };

  useEffect(() => {
    let frameCounter = 0;
    let fpsInterval: NodeJS.Timeout;
    let firstFrame = true;

    const unsubscribeFrame = window.electronAPI.video.onFrame((data) => {
      frameCounter++;
      setFrameCount((prev) => prev + 1);
      setDataSize(data.byteLength);

      const info = detectDetailedFormat(data);
      setFormatInfo(info);

      if (firstFrame) {
        console.log('[视频] 📥 首帧数据:', {
          size: data.byteLength,
          format: info.type,
          details: info.details,
          hex: info.hexStart
        });
        firstFrame = false;

        // 如果是 HEVC 且解码器未初始化，立即初始化
        if (info.type === 'hevc' && !decoderRef.current) {
          console.log('[视频] 检测到 HEVC，初始化解码器...');
          initHEVCDecoder();
        }
      }

      // 如果是 HEVC 且解码器已准备好，解码帧
      if (info.type === 'hevc' && decoderRef.current) {
        const arr = new Uint8Array(data);
        console.log('[视频] 🎞️ 发送帧到解码器, 帧数:', frameCounter, '大小:', arr.length);
        decodeHEVCFrame(arr);
      } else if (info.type === 'hevc') {
        console.log('[视频] ⏳ HEVC 帧已接收但解码器未初始化');
      }
    });

    const unsubscribeError = window.electronAPI.video.onError((error) => {
      console.error('[视频] 错误:', error);
    });

    fpsInterval = setInterval(() => {
      setFps(frameCounter);
      frameCounter = 0;
    }, 1000);

    return () => {
      unsubscribeFrame();
      unsubscribeError();
      clearInterval(fpsInterval);

      // 清理解码器
      if (decoderRef.current) {
        console.log('[HEVC] 🧹 清理解码器');
        decoderRef.current.close();
        decoderRef.current = null;
      }
    };
  }, []); // 移除 decoderStatus 依赖，避免重复初始化和清理

  const getStatusText = () => {
    switch (decoderStatus) {
      case 'none':
        return '等待视频数据...';
      case 'initializing':
        return '正在初始化 HEVC 解码器...';
      case 'ready':
        return '✅ HEVC 解码器已就绪';
      case 'error':
        return `❌ 解码器错误: ${decoderError}`;
      default:
        return '';
    }
  };

  return (
    <div style={styles.container}>
      <canvas
        ref={canvasRef}
        style={styles.canvas}
      />
      <div style={styles.overlay}>
        <div style={styles.stats}>
          FPS: {fps} | 帧数: {frameCount}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: '#000',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  canvas: {
    width: '100%',
    height: '100%',
    objectFit: 'contain',
  },
  placeholder: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
  },
  placeholderText: {
    color: '#666',
    fontSize: '24px',
  },
  overlay: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: '8px 16px',
    borderRadius: '4px',
  },
  stats: {
    color: '#fff',
    fontSize: '14px',
    fontFamily: 'monospace',
  },
};

export default VideoArea;