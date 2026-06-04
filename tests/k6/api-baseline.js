import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

const profile = (__ENV.K6_PROFILE || 'baseline').toLowerCase();
const userApiBaseUrl = stripTrailingSlash(__ENV.USER_API_BASE_URL || 'http://localhost:8080');
const cmsApiBaseUrl = stripTrailingSlash(__ENV.CMS_API_BASE_URL || 'http://localhost:8081');
const userLoginId = __ENV.USER_LOGIN_ID || 'demo-buyer@gamloot.local';
const userPasswordHash = __ENV.USER_PASSWORD_HASH || 'buyer-password-hash';
const cmsLoginEmail = __ENV.CMS_LOGIN_EMAIL || 'admin@example.com';
const cmsPasswordHash = __ENV.CMS_PASSWORD_HASH || 'admin-password-hash';
const includeCms = (__ENV.K6_INCLUDE_CMS || 'true').toLowerCase() !== 'false';
const includeAuthFailure = (__ENV.K6_INCLUDE_AUTH_FAILURE || 'true').toLowerCase() !== 'false';
const thinkTimeSeconds = Number(__ENV.K6_THINK_TIME_SECONDS || '1');

const apiErrors = new Counter('gam_api_errors_total');
const loginFailures = new Counter('gam_login_failures_total');
const loginSuccessRate = new Rate('gam_login_success_rate');
const authLatency = new Trend('gam_auth_latency_seconds');

export const options = buildOptions(profile);

export function setup() {
  const userHealth = http.get(`${userApiBaseUrl}/health`, {
    tags: { service: 'user-api', endpoint: 'health' },
  });
  check(userHealth, {
    'user-api health is 200': (res) => res.status === 200,
  });

  if (includeCms) {
    const cmsHealth = http.get(`${cmsApiBaseUrl}/health`, {
      tags: { service: 'cms-api', endpoint: 'health' },
    });
    check(cmsHealth, {
      'cms-api health is 200': (res) => res.status === 200,
    });
  }
}

export default function () {
  group('user-api health and metrics', () => {
    const tags = { service: 'user-api', endpoint: 'health' };
    expectOk(http.get(`${userApiBaseUrl}/health`, { tags }), 'user-api health', tags);

    const metricsTags = { service: 'user-api', endpoint: 'metrics' };
    expectOk(http.get(`${userApiBaseUrl}/metrics`, { tags: metricsTags }), 'user-api metrics', metricsTags);
  });

  group('user login', () => {
    const loginTags = { service: 'user-api', endpoint: 'auth_login', result: 'success' };
    const loginRes = postJson(
      `${userApiBaseUrl}/auth/login`,
      {
        username_or_email: userLoginId,
        password_hash: userPasswordHash,
      },
      loginTags,
    );
    recordLogin(loginRes, 'user-api login', loginTags);

    if (includeAuthFailure) {
      const failureTags = { service: 'user-api', endpoint: 'auth_login', result: 'failure' };
      const failureRes = postJson(
        `${userApiBaseUrl}/auth/login`,
        {
          username_or_email: userLoginId,
          password_hash: 'k6-invalid-password-hash',
        },
        failureTags,
      );
      const expectedFailure = check(failureRes, {
        'user-api invalid login is rejected': (res) => res.status === 403 || res.status === 401,
      });
      if (!expectedFailure) {
        apiErrors.add(1, failureTags);
      }
    }
  });

  if (includeCms) {
    group('cms-api health, metrics, and login', () => {
      const healthTags = { service: 'cms-api', endpoint: 'health' };
      expectOk(http.get(`${cmsApiBaseUrl}/health`, { tags: healthTags }), 'cms-api health', healthTags);

      const metricsTags = { service: 'cms-api', endpoint: 'metrics' };
      expectOk(http.get(`${cmsApiBaseUrl}/metrics`, { tags: metricsTags }), 'cms-api metrics', metricsTags);

      const loginTags = { service: 'cms-api', endpoint: 'auth_login', result: 'success' };
      const loginRes = postJson(
        `${cmsApiBaseUrl}/auth/login`,
        {
          email: cmsLoginEmail,
          password_hash: cmsPasswordHash,
        },
        loginTags,
      );
      recordLogin(loginRes, 'cms-api login', loginTags);
    });
  }

  sleep(thinkTimeSeconds);
}

export function handleSummary(data) {
  const summaryPath = __ENV.K6_SUMMARY_PATH || `reports/k6/${profile}-summary.json`;
  return {
    stdout: textSummary(data),
    [summaryPath]: JSON.stringify(data, null, 2),
  };
}

function buildOptions(selectedProfile) {
  const commonThresholds = {
    http_req_failed: [threshold('K6_HTTP_FAIL_RATE', 'rate<0.02')],
    http_req_duration: [threshold('K6_HTTP_P95', 'p(95)<800'), threshold('K6_HTTP_P99', 'p(99)<1500')],
    gam_login_success_rate: [threshold('K6_LOGIN_SUCCESS_RATE', 'rate>0.98')],
  };

  if (selectedProfile === 'smoke') {
    return {
      scenarios: {
        smoke: {
          executor: 'constant-vus',
          vus: numberEnv('K6_VUS', 1),
          duration: __ENV.K6_DURATION || '30s',
        },
      },
      thresholds: {
        ...commonThresholds,
        http_req_failed: [threshold('K6_HTTP_FAIL_RATE', 'rate<0.05')],
      },
    };
  }

  if (selectedProfile === 'stress') {
    return {
      scenarios: {
        stress: {
          executor: 'ramping-vus',
          stages: [
            { duration: __ENV.K6_RAMP_UP || '2m', target: numberEnv('K6_STRESS_TARGET_VUS', 50) },
            { duration: __ENV.K6_HOLD || '5m', target: numberEnv('K6_STRESS_TARGET_VUS', 50) },
            { duration: __ENV.K6_RAMP_DOWN || '1m', target: 0 },
          ],
        },
      },
      thresholds: {
        ...commonThresholds,
        http_req_failed: [threshold('K6_HTTP_FAIL_RATE', 'rate<0.05')],
        http_req_duration: [threshold('K6_HTTP_P95', 'p(95)<1500'), threshold('K6_HTTP_P99', 'p(99)<3000')],
      },
    };
  }

  return {
    scenarios: {
      baseline: {
        executor: 'ramping-vus',
        stages: [
          { duration: __ENV.K6_RAMP_UP || '1m', target: numberEnv('K6_BASELINE_TARGET_VUS', 10) },
          { duration: __ENV.K6_HOLD || '3m', target: numberEnv('K6_BASELINE_TARGET_VUS', 10) },
          { duration: __ENV.K6_RAMP_DOWN || '30s', target: 0 },
        ],
      },
    },
    thresholds: commonThresholds,
  };
}

function postJson(url, payload, tags) {
  return http.post(url, JSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
    tags,
  });
}

function recordLogin(res, name, tags) {
  authLatency.add(res.timings.duration / 1000, tags);
  const ok = check(res, {
    [`${name} is 200`]: (response) => response.status === 200,
  });
  loginSuccessRate.add(ok, tags);
  if (!ok) {
    loginFailures.add(1, tags);
    apiErrors.add(1, tags);
  }
}

function expectOk(res, name, tags) {
  const ok = check(res, {
    [`${name} is 200`]: (response) => response.status === 200,
  });
  if (!ok) {
    apiErrors.add(1, tags);
  }
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function numberEnv(name, fallback) {
  const value = Number(__ENV[name] || fallback);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function threshold(name, fallback) {
  return __ENV[name] || fallback;
}

function textSummary(data) {
  const metrics = data.metrics || {};
  const p95 = metrics.http_req_duration?.values?.['p(95)'];
  const p99 = metrics.http_req_duration?.values?.['p(99)'];
  const failRate = metrics.http_req_failed?.values?.rate;
  const loginRate = metrics.gam_login_success_rate?.values?.rate;

  return [
    '',
    `k6 profile: ${profile}`,
    `user-api: ${userApiBaseUrl}`,
    includeCms ? `cms-api: ${cmsApiBaseUrl}` : 'cms-api: disabled',
    `http p95: ${formatNumber(p95)} ms`,
    `http p99: ${formatNumber(p99)} ms`,
    `http failure rate: ${formatPercent(failRate)}`,
    `login success rate: ${formatPercent(loginRate)}`,
    '',
  ].join('\n');
}

function formatNumber(value) {
  return typeof value === 'number' ? value.toFixed(2) : 'n/a';
}

function formatPercent(value) {
  return typeof value === 'number' ? `${(value * 100).toFixed(2)}%` : 'n/a';
}
