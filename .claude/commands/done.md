執行完成品質閘門清單，確認任務可以收工。

## 品質閘門

依序執行以下檢查，每項回報結果（pass / fail / skipped）：

### 1. Lint
執行 `pnpm lint` 或 `just lint`，確認無 lint 錯誤。

### 2. TypeScript Typecheck
執行 `pnpm typecheck` 或確認無 TypeScript 型別錯誤。
若專案沒有 typecheck script，直接確認相關檔案無 TS 錯誤。

### 3. Build
執行 `pnpm build`，確認 build 通過。

### 4. Smoke Test（若服務正在執行）
執行 `just smoke`，確認各服務健康狀態正常。
若服務未啟動，標記為 skipped。

### 5. 程式碼品質確認
- 確認無 hardcoded secrets 或 API keys
- 確認無 `console.log` 留在 production 程式碼中
- 確認無 build artifacts 被追蹤（`.next/`、`dist/`、`target/`）

### 6. Git 狀態
執行 `git status`，確認：
- 所有預期的變更都已 staged
- 無意外的未追蹤或已修改檔案

## 輸出格式

```
## 完成確認

- [x] Lint: pass
- [x] Typecheck: pass
- [x] Build: pass
- [x] Smoke: pass / skipped
- [x] 程式碼品質: 通過
- [x] Git 狀態: 確認

任務完成，可以 commit。
```

若有任何項目 fail，說明原因並修復後再回報。
