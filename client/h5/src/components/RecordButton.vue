<script setup lang="ts">
defineProps<{
  isRecording: boolean;
  disabled: boolean;
}>();
</script>

<template>
  <button
    :class="['record-btn', { recording: isRecording, disabled }]"
    :disabled="disabled"
  >
    <div class="record-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        <line x1="12" y1="19" x2="12" y2="23"/>
        <line x1="8" y1="23" x2="16" y2="23"/>
      </svg>
    </div>
    <span class="record-text">
      {{ isRecording ? '松开发送' : '按住说话' }}
    </span>
  </button>
</template>

<style scoped>
.record-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 90px;
  height: 90px;
  background: linear-gradient(145deg, #1677ff, #4096ff);
  border-radius: 50%;
  border: none;
  box-shadow: 0 4px 12px rgba(22, 119, 255, 0.35);
  cursor: pointer;
  transition: all 0.2s ease;
  touch-action: none;
}

.record-btn:active,
.record-btn.recording {
  transform: scale(1.1);
  box-shadow: 0 6px 18px rgba(22, 119, 255, 0.45);
}

.record-btn.recording {
  background: linear-gradient(145deg, #ff4d4f, #ff7875);
  box-shadow: 0 4px 12px rgba(255, 77, 79, 0.35);
}

.record-btn.disabled {
  opacity: 0.6;
  pointer-events: none;
}

.record-icon {
  width: 32px;
  height: 32px;
  color: #fff;
  margin-bottom: 4px;
}

.record-icon svg {
  width: 100%;
  height: 100%;
}

.record-text {
  font-size: 11px;
  color: #fff;
  font-weight: 500;
}
</style>

