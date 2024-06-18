export type FileInfo = {
    name: string;
    bitRate: number;
    duration: number;
    size: number;
    url: string;
    nbStreams: number;
    flags: number;
    nbChapters: number;
    streams: StreamInfo[];
  };
  
  export type StreamInfo = {
    id: number;
    startTime: number;
    duration: number;
    codecType: number;
    codecName: string;
    format: string;
    bitRate: number;
    profile: string;
    level: number;
    width: number;
    height: number;
    channels: number;
    sampleRate: number;
    frameSize: number;
    tags: Tag[];
  };
  
  export type Tag = {
    key: string;
    value: string;
  };