/**
 * 小店报价助手 - 微信小程序
 */
App({
  globalData: {
    // 后端 API 地址
    apiBaseUrl: 'http://localhost:3001/api',
    // 会话 ID
    sessionId: '',
    // 用户信息
    userInfo: null
  },

  onLaunch() {
    // 生成会话 ID
    this.globalData.sessionId = this.generateSessionId();
    
    // 检查录音权限
    this.checkRecordPermission();
  },

  /**
   * 生成会话 ID
   */
  generateSessionId() {
    return 'mp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },

  /**
   * 检查录音权限
   */
  checkRecordPermission() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          // 请求录音权限
          wx.authorize({
            scope: 'scope.record',
            success: () => {
              console.log('录音权限已授权');
            },
            fail: () => {
              console.log('录音权限被拒绝');
            }
          });
        }
      }
    });
  },

  /**
   * API 请求封装
   */
  request(options) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.apiBaseUrl + options.url,
        method: options.method || 'GET',
        data: options.data,
        header: {
          'Content-Type': 'application/json',
          ...options.header
        },
        success: (res) => {
          if (res.data.success) {
            resolve(res.data.data);
          } else {
            reject(new Error(res.data.error || '请求失败'));
          }
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  }
});

