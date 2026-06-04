執行新功能開發工作流程。要開發的功能：$ARGUMENTS

## 工作流程

### 1. 準備階段
- 若 $ARGUMENTS 未說明需求，先詢問要做什麼功能
- 確認需求範圍清晰（若未做過需求分析，先執行 /requirements）
- 讀取相關程式碼結構，找出需要修改的檔案
- 列出實作計畫與順序

### 2. 實作順序（後端優先）

推薦順序：**Database → Rust API → API Client → Frontend**

#### Backend (Rust)
- [ ] 修改/新增 database schema（`rust/infrastructure/db/migrations/`）
- [ ] 建立 SeaORM entity 與 migration
- [ ] 在 `rust/domain/core/` 新增 domain logic
- [ ] 在 `rust/services/user-api/` 或 `rust/services/cms-api/` 新增 API endpoint
- [ ] 若有新 service，加入 `/health` endpoint

#### Frontend
- [ ] 在 `packages/api-client/` 新增/修改 API 呼叫
- [ ] 在 `packages/types/` 更新型別（若 Rust API 有變更，執行 `specta gen`）
- [ ] 在 `packages/ui/` 新增 Tamagui component（跨平台）
- [ ] 在 `packages/features/` 新增 Solito hook（共用業務邏輯）
- [ ] 在 `apps/user/web/` 或 `apps/admin/web/` 新增 page/route
- [ ] 串接 API

### 3. 每個階段完成後
- 回報進度，說明完成了什麼
- 如遇到不確定的設計決策，先詢問用戶

### 4. 完成驗證
實作完成後執行品質閘門：
- `pnpm lint` 或 `just lint`
- TypeScript typecheck
- `pnpm build`
- `just smoke`（如服務正在執行）

## 程式碼風格
- 使用現有的程式碼結構與命名慣例
- 遵循 packages 間的依賴關係（`@repo/ui`、`@repo/api-client`、`@repo/features`）
- 避免過度設計，不確定的設計先詢問

## Commit 訊息格式
```
feat(scope): 簡短描述

- 具體變更項目 1
- 具體變更項目 2
```
