/**
 * 平台适配器入口
 * 自动检测当前平台并返回对应的适配器
 */

import type { IPlatformAdapter, PlatformType } from './interface';
import { H5Adapter } from './h5-adapter';

// 当前平台适配器实例
let currentAdapter: IPlatformAdapter | null = null;

/**
 * 检测当前平台类型
 */
export function detectPlatform(): PlatformType {
  // 检测微信小程序
  if (typeof wx !== 'undefined' && wx.getSystemInfoSync) {
    return 'miniprogram';
  }

  // 检测 Android WebView（通过 JSBridge）
  if (typeof (window as any).AndroidBridge !== 'undefined') {
    return 'android';
  }

  // 检测 iOS WebView（通过 JSBridge）
  if (typeof (window as any).webkit?.messageHandlers !== 'undefined') {
    return 'ios';
  }

  // 默认 H5
  return 'h5';
}

/**
 * 获取平台适配器
 */
export function getPlatformAdapter(): IPlatformAdapter {
  if (currentAdapter) {
    return currentAdapter;
  }

  const platform = detectPlatform();

  switch (platform) {
    case 'miniprogram':
      // 小程序环境下不使用此适配器系统
      throw new Error('小程序环境请直接使用 miniprogram 目录下的代码');

    case 'android':
      // Android WebView，使用 H5 适配器 + JSBridge 增强
      currentAdapter = new H5Adapter();
      // 可以在这里添加 Android 特有的 JSBridge 调用
      break;

    case 'ios':
      // iOS WebView，使用 H5 适配器 + JSBridge 增强
      currentAdapter = new H5Adapter();
      // 可以在这里添加 iOS 特有的 JSBridge 调用
      break;

    case 'h5':
    default:
      currentAdapter = new H5Adapter();
      break;
  }

  return currentAdapter;
}

/**
 * 初始化平台适配器
 */
export async function initPlatform(): Promise<IPlatformAdapter> {
  const adapter = getPlatformAdapter();
  await adapter.init();
  return adapter;
}

// 导出类型
export type { IPlatformAdapter, PlatformType } from './interface';
export type {
  IRecorderService,
  IAudioService,
  IVibrateService,
  IToastService,
  IStorageService,
  RecordResult,
  RecordOptions
} from './interface';

// 导出适配器
export { H5Adapter } from './h5-adapter';

