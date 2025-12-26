/**
 * API 服务封装
 */

const app = getApp();

/**
 * 发送语音数据获取报价
 * @param {ArrayBuffer} audioData - 音频数据
 * @param {string} partnerId - 合作伙伴 ID（可选）
 */
function processVoice(audioData, partnerId = null) {
  return new Promise((resolve, reject) => {
    // 将 ArrayBuffer 转为 Base64
    const base64Audio = wx.arrayBufferToBase64(audioData);
    
    wx.request({
      url: app.globalData.apiBaseUrl + '/voice/process',
      method: 'POST',
      data: {
        sessionId: app.globalData.sessionId,
        audioData: base64Audio,
        audioFormat: 'pcm',
        sampleRate: 16000,
        partnerId
      },
      header: {
        'Content-Type': 'application/json'
      },
      success: (res) => {
        if (res.data.success) {
          resolve(res.data.data);
        } else {
          reject(new Error(res.data.error || '处理失败'));
        }
      },
      fail: reject
    });
  });
}

/**
 * 发送文本消息获取报价
 * @param {string} text - 用户输入的文本
 * @param {string} partnerId - 合作伙伴 ID（可选）
 */
function processText(text, partnerId = null) {
  return app.request({
    url: '/conversation/chat',
    method: 'POST',
    data: {
      sessionId: app.globalData.sessionId,
      text,
      partnerId
    }
  });
}

/**
 * 确认交易
 * @param {Object} quoteData - 报价数据
 */
function confirmTransaction(quoteData) {
  return app.request({
    url: '/transaction',
    method: 'POST',
    data: {
      ...quoteData,
      sessionId: app.globalData.sessionId
    }
  });
}

/**
 * 获取交易记录列表
 * @param {Object} params - 查询参数
 */
function getTransactionList(params = {}) {
  const { page = 1, pageSize = 20, startDate, endDate, partnerId } = params;
  
  let url = `/transaction?page=${page}&pageSize=${pageSize}`;
  if (startDate) url += `&startDate=${startDate}`;
  if (endDate) url += `&endDate=${endDate}`;
  if (partnerId) url += `&partnerId=${partnerId}`;
  
  return app.request({ url });
}

/**
 * 获取交易详情
 * @param {string} id - 交易 ID
 */
function getTransactionDetail(id) {
  return app.request({
    url: `/transaction/${id}`
  });
}

/**
 * 获取今日统计
 */
function getTodayStats() {
  const today = new Date().toISOString().split('T')[0];
  return app.request({
    url: `/transaction/stats/summary?startDate=${today}&endDate=${today}`
  });
}

/**
 * 获取热门商品
 */
function getTopProducts() {
  return app.request({
    url: '/transaction/stats/top-products'
  });
}

/**
 * 清除会话
 */
function clearSession() {
  return app.request({
    url: `/conversation/session/${app.globalData.sessionId}`,
    method: 'DELETE'
  });
}

module.exports = {
  processVoice,
  processText,
  confirmTransaction,
  getTransactionList,
  getTransactionDetail,
  getTodayStats,
  getTopProducts,
  clearSession
};

