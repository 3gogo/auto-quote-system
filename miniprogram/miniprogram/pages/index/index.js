/**
 * 首页 - 语音报价界面
 * 使用共享业务逻辑模块
 */
const api = require('../../utils/shared-api');
const recorder = require('../../utils/recorder');
const audio = require('../../utils/audio');
const util = require('../../utils/shared-util');

Page({
  data: {
    // 录音状态
    isRecording: false,
    recordingTime: 0,
    
    // 处理状态
    isProcessing: false,
    
    // 当前对话
    messages: [],
    
    // 当前报价
    currentQuote: null,
    
    // 今日统计
    todayStats: {
      orderCount: 0,
      totalAmount: 0
    },
    
    // 语音波形动画
    waveAnimation: false
  },

  onLoad() {
    this.loadTodayStats();
    this.initRecorderCallbacks();
  },

  onShow() {
    this.loadTodayStats();
  },

  /**
   * 加载今日统计
   */
  async loadTodayStats() {
    try {
      const stats = await api.getTodayStats();
      this.setData({
        todayStats: {
          orderCount: stats.totalCount || 0,
          totalAmount: stats.totalAmount || 0
        }
      });
    } catch (err) {
      console.log('加载统计失败', err);
    }
  },

  /**
   * 初始化录音回调
   */
  initRecorderCallbacks() {
    recorder.onStart(() => {
      this.setData({ isRecording: true, waveAnimation: true });
      this.startRecordingTimer();
    });

    recorder.onError((err) => {
      this.setData({ isRecording: false, waveAnimation: false });
      this.stopRecordingTimer();
      util.showError('录音失败');
      console.error('录音错误', err);
    });
  },

  /**
   * 按下录音按钮
   */
  onRecordStart() {
    if (this.data.isProcessing) return;
    
    wx.vibrateShort({ type: 'medium' });
    
    recorder.startRecord()
      .catch((err) => {
        console.error('开始录音失败', err);
        util.showError('无法开始录音');
      });
  },

  /**
   * 松开录音按钮
   */
  async onRecordEnd() {
    if (!this.data.isRecording) return;
    
    wx.vibrateShort({ type: 'light' });
    
    this.setData({ 
      isRecording: false, 
      waveAnimation: false,
      isProcessing: true 
    });
    this.stopRecordingTimer();

    try {
      const result = await recorder.stopRecord();
      
      if (!result || !result.tempFilePath) {
        throw new Error('录音文件无效');
      }

      // 检查录音时长
      if (result.duration < 500) {
        util.showError('录音时间太短');
        this.setData({ isProcessing: false });
        return;
      }

      // 读取音频文件并发送
      await this.processAudioFile(result.tempFilePath);
      
    } catch (err) {
      console.error('处理录音失败', err);
      util.showError('处理失败');
      this.setData({ isProcessing: false });
    }
  },

  /**
   * 取消录音
   */
  onRecordCancel() {
    if (!this.data.isRecording) return;
    
    this.setData({ 
      isRecording: false, 
      waveAnimation: false 
    });
    this.stopRecordingTimer();
    recorder.stopRecord();
  },

  /**
   * 处理音频文件
   */
  async processAudioFile(filePath) {
    try {
      // 读取文件为 ArrayBuffer
      const fs = wx.getFileSystemManager();
      const audioData = fs.readFileSync(filePath);
      
      // 添加用户消息
      this.addMessage('user', '🎤 语音输入...');
      
      // 发送到后端处理
      const result = await api.processVoice(audioData);
      
      // 更新用户消息（显示识别出的文本）
      this.updateLastUserMessage(result.recognizedText || '语音已识别');
      
      // 添加系统回复
      if (result.response) {
        this.addMessage('assistant', result.response.text);
        
        // 播放 TTS
        if (result.response.audioUrl) {
          await audio.playUrl(result.response.audioUrl);
        } else if (result.response.audioData) {
          await audio.playBase64(result.response.audioData);
        }
      }
      
      // 如果有报价结果
      if (result.quote) {
        this.setData({ currentQuote: result.quote });
      }
      
    } finally {
      this.setData({ isProcessing: false });
    }
  },

  /**
   * 发送文本消息
   */
  async sendTextMessage(text) {
    if (!text.trim() || this.data.isProcessing) return;
    
    this.setData({ isProcessing: true });
    
    try {
      // 添加用户消息
      this.addMessage('user', text);
      
      // 发送到后端
      const result = await api.processText(text);
      
      // 添加系统回复
      if (result.text) {
        this.addMessage('assistant', result.text);
        
        // 播放 TTS
        if (result.audioUrl) {
          await audio.playUrl(result.audioUrl);
        }
      }
      
      // 如果有报价结果
      if (result.quote) {
        this.setData({ currentQuote: result.quote });
      }
      
    } catch (err) {
      console.error('发送消息失败', err);
      this.addMessage('assistant', '抱歉，处理失败，请重试');
    } finally {
      this.setData({ isProcessing: false });
    }
  },

  /**
   * 添加消息
   */
  addMessage(role, content) {
    const messages = this.data.messages;
    messages.push({
      id: Date.now(),
      role,
      content,
      time: new Date()
    });
    
    // 只保留最近 20 条消息
    if (messages.length > 20) {
      messages.shift();
    }
    
    this.setData({ messages });
    
    // 滚动到底部
    this.scrollToBottom();
  },

  /**
   * 更新最后一条用户消息
   */
  updateLastUserMessage(content) {
    const messages = this.data.messages;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        messages[i].content = content;
        break;
      }
    }
    this.setData({ messages });
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    wx.createSelectorQuery()
      .select('#message-list')
      .boundingClientRect((rect) => {
        if (rect) {
          wx.pageScrollTo({
            scrollTop: rect.height,
            duration: 200
          });
        }
      })
      .exec();
  },

  /**
   * 确认交易
   */
  async confirmQuote() {
    if (!this.data.currentQuote) return;
    
    try {
      util.showLoading('确认中...');
      
      await api.confirmTransaction(this.data.currentQuote);
      
      util.hideLoading();
      util.showSuccess('交易已确认');
      
      // 清除当前报价
      this.setData({ currentQuote: null });
      
      // 刷新统计
      this.loadTodayStats();
      
      // 添加确认消息
      this.addMessage('assistant', '✅ 交易已确认，感谢您的惠顾！');
      
    } catch (err) {
      util.hideLoading();
      util.showError('确认失败');
      console.error('确认交易失败', err);
    }
  },

  /**
   * 取消报价
   */
  cancelQuote() {
    this.setData({ currentQuote: null });
    this.addMessage('assistant', '好的，已取消本次报价。');
  },

  /**
   * 清空对话
   */
  clearConversation() {
    wx.showModal({
      title: '清空对话',
      content: '确定要清空当前对话吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.clearSession();
            this.setData({ 
              messages: [],
              currentQuote: null 
            });
            util.showSuccess('已清空');
          } catch (err) {
            console.error('清空失败', err);
          }
        }
      }
    });
  },

  /**
   * 开始录音计时
   */
  startRecordingTimer() {
    this.recordingTimer = setInterval(() => {
      this.setData({
        recordingTime: this.data.recordingTime + 1
      });
      
      // 最长 60 秒
      if (this.data.recordingTime >= 60) {
        this.onRecordEnd();
      }
    }, 1000);
  },

  /**
   * 停止录音计时
   */
  stopRecordingTimer() {
    if (this.recordingTimer) {
      clearInterval(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.setData({ recordingTime: 0 });
  },

  onUnload() {
    this.stopRecordingTimer();
    audio.destroy();
  }
});

