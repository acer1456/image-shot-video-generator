# 旁白「產生中文字幕」可選模型 — 設計

## 背景

`NarrationSidebar` 的「產生中文字幕」按鈕呼叫 `translateNarrationCues`，該函式內部寫死使用
`NARRATION_TRANSLATION_MODEL = 'google/gemma-4-31b-it:free'`（`src/lib/openrouter.ts:269`）。
使用者想要能自行選擇翻譯用的 OpenRouter 模型。

## 目標 / 非目標

- 目標：讓「產生中文字幕」可選任意 OpenRouter 文字模型，選擇需持久化（下次開專案沿用）。
- 非目標：不做多套 prompt 設定檔、不做模型效果比較、不改動既有「產生旁白」「AI 攝影機/腳本生成」的模型選擇邏輯（僅重構共用部分，行為不變）。

## 現況

- `fetchOpenRouterModels(apiKey)`（`src/lib/openrouter.ts:59`）固定過濾只回傳
  `architecture.modality` 含 `image` 的視覺模型，因為它原本是給「AI 生成攝影機腳本」（需要讀圖）用的。
- `AiGeneratePanel.tsx` 和 `NarrationAIPanel.tsx` 各自貼了一份幾乎相同的 `ModelCombobox`
  元件（可搜尋、下拉選單、含 API Key 狀態、載入/錯誤狀態），並各自用
  `openrouter_model` / `openrouter_model_name` 這兩個 localStorage key 記住選擇。
- 字幕翻譯不需要視覺能力，若直接套用現有 vision-only 清單會不必要地排除掉大量純文字模型。

## 設計

### 1. `src/lib/openrouter.ts`

- `fetchOpenRouterModels(apiKey: string, opts?: { requireVision?: boolean })`：
  `requireVision` 預設 `true`（維持現有兩處呼叫行為不變）；呼叫端傳
  `{ requireVision: false }` 時回傳完整文字模型清單（不過濾 modality）。
- `translateNarrationCues(apiKey, narrationText, cues, model: string)`：新增第四個參數
  `model`，取代函式內寫死的 `NARRATION_TRANSLATION_MODEL`。常數本身保留匯出，作為
  UI 端的預設值 / fallback。

### 2. 抽出共用元件 `src/components/ModelCombobox.tsx`

現有 `ModelCombobox`（可搜尋下拉、API Key 驅動、載入/錯誤狀態、價格顯示）在
`AiGeneratePanel.tsx` 與 `NarrationAIPanel.tsx` 各有一份幾乎相同的實作。這次是第三個
使用點，直接抽成共用元件避免第三次複製貼上：

- Props：`apiKey`、`selectedId`、`selectedName`、`onSelect`、新增可選
  `requireVision?: boolean`（預設 `true`，往下傳給 `fetchOpenRouterModels`）。
- `AiGeneratePanel.tsx`、`NarrationAIPanel.tsx` 內原本的 `ModelCombobox` 定義刪除，改為
  `import { ModelCombobox } from '@/components/ModelCombobox'`，行為不變（因為預設
  `requireVision = true`）。

### 3. `src/components/panel/NarrationSidebar.tsx`

- 新增 state：
  - `apiKey`：原本只在 `handleTranslate` 內用 `localStorage.getItem('openrouter_api_key')`
    讀一次性字串，改成 component state（初始值來自同一個 localStorage key），才能作為
    prop 傳給 `ModelCombobox`。
  - `translationModel` / `translationModelName`：初始值讀 localStorage
    (`narration_translation_model` / `narration_translation_model_name`)；若無則預設
    `NARRATION_TRANSLATION_MODEL`（from `@/lib/openrouter`）。
  - 選擇變更時寫回對應的 localStorage key（沿用其他面板的 `useEffect` 寫入模式）。
- UI：在「產生中文字幕」按鈕上方/旁加入一個 `ModelCombobox`
  （`requireVision={false}`），樣式比照旁邊既有的小按鈕群（緊湊、`text-xs`）。
- `handleTranslate` 呼叫 `translateNarrationCues(apiKey, narrationText, cues, translationModel)`
  時帶入所選模型；若 `translationModel` 為空字串則 fallback 為
  `NARRATION_TRANSLATION_MODEL`。

## 資料流

```
NarrationSidebar (state: translationModel)
  → ModelCombobox(requireVision=false) → fetchOpenRouterModels(apiKey, {requireVision:false})
  → 使用者選模型 → onSelect(id, name) → setTranslationModel/setTranslationModelName
                                        → localStorage 寫入
  → 點「產生中文字幕」→ handleTranslate → translateNarrationCues(apiKey, text, cues, translationModel)
```

## 錯誤處理

沿用現有模式：
- 沒有 API Key → 沿用 `handleTranslate` 現有檢查（提示先輸入 API Key）。
- 模型清單載入失敗 → `ModelCombobox` 既有的 `fetchStatus === 'error'` 顯示錯誤訊息，不新增邏輯。
- 未選模型（`translationModel` 空字串）→ fallback 用預設常數，不擋按鈕（避免使用者第一次用就卡住）。

## 測試

- 手動驗證：在 NarrationSidebar 開啟模型下拉、切換模型、產生中文字幕、重新整理頁面確認選擇有記住。
- 確認 `AiGeneratePanel` / `NarrationAIPanel` 抽出共用元件後行為不變（vision 過濾清單、選擇/記憶邏輯不受影響）。
