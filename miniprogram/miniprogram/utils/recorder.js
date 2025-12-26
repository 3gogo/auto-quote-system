/**
 * 录音管理器
 * 封装微信小程序 RecorderManager
 */

const recorderManager = wx.getRecorderManager();

// 录音配置
const RECORDER_OPTIONS = {
  duration: 60000, // 最长录音时间 60 秒
  sampleRate: 16000, // 采样率 16kHz
  numberOfChannels: 1, // 单声道
  encodeBitRate: 48000, // 编码码率
  format: 'mp3', // 输出格式
  frameSize: 50 // 帧大小
};

// 回调函数
let onStartCallback = null;
let onStopCallback = null;
let onFrameCallback = null;
let onErrorCallback = null;

// 录音状态
let isRecording = false;

/**
 * 初始化录音事件监听
 */
function initRecorder() {
  // 录音开始
  recorderManager.onStart(() => {
    console.log('录音开始');
    isRecording = true;
    if (onStartCallback) {
      onStartCallback();
    }
  });

  // 录音结束
  recorderManager.onStop((res) => {
    console.log('录音结束', res);
    isRecording = false;
    if (onStopCallback) {
      onStopCallback(res);
    }
  });

  // 录音帧回调（用于实时识别）
  recorderManager.onFrameRecorded((res) => {
    if (onFrameCallback) {
      onFrameCallback(res);
    }
  });

  // 录音错误
  recorderManager.onError((err) => {
    console.error('录音错误', err);
    isRecording = false;
    if (onErrorCallback) {
      onErrorCallback(err);
    }
  });

  // 录音中断
  recorderManager.onInterruptionBegin(() => {
    console.log('录音被中断');
  });

  recorderManager.onInterruptionEnd(() => {
    console.log('录音中断结束');
  });
}

/**
 * 开始录音
 * @param {Object} options - 录音选项
 */
function startRecord(options = {}) {
  return new Promise((resolve, reject) => {
    // 先检查权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.record'] === false) {
          // 权限被拒绝，引导用户打开设置
          wx.showModal({
            title: '需要录音权限',
            content: '请在设置中开启录音权限，以便使用语音报价功能',
            confirmText: '去设置',
            success: (modalRes) => {
              if (modalRes.confirm) {
                wx.openSetting();
              }
            }
          });
          reject(new Error('录音权限被拒绝'));
          return;
        }

        // 开始录音
        const finalOptions = { ...RECORDER_OPTIONS, ...options };
        recorderManager.start(finalOptions);
        resolve();
      },
      fail: reject
    });
  });
}

/**
 * 停止录音
 */
function stopRecord() {
  return new Promise((resolve) => {
    if (isRecording) {
      onStopCallback = (res) => {
        resolve(res);
        onStopCallback = null;
      };
      recorderManager.stop();
    } else {
      resolve(null);
    }
  });
}

/**
 * 设置录音开始回调
 */
function onStart(callback) {
  onStartCallback = callback;
}

/**
 * 设置录音结束回调
 */
function onStop(callback) {
  onStopCallback = callback;
}

/**
 * 设置录音帧回调
 */
function onFrame(callback) {
  onFrameCallback = callback;
}

/**
 * 设置错误回调
 */
function onError(callback) {
  onErrorCallback = callback;
}

/**
 * 获取录音状态
 */
function getRecordingState() {
  return isRecording;
}

// 初始化
initRecorder();

module.exports = {
  startRecord,
  stopRecord,
  onStart,
  onStop,
  onFrame,
  onError,
  getRecordingState
};

