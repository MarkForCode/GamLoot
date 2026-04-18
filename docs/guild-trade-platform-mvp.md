# 遊戲交易平台（多遊戲 / 多公會）MVP 規格草案

## 1. 目標與定位

本文件將平台定義為「多租戶（Multi-tenant）公會交易營運系統」，不只是單純拍賣站。

- 服務對象：遊戲平台方、伺服器社群、公會會長、聯盟管理者與幹部。
- 商業模式：會長申請試用（5 人），再升級 20 / 50 / 300 人方案。
- 核心價值：交易流程 + 權限控管 + 審核 + 分潤結算 + 公會資產管理 + 稽核記錄。
- 支援情境：單一公會交易、跨公會聯盟交易、遊戲平台級市場、官方後台監管。

---

## 2. 產品範圍與優先級

### 2.1 必做功能（P0）

1. **公會試用申請與租戶建立**
   - 會長輸入公會資訊與 email 完成申請。
   - 建立 tenant、guild、owner 身分。
   - 預設方案：Trial（5 seats）。

2. **成員邀請與登入啟用**
   - 會長透過 email 邀請成員。
   - 系統發送一次性邀請連結 + 臨時憑證。
   - 首次登入強制改密碼。

3. **公會佈告欄**
   - 發佈公告、置頂、可見範圍（全員 / 幹部 / 指定 role）。
   - 已讀追蹤。

4. **商品拍賣 / 一般交易**
   - 單品與多品項 listing。
   - 交易模式：一般交易 / 競標。
   - 競標模式：明標 / 暗標。
   - 可見範圍：公會內 / 聯盟內 / 遊戲平台內 / 指定對象。
   - 投標資格：不限 / 指定公會 / 指定聯盟 / 指定成員 / 指定 role。
   - 支援交易保證金，得標或違約時依規則處理。

5. **交易留言與審核**
   - 商品留言、審核備註。
   - 交易狀態流轉（draft -> pending_approval -> active -> matched -> completed）。
   - 高價、跨公會、含保證金交易可要求二次審核。

6. **基礎分潤與捐給公會**
   - 上架時可設定分潤比例。
   - 交易完成產生 settlement，依比例配發。
   - 賣家可將固定比例或固定金額捐給公會金庫。

7. **遊戲內多幣別**
   - 同一遊戲可有多種幣別，例如金幣、鑽石、點券、材料代幣。
   - Listing、訂單、保證金、分潤、金庫流水皆需指定 currency。
   - MVP 不做跨幣別匯率換算，只記錄幣別與數量。

8. **公會資產管理**
   - 公會金庫：記錄幣別餘額、捐款、分潤收入、支出。
   - 公會倉庫：記錄道具庫存、來源、持有人或保管人。
   - 目前待售清單：公會資產中已上架但尚未售出的商品。

9. **訂貨系統（單次）**
   - 建立需求單。
   - 供應方接單。
   - 審核與完成。

10. **官方後台管理**
    - 管理 tenant、game、guild、plan、trial request。
    - 查詢交易、金庫、倉庫、保證金、爭議與 audit log。
    - 支援停權、凍結交易、凍結公會、調整方案。

11. **Audit Log**
    - 記錄關鍵行為：建立交易、審核、分潤調整、捐款、保證金、金庫異動、成員管理、官方後台操作。

### 2.2 次要功能（P1, Next）

- 自訂角色群組（類 AWS IAM 簡化版）。
- 長期供應合約。
- 抽獎活動。
- Discord / LINE 通知。
- 爭議處理流程。
- 公會金庫與倉庫盤點報表。

### 2.3 後續功能（P2）

- 價格歷史與市場行情。
- 信用評價與風控分數。
- 跨公會聯盟管理。
- 白標與自訂網域。
- API / Webhook。
- 多幣別匯率與估值報表。

---

## 3. 方案與人數限制

| Plan Code | 名稱 | Seat 上限 | 說明 |
|---|---:|---:|---|
| trial | Trial | 5 | 申請後立即可用 |
| starter | Starter | 20 | 小型公會 |
| guild_pro | Guild Pro | 50 | 活躍公會 |
| alliance | Alliance | 300 | 大型聯盟 |

> MVP 先實作 seats 上限控制，付款與計費流程於下一階段補齊。

建議的方案差異：

- Trial：限制 5 人、少量 listing、基礎公告與交易。
- Starter：開放一般交易、明標拍賣、基礎金庫。
- Guild Pro：開放暗標、指定投標資格、保證金、分潤規則。
- Alliance：開放聯盟範圍交易、跨公會管理、進階報表。

---

## 4. 多租戶資料邊界

所有業務資料必須帶入：

- `tenant_id`（遊戲平台 / 營運單位）
- `game_id`（遊戲）
- `guild_id`（公會）
- `alliance_id`（聯盟，可為空）
- `created_by` / `approved_by`

資料隔離原則：

1. 查詢預設必須帶 tenant 篩選。
2. 公會層資料必須同時帶 guild 篩選。
3. 聯盟層資料必須確認該 guild 屬於 alliance。
4. 官方後台需具備跨 tenant 權限才可查全域。
5. 官方後台操作必須全部寫入 audit log。

---

## 5. 角色與權限（MVP 版）

預設角色：

- `platform_admin`
- `tenant_admin`
- `guild_owner`
- `guild_officer`
- `guild_treasurer`
- `guild_warehouse_manager`
- `guild_member`

MVP 權限集合：

- `notice:manage`
- `member:invite`
- `member:role_manage`
- `listing:create`
- `listing:approve`
- `listing:bid`
- `listing:restrict_bidders`
- `order:create`
- `order:approve`
- `settlement:approve`
- `treasury:view`
- `treasury:manage`
- `warehouse:view`
- `warehouse:manage`
- `deposit:manage`
- `lottery:manage`
- `admin:tenant_manage`
- `admin:guild_manage`
- `admin:trade_moderate`

權限設計原則：

1. 一般成員只能建立交易、投標、留言與查看自己可見的資料。
2. 幹部可審核 listing / order。
3. 財務可審核分潤、捐款、金庫支出與保證金退還。
4. 倉庫管理者可維護公會倉庫與待售清單。
5. 官方後台權限與公會權限分離。

---

## 6. 交易與拍賣規格

### 6.1 Listing 類型

- `fixed_price`：一般定價交易。
- `auction_open_bid`：明標拍賣，投標金額公開。
- `auction_sealed_bid`：暗標拍賣，截止後才揭露得標結果。
- `guild_donation_sale`：出售後部分或全部捐給公會。

### 6.2 商品與數量

- 支援單一商品。
- 支援複數商品。
- 支援套裝商品。
- 支援可拆售商品。
- 每個品項需指定 game item、quantity、currency、price 或起標價。

### 6.3 可見範圍與投標資格

可見範圍（visibility）：

- `guild_only`：只限本公會。
- `alliance_only`：只限聯盟。
- `tenant_market`：遊戲平台內市場。
- `invite_only`：指定人員。

投標資格（bid eligibility）：

- 不限制。
- 限定指定 guild。
- 限定指定 alliance。
- 限定指定 users。
- 限定指定 roles。
- 可組合多個條件，例如「聯盟內 + 財務 role + 指定 3 人」。

資格檢查必須在以下時機執行：

1. 查看 listing 詳情。
2. 留言。
3. 出價或購買。
4. 成交前重新檢查，避免成員被移除後仍得標。

### 6.4 交易保證金

保證金用途：

- 避免惡意投標。
- 避免得標後不交易。
- 避免賣家上架後反悔。

保證金規則：

- 可針對買家、賣家或雙方要求保證金。
- 保證金指定幣別與金額。
- 未得標者自動退還。
- 得標後可轉為交易款項的一部分，或完成交易後退還。
- 違約時可沒收並分配給公會金庫、受害方或平台。

MVP 先做「記帳型保證金」，不串接真實金流。

### 6.5 拍賣流程

```text
draft
  -> pending_approval
  -> active
  -> bidding
  -> ended
  -> matched
  -> trade_review
  -> completed
  -> settled
```

明標：

- 投標紀錄顯示投標者與金額。
- 可設定是否隱藏投標者名稱，只顯示金額。

暗標：

- 截止前只顯示投標人是否已投標，不公開金額。
- 截止後依規則選出最高價。
- 若同價，可依最早投標、抽籤或管理員裁定處理。

---

## 7. 訂貨系統規格

### 7.1 訂貨流程

```text
draft
  -> pending_approval
  -> open
  -> accepted
  -> delivered
  -> completed
  -> settled
```

### 7.2 訂單類型

- `one_time`：單次需求。
- `recurring`：長期供應，P1。
- `guild_procurement`：公會採購，可由公會金庫付款。

### 7.3 訂單限制

- 可限制供應者為本公會、聯盟、指定成員或指定 role。
- 可要求供應者保證金。
- 可設定完成後是否捐贈部分收益給公會。

---

## 8. 分潤、捐款與結算

### 8.1 分潤

分潤設定時機：

- 上架時設定。
- 交易完成前補申請。
- 幹部要求補分潤。
- 公會套用預設分潤規則。

分潤方式：

- 百分比。
- 固定金額。
- 混合模式。
- 指定成員、role、公會金庫或平台帳戶。

### 8.2 捐給公會

捐款來源：

- Listing 成交後自動捐款。
- 訂單完成後自動捐款。
- 成員手動捐款。
- 違約保證金轉入公會金庫。

捐款必須產生：

- 金庫流水。
- settlement recipient。
- audit log。

### 8.3 多幣別結算

結算限制：

- 每筆 settlement 可包含多個 currency。
- 同一 recipient 可收到不同 currency。
- MVP 不自動換算幣別。
- 後台報表需依 currency 分組顯示。

---

## 9. 公會金庫、倉庫與待售清單

### 9.1 公會金庫

用途：

- 記錄公會各幣別餘額。
- 記錄交易分潤、捐款、保證金沒收、採購支出。
- 支援人工調整，但必須要求原因與 audit log。

金庫流水類型：

- `donation`
- `profit_share`
- `deposit_hold`
- `deposit_release`
- `deposit_forfeit`
- `purchase_payment`
- `manual_adjustment`

### 9.2 公會倉庫

用途：

- 管理公會持有的道具或資源。
- 記錄來源交易、捐贈者、保管人、數量與狀態。
- 可從倉庫直接建立待售 listing。

倉庫狀態：

- `available`
- `reserved`
- `listed`
- `sold`
- `removed`

### 9.3 目前待售清單

待售清單需顯示：

- 商品名稱、數量、幣別、價格或起標價。
- Listing 類型。
- 可見範圍。
- 投標資格摘要。
- 保證金要求。
- 上架人與審核人。
- 剩餘時間。

---

## 10. 抽獎活動（P1）

抽獎可作為公會活動、捐款回饋或官方活動工具。

### 10.1 抽獎類型

- 免費抽獎：符合資格即可參加。
- 捐款抽獎：捐給公會後取得抽獎資格。
- 交易回饋抽獎：完成交易後取得抽獎資格。
- 限定名單抽獎：指定成員、role、公會或聯盟可參加。

### 10.2 抽獎限制

- 可限制參加資格：公會、聯盟、指定人、指定 role。
- 可限制每人參加次數。
- 可設定獎品為遊戲道具、幣別、倉庫物品或文字獎項。
- 抽獎結果必須可稽核。

### 10.3 抽獎流程

```text
draft
  -> pending_approval
  -> open
  -> closed
  -> drawn
  -> prize_claimed
```

---

## 11. 官方後台管理

官方後台使用者是平台營運方，不等同於公會幹部。

### 11.1 後台功能

- Tenant / game / guild 管理。
- Trial request 審核。
- Plan 與 seat 上限調整。
- 官方公告。
- 全域交易查詢。
- Listing / order / lottery / settlement 查詢。
- 金庫、倉庫、保證金紀錄查詢。
- 爭議與檢舉處理。
- 凍結帳號、凍結公會、凍結交易。
- Audit log 查詢與匯出。

### 11.2 後台原則

1. 官方後台操作不可繞過 audit log。
2. 官方可凍結交易，但不得直接刪除交易歷史。
3. 金庫與倉庫調整必須填寫原因。
4. 敏感操作需要二次確認或更高權限。

---

## 12. MVP 資料模型（與 migration 對應）

本階段建議新增或預留資料表：

- `tenants`
- `games`
- `game_currencies`
- `game_items`
- `plans`
- `guilds`
- `alliances`
- `alliance_guilds`
- `users`（補 tenant / guild 與強制改密碼欄位）
- `subscriptions`
- `trial_requests`
- `guild_invitations`
- `roles`
- `permissions`
- `role_permissions`
- `member_roles`
- `guild_notices`
- `guild_notice_reads`
- `listings`
- `listing_items`
- `listing_visibility_rules`
- `listing_bid_eligibility_rules`
- `listing_bids`
- `listing_comments`
- `trade_deposits`
- `trade_settlements`
- `trade_settlement_recipients`
- `guild_treasury_accounts`
- `guild_treasury_ledger_entries`
- `guild_warehouse_items`
- `guild_warehouse_movements`
- `orders`
- `order_items`
- `order_comments`
- `lotteries`
- `lottery_entries`
- `lottery_prizes`
- `lottery_draw_results`
- `admin_actions`
- `audit_logs`

MVP 可先完整實作交易、幣別、金庫與保證金的「記帳資料模型」，實際支付、匯率、外部金流於後續階段補齊。

---

## 13. 第一階段實作項目（開始製作）

### Sprint 0（本次提交）

- [x] 建立 MVP 規格文件（本文件）
- [x] 新增 SQL migration：多租戶 + 公會 + 方案 + 試用 + 基礎交易模型
- [x] 將 README 補上文件導覽入口

### Sprint 1（下一步）

- [ ] Rust service 讀取新 schema（entity + repository）
- [ ] Trial 申請 API（create / approve）
- [ ] 邀請成員 API（invite / accept）
- [ ] Listing 建立與審核 API
- [ ] 明標 / 暗標 bidding API
- [ ] 投標資格檢查
- [ ] Settlement 結算邏輯
- [ ] Guild treasury ledger 基礎寫入

### Sprint 2

- [ ] 保證金 hold / release / forfeit 流程
- [ ] 公會倉庫與待售清單
- [ ] 官方後台查詢與凍結操作
- [ ] 訂貨系統 API
- [ ] 抽獎活動 API

---

## 14. 驗收標準（MVP）

1. 會長可申請 trial 並建立公會。
2. Trial 公會成員超過 5 人時，邀請失敗並返回明確錯誤。
3. 幹部可審核 listing；一般成員不可。
4. Listing 可設定明標或暗標。
5. Listing 可限制投標者為公會、聯盟、指定成員或指定 role。
6. 未符合資格的使用者不可查看、留言、投標或成交。
7. 交易可指定遊戲內幣別，且 settlement 依幣別分組。
8. 交易完成後可產生 settlement 與 recipients 明細。
9. 捐給公會會寫入公會金庫流水。
10. 保證金可被記錄、退還或沒收，且每次異動都有 audit log。
11. 公會可查看金庫、倉庫與目前待售清單。
12. 官方後台可查詢公會、交易、金庫、倉庫與保證金紀錄。
13. 所有上述操作都有 audit log。

