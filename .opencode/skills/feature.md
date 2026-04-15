# Skill: 新功能開發

## 觸發條件
用戶說「要做OO功能」且已確認需求，準備開始實作

## 工作流程

### 1. 準備階段
- [ ] 確認需求範圍清晰
- [ ] 檢查現有程式碼結構
- [ ] 規劃實作順序
- [ ] 列出需要修改的檔案

### 2. 實作階段

#### Backend (Rust)
- [ ] 修改/新增 database schema
- [ ] 建立 SeaORM migration (如需)
- [ ] 新增 API endpoint
- [ ] 新增 business logic
- [ ] 加入 `/health` endpoint (如有新 service)

#### Frontend
- [ ] 新增/修改 API client (packages/api-client)
- [ ] 新增 component (packages/ui)
- [ ] 新增 feature hook (packages/features)
- [ ] 新增 page/route
- [ ] 串接 API

### 3. 測試與驗證
- [ ] 本地手動測試功能
- [ ] 執行 `pnpm lint`
- [ ] 執行 `pnpm build`
- [ ] 執行 `just smoke` (如適用)
- [ ] 檢查 edge cases

### 4. 完成
- [ ] 確保 lint/build/pass
- [ ] 確認功能正常運作
- [ ] 匯報完成進度

## 實作順序建議

### 從後往前 (Back-end First)
1. Database → 2. Rust API → 3. API Client → 4. Frontend

### 從前往後 (Front-end First)
1. UI → 2. API Client → 3. Rust API → 4. Database

推薦: **從後往前** - 先確認 API 可用，前端較好開發

## 程式碼風格
- 使用現有的程式碼結構
- 遵循 packages 間的依賴關係
- 不確定的風格問題先問
- 避免过度设计

## Commit 訊息範例
```
feat(auth): add user login endpoint

- POST /auth/login with email/password
- Returns JWT token on success
- Validates credentials against database
```