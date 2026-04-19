# 遊戲交易平台（多遊戲 / 多公會）MVP 規格與操作手冊

## 文件導讀

這份文件同時作為產品規格、工程對齊文件與 MVP 驗收手冊。

- 想快速理解產品：先看「目前版本功能介紹」與「核心操作流程」。
- 想確認權限、交易、金庫、倉庫、後台規則：看第 5 到第 12 節。
- 想串接或測試 API：看「已實作 API 端點」。
- 想跑本機驗收：看「本機操作與 Smoke Test」。

---

## 目前版本功能介紹

目前 MVP 已經不是單頁 prototype，而是拆成前台市場、登入頁、商品詳情、賣家中心與官方後台的基本產品流程。

### 使用者前台

- **市場瀏覽**：查看目前可交易 listing，支援商品卡片、狀態、價格與商品 ID 顯示。
- **登入入口**：提供買家與賣家切換操作身分，讓測試流程可以模擬不同 actor。
- **商品詳情**：查看單一 listing，買家可進入出價或購買流程。
- **出價流程**：買家對 active listing 出價，後端會檢查 visibility、eligibility、權限與幣別。

### 賣家中心

- **建立拍賣 / 商品**：賣家可建立 draft listing。
- **商品管理**：查看自己或公會相關 listing 狀態。
- **審核上架**：具權限者可將 draft / pending listing 啟用。
- **結算流程**：可依 winning bid 建立 settlement，並把捐款或分潤寫入公會金庫。

### 官方後台

- **後台登入**：平台行政人員需使用獨立後台登入流程，不可依賴前台測試 actor。
- **行政帳號管理**：超級管理員可新增、停用、重設密碼與管理行政人員。
- **後台權限管理**：依平台角色控制 trial 審核、交易監管、爭議處理、帳號凍結與系統設定。
- **Trial 審核**：平台方可載入 trial request queue 並核准申請。
- **Listing 監管**：平台方可查看 tenant 下的 listing 清單。
- **凍結交易**：每筆 listing 旁有明確的 `Freeze #ID` 動作，會建立二次確認 token 後執行 freeze。
- **稽核前提**：敏感操作必須寫入 `admin_actions` 與 `audit_logs`。

### 目前本機服務

| 服務 | 位址 | 說明 |
|---|---:|---|
| User Web | `http://localhost:3000` | 前台市場、登入、商品詳情、賣家中心 |
| Admin Web | `http://localhost:3001` | 官方後台操作 console |
| User API | `http://localhost:8080` | 使用者、公會、交易、金庫、倉庫 API |
| CMS API | `http://localhost:8081` | 官方後台審核、查詢、凍結 API |

---

## 核心操作流程

### 流程 A：會長申請試用與官方審核

1. 會長提交 trial request，包含 email、申請人、公會名稱與 tenant 名稱。
2. 官方後台打開 `http://localhost:3001`。
3. 點擊 `Load queue` 載入待審申請。
4. 選取 trial request。
5. 點擊 `Approve selected trial`。
6. 系統建立 tenant、guild、owner user、trial subscription、guild member 與 owner role。
7. 審核結果顯示為 `approved`，並寫入 audit log。

### 流程 B：賣家建立商品並上架

1. 賣家進入 `http://localhost:3000/zh-TW/seller/listings`。
2. 建立 listing，輸入標題、描述、交易模式、幣別、起標價或直購價。
3. Listing 先進入 `draft`。
4. 具 `listing:approve` 權限的角色審核 listing。
5. 審核通過後 listing 變成 `active`，前台市場可看到商品。

### 流程 C：買家瀏覽、登入、出價

1. 買家進入 `http://localhost:3000/zh-TW/market`。
2. 從商品卡片進入 listing detail。
3. 若尚未登入，先進入 `http://localhost:3000/zh-TW/login`。
4. 買家送出 bid。
5. User API 檢查以下條件：
   - listing 是否 active。
   - 買家是否具備 `listing:bid` 權限。
   - visibility 與 eligibility rule 是否允許。
   - 出價幣別與金額是否符合規則。
6. 出價成功後寫入 `listing_bids`。

### 流程 D：得標、結算與公會捐款

1. Listing 結束後，具 `settlement:approve` 權限者執行 settle。
2. 系統選出 winning bid。
3. 建立 `trade_settlements` 與 `trade_settlement_recipients`。
4. 若 listing 設定捐給公會，系統寫入 `guild_treasury_ledger_entries`。
5. Audit log 記錄 settlement 與金庫異動。

### 流程 E：官方凍結異常交易

1. 官方後台打開 `http://localhost:3001`。
2. 行政人員先登入後台。
3. 系統依行政角色載入可用功能。
4. 點擊 `Load listings` 載入 tenant listing。
5. 找到目標 listing。
6. 點擊該列的 `Freeze #ID`。
7. Admin Web 先呼叫 `POST /admin-action-confirmations` 建立一次性確認 token。
8. Admin Web 再呼叫 `POST /listings/:listing_id/freeze`。
9. Listing 狀態變成 `frozen`。
10. 系統寫入 `admin_actions` 與 `audit_logs`。

### 流程 F：新增行政人員與權限管理

1. `platform_admin` 登入官方後台。
2. 進入「行政人員管理」。
3. 新增行政帳號，輸入 email、姓名、初始角色與可管理 tenant 範圍。
4. 系統建立行政人員並產生一次性啟用連結或臨時密碼。
5. 新行政人員首次登入後必須重設密碼。
6. `platform_admin` 可調整行政角色，例如 `platform_operator` 或 `platform_support`。
7. 每次新增、停用、角色調整、重設密碼都必須寫入 audit log。

---

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

### 11.1 後台登入與 Session

後台必須有獨立登入系統，不可只靠前端 hard-coded actor 或 query string 切換身分。

登入要求：

- 使用 email / username + password 登入。
- 密碼必須以安全雜湊儲存，不可存明文或固定測試 hash。
- 首次登入、重設密碼後必須強制改密碼。
- 登入成功後發放後台 session 或 JWT。
- Session 需包含 admin user id、角色、tenant scope 與過期時間。
- 登出後 session 立即失效。
- 多次登入失敗需暫時鎖定或增加冷卻時間。
- 敏感操作可要求重新輸入密碼或二次確認 token。

後台登入流程：

```text
login
  -> password_verified
  -> session_created
  -> require_password_reset? 
  -> admin_dashboard
```

### 11.2 行政人員管理

`platform_admin` 可管理後台行政人員。

功能：

- 新增行政人員。
- 停用 / 啟用行政人員。
- 重設行政人員密碼。
- 指派與移除角色。
- 限制可管理 tenant / guild 範圍。
- 查看行政人員最近登入時間與最近操作紀錄。
- 強制登出特定行政人員的所有 session。

新增行政人員時需填寫：

- email。
- display name。
- 初始角色。
- tenant scope：全域、指定 tenant、只讀查詢。
- 備註或建立原因。

安全限制：

- `platform_admin` 不可停用自己最後一個 `platform_admin` 權限。
- 權限調整必須由具備 `admin_user.manage` 權限者執行。
- 角色提升必須寫入 audit log。
- 重設密碼必須讓對方下次登入強制改密碼。

### 11.3 後台角色與權限管理

預設後台角色：

| Role | 說明 | 典型權限 |
|---|---|---|
| `platform_admin` | 平台最高管理員 | 全部權限、行政人員管理、權限管理 |
| `platform_operator` | 營運操作人員 | Trial 審核、交易監管、凍結 listing / guild |
| `platform_support` | 客服支援 | 查詢資料、處理爭議與檢舉 |
| `platform_finance` | 財務人員 | 金庫、分潤、保證金與 settlement 查詢 |
| `platform_auditor` | 稽核人員 | 只讀 audit log、admin actions、交易紀錄 |

後台權限集合：

- `cms.login`
- `cms.dashboard.view`
- `admin_user.create`
- `admin_user.update`
- `admin_user.disable`
- `admin_user.reset_password`
- `admin_role.manage`
- `tenant.view`
- `tenant.manage`
- `guild.view`
- `guild.freeze`
- `trial_request.view`
- `trial_request.approve`
- `listing.view`
- `listing.freeze`
- `user.view`
- `user.freeze`
- `treasury.view`
- `warehouse.view`
- `deposit.view`
- `settlement.view`
- `dispute.view`
- `dispute.resolve`
- `report.view`
- `report.resolve`
- `audit_log.view`
- `admin_action.view`

權限原則：

1. 後台權限與公會 RBAC 分離。
2. 前台 guild owner 不會自動擁有官方後台權限。
3. 所有後台 API 必須檢查 session 與 permission。
4. 只讀角色不可呼叫 mutate API。
5. 敏感 mutate API 必須搭配 confirmation token。

### 11.4 後台功能

- Tenant / game / guild 管理。
- Trial request 審核。
- Plan 與 seat 上限調整。
- 行政人員管理。
- 後台角色與權限管理。
- 後台 session 管理。
- 官方公告。
- 全域交易查詢。
- Listing / order / lottery / settlement 查詢。
- 金庫、倉庫、保證金紀錄查詢。
- 爭議與檢舉處理。
- 凍結帳號、凍結公會、凍結交易。
- Audit log 查詢與匯出。

### 11.5 後台原則

1. 官方後台操作不可繞過 audit log。
2. 官方可凍結交易，但不得直接刪除交易歷史。
3. 金庫與倉庫調整必須填寫原因。
4. 敏感操作需要二次確認或更高權限。
5. 後台 API 不接受前端自行傳入 `actor_user_id` 作為信任來源；正式版需由 session 解析 actor。
6. 後台登入、登出、失敗登入、角色異動都必須可稽核。
7. 預設最小權限原則，新增行政人員不可預設給 `platform_admin`。

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
- `procurement_orders`
- `procurement_order_items`
- `procurement_order_eligibility_rules`
- `procurement_order_comments`
- `lotteries`
- `lottery_entries`
- `lottery_prizes`
- `lottery_draw_results`
- `dispute_cases`
- `dispute_messages`
- `reports`
- `admin_users`
- `admin_roles`
- `admin_permissions`
- `admin_role_permissions`
- `admin_user_roles`
- `admin_sessions`
- `admin_password_reset_tokens`
- `admin_action_confirmations`
- `admin_actions`
- `audit_logs`

後台稽核欄位：

- `audit_logs.actor_user_id`：保留相容舊平台使用者 actor。
- `audit_logs.actor_admin_user_id`：記錄官方後台行政人員 actor。
- `admin_actions.actor_user_id`：保留相容舊平台使用者 actor。
- `admin_actions.actor_admin_user_id`：記錄官方後台行政人員 actor。
- `admin_action_confirmations.actor_admin_user_id`：敏感操作二次確認 token 綁定後台行政人員。

MVP 可先完整實作交易、幣別、金庫與保證金的「記帳資料模型」，實際支付、匯率、外部金流於後續階段補齊。

---

## 13. 第一階段實作項目（開始製作）

### Sprint 0（本次提交）

- [x] 建立 MVP 規格文件（本文件）
- [x] 新增 SQL migration：多租戶 + 公會 + 方案 + 試用 + 基礎交易模型
- [x] 將 README 補上文件導覽入口

### Sprint 0.5（核心帳本與交易資料模型）

- [x] 新增 SQL migration：多遊戲、多幣別、遊戲道具
- [x] 新增 SQL migration：聯盟、公會成員、RBAC 權限資料模型
- [x] 新增 SQL migration：listing 可見範圍、投標資格、bid 紀錄
- [x] 新增 SQL migration：保證金、settlement 幣別欄位、公會金庫 ledger
- [x] 新增 SQL migration：公會倉庫、倉庫異動、官方操作紀錄
- [x] 新增 migration validation script，使用乾淨 Postgres 驗證 `001` / `002` / `003`

### Sprint 1（下一步）

- [x] Rust service 讀取新 schema（先以 SeaORM connection + 參數化 SQL 實作）
- [x] Trial 申請 API（create / approve）
- [x] 邀請成員 API（invite / accept）
- [x] Listing 建立 API（draft）
- [x] Listing 審核 API
- [x] 明標 / 暗標 bidding API（先共用 bid 寫入模型；暗標顯示層後續處理）
- [x] 投標資格檢查（visibility + eligibility rules + RBAC）
- [x] Settlement 結算邏輯（winning bid -> settlement -> recipients）
- [x] Guild treasury ledger 基礎寫入（settlement 捐款入帳）

### Sprint 2（進行中）

- [x] 保證金 hold / release / forfeit 流程（記帳型；forfeit 進公會金庫 ledger）
- [x] 公會倉庫與待售清單（入庫、從倉庫建立 listing、listed 查詢）
- [x] 官方後台查詢與凍結操作（guild/listing 查詢與 freeze）
- [x] 訂貨系統 API（create / approve / accept / deliver / complete）
- [x] 抽獎活動 API（create / approve / enter / draw）

### Sprint 3（進行中）

- [x] 公會端查詢 API：完整倉庫、金庫帳戶、金庫流水
- [x] 官方後台查詢 API：金庫、倉庫、保證金、audit log
- [x] 爭議與檢舉流程 API（建立爭議、留言、檢舉、後台結案）
- [x] 官方後台凍結帳號 API
- [x] 官方後台敏感操作二次確認（confirmation token）
- [x] 官方後台權限分級（platform_admin / platform_operator / platform_support）

### Sprint 4（Web UX 與流程驗收）

- [x] User Web 拆成市場、登入、商品詳情、賣家中心多頁流程。
- [x] Market listing card 顯示 listing ID，方便使用者與測試對照。
- [x] Seller Center 支援建立 listing、審核、結算操作。
- [x] Admin Web 支援 trial queue 載入與核准。
- [x] Admin Web 支援 listing queue 載入與逐筆 `Freeze #ID` 操作。
- [x] 修正 Admin Web freeze confirmation token 欄位，前端使用 `confirmation_token` 對齊 CMS API。
- [x] 新增前台與後台 smoke test 腳本，驗證主要 UX 流程。

### Sprint 5（後台登入、行政人員與權限管理）

- [x] 新增後台登入頁與 session 驗證。
- [x] 新增 admin user / role / permission / session migration。
- [x] 新增 CMS API：後台登入、登出、取得目前登入者。
- [x] 新增 CMS API：新增行政人員、停用行政人員、重設密碼。
- [x] 新增 CMS API：後台角色與權限查詢。
- [x] 將 CMS API 敏感操作改為優先從 session / token 解析 actor，舊 `actor_user_id` 僅保留相容 fallback。
- [x] 新增後台稽核 actor 欄位，`audit_logs` / `admin_actions` / `admin_action_confirmations` 可記錄 `actor_admin_user_id`。
- [x] Admin Web 加入 route guard，未登入不可進入 dashboard。
- [x] Admin Web 加入行政人員管理區塊。
- [x] Admin Web 加入角色權限查詢區塊。
- [x] Smoke test 補上後台登入流程。
- [ ] Smoke test 補上新增行政、調整權限、登出流程。

> 目前仍保留 legacy `actor_user_id`，方便舊 API 與既有 audit 查詢相容；新後台 session 會同步寫入 `actor_admin_user_id`，用來追蹤實際行政人員。

### Sprint 1 API 端點

User API（`:8080`）：

- `POST /trial-requests`：建立 trial 申請。
- `POST /guilds/:guild_id/invitations`：建立公會邀請，會檢查 active subscription seat limit。
- `POST /guild-invitations/:token/accept`：接受邀請、建立 user 與 guild member，並增加 seats used。
- `POST /guilds/:guild_id/listings`：建立 draft listing，支援 fixed price / open bid / sealed bid / donation sale 模式。
- `POST /listings/:listing_id/approve`：具 `listing:approve` 權限者可將 draft / pending listing 啟用。
- `POST /listings/:listing_id/bids`：具 `listing:bid` 權限者可出價，會檢查 visibility、eligibility rules、幣別與最高價。
- `POST /listings/:listing_id/settle`：具 `settlement:approve` 權限者可依 winning bid 建立 settlement、recipient，並可將指定金額寫入公會金庫 ledger。
- `POST /listings/:listing_id/deposits`：建立交易保證金需求。
- `POST /trade-deposits/:deposit_id/hold`：將 required deposit 轉為 held。
- `POST /trade-deposits/:deposit_id/release`：將 held deposit 轉為 released。
- `POST /trade-deposits/:deposit_id/forfeit`：將 held deposit 沒收，並寫入公會金庫 ledger。
- `POST /guilds/:guild_id/warehouse/items`：建立公會倉庫物品。
- `POST /warehouse/items/:warehouse_item_id/list`：從倉庫物品建立 draft listing，並將倉庫狀態改為 listed。
- `GET /tenants/:tenant_id/guilds/:guild_id/warehouse/listed`：查詢公會目前待售清單。
- `GET /tenants/:tenant_id/guilds/:guild_id/warehouse/items?actor_user_id=...`：具 `warehouse:view` 權限者可查詢完整倉庫。
- `GET /tenants/:tenant_id/guilds/:guild_id/treasury/accounts?actor_user_id=...`：具 `treasury:view` 權限者可查詢公會金庫各幣別餘額。
- `GET /tenants/:tenant_id/guilds/:guild_id/treasury/ledger?actor_user_id=...`：具 `treasury:view` 權限者可查詢公會金庫流水。
- `POST /guilds/:guild_id/procurement-orders`：建立公會訂貨需求，包含品項、預算、供應者保證金與捐款設定。
- `POST /procurement-orders/:order_id/approve`：具 `order:approve` 權限者可將 draft / pending 訂單開放供應。
- `POST /procurement-orders/:order_id/accept`：具 `order:accept` 權限者可承接 open 訂單。
- `POST /procurement-orders/:order_id/deliver`：供應者可將 accepted 訂單標記為 delivered。
- `POST /procurement-orders/:order_id/complete`：具 `order:approve` 權限者可驗收 delivered 訂單。
- `POST /guilds/:guild_id/lotteries`：建立抽獎活動與獎品。
- `POST /lotteries/:lottery_id/approve`：具 `lottery:manage` 權限者可開放抽獎。
- `POST /lotteries/:lottery_id/entries`：具 `lottery:enter` 權限者可參加抽獎，會檢查活動狀態、時間與每人上限。
- `POST /lotteries/:lottery_id/draw`：具 `lottery:manage` 權限者可抽出得獎結果，結果會寫入 draw results。
- `POST /listings/:listing_id/disputes`：建立 listing 爭議案件，寫入 audit log。
- `POST /disputes/:dispute_id/messages`：爭議案件留言或內部註記，寫入 audit log。
- `POST /reports`：建立檢舉案件，寫入 audit log。

CMS API（`:8081`）：

- `POST /auth/login`：後台行政人員登入，成功後建立 session。
- `POST /auth/logout`：登出目前 session。
- `GET /auth/me`：取得目前登入行政人員、角色、權限與 tenant scope。
- `POST /admin-users`：新增行政人員，需要 `admin_user.create`。
- `GET /admin-users`：查詢行政人員列表，需要 `admin_user.update` 或 `admin_action.view`。
- `PATCH /admin-users/:admin_user_id`：更新行政人員基本資料或 tenant scope，需要 `admin_user.update`。
- `POST /admin-users/:admin_user_id/disable`：停用行政人員，需要 `admin_user.disable`。
- `POST /admin-users/:admin_user_id/reset-password`：重設行政人員密碼，需要 `admin_user.reset_password`。
- `GET /admin-roles`：查詢後台角色與權限。
- `POST /admin-roles`：新增後台角色，需要 `admin_role.manage`。
- `PATCH /admin-roles/:role_id/permissions`：調整角色權限，需要 `admin_role.manage`。
- `GET /trial-requests`：查詢最近 100 筆 trial 申請。
- `POST /trial-requests/:id/approve`：審核 trial，建立 tenant、guild、owner user、trial subscription、guild member、guild owner role 與 audit log。
- `GET /tenants/:tenant_id/guilds`：後台查詢公會清單。
- `GET /tenants/:tenant_id/listings`：後台查詢 listing 清單。
- `GET /tenants/:tenant_id/procurement-orders`：後台查詢訂貨單清單。
- `GET /tenants/:tenant_id/lotteries`：後台查詢抽獎活動清單。
- `GET /tenants/:tenant_id/treasury/accounts`：後台查詢金庫帳戶。
- `GET /tenants/:tenant_id/treasury/ledger`：後台查詢金庫流水。
- `GET /tenants/:tenant_id/warehouse/items`：後台查詢倉庫物品。
- `GET /tenants/:tenant_id/trade-deposits`：後台查詢保證金紀錄。
- `GET /tenants/:tenant_id/audit-logs`：後台查詢 audit log。
- `GET /tenants/:tenant_id/disputes`：後台查詢爭議案件。
- `GET /tenants/:tenant_id/reports`：後台查詢檢舉案件。
- `POST /admin-action-confirmations`：建立敏感操作二次確認 token，會檢查平台角色，預設 10 分鐘有效且只能使用一次。
- `POST /disputes/:dispute_id/resolve`：後台結案爭議案件，需 confirmation token，寫入 audit log 與 admin action。
- `POST /reports/:report_id/resolve`：後台結案檢舉案件，需 confirmation token，寫入 audit log 與 admin action。
- `POST /users/:user_id/freeze`：凍結使用者，需 confirmation token，寫入 audit log 與 admin action。
- `POST /guilds/:guild_id/freeze`：凍結公會，需 confirmation token，寫入 audit log 與 admin action。
- `POST /listings/:listing_id/freeze`：凍結 listing，需 confirmation token，寫入 audit log 與 admin action。

---

## 14. 本機操作與 Smoke Test

### 14.1 啟動服務

```bash
docker compose up -d postgres redis

DATABASE_URL=postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev cargo run -p user-api
DATABASE_URL=postgresql://gam_trade:gam_trade_secure_pass@localhost:5432/gam_trade_dev cargo run -p cms-api

pnpm --filter @gam/user-web dev
pnpm --filter @gam/admin-web dev
```

> 若使用 `docker compose up --build` 啟動全套服務，也可以直接使用 compose 內的 API 與 worker。

### 14.2 前台 UX Smoke Test

```bash
google-chrome --headless=new --remote-debugging-port=9222 --user-data-dir=/tmp/gam-trade-chrome --no-first-run --no-default-browser-check about:blank
CHROME_URL=http://127.0.0.1:9222 node scripts/smoke-multipage-ux.mjs
```

驗證內容：

- 市場頁可載入。
- 賣家中心可建立 listing。
- Listing 可被審核為 active。
- 買家可進入商品詳情並出價。
- Listing 可完成 settle。

### 14.3 後台 UX Smoke Test

```bash
google-chrome --headless=new --remote-debugging-port=9223 --user-data-dir=/tmp/gam-trade-admin-chrome --no-first-run --no-default-browser-check about:blank
CHROME_URL=http://127.0.0.1:9223 node scripts/smoke-admin-ux.mjs
```

驗證內容：

- Admin Web 可載入。
- Trial queue 可載入。
- Trial request 可核准為 approved。
- Listing queue 可載入。
- 指定 listing 可被 freeze。
- 最終截圖輸出到 `/tmp/gam-admin-ux-final.png`。

### 14.4 建置與靜態檢查

```bash
pnpm --filter @gam/user-web lint
pnpm --filter @gam/user-web build
pnpm --filter @gam/admin-web lint
pnpm --filter @gam/admin-web build
cargo check -p user-api
cargo check -p cms-api
```

---

## 15. 驗收標準（MVP）

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
14. User Web 可跑市場、登入、商品詳情、賣家中心的基本交易 UX。
15. Admin Web 可跑 trial approve 與 listing freeze 的後台 UX。
16. Admin Web 必須有獨立登入頁，未登入不可進入後台功能。
17. `platform_admin` 可新增、停用、重設密碼與調整行政人員角色。
18. 後台角色權限可控管 trial 審核、交易凍結、爭議處理、金庫查詢與 audit log 查詢。
19. CMS API 正式版不可信任前端傳入的 `actor_user_id`，必須由 session / token 解析。
20. 後台登入、登出、失敗登入、行政人員異動與權限異動都必須寫入 audit log。
