# Skill: 重構優化

## 觸發條件
用戶說「重構」、「優化」、「整理程式碼」、「改寫」、「refactor」

## 工作流程

### 1. 理解現狀
- [ ] 了解要重構的原因 (效能、維護性、可讀性)
- [ ] 理解現有程式碼邏輯
- [ ] 確認重構範圍
- [ ] 列出受影響的檔案

### 2. 規劃
- [ ] 評估重構複雜度
- [ ] 確認重構後的目標
- [ ] 確認現有測試覆蓋範圍
- [ ] 規劃步驟 (小步前進)

### 3. 執行重構
- [ ] 先確保現有功能正常運作
- [ ] 每次只改一個小部分
- [ ] 保持功能不變 (除非明確要求)
- [ ] 頻繁測試

### 4. 驗證
- [ ] 執行所有現有測試
- [ ] 執行 `pnpm lint`
- [ ] 執行 `pnpm build`
- [ ] 手動測試功能正常

### 5. 完成
- [ ] 確認重構目標達成
- [ ] 說明改動內容
- [ ] 討論後續優化可能

## 重構類型

### 程式碼風格 (Naming, Formatting)
- 改 variable/function 命名
- 格式化排版
- 遵循專案 convention

### 架構重構 (Architecture)
- 拆分大檔案
- 建立共享模組
- 改善 module 依賴

### 效能優化 (Performance)
- 優化資料庫查詢
- 快取處理
- 減少不必要的計算

### 技術債 (Tech Debt)
- 移除 dead code
- 補齊型別
- 更新依賴版本

## 重要原則
- **小步前進** - 每次只改一點
- **保持功能** - 不破壞現有行為
- **頻繁驗證** - 改了之後馬上測試
- **有疑問就問** - 不要假設

## Commit 訊息範例
```
refactor(auth): extract token validation to helper function

- Move token parsing logic to utils/auth.ts
- Simplify main handler code
- No behavior change
```