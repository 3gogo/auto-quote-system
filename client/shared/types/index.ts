/**
 * 共享类型定义
 * 跨平台通用的数据类型
 */

// ========== API 响应类型 ==========

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

// ========== 报价相关 ==========

export interface QuoteItem {
  productId?: number;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Quote {
  items: QuoteItem[];
  totalAmount: number;
  customerName?: string;
  partnerId?: string | number;
}

// ========== 语音处理 ==========

export interface VoiceProcessRequest {
  sessionId: string;
  audioData: string;  // Base64 编码的音频
  audioFormat?: string;
  sampleRate?: number;
  partnerId?: string;
}

export interface VoiceProcessResponse {
  recognizedText: string;
  response: {
    text: string;
    audioData?: string;  // Base64 编码的 TTS 音频
    audioUrl?: string;
  };
  quote?: Quote;
  intent?: string;
  state?: string;
}

// ========== 对话相关 ==========

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatRequest {
  sessionId: string;
  text: string;
  partnerId?: string;
}

export interface ChatResponse {
  text: string;
  speechText?: string;
  quote?: Quote;
  state: string;
  needsConfirmation: boolean;
}

// ========== 交易记录 ==========

export interface TransactionItem {
  productId?: number;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface Transaction {
  id: number;
  partnerId?: number;
  partnerName?: string;
  items: TransactionItem[];
  totalAmount: number;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionListResponse {
  records: Transaction[];
  total: number;
  page: number;
  pageSize: number;
  totalAmount?: number;
}

export interface TransactionStats {
  totalCount: number;
  totalAmount: number;
  averageAmount?: number;
}

// ========== 应用状态 ==========

export type RecordingState = 'idle' | 'recording' | 'processing';

export interface AppState {
  sessionId: string;
  messages: ChatMessage[];
  currentQuote: Quote | null;
  recordingState: RecordingState;
  isPlaying: boolean;
  todayStats: TransactionStats;
}

// ========== 设置 ==========

export interface AppSettings {
  serverUrl: string;
  voiceEnabled: boolean;
  autoPlayTTS: boolean;
}

