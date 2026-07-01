# 設計預覽版（Preview）

依弘一工程顧問設計團隊之高保真設計交接稿製作之預覽版本。

## 網址
👉 [https://oxsum324.github.io/kaohsiung-arena-cable-monitor/preview/](https://oxsum324.github.io/kaohsiung-arena-cable-monitor/preview/)

## 狀態

**Push 1（本次）**：設計原型上線 · 使用**模擬資料**（來自設計工具之衍生資料，可視作 realistic mock）
**Push 2（規劃）**：接入真實 CSV 監測資料
**Push 3（規劃）**：驗收通過後併入主分支，取代原 Plotly 版

## 檔案結構
- `index.html` — 主報告頁面（承襲設計原型結構）
- `dc-shim.js` — 相容層：以純 JS 實作 React.createRef + DCLogic + 模板引擎，取代原設計工具之 support.js
- `cabledata.js` — 監測資料集（現階段為模擬值，`window.CABLE_DATA` 全域）
- `assets/` — 品牌 logo（弘一工程顧問）

## 與現行版本之比較

| 項目 | 現行版本（`/index.html`） | 預覽版本（`/preview/`）|
|---|---|---|
| 資料來源 | ✅ 真實 CSV | ⚠️ 模擬（Push 2 接真實）|
| 視覺調性 | Plotly 藍框 | 弘一 CI（深藍 + 紅重點）|
| 章節數 | 16 章 | 10 章（更聚焦）|
| 特色 | 完整資料展示 | 內部儀表板 + 預警系統（mission-control 深色）|
| 列印 / PDF | — | 專屬版面（A4 分頁）|
