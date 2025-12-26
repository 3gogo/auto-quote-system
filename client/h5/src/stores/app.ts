/**
 * 应用状态管理
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ChatMessage, Quote, TransactionStats, RecordingState, AppSettings } from '@shared/types';
import * as api from '@shared/api';
import { generateSessionId, generateId } from '@shared/utils';
import { getPlatformAdapter } from '@platform/index';

export const useAppStore = defineStore('app', () => {
  // 会话 ID
  const sessionId = ref(generateSessionId());

  // 消息列表
  const messages = ref<ChatMessage[]>([]);

  // 当前报价
  const currentQuote = ref<Quote | null>(null);

  // 录音状态
  const recordingState = ref<RecordingState>('idle');

  // 是否正在播放
  const isPlaying = ref(false);

  // 今日统计
  const todayStats = ref<TransactionStats>({
    totalCount: 0,
    totalAmount: 0
  });

  // 设置
  const settings = ref<AppSettings>({
    serverUrl: 'http://localhost:3001/api',
    voiceEnabled: true,
    autoPlayTTS: true
  });

  // 是否有消息
  const hasMessages = computed(() => messages.value.length > 0);

  // 添加消息
  function addMessage(role: 'user' | 'assistant', content: string) {
    messages.value.push({
      id: generateId(),
      role,
      content,
      timestamp: new Date()
    });

    // 限制消息数量
    if (messages.value.length > 50) {
      messages.value = messages.value.slice(-50);
    }
  }

  // 清空消息
  async function clearMessages() {
    try {
      await api.clearSession(sessionId.value);
      messages.value = [];
      currentQuote.value = null;
      sessionId.value = generateSessionId();
    } catch (error) {
      console.error('清空会话失败:', error);
    }
  }

  // 加载今日统计
  async function loadTodayStats() {
    try {
      const stats = await api.getTodayStats();
      todayStats.value = stats;
    } catch (error) {
      console.error('加载统计失败:', error);
    }
  }

  // 处理语音
  async function processVoice(audioData: string, format: string, sampleRate: number) {
    recordingState.value = 'processing';
    
    try {
      addMessage('user', '🎤 语音识别中...');

      const result = await api.processVoice({
        sessionId: sessionId.value,
        audioData,
        audioFormat: format,
        sampleRate
      });

      // 更新用户消息
      const lastUserMessage = messages.value.filter(m => m.role === 'user').pop();
      if (lastUserMessage) {
        lastUserMessage.content = result.recognizedText || '语音已识别';
      }

      // 添加助手回复
      if (result.response.text) {
        addMessage('assistant', result.response.text);
      }

      // 更新报价
      if (result.quote) {
        currentQuote.value = result.quote;
      }

      // 播放 TTS
      if (settings.value.autoPlayTTS && result.response.audioData) {
        await playAudio(result.response.audioData);
      }

    } catch (error) {
      console.error('处理语音失败:', error);
      addMessage('assistant', '抱歉，处理失败，请重试');
    } finally {
      recordingState.value = 'idle';
    }
  }

  // 发送文本
  async function sendText(text: string) {
    if (!text.trim()) return;

    recordingState.value = 'processing';
    addMessage('user', text);

    try {
      const result = await api.sendMessage({
        sessionId: sessionId.value,
        text
      });

      if (result.text) {
        addMessage('assistant', result.text);
      }

      if (result.quote) {
        currentQuote.value = result.quote;
      }

    } catch (error) {
      console.error('发送消息失败:', error);
      addMessage('assistant', '抱歉，处理失败，请重试');
    } finally {
      recordingState.value = 'idle';
    }
  }

  // 确认交易
  async function confirmQuote() {
    if (!currentQuote.value) return;

    const adapter = getPlatformAdapter();
    adapter.toast.showLoading('确认中...');

    try {
      await api.confirmTransaction(currentQuote.value, sessionId.value);
      
      adapter.toast.hideLoading();
      adapter.toast.success('交易已确认');
      
      currentQuote.value = null;
      addMessage('assistant', '✅ 交易已确认，感谢您的惠顾！');
      
      // 刷新统计
      loadTodayStats();

    } catch (error) {
      adapter.toast.hideLoading();
      adapter.toast.error('确认失败');
      console.error('确认交易失败:', error);
    }
  }

  // 取消报价
  function cancelQuote() {
    currentQuote.value = null;
    addMessage('assistant', '好的，已取消本次报价。');
  }

  // 播放音频
  async function playAudio(audioData: string) {
    const adapter = getPlatformAdapter();
    
    isPlaying.value = true;
    try {
      await adapter.audio.playBase64(audioData, 'mp3');
    } catch (error) {
      console.error('播放音频失败:', error);
    } finally {
      isPlaying.value = false;
    }
  }

  // 更新设置
  function updateSettings(newSettings: Partial<AppSettings>) {
    settings.value = { ...settings.value, ...newSettings };
    if (newSettings.serverUrl) {
      api.setApiBaseUrl(newSettings.serverUrl);
    }
  }

  // 加载设置
  async function loadSettings() {
    const adapter = getPlatformAdapter();
    const saved = await adapter.storage.get<AppSettings>('settings');
    if (saved) {
      settings.value = { ...settings.value, ...saved };
      api.setApiBaseUrl(settings.value.serverUrl);
    }
  }

  // 保存设置
  async function saveSettings() {
    const adapter = getPlatformAdapter();
    await adapter.storage.set('settings', settings.value);
  }

  return {
    // 状态
    sessionId,
    messages,
    currentQuote,
    recordingState,
    isPlaying,
    todayStats,
    settings,
    // 计算属性
    hasMessages,
    // 方法
    addMessage,
    clearMessages,
    loadTodayStats,
    processVoice,
    sendText,
    confirmQuote,
    cancelQuote,
    updateSettings,
    loadSettings,
    saveSettings
  };
});

