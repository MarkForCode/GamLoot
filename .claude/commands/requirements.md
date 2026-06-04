執行需求分析工作流程。用戶要分析的功能描述：$ARGUMENTS

## 工作流程

### 1. 理解需求
- 若 $ARGUMENTS 為空，先詢問要做什麼功能
- 確認功能範圍（scope）
- 了解目標使用者（user）
- 確認商業價值（why now）
- 搜尋並讀取現有相關程式碼，找出已有哪些相關功能

### 2. 技術評估
- 檢查現有架構是否支援（讀取相關的 Rust service / frontend package）
- 確認需要新增哪些元件（database schema、API endpoint、UI component）
- 評估複雜度：簡單 / 中等 / 複雜
- 估算工作量

### 3. 輸出需求清單
用以下格式整理需求：

```
## 需求分析：[功能名稱]

### Must Have
- [ ] 核心需求項目

### Nice to Have
- [ ] 優化項目

### Out of Scope
- 這次不做的事項
```

### 4. 技術規格草稿
- 資料庫 schema 變更（如需）
- API endpoint 設計（method、路徑、request/response 格式）
- 前端 component 規劃（哪個 package 新增、哪個 page 修改）

### 5. 確認
- 輸出需求分析總結
- **等待用戶確認**，不要自行開始實作

## 輸出格式範例

```
## 需求分析總結

**功能**: 用戶登入系統
**優先**: 高
**複雜度**: 中等

### 技術需求
- 資料表: users（已存在）
- API: POST /auth/login
- Frontend: 登入頁面 + 認證狀態管理

### 下一步
確認後可執行 /feature 開始實作
```

## 重要原則
- 沒聽懂就問，不要假設需求
- 先問清楚再規劃，避免方向錯誤
- 複雜功能才需要詳細技術規格，簡單功能快速確認即可
