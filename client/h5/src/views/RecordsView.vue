<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import * as api from '@shared/api';
import { formatAmount, formatRelativeTime, formatDate } from '@shared/utils';
import type { Transaction } from '@shared/types';

// 日期范围选项
const dateRanges = [
  { value: 'today', label: '今天' },
  { value: 'week', label: '本周' },
  { value: 'month', label: '本月' },
  { value: 'all', label: '全部' }
];

const selectedRange = ref('today');
const records = ref<Transaction[]>([]);
const loading = ref(false);
const total = ref(0);
const totalAmount = ref(0);
const page = ref(1);
const hasMore = ref(true);

// 计算日期范围
function getDateRange(range: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (range) {
    case 'today':
      return { startDate: formatDate(today), endDate: formatDate(today) };
    case 'week':
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { startDate: formatDate(weekStart), endDate: formatDate(today) };
    case 'month':
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: formatDate(monthStart), endDate: formatDate(today) };
    default:
      return {};
  }
}

// 加载记录
async function loadRecords(refresh = false) {
  if (loading.value) return;

  if (refresh) {
    page.value = 1;
    records.value = [];
    hasMore.value = true;
  }

  loading.value = true;

  try {
    const { startDate, endDate } = getDateRange(selectedRange.value);
    const result = await api.getTransactionList({
      page: page.value,
      pageSize: 20,
      startDate,
      endDate
    });

    const newRecords = result.records || [];
    
    if (refresh) {
      records.value = newRecords;
      total.value = result.total;
      totalAmount.value = result.totalAmount || 0;
    } else {
      records.value = [...records.value, ...newRecords];
    }

    hasMore.value = records.value.length < result.total;
    page.value++;

  } catch (error) {
    console.error('加载记录失败:', error);
  } finally {
    loading.value = false;
  }
}

// 切换日期范围
function selectRange(range: string) {
  if (range !== selectedRange.value) {
    selectedRange.value = range;
    loadRecords(true);
  }
}

// 加载更多
function loadMore() {
  if (hasMore.value && !loading.value) {
    loadRecords(false);
  }
}

onMounted(() => {
  loadRecords(true);
});
</script>

<template>
  <div class="records">
    <!-- 日期筛选 -->
    <div class="filter-bar">
      <div
        v-for="range in dateRanges"
        :key="range.value"
        :class="['filter-item', { active: selectedRange === range.value }]"
        @click="selectRange(range.value)"
      >
        {{ range.label }}
      </div>
    </div>

    <!-- 统计摘要 -->
    <div class="summary-bar">
      <span>共 {{ total }} 笔交易</span>
      <span>合计 <span class="amount">{{ formatAmount(totalAmount) }}</span></span>
    </div>

    <!-- 记录列表 -->
    <div class="record-list">
      <div
        v-for="record in records"
        :key="record.id"
        class="record-item"
      >
        <div class="record-main">
          <div class="record-info">
            <span class="record-partner">{{ record.partnerName || '散客' }}</span>
            <span class="record-time">{{ formatRelativeTime(record.createdAt) }}</span>
          </div>
          <div class="record-amount">
            <span class="amount">{{ formatAmount(record.totalAmount) }}</span>
          </div>
        </div>
        <div v-if="record.items?.length" class="record-items">
          {{ record.items[0].productName }} ×{{ record.items[0].quantity }}
          <span v-if="record.items.length > 1">
            等{{ record.items.length }}件商品
          </span>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && records.length === 0" class="empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        </svg>
        <span>暂无交易记录</span>
      </div>

      <!-- 加载更多 -->
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <span>加载中...</span>
      </div>

      <div v-if="!hasMore && records.length > 0" class="no-more">
        已加载全部
      </div>

      <!-- 触发加载更多 -->
      <div v-if="hasMore && !loading" class="load-more" @click="loadMore">
        加载更多
      </div>
    </div>
  </div>
</template>

<style scoped>
.records {
  min-height: 100%;
  background: var(--bg-color);
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  padding: 12px;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.filter-item {
  flex: 1;
  text-align: center;
  padding: 8px 0;
  font-size: 14px;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-item.active {
  background: #e6f4ff;
  color: var(--primary-color);
  font-weight: 500;
}

/* 统计摘要 */
.summary-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 16px;
  background: #fafafa;
  font-size: 13px;
  color: var(--text-tertiary);
}

.summary-bar .amount {
  font-size: 15px;
  font-weight: 600;
}

/* 记录列表 */
.record-list {
  padding: 8px 12px;
}

.record-item {
  background: #fff;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
}

.record-item:active {
  background: #fafafa;
}

.record-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.record-info {
  display: flex;
  flex-direction: column;
}

.record-partner {
  font-size: 16px;
  color: var(--text-primary);
  font-weight: 500;
}

.record-time {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 4px;
}

.record-amount .amount {
  font-size: 18px;
  font-weight: 600;
}

.record-items {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #f0f0f0;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 状态 */
.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 20px;
}

.empty svg {
  width: 100px;
  height: 100px;
  color: var(--text-tertiary);
  opacity: 0.5;
  margin-bottom: 12px;
}

.empty span {
  color: var(--text-tertiary);
}

.no-more {
  text-align: center;
  padding: 16px;
  color: #ccc;
  font-size: 12px;
}

.load-more {
  text-align: center;
  padding: 16px;
  color: var(--primary-color);
  font-size: 14px;
  cursor: pointer;
}
</style>

