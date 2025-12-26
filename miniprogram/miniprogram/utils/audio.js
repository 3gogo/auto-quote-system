/**
 * 音频播放工具
 * 封装微信小程序音频播放能力
 */

const innerAudioContext = wx.createInnerAudioContext();

// 播放状态
let isPlaying = false;
let onPlayCallback = null;
let onEndCallback = null;
let onErrorCallback = null;

/**
 * 初始化音频事件监听
 */
function initAudio() {
  innerAudioContext.onPlay(() => {
    console.log('音频开始播放');
    isPlaying = true;
    if (onPlayCallback) {
      onPlayCallback();
    }
  });

  innerAudioContext.onEnded(() => {
    console.log('音频播放结束');
    isPlaying = false;
    if (onEndCallback) {
      onEndCallback();
    }
  });

  innerAudioContext.onError((err) => {
    console.error('音频播放错误', err);
    isPlaying = false;
    if (onErrorCallback) {
      onErrorCallback(err);
    }
  });

  innerAudioContext.onStop(() => {
    console.log('音频播放停止');
    isPlaying = false;
  });
}

/**
 * 播放音频 URL
 * @param {string} url - 音频 URL
 */
function playUrl(url) {
  return new Promise((resolve, reject) => {
    innerAudioContext.src = url;
    
    onEndCallback = () => {
      resolve();
      onEndCallback = null;
    };
    
    onErrorCallback = (err) => {
      reject(err);
      onErrorCallback = null;
    };
    
    innerAudioContext.play();
  });
}

/**
 * 播放 Base64 音频数据
 * 注意：小程序不直接支持 Base64，需要先保存到临时文件
 * @param {string} base64Data - Base64 编码的音频数据
 * @param {string} format - 音频格式（默认 mp3）
 */
function playBase64(base64Data, format = 'mp3') {
  return new Promise((resolve, reject) => {
    // 解码 Base64 为 ArrayBuffer
    const arrayBuffer = wx.base64ToArrayBuffer(base64Data);
    
    // 获取文件系统管理器
    const fs = wx.getFileSystemManager();
    const tempFilePath = `${wx.env.USER_DATA_PATH}/temp_audio.${format}`;
    
    // 写入临时文件
    fs.writeFile({
      filePath: tempFilePath,
      data: arrayBuffer,
      encoding: 'binary',
      success: () => {
        // 播放临时文件
        playUrl(tempFilePath)
          .then(resolve)
          .catch(reject);
      },
      fail: (err) => {
        reject(new Error('写入音频文件失败: ' + err.errMsg));
      }
    });
  });
}

/**
 * 停止播放
 */
function stop() {
  innerAudioContext.stop();
  isPlaying = false;
}

/**
 * 暂停播放
 */
function pause() {
  innerAudioContext.pause();
}

/**
 * 恢复播放
 */
function resume() {
  innerAudioContext.play();
}

/**
 * 设置音量
 * @param {number} volume - 音量 0-1
 */
function setVolume(volume) {
  innerAudioContext.volume = volume;
}

/**
 * 获取播放状态
 */
function getPlayingState() {
  return isPlaying;
}

/**
 * 设置播放回调
 */
function onPlay(callback) {
  onPlayCallback = callback;
}

/**
 * 设置结束回调
 */
function onEnd(callback) {
  onEndCallback = callback;
}

/**
 * 设置错误回调
 */
function onError(callback) {
  onErrorCallback = callback;
}

/**
 * 销毁音频实例
 */
function destroy() {
  innerAudioContext.destroy();
}

// 初始化
initAudio();

module.exports = {
  playUrl,
  playBase64,
  stop,
  pause,
  resume,
  setVolume,
  getPlayingState,
  onPlay,
  onEnd,
  onError,
  destroy
};

