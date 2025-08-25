# TTS API 架構重構說明

## 概述

TTS API 已重構為支援多個 TTS 提供商的架構，允許根據語音 ID 自動選擇合適的 TTS 服務提供商。

## 架構特點

### 1. 提供商抽象
- `BaseTTSProvider` 介面定義了所有 TTS 提供商的標準方法
- 每個提供商實作自己的請求處理和事件數據處理邏輯
- 支援不同提供商的不同 API 格式和回應處理

### 2. 語音映射
`VOICE_MAPPING` 物件將語音 ID 映射到具體的提供商和語音配置：

```typescript
const VOICE_MAPPING = {
  pazu: { provider: TTSProvider.MINIMAX, voiceId: 'book_pazu_v2' },
  phoebe: { provider: TTSProvider.MINIMAX, voiceId: 'phoebe_v1' },
  // 未來可添加更多提供商的語音
  // azure_voice: { provider: TTSProvider.AZURE, voiceId: 'zh-CN-XiaoxiaoNeural' },
}
```

### 3. 提供商工廠
`getTTSProvider()` 函數根據語音 ID 自動選擇和建立合適的提供商實例。

## 目前支援的提供商

### Minimax TTS
- **提供商 ID**: `TTSProvider.MINIMAX`
- **支援的語音**: pazu, phoebe, 0, 1
- **API 格式**: 串流式事件數據，返回十六進制編碼的音訊
- **特點**: 支援發音字典、語言增強、情感設定

### Azure TTS（示例實作）
- **狀態**: 已準備架構，但實作被註釋
- **提供商 ID**: `TTSProvider.AZURE`
- **預期格式**: SSML 格式的請求，二進位音訊回應

## 如何添加新的 TTS 提供商

### 步驟 1: 添加提供商枚舉
```typescript
enum TTSProvider {
  MINIMAX = 'minimax',
  AZURE = 'azure',
  OPENAI = 'openai', // 新提供商
}
```

### 步驟 2: 實作提供商類別
```typescript
class OpenAITTSProvider implements BaseTTSProvider {
  provider = TTSProvider.OPENAI

  getSupportedVoices(): string[] {
    // 返回此提供商支援的語音 ID
  }

  async processRequest(params: TTSRequestParams): Promise<ReadableStream> {
    // 實作 OpenAI TTS API 請求
  }

  processEventData(eventData: string): Buffer | null {
    // 處理 OpenAI TTS API 回應格式
  }
}
```

### 步驟 3: 更新語音映射
```typescript
const VOICE_MAPPING = {
  // 現有語音...
  openai_alloy: { provider: TTSProvider.OPENAI, voiceId: 'alloy' },
  openai_echo: { provider: TTSProvider.OPENAI, voiceId: 'echo' },
}
```

### 步驟 4: 更新提供商工廠
```typescript
function getTTSProvider(voiceId: string): BaseTTSProvider {
  switch (voiceConfig.provider) {
    case TTSProvider.MINIMAX:
      return new MinimaxTTSProvider()
    case TTSProvider.OPENAI:
      return new OpenAITTSProvider() // 新提供商
    // ...
  }
}
```

## 快取機制

快取鍵現在包含提供商資訊，確保不同提供商的相同文本不會互相衝突：

```typescript
// 快取元數據包含提供商資訊
customMetadata: {
  language,
  voiceId: validVoiceId,
  provider: VOICE_MAPPING[validVoiceId].provider,
  text: truncatedText,
  textLength: text.length.toString(),
  createdAt: new Date().toISOString(),
}
```

## 日誌和監控

日誌現在包含提供商資訊，便於監控和除錯：

```
[Speech] User ${userWallet} requested conversion. 
Language: ${language}, Text: "${text}", 
Voice: ${voiceId}, Provider: ${provider}
```

## 向前相容性

- 現有的語音 ID（0, 1, pazu, phoebe）繼續正常工作
- 前端代碼無需更改
- API 介面保持相同

## 未來擴展

1. **動態提供商選擇**: 可根據負載、成本或品質自動選擇提供商
2. **備援機制**: 如果主要提供商失敗，自動切換到備援提供商
3. **A/B 測試**: 同時使用多個提供商進行品質比較
4. **成本優化**: 根據使用量和成本自動選擇最經濟的提供商

## 工具函數

- `getAllSupportedVoices()`: 獲取所有支援的語音及其提供商資訊
- `getTTSProvider(voiceId)`: 根據語音 ID 獲取提供商實例
