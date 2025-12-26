/**
 * 共享 API 适配器
 * 将共享的 API 模块适配到小程序环境
 */

// 引入共享 API（构建时会复制过来）
// 目前直接内联实现，后续可通过构建脚本同步

const app = getApp();

// 配置
let apiBaseUrl = '';

/**
 * 初始化 API
 */
function init() {
  apiBaseUrl = app.globalData.apiBaseUrl;
}

/**
 * 设置 API 基础 URL
 */
function setApiBaseUrl(url) {
  apiBaseUrl = url.replace(/\/$/, '');
  app.globalData.apiBaseUrl = apiBaseUrl;
}

/**
 * 获取 API 基础 URL
 */
function getApiBaseUrl() {
  return apiBaseUrl || app.globalData.apiBaseUrl;
}

/**
 * HTTP 请求封装
 */
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: getApiBaseUrl() + options.url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        'Content-Type': 'application/json',
        ...options.header
      },
      success: (res) => {
        if (res.data.success) {
          resolve(res.data);
        } else {
          reject(new Error(res.data.error?.message || '请求失败'));
        }
      },
      fail: (err) => {
        reject(new Error(err.errMsg || '网络错误'));
      }
    });
  });
}

// ========== 语音处理 API ==========

/**
 * 处理语音并获取报价
 * @param {ArrayBuffer} audioData - 音频数据
 * @param {string} partnerId - 合作伙伴 ID（可选）
 */
async function processVoice(audioData, partnerId) {
  const base64Audio = wx.arrayBufferToBase64(audioData);
  
  const response = await request({
    url: '/voice/process',
    method: 'POST',
    data: {
      sessionId: app.globalData.sessionId,
      audioData: base64Audio,
      audioFormat: 'mp3',
      sampleRate: 16000,
      partnerId
    }
  });
  
  return response.data;
}

// ========== 对话 API ==========

/**
 * 发送文本消息
 */
async function sendMessage(text, partnerId) {
  const response = await request({
    url: '/conversation/chat',
    method: 'POST',
    data: {
      sessionId: app.globalData.sessionId,
      text,
      partnerId
    }
  });
  
  return response.data;
}

/**
 * 清除会话
 */
async function clearSession() {
  return request({
    url: `/conversation/session/${app.globalData.sessionId}`,
    method: 'DELETE'
  });
}

// ========== 交易 API ==========

/**
 * 确认交易
 */
async function confirmTransaction(quote) {
  const response = await request({
    url: '/transaction',
    method: 'POST',
    data: {
      ...quote,
      sessionId: app.globalData.sessionId
    }
  });
  
  return response.data;
}

/**
 * 获取交易列表
 */
async function getTransactionList(params = {}) {
  const { page = 1, pageSize = 20, startDate, endDate, partnerId } = params;
  
  let url = `/transaction?page=${page}&pageSize=${pageSize}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  if (partnerId) url += `&partnerId=${partnerId}`;
  
  const response = await request({ url });
  return response.data;
}

/**
 * 获取交易详情
 */
async function getTransactionDetail(id) {
  const response = await request({
    url: `/transaction/${id}`
  });
  return response.data;
}

/**
 * 获取今日统计
 */
async function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  const response = await request({
    url: `/transaction/stats/summary?startDate=${today}&endDate=${today}`
  });
  return response.data;
}

/**
 * 获取热门商品
 */
async function getTopProducts() {
  const response = await request({
    url: '/transaction/stats/top-products'
  });
  return response.data;
}

/**
 * 测试服务器连接
 */
async function testConnection() {
  return new Promise((resolve) => {
    wx.request({
      url: getApiBaseUrl() + '/health',
      method: 'GET',
      timeout: 5000,
      success: (res) => resolve(res.statusCode === 200),
      fail: () => resolve(false)
    });
  });
}

module.exports = {
  init,
  setApiBaseUrl,
  getApiBaseUrl,
  processVoice,
  sendMessage,
  clearSession,
  confirmTransaction,
  getTransactionList,
  getTransactionDetail,
  getTodayStats,
  getTopProducts,
  testConnection
};

