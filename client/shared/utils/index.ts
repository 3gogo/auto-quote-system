/**
 * 共享工具函数
 * 跨平台通用的工具方法
 */

/**
 * 生成会话 ID
 */
export function generateSessionId(): string {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 11);
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

/**
 * 格式化金额
 * @param amount 金额
 * @param decimals 小数位数
 */
export function formatAmount(amount: number, decimals = 2): string {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return '0.00';
  }
  return amount.toFixed(decimals);
}

/**
 * 格式化日期
 * @param date 日期对象或字符串
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化时间
 * @param date 日期对象或字符串
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * 格式化日期时间
 * @param date 日期对象或字符串
 */
export function formatDateTime(date: Date | string): string {
  return `${formatDate(date)} ${formatTime(date)}`;
}

/**
 * 格式化相对时间
 * @param date 日期对象或字符串
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    if (days === 1) return '昨天';
    if (days === 2) return '前天';
    if (days < 7) return `${days}天前`;
    return formatDate(d);
  }

  if (hours > 0) return `${hours}小时前`;
  if (minutes > 0) return `${minutes}分钟前`;
  return '刚刚';
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return function (this: any, ...args: Parameters<T>) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  interval = 300
): (...args: Parameters<T>) => void {
  let lastTime = 0;
  return function (this: any, ...args: Parameters<T>) {
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
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Base64 编码
 */
export function base64Encode(str: string): string {
  if (typeof btoa !== 'undefined') {
    return btoa(str);
  }
  // Node.js 环境
  return Buffer.from(str).toString('base64');
}

/**
 * Base64 解码
 */
export function base64Decode(str: string): string {
  if (typeof atob !== 'undefined') {
    return atob(str);
  }
  // Node.js 环境
  return Buffer.from(str, 'base64').toString();
}

/**
 * ArrayBuffer 转 Base64
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return base64Encode(binary);
}

/**
 * Base64 转 ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = base64Decode(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * 存储键名前缀
 */
const STORAGE_PREFIX = 'auto_quote_';

/**
 * 获取完整存储键名
 */
function getStorageKey(key: string): string {
  return STORAGE_PREFIX + key;
}

/**
 * 存储数据（平台无关的接口，需要适配器实现）
 */
export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
}

let storageAdapter: StorageAdapter = {
  async get(key: string) {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(getStorageKey(key));
    }
    return null;
  },
  async set(key: string, value: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(getStorageKey(key), value);
    }
  },
  async remove(key: string) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(getStorageKey(key));
    }
  },
  async clear() {
    if (typeof localStorage !== 'undefined') {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
  }
};

/**
 * 设置存储适配器
 */
export function setStorageAdapter(adapter: StorageAdapter): void {
  storageAdapter = adapter;
}

/**
 * 获取存储值
 */
export async function getStorage<T>(key: string, defaultValue?: T): Promise<T | null> {
  const value = await storageAdapter.get(key);
  if (value === null) {
    return defaultValue ?? null;
  }
  try {
    return JSON.parse(value) as T;
  } catch {
    return value as unknown as T;
  }
}

/**
 * 设置存储值
 */
export async function setStorage<T>(key: string, value: T): Promise<void> {
  const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
  await storageAdapter.set(key, stringValue);
}

/**
 * 移除存储值
 */
export async function removeStorage(key: string): Promise<void> {
  await storageAdapter.remove(key);
}

/**
 * 清除所有存储
 */
export async function clearStorage(): Promise<void> {
  await storageAdapter.clear();
}

