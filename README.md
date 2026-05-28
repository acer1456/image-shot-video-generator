# 9:16 畫作鏡頭影片產生器

> 將靜態圖片轉化為具備鏡頭路徑與字幕疊加的 9:16 直式短影片。

---

## 功能概覽

- **鏡頭路徑編輯**：在圖片上自由設定多個鏡頭定格點，控制每段的縮放（Zoom）、移動方式（滑動 / 直接跳）、移動秒數與停留秒數
- **時間軸（Timeline）**：視覺化拖拉時間軸，即時預覽鏡頭順序與時間分配
- **字幕疊加**：為每個鏡頭定格點加入主標題與副標題，支援多種中英文字型、文字陰影、位置與縮放控制
- **平台安全區預覽**：可切換 Instagram Reels、YouTube Shorts、TikTok 安全區顯示，確保字幕不被 UI 遮擋
- **影片匯出**：直接在瀏覽器端以 Canvas + MediaRecorder 輸出 1080×1920（9:16）MP4 影片
- **專案儲存 / 讀取**：以 JSON 格式匯出 / 匯入完整專案設定，支援版本化向下相容遷移
- **PWA 支援**：可安裝至桌面或行動裝置離線使用
- **深色 / 淺色主題**：使用 `next-themes` 切換，系統主題跟隨

---

## 技術架構

| 層級 | 技術 |
|------|------|
| 框架 | React 19 + TypeScript 5.8 |
| 建置 | Vite 6 |
| 樣式 | Tailwind CSS 3 |
| UI 元件 | Radix UI Primitives |
| 圖示 | lucide-react |
| 時間軸 | @xzdarcy/react-timeline-editor |
| Canvas 渲染 | Native HTML Canvas API |
| 輸出格式 | 1080 × 1920 px（9:16） |
| PWA | vite-plugin-pwa（Workbox generateSW） |

---

## 快速開始

### 環境需求

- Node.js ≥ 18
- npm ≥ 9

### 安裝與啟動

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev
```

開啟瀏覽器前往 `http://localhost:5173`

### 建置

```bash
npm run build
```

產出檔案位於 `dist/`。

### 預覽 Production Build

```bash
npm run preview
```

---

## 專案結構

```
src/
├── App.tsx                  # 頂層狀態協調、預覽 / 渲染流程、存讀檔
├── main.tsx                 # 應用進入點
├── components/
│   ├── CanvasEditor.tsx     # 畫布互動（拖拉、縮放、字幕 T 鍵、刪除 X）
│   ├── CameraPanel.tsx      # 鏡頭清單、拖排序、縮圖、逐點編輯
│   ├── TimelinePanel.tsx    # 時間軸 UI、播放控制、秒數編輯
│   ├── CaptionEditor.tsx    # 字幕內容與樣式控制
│   └── AssistPanel.tsx      # 背景、安全區、輔助線切換
├── hooks/
│   └── useAppStore.ts       # 全域狀態 + mutation helpers（純 useState）
├── lib/
│   ├── canvas.ts            # 所有 Canvas 繪製邏輯（縮圖、預覽、匯出）
│   ├── utils.ts             # 常數、數學工具函式
│   └── chinese.ts           # 繁簡轉換（opencc-js）
└── types/
    └── index.ts             # 共用 TypeScript 型別定義
```

---

## 使用流程

1. **上傳圖片** — 支援拖放或點擊上傳（JPG / PNG / WebP）
2. **新增鏡頭點** — 在鏡頭面板點擊「＋」新增定格點；拖拉調整順序
3. **設定構圖** — 在 Canvas 上拖拉方框決定鏡頭位置與縮放
4. **編輯時間** — 在時間軸拖拉調整各段移動與停留秒數
5. **加入字幕** — 點擊 Canvas 右上角「T」進入字幕模式，輸入文字並調整樣式
6. **預覽** — 點擊播放按鈕即時預覽完整鏡頭動線
7. **匯出影片** — 點擊「匯出影片」輸出 MP4

---

## 字型支援

預載以下 Google Fonts，可直接於字幕設定中選用：

- **中文**：Noto Sans TC、Noto Serif TC
- **無襯線**：Noto Sans、Roboto
- **襯線 / 展示**：Playfair Display、Cormorant Garamond、DM Serif Display、Spectral、Cinzel
- **手寫**：Great Vibes

---

## 授權

本專案為私有專案（`"private": true`），未對外開放授權。
