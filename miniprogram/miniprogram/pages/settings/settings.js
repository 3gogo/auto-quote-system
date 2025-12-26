/**
 * 设置页面
 * 使用共享业务逻辑模块
 */
const app = getApp();
const api = require('../../utils/shared-api');
const util = require('../../utils/shared-util');

Page({
  data: {
    // 服务器设置
    serverUrl: '',
    
    // 语音设置
    voiceEnabled: true,
    autoPlay: true,
    
    // 版本信息
    version: '1.0.0'
  },

  onLoad() {
    // 加载设置
    this.loadSettings();
  },

  /**
   * 加载设置
   */
  loadSettings() {
    const serverUrl = wx.getStorageSync('serverUrl') || app.globalData.apiBaseUrl;
    const voiceEnabled = wx.getStorageSync('voiceEnabled');
    const autoPlay = wx.getStorageSync('autoPlay');
    
    this.setData({
      serverUrl,
      voiceEnabled: voiceEnabled !== false,
      autoPlay: autoPlay !== false
    });
  },

  /**
   * 修改服务器地址
   */
  onServerUrlChange(e) {
    const serverUrl = e.detail.value.trim();
    this.setData({ serverUrl });
  },

  /**
   * 保存服务器地址
   */
  saveServerUrl() {
    const { serverUrl } = this.data;
    
    if (!serverUrl) {
      wx.showToast({ title: '请输入服务器地址', icon: 'none' });
      return;
    }
    
    // 验证 URL 格式
    if (!serverUrl.startsWith('http://') && !serverUrl.startsWith('https://')) {
      wx.showToast({ title: 'URL 格式不正确', icon: 'none' });
      return;
    }
    
    wx.setStorageSync('serverUrl', serverUrl);
    api.setApiBaseUrl(serverUrl);
    
    util.showSuccess('已保存');
  },

  /**
   * 切换语音开关
   */
  onVoiceEnabledChange(e) {
    const voiceEnabled = e.detail.value;
    this.setData({ voiceEnabled });
    wx.setStorageSync('voiceEnabled', voiceEnabled);
  },

  /**
   * 切换自动播放
   */
  onAutoPlayChange(e) {
    const autoPlay = e.detail.value;
    this.setData({ autoPlay });
    wx.setStorageSync('autoPlay', autoPlay);
  },

  /**
   * 清除缓存
   */
  clearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确定要清除所有本地缓存吗？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          util.showSuccess('已清除');
          
          // 重新加载设置
          this.loadSettings();
        }
      }
    });
  },

  /**
   * 测试连接
   */
  async testConnection() {
    util.showLoading('测试中...');
    
    try {
      const success = await api.testConnection();
      
      util.hideLoading();
      
      if (success) {
        util.showSuccess('连接成功');
      } else {
        wx.showModal({
          title: '连接失败',
          content: '无法连接到服务器，请检查地址是否正确',
          showCancel: false
        });
      }
    } catch (err) {
      util.hideLoading();
      wx.showModal({
        title: '连接失败',
        content: '无法连接到服务器，请检查地址是否正确',
        showCancel: false
      });
    }
  },

  /**
   * 关于
   */
  showAbout() {
    wx.showModal({
      title: '小店报价助手',
      content: `版本：${this.data.version}\n\n一款面向小店店主的 AI 语音报价工具，让报价更简单高效。`,
      showCancel: false
    });
  },

  /**
   * 反馈
   */
  feedback() {
    wx.showModal({
      title: '意见反馈',
      content: '如有问题或建议，请联系客服',
      confirmText: '复制邮箱',
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: 'support@example.com',
            success: () => {
              util.showSuccess('已复制');
            }
          });
        }
      }
    });
  }
});
