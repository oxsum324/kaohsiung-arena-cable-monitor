# 設計預覽版（Preview）

依弘一工程顧問設計團隊之高保真設計交接稿製作之預覽版本。

## 網址
👉 [https://oxsum324.github.io/kaohsiung-arena-cable-monitor/preview/](https://oxsum324.github.io/kaohsiung-arena-cable-monitor/preview/)

## 狀態

**Push 1**：設計原型上線 · 使用**模擬資料**（來自設計工具之衍生資料，可視作 realistic mock）
**Push 2（本次）**：接入真實 CSV 監測資料 — `cabledata.js` 已由 `generate_cabledata_js.py` 重新產出，
  沿用與現行 Plotly 版完全一致之 F_abs 換算公式與代表值過濾管線（Layer0 物理範圍 → Layer1 F₀ 範圍 →
  固定 σ Z-score 濾波 → Layer2 跨通道一致性 → 取最接近 70% 基準值者為代表值）
**Push 3（規劃）**：驗收通過後併入主分支，取代原 Plotly 版

## 檔案結構
- `index.html` — 主報告頁面（承襲設計原型結構）
- `dc-shim.js` — 相容層：以純 JS 實作 React.createRef + DCLogic + 模板引擎，取代原設計工具之 support.js
- `cabledata.js` — 監測資料集（Push 2 起為真實資料，`window.CABLE_DATA` 全域；產生腳本見 `../../generate_cabledata_js.py`）
- `assets/` — 品牌 logo（弘一工程顧問）

## 與現行版本之比較

| 項目 | 現行版本（`/index.html`） | 預覽版本（`/preview/`）|
|---|---|---|
| 資料來源 | ✅ 真實 CSV | ✅ 真實 CSV（Push 2 起）|
| 視覺調性 | Plotly 藍框 | 弘一 CI（深藍 + 紅重點）|
| 章節數 | 16 章 | 10 章（更聚焦）|
| 特色 | 完整資料展示 | 內部儀表板 + 預警系統（mission-control 深色）＋線性回歸趨勢預估 |
| 列印 / PDF | — | 專屬版面（A4 分頁）|

## ⚠️ Push 2 資料重跑後之工程發現（非部署問題，請留意）

以真實資料重新計算後，**RX7 鋼索代表值現況為設計值之 64.2%**，已低於 67% 行動值門檻，落入「行動區間·規劃補拉」。
此結果與現行 Plotly 版採用相同運算邏輯，屬既有資料之再確認，非本次介面異動所致。詳見對話回覆說明。
