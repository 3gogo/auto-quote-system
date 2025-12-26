<script setup lang="ts">
import type { ChatMessage } from '@shared/types';

defineProps<{
  messages: ChatMessage[];
}>();
</script>

<template>
  <div class="message-list">
    <!-- 空状态 -->
    <div v-if="messages.length === 0" class="welcome">
      <div class="welcome-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          <line x1="12" y1="19" x2="12" y2="23"/>
          <line x1="8" y1="23" x2="16" y2="23"/>
        </svg>
      </div>
      <p class="welcome-text">按住下方按钮开始语音报价</p>
      <p class="welcome-hint">例如："老王要5斤猪肉3斤白菜"</p>
    </div>

    <!-- 消息列表 -->
    <div
      v-for="message in messages"
      :key="message.id"
      :class="['message', message.role === 'user' ? 'message-user' : 'message-assistant']"
    >
      <div class="message-bubble">
        {{ message.content }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  padding: 12px;
}

/* 欢迎状态 */
.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
}

.welcome-icon {
  width: 80px;
  height: 80px;
  color: var(--text-tertiary);
  opacity: 0.5;
  margin-bottom: 16px;
}

.welcome-icon svg {
  width: 100%;
  height: 100%;
}

.welcome-text {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.welcome-hint {
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 消息 */
.message {
  display: flex;
  margin-bottom: 12px;
}

.message-user {
  justify-content: flex-end;
}

.message-assistant {
  justify-content: flex-start;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 15px;
  line-height: 1.5;
  word-break: break-all;
}

.message-user .message-bubble {
  background: var(--primary-color);
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message-assistant .message-bubble {
  background: #fff;
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}
</style>

