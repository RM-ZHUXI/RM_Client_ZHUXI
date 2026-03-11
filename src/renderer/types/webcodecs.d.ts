// WebCodecs API 类型定义
// https://www.w3.org/TR/webcodecs/

interface VideoDecoderConfig {
  codec: string;
  description?: BufferSource;
  codedWidth?: number;
  codedHeight?: number;
  displayAspectWidth?: number;
  displayAspectHeight?: number;
  colorSpace?: VideoColorSpaceInit;
  hardwareAcceleration?: HardwareAcceleration;
  optimizeForLatency?: boolean;
}

interface VideoDecoderSupport {
  supported: boolean;
  config: VideoDecoderConfig;
}

interface VideoDecoderInit {
  output: (frame: VideoFrame) => void;
  error: (error: DOMException) => void;
}

interface EncodedVideoChunkInit {
  type: 'key' | 'delta';
  timestamp: number;
  duration?: number;
  data: BufferSource;
}

type VideoColorSpaceInit = any;
type HardwareAcceleration = 'no-preference' | 'prefer-hardware' | 'prefer-software';
type CodecState = 'unconfigured' | 'configured' | 'closed';

declare class VideoDecoder {
  constructor(init: VideoDecoderInit);
  configure(config: VideoDecoderConfig): void;
  decode(chunk: EncodedVideoChunk): void;
  flush(): Promise<void>;
  reset(): void;
  close(): void;
  readonly state: CodecState;
  readonly decodeQueueSize: number;
  static isConfigSupported(config: VideoDecoderConfig): Promise<VideoDecoderSupport>;
}

interface VideoFrame extends CanvasImageSource {
  readonly format: VideoPixelFormat | null;
  readonly codedWidth: number;
  readonly codedHeight: number;
  readonly codedRect: DOMRectReadOnly | null;
  readonly visibleRect: DOMRectReadOnly | null;
  readonly displayWidth: number;
  readonly displayHeight: number;
  readonly width: number;  // 兼容 ImageBitmap
  readonly height: number; // 兼容 ImageBitmap
  readonly duration: number | null;
  readonly timestamp: number;
  readonly colorSpace: VideoColorSpace;
  clone(): VideoFrame;
  close(): void;
}

declare var VideoFrame: {
  prototype: VideoFrame;
  new(image: CanvasImageSource, init?: VideoFrameInit): VideoFrame;
};

declare class EncodedVideoChunk {
  constructor(init: EncodedVideoChunkInit);
  readonly type: 'key' | 'delta';
  readonly timestamp: number;
  readonly duration: number | null;
  readonly byteLength: number;
  copyTo(destination: BufferSource): void;
}

interface VideoFrameInit {
  duration?: number;
  timestamp?: number;
  alpha?: AlphaOption;
  visibleRect?: DOMRectInit;
  displayWidth?: number;
  displayHeight?: number;
  colorSpace?: VideoColorSpaceInit;
}

type VideoPixelFormat = string;
type AlphaOption = 'keep' | 'discard';
type VideoColorSpace = any;
