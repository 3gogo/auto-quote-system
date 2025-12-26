<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { getPlatformAdapter } from '@platform/index';
import * as api from '@shared/api';

const store = useAppStore();
const adapter = getPlatformAdapter();

const serverUrl = ref('');
const voiceEnabled = ref(true);
const autoPlayTTS = ref(true);

onMounted(async () => {
  await store.loadSettings();
  serverUrl.value = store.settings.serverUrl;
  voiceEnabled.value = store.settings.voiceEnabled;
  autoPlayTTS.value = store.settings.autoPlayTTS;
});

// 保存服务器地址
async function saveServerUrl() {
  if (!serverUrl.value.trim()) {
    adapter.toast.error('请输入服务器地址');
    return;
  }

  if (!serverUrl.value.startsWith('http://') && !serverUrl.value.startsWith('https://')) {
    adapter.toast.error('URL 格式不正确');
    return;
  }

  store.updateSettings({ serverUrl: serverUrl.value });
  await store.saveSettings();
  adapter.toast.success('已保存');
}

// 测试连接
async function testConnection() {
  adapter.toast.showLoading('测试中...');

  try {
    const ok = await api.testConnection();
    adapter.toast.hideLoading();
    
    if (ok) {
      adapter.toast.success('连接成功');
    } else {
      adapter.toast.error('连接失败');
    }
  } catch {
    adapter.toast.hideLoading();
    adapter.toast.error('无法连接到服务器');
  }
}

// 切换语音功能
function toggleVoice() {
  voiceEnabled.value = !voiceEnabled.value;
  store.updateSettings({ voiceEnabled: voiceEnabled.value });
  store.saveSettings();
}

// 切换自动播放
function toggleAutoPlay() {
  autoPlayTTS.value = !autoPlayTTS.value;
  store.updateSettings({ autoPlayTTS: autoPlayTTS.value });
  store.saveSettings();
}

// 清除缓存
async function clearCache() {
  const confirmed = await adapter.toast.confirm({
    title: '清除缓存',
    content: '确定要清除所有本地缓存吗？'
  });

  if (confirmed) {
    await adapter.storage.clear();
    adapter.toast.success('已清除');
  }
}

// 关于
function showAbout() {
  adapter.toast.confirm({
    title: '小店报价助手',
    content: '版本：1.0.0\n\n一款面向小店店主的 AI 语音报价工具，让报价更简单高效。',
    confirmText: '确定',
    cancelText: ''
  });
}
</script>

<template>
  <div class="settings">
    <!-- 服务器设置 -->
    <div class="section">
      <div class="section-title">服务器设置</div>
      <div class="section-content">
        <div class="setting-item">
          <label class="setting-label">服务器地址</label>
          <input
            v-model="serverUrl"
            type="text"
            class="setting-input"
            placeholder="http://localhost:3001/api"
          />
        </div>
        <div class="setting-actions">
          <button class="btn btn-default" @click="testConnection">测试连接</button>
          <button class="btn btn-primary" @click="saveServerUrl">保存</button>
        </div>
      </div>
    </div>

    <!-- 语音设置 -->
    <div class="section">
      <div class="section-title">语音设置</div>
      <div class="section-content">
        <div class="setting-item clickable" @click="toggleVoice">
          <div class="setting-info">
            <span class="setting-label">语音功能</span>
            <span class="setting-desc">开启后可使用语音报价</span>
          </div>
          <div :class="['toggle', { active: voiceEnabled }]">
            <div class="toggle-thumb"></div>
          </div>
        </div>
        <div class="setting-item clickable" @click="toggleAutoPlay">
          <div class="setting-info">
            <span class="setting-label">自动播放回复</span>
            <span class="setting-desc">自动播放 AI 语音回复</span>
          </div>
          <div :class="['toggle', { active: autoPlayTTS }]">
            <div class="toggle-thumb"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 其他设置 -->
    <div class="section">
      <div class="section-title">其他</div>
      <div class="section-content">
        <div class="setting-item clickable" @click="clearCache">
          <span class="setting-label">清除缓存</span>
          <span class="arrow">›</span>
        </div>
        <div class="setting-item clickable" @click="showAbout">
          <div class="setting-info">
            <span class="setting-label">关于</span>
          </div>
          <div class="setting-extra">
            <span class="version">v1.0.0</span>
            <span class="arrow">›</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings {
  min-height: 100%;
  background: var(--bg-color);
  padding-bottom: 20px;
}

/* 分组 */
.section {
  margin-top: 12px;
}

.section-title {
  padding: 12px 16px 6px;
  font-size: 13px;
  color: var(--text-tertiary);
}

.section-content {
  background: #fff;
}

/* 设置项 */
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
}

.setting-item:last-child {
  border-bottom: none;
}

.setting-item.clickable {
  cursor: pointer;
}

.setting-item.clickable:active {
  background: #fafafa;
}

.setting-info {
  display: flex;
  flex-direction: column;
}

.setting-label {
  font-size: 15px;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.setting-input {
  flex: 1;
  text-align: right;
  font-size: 14px;
  color: var(--text-secondary);
  border: none;
  outline: none;
  margin-left: 12px;
}

.setting-extra {
  display: flex;
  align-items: center;
}

.version {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-right: 4px;
}

.arrow {
  font-size: 18px;
  color: #ccc;
}

/* 开关 */
.toggle {
  width: 50px;
  height: 30px;
  background: #e4e4e4;
  border-radius: 15px;
  padding: 2px;
  transition: background 0.2s ease;
}

.toggle.active {
  background: var(--primary-color);
}

.toggle-thumb {
  width: 26px;
  height: 26px;
  background: #fff;
  border-radius: 13px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
}

.toggle.active .toggle-thumb {
  transform: translateX(20px);
}

/* 操作按钮 */
.setting-actions {
  display: flex;
  gap: 12px;
  padding: 12px 16px;
  background: #fafafa;
}

.setting-actions .btn {
  flex: 1;
  height: 36px;
}
</style>

