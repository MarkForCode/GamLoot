# Skill: K6 壓力測試流程

## 觸發條件
- 用戶說「壓測」、「load test」、「stress test」、「效能測試」、「容量測試」、「k6」
- 需要驗證 API latency、錯誤率、登入監控、Prometheus/Grafana 指標是否承受流量

## 目標
- 使用 k6 對 Rust API 做可重複的 baseline / smoke / stress 測試
- 測試前確認服務健康，測試後留下 `reports/k6/*.json`
- 不把 raw email、password、token、payload body 寫進測試報告或日誌

## 主要檔案
- Scenario: `tests/k6/api-baseline.js`
- Local runner: `scripts/k6/run-local.sh`
- Docker runner: `scripts/k6/run-docker.sh`
- Reports: `reports/k6/`
- Commands: `pnpm run load:k6`, `just k6-baseline`

## 工作流程

### 1. 確認測試目標
- [ ] 測試環境：local / staging / production-like
- [ ] 目標 API base URL：
  - `USER_API_BASE_URL`，預設 `http://localhost:8080`
  - `CMS_API_BASE_URL`，預設 `http://localhost:8081`
- [ ] profile：`smoke` / `baseline` / `stress`
- [ ] 是否包含 CMS：`K6_INCLUDE_CMS=true|false`
- [ ] 是否包含預期登入失敗事件：`K6_INCLUDE_AUTH_FAILURE=true|false`

### 2. 準備服務
```bash
docker compose up -d --build postgres redis user-api cms-api
just db-apply-migrations
just db-seed || true
just db-seed-demo-users
```

### 3. Smoke 測試
先跑短測確認流程和帳號可用：

```bash
pnpm run load:k6:smoke
# 或
just k6-smoke
```

### 4. Baseline 測試
用預設 ramping VUs 取得一般容量基準：

```bash
pnpm run load:k6
# 或
just k6-baseline
```

### 5. Stress 測試
壓到較高 VUs，觀察 p95/p99、錯誤率、DB、CPU、RSS、Tokio lag：

```bash
pnpm run load:k6:stress
# 或
just k6-stress
```

### 6. 沒有本機 k6 binary 時
```bash
pnpm run load:k6:docker
# 或
just k6-docker
```

Docker runner 預設使用 `--network host`，適合 Linux local。Docker Desktop 可改用：

```bash
USER_API_BASE_URL=http://host.docker.internal:8080 \
CMS_API_BASE_URL=http://host.docker.internal:8081 \
pnpm run load:k6:docker
```

## 常用參數

```bash
K6_PROFILE=baseline
K6_BASELINE_TARGET_VUS=10
K6_STRESS_TARGET_VUS=50
K6_DURATION=30s
K6_RAMP_UP=1m
K6_HOLD=3m
K6_RAMP_DOWN=30s
K6_THINK_TIME_SECONDS=1
K6_HTTP_FAIL_RATE='rate<0.02'
K6_HTTP_P95='p(95)<800'
K6_HTTP_P99='p(99)<1500'
K6_LOGIN_SUCCESS_RATE='rate>0.98'
```

登入測試帳號預設：

```bash
USER_LOGIN_ID=demo-buyer@gamloot.local
USER_PASSWORD_HASH=buyer-password-hash
CMS_LOGIN_EMAIL=admin@example.com
CMS_PASSWORD_HASH=admin-password-hash
```

## 判讀標準
- `http_req_failed` 超過 threshold：先看 5xx、連線 timeout、DB saturation
- p95/p99 上升但錯誤率低：看 DB query duration、CPU/RSS、Tokio tick lag
- 登入成功率下降：看 `auth_login_attempts_total`、DB slow query log、`admin_sessions` insert latency
- 預期登入失敗應該是 401/403，不應該產生 5xx

## Observability 對照
- API metrics: `/metrics`
- Auth counter: `auth_login_attempts_total{service,actor_type,result,reason}`
- DB metrics: `db_queries_total`, `db_query_duration_seconds`
- Runtime metrics: `process_cpu_seconds_total`, `process_resident_memory_bytes`, `process_memory_bytes`, `tokio_runtime_tick_lag_seconds`
- Logs: FireLens / Loki 或 local observability stack

## 安全提醒
- 不要使用真實用戶密碼、token、session cookie 做壓測
- 不要把 production 帳號或 secrets commit 到 repo
- 對 production-like 環境壓測前，要明確設定 target VUs、duration、threshold
- 高流量登入測試會寫入 `last_login_at` / `admin_sessions`，測試資料庫要可清理
