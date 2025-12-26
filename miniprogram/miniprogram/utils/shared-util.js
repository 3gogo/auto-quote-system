/**
 * 共享工具函数
 * 与 client/shared/utils 保持同步
 */

/**
 * 生成会话 ID
 */
function generateSessionId() {
  return 'mp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * 格式化金额
 */
function formatAmount(amount, decimals = 2) {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }
  return amount.toFixed(decimals);
}

/**
 * 格式化日期
 */
function formatDate(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间
 */
function formatTime(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期时间
 */
function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * 格式化相对时间
 */
function formatRelativeTime(date) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    if (days === 1) return '昨天';
    if (days === 2) return '前天';
    if (days < 7) return `${days}天前`;
    return formatDate(date);
  }
  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

/**
 * 防抖函数
 */
function debounce(fn, delay = 300) {
  let timer = null;
  return function(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 */
function throttle(fn, interval = 300) {
  let lastTime = 0;
  return function(...args) {
    const now = Date.now();
    if (now - lastTime >= interval) {
      lastTime = now;
      fn.apply(this, args);
    }
  };
}

/**
 * 延迟执行
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 显示成功提示
 */
function showSuccess(title) {
  wx.showToast({
    title,
    icon: 'success',
    duration: 1500
  });
}

/**
 * 显示错误提示
 */
function showError(title) {
  wx.showToast({
    title,
    icon: 'error',
    duration: 2000
  });
}

/**
 * 显示加载中
 */
function showLoading(title = '加载中...') {
  wx.showLoading({
    title,
    mask: true
  });
}

/**
 * 隐藏加载
 */
function hideLoading() {
  wx.hideLoading();
}

module.exports = {
  generateSessionId,
  generateId,
  formatAmount,
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  debounce,
  throttle,
  delay,
  showSuccess,
  showError,
  showLoading,
  hideLoading
};

