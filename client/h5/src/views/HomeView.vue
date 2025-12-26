<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useAppStore } from '../stores/app';
import { getPlatformAdapter } from '@platform/index';
import { formatAmount } from '@shared/utils';
import QuoteCard from '../components/QuoteCard.vue';
import MessageList from '../components/MessageList.vue';
import RecordButton from '../components/RecordButton.vue';

const store = useAppStore();
const adapter = getPlatformAdapter();

// 录音相关
const recordingTime = ref(0);
let recordingTimer: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
  await store.loadSettings();
  await store.loadTodayStats();
  
  // 设置录音回调
  adapter.recorder.onStart(() => {
    store.recordingState = 'recording';
    startTimer();
  });

  adapter.recorder.onError((error) => {
    console.error('录音错误:', error);
    store.recordingState = 'idle';
    stopTimer();
    adapter.toast.error('录音失败');
  });
});

onUnmounted(() => {
  stopTimer();
});

// 开始录音
async function startRecording() {
  if (store.recordingState !== 'idle') return;

  adapter.vibrate.short();

  try {
    const hasPermission = await adapter.recorder.requestPermission();
    if (!hasPermission) {
      adapter.toast.error('请允许录音权限');
      return;
    }

    await adapter.recorder.start({
      maxDuration: 60000,
      sampleRate: 16000,
      numberOfChannels: 1
    });
  } catch (error) {
    console.error('开始录音失败:', error);
    adapter.toast.error('无法开始录音');
  }
}

// 停止录音
async function stopRecording() {
  if (!adapter.recorder.isRecording()) return;

  adapter.vibrate.short();
  stopTimer();

  try {
    const result = await adapter.recorder.stop();
    
    if (result.duration < 500) {
      adapter.toast.info('录音时间太短');
      store.recordingState = 'idle';
      return;
    }

    // 处理语音
    await store.processVoice(result.audioData, result.format, result.sampleRate);

  } catch (error) {
    console.error('停止录音失败:', error);
    store.recordingState = 'idle';
  }
}

// 取消录音
function cancelRecording() {
  adapter.recorder.cancel();
  store.recordingState = 'idle';
  stopTimer();
}

// 开始计时
function startTimer() {
  recordingTime.value = 0;
  recordingTimer = setInterval(() => {
    recordingTime.value++;
    if (recordingTime.value >= 60) {
      stopRecording();
    }
  }, 1000);
}

// 停止计时
function stopTimer() {
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  recordingTime.value = 0;
}

// 清空对话
async function clearConversation() {
  const confirmed = await adapter.toast.confirm({
    title: '清空对话',
    content: '确定要清空当前对话吗？'
  });
  if (confirmed) {
    await store.clearMessages();
    adapter.toast.success('已清空');
  }
}
</script>

<template>
  <div class="home">
    <!-- 今日统计 -->
    <div class="stats-card">
      <div class="stats-item">
        <span class="stats-value">{{ store.todayStats.totalCount }}</span>
        <span class="stats-label">今日订单</span>
      </div>
      <div class="stats-divider"></div>
      <div class="stats-item">
        <span class="stats-value amount">{{ formatAmount(store.todayStats.totalAmount) }}</span>
        <span class="stats-label">今日销售额</span>
      </div>
    </div>

    <!-- 消息列表 -->
    <MessageList :messages="store.messages" />

    <!-- 报价卡片 -->
    <QuoteCard
      v-if="store.currentQuote"
      :quote="store.currentQuote"
      @confirm="store.confirmQuote"
      @cancel="store.cancelQuote"
    />

    <!-- 底部操作区 -->
    <div class="action-area">
      <!-- 录音状态 -->
      <div v-if="store.recordingState === 'recording'" class="recording-status">
        <div class="wave-bars">
          <div class="wave-bar" v-for="i in 5" :key="i"></div>
        </div>
        <span class="recording-time">{{ recordingTime }}s</span>
        <span class="recording-hint">松开发送，上滑取消</span>
      </div>

      <!-- 处理中 -->
      <div v-if="store.recordingState === 'processing'" class="processing-status">
        <div class="loading-spinner"></div>
        <span>处理中...</span>
      </div>

      <!-- 录音按钮 -->
      <RecordButton
        :is-recording="store.recordingState === 'recording'"
        :disabled="store.recordingState === 'processing'"
        @touchstart.prevent="startRecording"
        @touchend.prevent="stopRecording"
        @touchcancel.prevent="cancelRecording"
      />

      <!-- 清空按钮 -->
      <button
        v-if="store.hasMessages"
        class="clear-btn"
        @click="clearConversation"
      >
        清空
      </button>
    </div>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding-bottom: 140px;
}

/* 统计卡片 */
.stats-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  margin: 12px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #1677ff 0%, #4096ff 100%);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.25);
}

.stats-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.stats-value.amount::before {
  content: '¥';
  font-size: 16px;
}

.stats-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.8);
  margin-top: 4px;
}

.stats-divider {
  width: 1px;
  height: 30px;
  background: rgba(255, 255, 255, 0.3);
}

/* 底部操作区 */
.action-area {
  position: fixed;
  bottom: calc(56px + var(--safe-area-bottom));
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: linear-gradient(to top, #fff 80%, transparent);
}

/* 录音状态 */
.recording-status,
.processing-status {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: var(--primary-color);
  font-size: 14px;
}

.recording-time {
  font-size: 18px;
  font-weight: 600;
  margin: 0 8px;
}

.recording-hint {
  font-size: 12px;
  color: var(--text-tertiary);
}

/* 波形动画 */
.wave-bars {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 20px;
}

.wave-bar {
  width: 3px;
  height: 10px;
  background: var(--primary-color);
  border-radius: 2px;
  animation: wave 0.5s ease-in-out infinite;
}

.wave-bar:nth-child(1) { animation-delay: 0s; }
.wave-bar:nth-child(2) { animation-delay: 0.1s; }
.wave-bar:nth-child(3) { animation-delay: 0.2s; }
.wave-bar:nth-child(4) { animation-delay: 0.1s; }
.wave-bar:nth-child(5) { animation-delay: 0s; }

@keyframes wave {
  0%, 100% { height: 10px; }
  50% { height: 20px; }
}

/* 清空按钮 */
.clear-btn {
  position: absolute;
  right: 24px;
  bottom: 40px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  background: none;
  border: none;
  cursor: pointer;
}

.clear-btn:active {
  color: var(--text-secondary);
}
</style>

