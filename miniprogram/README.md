# 小店报价助手 - 微信小程序

面向小店店主的 AI 语音报价微信小程序，支持语音识别、智能报价和交易管理。

## 功能特性

### 🎤 语音报价
- 按住说话，自动识别语音内容
- 支持自然语言报价，如"老王要5斤猪肉3斤白菜"
- 智能识别商品、数量、客户信息
- 自动计算价格并生成报价单

### 📋 交易管理
- 查看交易记录
- 按日期筛选
- 交易统计分析

### ⚙️ 灵活配置
- 自定义服务器地址
- 语音功能开关
- 自动播放设置

## 项目结构

```
miniprogram/
├── project.config.json    # 项目配置
├── miniprogram/
│   ├── app.js            # 应用入口
│   ├── app.json          # 应用配置
│   ├── app.wxss          # 全局样式
│   ├── sitemap.json      # 站点地图
│   ├── images/           # 图片资源
│   ├── pages/
│   │   ├── index/        # 首页（语音报价）
│   │   ├── records/      # 交易记录
│   │   └── settings/     # 设置
│   └── utils/
│       ├── api.js        # API 封装
│       ├── recorder.js   # 录音管理
│       ├── audio.js      # 音频播放
│       └── util.js       # 通用工具
```

## 开发指南

### 环境准备

1. 下载并安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 注册微信小程序账号并获取 AppID

### 导入项目

1. 打开微信开发者工具
2. 选择"导入项目"
3. 选择 `miniprogram` 目录
4. 填入你的 AppID（测试可使用测试号）
5. 点击"导入"

### 配置后端

1. 确保后端服务已启动（默认 `http://localhost:3001`）
2. 在小程序"设置"页面配置服务器地址
3. 开发环境需要在开发者工具中关闭域名校验

### 添加图片资源

参考 `miniprogram/images/README.md` 添加所需的图标资源。

## 后端 API

小程序调用以下后端 API：

| 接口 | 方法 | 描述 |
|------|------|------|
| `/api/voice/process` | POST | 处理语音，返回报价 |
| `/api/conversation/chat` | POST | 处理文本，返回报价 |
| `/api/transaction` | GET/POST | 交易记录 |
| `/api/transaction/:id` | GET | 交易详情 |
| `/api/transaction/stats/summary` | GET | 统计摘要 |

## 注意事项

### 开发环境

- 需要在开发者工具中勾选"不校验合法域名"
- 真机调试需要配置服务器为 HTTPS

### 录音权限

- 首次使用会请求录音权限
- 用户拒绝后会引导至设置页面

### 性能优化

- 录音文件限制 60 秒
- 对话记录限制 20 条
- 使用本地缓存减少请求

## 版本历史

### v1.0.0
- 初始版本
- 语音报价功能
- 交易记录管理
- 基础设置

## License

MIT

