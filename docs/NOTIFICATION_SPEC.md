# Gam 通知系統規格

## 1. 目標與範圍

本文件定義 Gam 多租戶、多公會交易平台的通知系統規格。通知系統負責接收平台內部業務事件與外部 webhook 事件，依事件類別、租戶、公會、使用者偏好與通知規則決定是否產生通知，並執行站內通知、Discord 通知與其他 webhook action。

本文件是通知系統規格與實作對齊文件。現有架構已包含 `user-api`、`cms-api`、PostgreSQL、Redis runtime config、`notification-worker`、audit log 與多租戶資料模型；通知 event outbox、站內通知 inbox、投遞紀錄、偏好、整合與 webhook 相關 schema 已建立第一版。`notification-worker` 已支援將 pending event 轉成站內通知；Discord 發送與 inbound webhook endpoint 仍待後續實作。

### 1.1 必須支援

- 站內通知：使用者可在 web/app 查看通知、未讀數、已讀狀態與通知詳情。
- Discord 通知：公會可設定 guild-level Discord webhook，將重要事件推送到指定頻道。
- 外部 webhook 接收：平台可接收第三方系統 signed HTTP POST，轉換成標準通知事件。
- 規則判斷：依事件類別、severity、tenant、guild、resource、actor、recipient scope 與使用者偏好判斷是否通知。
- 動作執行：根據規則產生站內通知、發送 Discord、呼叫 outbound webhook 或記錄 action run。
- 稽核與可追蹤：重要事件、規則變更、手動重送與失敗投遞都必須可查詢。

### 1.2 暫不支援

- Discord bot OAuth、slash command、互動按鈕或私訊。
- LINE、Email、Push notification。
- 第三方 marketplace 的完整雙向同步。
- 使用者自訂任意程式碼 action。
- 跨 tenant 的通知規則套用，除非由平台後台明確建立 global rule。

## 2. 現有架構對齊

### 2.1 現有事實

- Backend 使用 Rust workspace、Axum services、SeaORM/PostgreSQL、Redis integration 與背景 worker。
- `user-api` 處理前台交易、公會、listing、bid、settlement、金庫、倉庫、訂貨、抽獎、爭議與檢舉流程。
- `cms-api` 處理官方後台登入、行政人員、權限、trial 審核、查詢、凍結、爭議/檢舉結案與 audit log。
- `notification-worker` 目前存在於 `rust/workers/notification/`，會讀取 `notification_events`、產生 `in_app_notifications` 與 `notification_deliveries`。
- 目前資料庫已有 `audit_logs`、`admin_actions`、`guild_notices`、`listing_bids`、`trade_settlements`、`guild_treasury_ledger_entries`、`procurement_orders`、`lotteries`、`dispute_cases` 與 `reports` 等事件來源表。
- Docker Compose 與 Terraform 已為 worker 類服務提供 `DATABASE_URL`、`REDIS_URL` 與 observability env，但目前 worker 尚未使用。

### 2.2 目標 runtime shape

```text
user-api / cms-api / inbound webhook endpoint
        |
        v
PostgreSQL notification_events outbox
        |
        v
notification-worker
        |
        +--> in_app_notifications
        +--> Discord webhook
        +--> outbound webhook action
        +--> notification_deliveries / notification_action_runs
```

### 2.3 邊界原則

- `user-api` / `cms-api` 只負責在業務 transaction 成功後寫入通知事件 outbox，不直接同步發送 Discord。
- `notification-worker` 負責事件消費、規則套用、投遞、重試、冪等與失敗紀錄。
- PostgreSQL 是事件、規則、偏好、投遞結果與稽核紀錄的 source of truth。
- Redis 可作為 worker coordination、短期鎖、rate limit 與 retry wake-up queue；不可作為唯一持久事件儲存。
- domain logic 應保持 deterministic，可將規則匹配、recipient resolution 與 payload shaping 放入 domain/core 或測試友善模組。

## 3. 核心概念

### 3.1 Notification Event

通知事件是平台內部或外部產生的標準化 outbox record。事件只代表「某件事已發生」，不保證一定要通知所有人。

事件必要欄位：

- `tenant_id`：所有事件必填。
- `guild_id`：公會層事件必填；平台層或 tenant 層事件可為空。
- `event_type`：穩定字串，例如 `listing.approved`。
- `event_category`：高階分類，例如 `trade`、`member`、`security`。
- `severity`：`info`、`success`、`warning`、`critical`。
- `actor_user_id` / `actor_admin_user_id`：觸發者，依前台或後台 actor 填入。
- `resource_type` / `resource_id`：事件主體。
- `dedupe_key`：同一事件的冪等 key。
- `payload`：JSONB，保存最小必要資料與 deep link context。
- `occurred_at`：事件發生時間。

### 3.2 Rule

通知規則定義哪些事件要通知、通知誰、用什麼 channel、執行哪些 action。規則可以是 platform default、tenant default、guild override 或 user preference 的組合。

規則判斷順序：

1. 事件有效且未取消。
2. tenant / guild scope 符合。
3. event category/type 符合。
4. resource 條件符合，例如 listing status、order status、severity。
5. recipient scope 可解析出有效使用者或 Discord integration。
6. 使用者偏好沒有關閉該 channel。
7. channel policy 與 rate limit 允許投遞。

### 3.3 Action

Action 是規則命中後要執行的行為：

- `create_in_app_notification`
- `send_discord_webhook`
- `send_outbound_webhook`
- `record_audit_marker`
- `suppress`

`suppress` 用於明確阻止低優先級或重複通知，通常由更高優先級規則產生。

### 3.4 Delivery

Delivery 是 action 的單次投遞結果。每個 channel、recipient、event、rule 應有穩定冪等 key，worker restart 或重試不得產生重複站內通知或重複外部投遞。

## 4. 建議資料模型

以下資料表為建議新增 schema，尚未存在於目前 migrations。

### 4.1 `notification_events`

用途：通知 outbox 與標準化事件來源。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `tenant_id` | 必填，租戶邊界 |
| `guild_id` | 公會事件必填 |
| `event_type` | 例如 `bid.created` |
| `event_category` | 例如 `trade` |
| `severity` | `info` / `success` / `warning` / `critical` |
| `actor_user_id` | 前台使用者 actor |
| `actor_admin_user_id` | 後台行政 actor |
| `resource_type` | `listing` / `bid` / `order` 等 |
| `resource_id` | resource id 字串 |
| `dedupe_key` | unique，避免重複事件 |
| `payload` | JSONB，最小必要資料 |
| `status` | `pending` / `processing` / `processed` / `failed` / `cancelled` |
| `attempt_count` | worker 處理次數 |
| `next_attempt_at` | 下次處理時間 |
| `occurred_at` | 業務事件時間 |
| `created_at` / `updated_at` | 系統時間 |

### 4.2 `notification_rules`

用途：事件匹配與通知策略。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `tenant_id` | tenant scope；global rule 可為空 |
| `guild_id` | guild override；tenant/platform rule 可為空 |
| `name` | 規則名稱 |
| `description` | 規則用途 |
| `priority` | 數字越大越優先 |
| `enabled` | 是否啟用 |
| `event_category` | 可為空，代表不限制 |
| `event_type` | 可為空，代表不限制 |
| `severity_min` | 最低 severity |
| `conditions` | JSONB 條件，例如 status/resource filters |
| `recipient_scope` | `actor` / `resource_owner` / `guild_officers` / `guild_members` / `admin_role` / `explicit_users` |
| `created_by_admin_user_id` | 規則建立者 |
| `created_at` / `updated_at` | 系統時間 |

### 4.3 `notification_rule_actions`

用途：一條 rule 對應多個 action。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `rule_id` | 關聯 `notification_rules` |
| `action_type` | `create_in_app_notification` / `send_discord_webhook` / `send_outbound_webhook` / `suppress` |
| `channel` | `in_app` / `discord` / `webhook` / `system` |
| `template_key` | 訊息模板 |
| `config` | JSONB action config |
| `enabled` | 是否啟用 |

### 4.4 `notification_deliveries`

用途：記錄每次 channel 投遞。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `event_id` | 關聯 `notification_events` |
| `rule_id` | 命中規則 |
| `action_id` | 命中 action |
| `tenant_id` / `guild_id` | 查詢與隔離 |
| `channel` | `in_app` / `discord` / `webhook` |
| `recipient_user_id` | 站內通知 recipient |
| `integration_id` | Discord 或 webhook integration |
| `idempotency_key` | unique |
| `status` | `pending` / `sent` / `failed` / `skipped` |
| `attempt_count` | 投遞次數 |
| `last_error_code` | 失敗代碼 |
| `last_error_message` | sanitized error |
| `sent_at` | 成功時間 |
| `created_at` / `updated_at` | 系統時間 |

### 4.5 `in_app_notifications`

用途：使用者站內通知 inbox。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `tenant_id` / `guild_id` | 租戶與公會邊界 |
| `user_id` | recipient |
| `event_id` | 來源事件 |
| `title` | 通知標題 |
| `body` | 摘要內容 |
| `severity` | 顯示層級 |
| `resource_type` / `resource_id` | deep link target |
| `link_path` | app/web 相對路徑 |
| `read_at` | 已讀時間 |
| `archived_at` | 封存時間 |
| `created_at` | 建立時間 |

### 4.6 `notification_preferences`

用途：使用者與公會層級偏好。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `tenant_id` / `guild_id` | scope |
| `user_id` | 使用者偏好；公會預設可為空 |
| `event_category` / `event_type` | 適用事件 |
| `channel` | `in_app` / `discord` / `webhook` |
| `enabled` | 是否開啟 |
| `minimum_severity` | 最低通知層級 |
| `quiet_hours` | JSONB，可選 |
| `created_at` / `updated_at` | 系統時間 |

### 4.7 `discord_integrations`

用途：公會層 Discord webhook 設定。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `tenant_id` / `guild_id` | 必填 |
| `name` | integration 顯示名稱 |
| `webhook_url_secret_ref` | secret reference，不存明文 |
| `default_channel_label` | 顯示用頻道名稱 |
| `enabled` | 是否啟用 |
| `created_by` | 建立者 |
| `last_success_at` | 最近成功 |
| `last_failure_at` | 最近失敗 |
| `created_at` / `updated_at` | 系統時間 |

### 4.8 `inbound_webhook_sources`

用途：管理外部 webhook source。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `tenant_id` / `guild_id` | source scope |
| `source_code` | 穩定代碼，例如 `game-platform-a` |
| `name` | 顯示名稱 |
| `secret_ref` | 簽章 secret reference |
| `signature_header` | 預期簽章 header |
| `timestamp_header` | 預期 timestamp header |
| `enabled` | 是否啟用 |
| `created_by_admin_user_id` | 建立者 |
| `created_at` / `updated_at` | 系統時間 |

### 4.9 `inbound_webhook_events`

用途：保存外部 webhook 接收、驗證與轉換結果。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `source_id` | 關聯 webhook source |
| `tenant_id` / `guild_id` | scope |
| `external_event_id` | 外部事件 id |
| `idempotency_key` | unique |
| `signature_valid` | 驗證結果 |
| `received_headers` | JSONB，需移除敏感值 |
| `payload` | JSONB 原始 payload 或 sanitized payload |
| `notification_event_id` | 轉換後事件 |
| `status` | `received` / `rejected` / `converted` / `failed` |
| `error_message` | sanitized error |
| `received_at` | 接收時間 |

### 4.10 `notification_action_runs`

用途：記錄非單純投遞的 rule action 執行結果，例如 outbound webhook 與手動重送。

建議欄位：

| 欄位 | 說明 |
| --- | --- |
| `id` | primary key |
| `event_id` | 來源事件 |
| `rule_id` / `action_id` | 命中來源 |
| `run_type` | `automatic` / `manual_retry` |
| `status` | `pending` / `running` / `succeeded` / `failed` / `skipped` |
| `request_summary` | sanitized request metadata |
| `response_summary` | sanitized response metadata |
| `attempt_count` | 次數 |
| `started_at` / `finished_at` | 執行時間 |
| `created_by_admin_user_id` | 手動觸發者 |

## 5. 事件分類與預設策略

### 5.1 分類

| Category | Event examples | 預設 channel |
| --- | --- | --- |
| `guild_notice` | `guild_notice.published`, `guild_notice.pinned` | 站內、Discord |
| `member` | `member.invited`, `member.joined`, `member.role_changed`, `member.suspended` | 站內；高風險事件 Discord |
| `listing` | `listing.created`, `listing.pending_approval`, `listing.approved`, `listing.active`, `listing.frozen`, `listing.ended` | 站內、Discord |
| `bid` | `bid.created`, `bid.outbid`, `bid.winning`, `bid.cancelled` | 站內；重要 bid Discord |
| `settlement` | `settlement.created`, `settlement.completed`, `profit_share.recorded`, `donation.recorded` | 站內、Discord |
| `treasury` | `treasury.ledger_created`, `deposit.held`, `deposit.released`, `deposit.forfeited` | 站內、Discord for warning/critical |
| `procurement` | `procurement.created`, `procurement.approved`, `procurement.accepted`, `procurement.delivered`, `procurement.completed` | 站內、Discord |
| `lottery` | `lottery.approved`, `lottery.opened`, `lottery.drawn`, `lottery.prize_claimed` | 站內、Discord |
| `moderation` | `dispute.created`, `dispute.message_created`, `dispute.resolved`, `report.created`, `report.resolved` | 站內、Discord for officers |
| `admin` | `admin_action.created`, `user.frozen`, `guild.frozen`, `listing.frozen` | CMS 查詢、站內、Discord for critical |
| `security` | `admin.login_failed`, `admin.password_reset`, `webhook.signature_failed` | CMS 查詢、critical Discord |
| `external_webhook` | `external_webhook.received`, `external_webhook.converted` | 依 source rule |

### 5.2 預設 recipient policy

| Event | Recipient |
| --- | --- |
| `guild_notice.published` | 可見範圍內的 guild members |
| `member.invited` | 被邀請 email 對應 user，邀請人，guild officers |
| `listing.pending_approval` | listing seller，具 `listing:approve` 權限者 |
| `listing.approved` | seller，watchers，符合可見範圍的 officers |
| `bid.created` | seller，bidder；明標可通知已出價者 |
| `bid.outbid` | 被超標 bidder |
| `bid.winning` | winning bidder，seller，settlement approvers |
| `settlement.completed` | seller，buyer，settlement recipients，treasurers |
| `deposit.forfeited` | deposit owner，treasurers，officers |
| `procurement.delivered` | requester，approvers，supplier |
| `lottery.drawn` | winners，guild members 或活動可見範圍 |
| `dispute.created` | involved users，support/admin scope，guild officers |
| `user.frozen` | platform operators，guild officers if guild scoped |
| `webhook.signature_failed` | platform operators only |

### 5.3 Severity policy

- `info`：一般流程更新，例如已建立、已留言、已接單。
- `success`：正向完成，例如審核通過、結算完成、抽獎開獎。
- `warning`：需要注意，例如保證金沒收、爭議建立、重試中。
- `critical`：安全或營運高風險，例如使用者/公會/listing 凍結、webhook 簽章連續失敗。

Discord 預設只發送 `success`、`warning`、`critical`，除非公會規則明確開啟 `info`。

## 6. Public Interfaces

### 6.1 User API

建議新增端點：

| Method | Path | 說明 |
| --- | --- | --- |
| `GET` | `/notifications` | 查詢目前使用者站內通知，支援 `unread_only`、`category`、pagination |
| `GET` | `/notifications/unread-count` | 查詢未讀數 |
| `POST` | `/notifications/:notification_id/read` | 標記單筆已讀 |
| `POST` | `/notifications/read-all` | 標記目前 scope 全部已讀 |
| `PATCH` | `/notification-preferences` | 更新使用者通知偏好 |
| `GET` | `/guilds/:guild_id/notification-integrations` | 查詢公會通知整合 |
| `POST` | `/guilds/:guild_id/discord-integrations` | 建立 Discord webhook integration，需要管理權限 |
| `PATCH` | `/guilds/:guild_id/discord-integrations/:integration_id` | 更新或停用 integration |
| `POST` | `/guilds/:guild_id/discord-integrations/:integration_id/test` | 發送測試訊息並記錄 delivery |

權限：

- 一般使用者只能查詢自己的站內通知與偏好。
- Discord integration 管理需要 `notice:manage` 或後續新增 `notification:manage`。
- 公會通知規則管理建議新增 `notification:manage` 權限，避免和公告管理混用。

### 6.2 CMS API

建議新增端點：

| Method | Path | 說明 |
| --- | --- | --- |
| `GET` | `/tenants/:tenant_id/notification-events` | 查詢通知事件 |
| `GET` | `/tenants/:tenant_id/notification-deliveries` | 查詢投遞紀錄 |
| `GET` | `/tenants/:tenant_id/notification-action-runs` | 查詢 action runs |
| `GET` | `/notification-rules` | 查詢 platform / tenant rules |
| `POST` | `/notification-rules` | 建立規則 |
| `PATCH` | `/notification-rules/:rule_id` | 更新、停用或調整優先級 |
| `POST` | `/notification-deliveries/:delivery_id/retry` | 手動重送 |
| `GET` | `/inbound-webhook-sources` | 查詢外部 webhook sources |
| `POST` | `/inbound-webhook-sources` | 建立 signed webhook source |
| `PATCH` | `/inbound-webhook-sources/:source_id` | 更新或停用 source |

權限：

- 查詢需要 `admin_action.view` 或建議新增 `notification.view`。
- 規則與 source 管理需要建議新增 `notification.manage`。
- 手動重送需要 `notification.manage`，且必須寫入 `admin_actions` 或 `audit_logs`。

### 6.3 Inbound Webhook

建議 endpoint：

```text
POST /webhooks/inbound/:source_code
```

驗證規則：

- 必須使用 HTTPS in production。
- 必須驗證 source 是否 enabled。
- 必須驗證 timestamp header，預設容忍 5 分鐘。
- 必須驗證簽章，建議 HMAC-SHA256。
- 必須支援 `Idempotency-Key` 或外部 event id 去重。
- 簽章失敗不得產生業務通知，只記錄 rejected inbound event 與安全事件摘要。

成功處理流程：

1. 接收 request 並移除敏感 header。
2. 驗證 source、timestamp、signature。
3. 以 source + external event id 產生 idempotency key。
4. 寫入 `inbound_webhook_events`。
5. 將外部 payload 轉換為標準 `notification_events`，event category 使用 `external_webhook` 或 mapping 後的 category。
6. 回傳 `202 Accepted`。

### 6.4 Worker Contract

`notification-worker` 必須符合以下 contract：

- 每次從 `notification_events` 取得 `pending` 且 `next_attempt_at <= now()` 的事件。
- 使用 row lock 或 equivalent coordination 避免多 worker 重複處理同一事件。
- 對每個事件套用 enabled rules，依 priority 決定 action。
- 對每個 action 建立或取得既有 `notification_deliveries`，以 `idempotency_key` 保證冪等。
- 站內通知寫入 `in_app_notifications` 時同樣使用 delivery idempotency。
- Discord/webhook 發送失敗必須記錄 sanitized error，不可保存 secret 或完整敏感 response。
- 可重試錯誤使用 exponential backoff；不可重試錯誤標記 `failed`。
- 事件處理完成後標記 `processed`；若所有 action 都被 suppress 或 skipped，也視為 processed。

## 7. Discord 規格

### 7.1 Integration scope

- Discord integration 以 guild-level webhook 為主。
- 一個 guild 可設定多個 integration，例如 `trade-alerts`、`officer-alerts`。
- 規則 action 可指定 integration；未指定時使用 guild default enabled integration。

### 7.2 訊息內容

Discord 訊息只可包含摘要：

- title
- event type / severity
- guild name
- resource display name
- amount/currency 摘要
- deep link path
- occurred time

不得包含：

- 使用者 token、session、password hash。
- 完整 webhook secret 或 Discord webhook URL。
- 外部 webhook 原始敏感 payload。
- 內部 audit before/after JSON 的完整內容。

### 7.3 Rate limit

- worker 必須處理 Discord 429，依 response 指示延後重試。
- 同一 integration 應序列化或限速，避免短時間大量投遞。
- critical event 可優先於 info event，但不得跳過冪等檢查。

## 8. 安全與稽核

- 所有通知事件必須帶 `tenant_id`；公會層事件必須帶 `guild_id`。
- 所有查詢 API 必須依 session actor 套用 tenant/guild scope。
- Discord/webhook secret 只能以 secret reference 儲存，不可寫入 docs、migration seed 或 log。
- 外部 webhook 必須驗證簽章與 timestamp，並支援 idempotency。
- 敏感 payload 不直接外發；外發 channel 使用摘要與 deep link。
- 規則新增、停用、優先級調整、integration 變更、source 變更與手動 retry 必須寫入 audit log 或 admin action。
- 失敗 log 必須 sanitized，避免保存 Authorization header、Cookie、Discord webhook URL 或第三方 secret。
- observability label 必須低基數，只使用 `service`、`env`、`level`、`cluster` 等既有 policy；tenant/user/resource id 留在 structured fields。

## 9. 錯誤處理與重試

### 9.1 可重試錯誤

- Discord 429 / 5xx。
- outbound webhook 408 / 429 / 5xx。
- transient database or Redis coordination error。
- worker crash during processing。

### 9.2 不可重試錯誤

- Discord webhook disabled 或 404。
- 外部 webhook source disabled。
- 簽章驗證失敗。
- payload mapping 無法識別且沒有 fallback rule。
- recipient scope 無法解析且規則要求 strict recipient。

### 9.3 狀態轉換

```text
notification_events:
pending -> processing -> processed
pending -> processing -> failed
pending -> cancelled
failed  -> pending       # manual retry

notification_deliveries:
pending -> sent
pending -> failed
pending -> skipped
failed  -> pending       # retry
```

## 10. 測試與驗收

### 10.1 Docs-only validation

新增或修改本文件時需執行：

```bash
.agent/hooks/validate-docs.sh
git diff --check
```

### 10.2 後續實作測試場景

- `user-api` 建立 listing 後寫入 `notification_events`，worker 消費後產生 seller 站內通知。
- listing 審核通過後通知 seller 與具相關權限的 guild officers。
- bid 建立後通知 seller；被超標時通知前一位 highest bidder。
- settlement completed 後通知 seller、buyer、recipients 與 treasurers。
- deposit forfeited 產生 warning severity，通知 deposit owner 與 treasurers。
- procurement order 從 approved 到 delivered 的每個狀態變更都產生對應 recipient 通知。
- lottery drawn 後通知 winners 並可發送 Discord 摘要。
- dispute created 後通知 involved users 與 support/admin scope。
- Discord 發送成功時 `notification_deliveries.status = sent`。
- Discord 429 時 delivery 保持可重試，`next_attempt_at` 依 rate limit 延後。
- 外部 webhook 簽章失敗時不得產生業務通知，只留下 rejected inbound event。
- 重複 webhook event 使用 idempotency key 去重，不重複產生 `notification_events`。
- 規則停用後，同類事件不再產生該規則 action。
- 使用者關閉某 category 的 Discord/in-app preference 後，不產生該 channel delivery。
- worker restart 後不重複建立站內通知或重複外發 webhook。
- 租戶 A 的 admin 或 member 不可查詢租戶 B 的 notification event、delivery 或 inbox。

## 11. 實作順序建議

1. 新增 notification schema migration 與 repository tests。
2. 在 `user-api` / `cms-api` 的高價值事件先寫入 `notification_events` outbox：listing approval、bid、settlement、deposit forfeiture、dispute/report、freeze actions。
3. 實作 `notification-worker` event polling、rule matching 與站內通知。
4. 實作 User API inbox 查詢、已讀與未讀數。
5. 實作 Discord integration 與 Discord delivery。
6. 實作 inbound webhook source、簽章驗證與事件轉換。
7. 實作 CMS 查詢、規則管理、delivery retry 與 action run 檢視。

## 12. 開放問題

- 是否要新增 `notification:manage` 與 `notification:view` 權限，或重用現有 `notice:manage` / `admin_action.view`。
- Discord webhook secret reference 要使用現有 SSM secret pattern，或先以資料庫 encrypted field 實作。
- 站內通知保留期限與歸檔政策尚未定義。
- 是否需要 digest/batch 通知，例如每日交易摘要。
- 是否需要將 audit log 本身全部轉成 notification event，或只挑 critical/security 事件。
