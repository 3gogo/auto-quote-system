<script setup lang="ts">
import type { Quote } from '@shared/types';
import { formatAmount } from '@shared/utils';

defineProps<{
  quote: Quote;
}>();

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>

<template>
  <div class="quote-card">
    <div class="quote-header">
      <span class="quote-title">📋 报价单</span>
      <span v-if="quote.customerName" class="quote-customer">
        客户：{{ quote.customerName }}
      </span>
    </div>

    <div class="quote-items">
      <div v-for="(item, index) in quote.items" :key="index" class="quote-item">
        <div class="item-info">
          <span class="item-name">{{ item.productName }}</span>
          <span class="item-qty">×{{ item.quantity }}{{ item.unit }}</span>
        </div>
        <div class="item-price">
          <span class="price-unit">¥{{ formatAmount(item.unitPrice) }}/{{ item.unit }}</span>
          <span class="price-total amount">{{ formatAmount(item.totalPrice) }}</span>
        </div>
      </div>
    </div>

    <div class="quote-footer">
      <div class="quote-total">
        <span>合计：</span>
        <span class="total-amount amount">{{ formatAmount(quote.totalAmount) }}</span>
      </div>
      <div class="quote-actions">
        <button class="btn btn-default" @click="emit('cancel')">取消</button>
        <button class="btn btn-success" @click="emit('confirm')">确认</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.quote-card {
  margin: 12px;
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.quote-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #fafafa;
  border-bottom: 1px solid #f0f0f0;
}

.quote-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.quote-customer {
  font-size: 13px;
  color: var(--text-secondary);
}

.quote-items {
  padding: 8px 16px;
}

.quote-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px dashed #f0f0f0;
}

.quote-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  align-items: baseline;
}

.item-name {
  font-size: 15px;
  color: var(--text-primary);
}

.item-qty {
  font-size: 13px;
  color: var(--text-tertiary);
  margin-left: 8px;
}

.item-price {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.price-unit {
  font-size: 12px;
  color: var(--text-tertiary);
}

.price-total {
  font-size: 16px;
  font-weight: 600;
}

.quote-footer {
  padding: 12px 16px;
  background: #fafafa;
  border-top: 1px solid #f0f0f0;
}

.quote-total {
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  margin-bottom: 12px;
}

.quote-total > span:first-child {
  font-size: 14px;
  color: var(--text-secondary);
}

.total-amount {
  font-size: 22px;
  font-weight: 700;
}

.quote-actions {
  display: flex;
  gap: 12px;
}

.quote-actions .btn {
  flex: 1;
  height: 40px;
}
</style>

