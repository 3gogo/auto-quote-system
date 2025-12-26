package com.autoquote.app.bridge

import android.content.Context
import android.media.MediaRecorder
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.widget.Toast
import java.io.File
import java.io.FileInputStream

/**
 * Android JSBridge
 * 提供原生功能给 H5 调用
 */
class AndroidBridge(
    private val context: Context,
    private val webView: WebView
) {
    private var mediaRecorder: MediaRecorder? = null
    private var audioFile: File? = null
    private var isRecording = false
    private var recordingStartTime = 0L

    /**
     * 检查录音权限
     */
    @JavascriptInterface
    fun hasRecordPermission(): Boolean {
        return context.checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) ==
                android.content.pm.PackageManager.PERMISSION_GRANTED
    }

    /**
     * 开始录音
     */
    @JavascriptInterface
    fun startRecording(): Boolean {
        if (isRecording) return false

        try {
            // 创建临时文件
            audioFile = File.createTempFile("recording", ".m4a", context.cacheDir)

            // 初始化 MediaRecorder
            mediaRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                MediaRecorder(context)
            } else {
                @Suppress("DEPRECATION")
                MediaRecorder()
            }

            mediaRecorder?.apply {
                setAudioSource(MediaRecorder.AudioSource.MIC)
                setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                setAudioSamplingRate(16000)
                setAudioEncodingBitRate(128000)
                setAudioChannels(1)
                setOutputFile(audioFile?.absolutePath)
                prepare()
                start()
            }

            isRecording = true
            recordingStartTime = System.currentTimeMillis()

            // 通知 H5 录音开始
            runOnMainThread {
                webView.evaluateJavascript("window.onAndroidRecordStart && window.onAndroidRecordStart()", null)
            }

            return true
        } catch (e: Exception) {
            e.printStackTrace()
            return false
        }
    }

    /**
     * 停止录音并返回 Base64 音频数据
     */
    @JavascriptInterface
    fun stopRecording(): String {
        if (!isRecording) return ""

        try {
            val duration = System.currentTimeMillis() - recordingStartTime

            mediaRecorder?.apply {
                stop()
                release()
            }
            mediaRecorder = null
            isRecording = false

            // 读取音频文件并转换为 Base64
            val audioData = audioFile?.let { file ->
                val bytes = FileInputStream(file).use { it.readBytes() }
                file.delete()
                Base64.encodeToString(bytes, Base64.NO_WRAP)
            } ?: ""

            // 返回 JSON 格式的结果
            return """{"duration":$duration,"audioData":"$audioData","format":"m4a","sampleRate":16000}"""
        } catch (e: Exception) {
            e.printStackTrace()
            return ""
        }
    }

    /**
     * 取消录音
     */
    @JavascriptInterface
    fun cancelRecording() {
        if (!isRecording) return

        try {
            mediaRecorder?.apply {
                stop()
                release()
            }
        } catch (e: Exception) {
            // 忽略错误
        }

        mediaRecorder = null
        isRecording = false
        audioFile?.delete()
    }

    /**
     * 检查是否正在录音
     */
    @JavascriptInterface
    fun isRecording(): Boolean = isRecording

    /**
     * 短振动
     */
    @JavascriptInterface
    fun vibrateShort() {
        vibrate(50)
    }

    /**
     * 长振动
     */
    @JavascriptInterface
    fun vibrateLong() {
        vibrate(200)
    }

    private fun vibrate(duration: Long) {
        val vibrator = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as VibratorManager
            vibratorManager.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            context.getSystemService(Context.VIBRATOR_SERVICE) as Vibrator
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createOneShot(duration, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(duration)
        }
    }

    /**
     * 显示 Toast
     */
    @JavascriptInterface
    fun showToast(message: String) {
        runOnMainThread {
            Toast.makeText(context, message, Toast.LENGTH_SHORT).show()
        }
    }

    /**
     * 获取设备信息
     */
    @JavascriptInterface
    fun getDeviceInfo(): String {
        return """{"platform":"android","model":"${Build.MODEL}","version":"${Build.VERSION.RELEASE}"}"""
    }

    /**
     * 权限结果回调
     */
    fun onPermissionResult(granted: Boolean) {
        runOnMainThread {
            webView.evaluateJavascript(
                "window.onAndroidPermissionResult && window.onAndroidPermissionResult($granted)",
                null
            )
        }
    }

    private fun runOnMainThread(action: () -> Unit) {
        webView.post(action)
    }
}

