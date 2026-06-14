import { execFile } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const MARKER = '<!-- gam-ai-code-review -->';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const DEFAULT_MAX_DIFF_CHARS = 60000;
const DEFAULT_MAX_FILES = 80;
const GITHUB_API_VERSION = '2022-11-28';
const REVIEW_COMMENT_LIMIT = 62000;

const env = process.env;
const dryRun = env.AI_REVIEW_DRY_RUN === '1';

function parsePositiveInt(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function requiredEnv(name, fallback) {
  const value = env[name] || fallback;
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function truncate(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[truncated ${text.length - maxLength} chars]`;
}

async function writeSummary(message) {
  if (!env.GITHUB_STEP_SUMMARY) {
    console.log(message);
    return;
  }
  await appendFile(env.GITHUB_STEP_SUMMARY, `${message}\n`);
}

async function git(args) {
  const { stdout } = await execFileAsync('git', args, {
    maxBuffer: 50 * 1024 * 1024,
  });
  return stdout;
}

function parseNameStatus(output) {
  return output
    .split('\n')
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('\t');
      const status = parts[0] || '';
      const path = parts.at(-1) || '';
      const oldPath = parts.length > 2 ? parts[1] : undefined;
      return { status, path, oldPath };
    })
    .filter((file) => file.path);
}

function isLockFile(path) {
  return /(^|\/)(pnpm-lock\.yaml|package-lock\.json|yarn\.lock|bun\.lockb|Cargo\.lock|Pipfile\.lock|poetry\.lock|Gemfile\.lock)$/i.test(path);
}

function isExcludedPath(path) {
  const normalized = path.replaceAll('\\', '/');
  if (/^\.env($|\.)/i.test(normalized) || /(^|\/)\.env($|\.)/i.test(normalized)) return true;
  if (/(^|\/)(node_modules|target|dist|build|coverage|test-results|reports|\.next|\.turbo|\.expo)\//.test(normalized)) return true;
  if (/(^|\/)(generated|__generated__)\//.test(normalized)) return true;
  if (/\.(png|jpe?g|gif|webp|ico|avif|mp4|mov|webm|mp3|wav|flac|pdf|zip|gz|tgz|xz|7z|woff2?|ttf|eot)$/i.test(normalized)) return true;
  if (/\.(min\.js|min\.css|map)$/i.test(normalized)) return true;
  return false;
}

function redactSecrets(text) {
  return text
    .replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_OPENAI_KEY]')
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED_AWS_ACCESS_KEY]')
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+/=-]{16,}/gi, '$1[REDACTED]')
    .replace(/\b(AWS_SECRET_ACCESS_KEY\s*=\s*)\S+/gi, '$1[REDACTED]')
    .replace(/\b((?:api[_-]?key|access[_-]?token|auth[_-]?token|refresh[_-]?token|secret|password|passwd|authorization)\s*[:=]\s*)(["']?)[^"'\s,]+/gi, '$1$2[REDACTED]');
}

function buildFileSummary(files) {
  if (files.length === 0) return '- No changed files found.';
  return files
    .map((file) => {
      const rename = file.oldPath ? ` from ${file.oldPath}` : '';
      return `- ${file.status} ${file.path}${rename}`;
    })
    .join('\n');
}

async function buildDiffContext(baseSha, headSha, maxFiles, maxDiffChars) {
  const nameStatus = await git(['diff', '--name-status', '--find-renames', `${baseSha}...${headSha}`]);
  const changedFiles = parseNameStatus(nameStatus);
  const lockFiles = changedFiles.filter((file) => isLockFile(file.path));
  const excludedFiles = changedFiles.filter((file) => !isLockFile(file.path) && isExcludedPath(file.path));
  const reviewableFiles = changedFiles.filter((file) => !isLockFile(file.path) && !isExcludedPath(file.path));
  const selectedFiles = reviewableFiles.slice(0, maxFiles);
  const fileLimitExceeded = reviewableFiles.length > selectedFiles.length;

  let diff = '';
  let truncated = false;

  for (const file of selectedFiles) {
    const remaining = maxDiffChars - diff.length;
    if (remaining <= 0) {
      truncated = true;
      break;
    }

    const fileDiff = await git(['diff', '--find-renames', '--unified=80', `${baseSha}...${headSha}`, '--', file.path]);
    if (!fileDiff.trim()) continue;

    const redacted = redactSecrets(fileDiff);
    const chunk = `\n\n### ${file.path}\n\n${redacted}`;
    if (chunk.length > remaining) {
      diff += chunk.slice(0, remaining);
      truncated = true;
      break;
    }
    diff += chunk;
  }

  return {
    changedFiles,
    lockFiles,
    excludedFiles,
    reviewableFiles,
    selectedFiles,
    fileLimitExceeded,
    truncated,
    diff: diff.trim(),
  };
}

function createPrompt({ repository, prNumber, baseSha, headSha, context }) {
  const skipped = [
    ...context.lockFiles.map((file) => `${file.path} (lockfile summarized only)`),
    ...context.excludedFiles.map((file) => `${file.path} (excluded generated/binary/sensitive path)`),
  ];

  return [
    `Repository: ${repository}`,
    `Pull Request: #${prNumber}`,
    `Base SHA: ${baseSha}`,
    `Head SHA: ${headSha}`,
    '',
    'Changed files:',
    buildFileSummary(context.changedFiles),
    '',
    skipped.length > 0 ? `Skipped files:\n${skipped.map((path) => `- ${path}`).join('\n')}` : 'Skipped files: none',
    context.fileLimitExceeded ? `\nFile limit note: reviewed first ${context.selectedFiles.length} of ${context.reviewableFiles.length} reviewable files.` : '',
    context.truncated ? `\nDiff limit note: diff was truncated to fit MAX_DIFF_CHARS.` : '',
    '',
    'Reviewable diff:',
    context.diff || '[No reviewable source diff after filters.]',
  ].filter(Boolean).join('\n');
}

const REVIEW_INSTRUCTIONS = `
你是 Game Trade Platform 的資深 code reviewer。請用繁體中文回覆。

請只根據提供的 PR diff 做 advisory review。不要要求大規模重構，不要評論純格式或偏好問題。

優先找：
- correctness / regression / edge case
- security、secret/token/body 洩漏、auth/permission 問題
- migration、Terraform/IaC、observability 成本或資料基數風險
- concurrency、race condition、timeout、error handling
- 明顯缺失的測試

輸出格式固定：
## Verdict
一句話，使用「Looks good」或「Needs attention」開頭。

## Findings
若有問題，依 High / Medium / Low 排序，提供檔案路徑與可操作建議。若沒有，寫「No blocking findings.」

## Test Gaps
列出值得補的測試；若沒有，寫「No specific gaps found from the diff.」

## Limitations
簡短說明本次 review 只看 diff、部分檔案可能被略過或截斷。
`.trim();

async function callOpenAI({ apiKey, model, prompt }) {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      instructions: REVIEW_INSTRUCTIONS,
      input: prompt,
      max_output_tokens: 2500,
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI API returned ${response.status}: ${truncate(responseText, 1200)}`);
  }

  const payload = JSON.parse(responseText);
  return extractOutputText(payload);
}

function extractOutputText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const parts = [];
  for (const item of payload.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === 'string') parts.push(content.text);
    }
  }

  const text = parts.join('\n').trim();
  if (!text) throw new Error('OpenAI response did not include output text.');
  return text;
}

async function githubRequest(method, path, body) {
  const token = requiredEnv('GITHUB_TOKEN', dryRun ? 'dry-run-token' : undefined);
  const apiUrl = env.GITHUB_API_URL || 'https://api.github.com';
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': GITHUB_API_VERSION,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub API ${method} ${path} returned ${response.status}: ${truncate(responseText, 1200)}`);
  }

  if (!responseText) return null;
  return JSON.parse(responseText);
}

async function findExistingReviewComment(owner, repo, prNumber) {
  for (let page = 1; page <= 3; page += 1) {
    const comments = await githubRequest(
      'GET',
      `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100&page=${page}`,
    );
    const existing = comments.find((comment) => comment.body?.includes(MARKER));
    if (existing) return existing;
    if (comments.length < 100) return null;
  }
  return null;
}

async function upsertReviewComment({ repository, prNumber, body }) {
  const [owner, repo] = repository.split('/');
  if (!owner || !repo) throw new Error(`Invalid GITHUB_REPOSITORY: ${repository}`);

  const existing = await findExistingReviewComment(owner, repo, prNumber);
  if (existing) {
    await githubRequest('PATCH', `/repos/${owner}/${repo}/issues/comments/${existing.id}`, { body });
    return 'updated';
  }

  await githubRequest('POST', `/repos/${owner}/${repo}/issues/${prNumber}/comments`, { body });
  return 'created';
}

function createCommentBody({ model, headSha, context, reviewText }) {
  const skippedCount = context.lockFiles.length + context.excludedFiles.length;
  const notices = [
    context.fileLimitExceeded ? `Reviewed first ${context.selectedFiles.length} of ${context.reviewableFiles.length} reviewable files.` : null,
    context.truncated ? 'Diff was truncated by MAX_DIFF_CHARS.' : null,
    skippedCount > 0 ? `${skippedCount} generated, binary, sensitive, or lock files were skipped/summarized.` : null,
  ].filter(Boolean);

  const body = [
    MARKER,
    '## AI Code Review',
    '',
    `- Model: \`${model}\``,
    `- Head: \`${headSha.slice(0, 12)}\``,
    `- Files: ${context.changedFiles.length} changed, ${context.selectedFiles.length} reviewed`,
    '- Mode: advisory only; this comment does not approve, request changes, or block merge.',
    notices.length > 0 ? `- Notes: ${notices.join(' ')}` : null,
    '',
    reviewText,
  ].filter(Boolean).join('\n');

  return truncate(body, REVIEW_COMMENT_LIMIT);
}

async function run() {
  const model = env.OPENAI_MODEL || DEFAULT_MODEL;
  const maxDiffChars = parsePositiveInt(env.MAX_DIFF_CHARS, DEFAULT_MAX_DIFF_CHARS);
  const maxFiles = parsePositiveInt(env.MAX_FILES, DEFAULT_MAX_FILES);
  const repository = requiredEnv('GITHUB_REPOSITORY', dryRun ? 'local/dry-run' : undefined);
  const prNumber = requiredEnv('PR_NUMBER', dryRun ? '0' : undefined);
  const baseSha = requiredEnv('BASE_SHA', dryRun ? 'HEAD~1' : undefined);
  const headSha = requiredEnv('HEAD_SHA', dryRun ? 'HEAD' : undefined);

  const context = await buildDiffContext(baseSha, headSha, maxFiles, maxDiffChars);
  const prompt = createPrompt({ repository, prNumber, baseSha, headSha, context });

  if (dryRun) {
    console.log('AI_REVIEW_DRY_RUN=1; skipping OpenAI call and GitHub comment.');
    console.log(`Model: ${model}`);
    console.log(`Changed files: ${context.changedFiles.length}`);
    console.log(`Reviewed files: ${context.selectedFiles.length}`);
    console.log(`Prompt chars: ${prompt.length}`);
    console.log('\nPrompt preview:\n');
    console.log(truncate(prompt, 4000));
    return;
  }

  const apiKey = env.OPENAI_API_KEY || '';
  if (!apiKey.trim()) {
    await writeSummary('## AI Code Review\n\nSkipped because `OPENAI_API_KEY` is not configured.');
    return;
  }

  let reviewText;
  if (!context.diff) {
    reviewText = [
      '## Verdict',
      'Looks good: no reviewable source diff remained after filters.',
      '',
      '## Findings',
      'No blocking findings.',
      '',
      '## Test Gaps',
      'No specific gaps found from the diff.',
      '',
      '## Limitations',
      'Only changed-file metadata was available because generated, binary, sensitive, or lock files were skipped/summarized.',
    ].join('\n');
  } else {
    reviewText = await callOpenAI({ apiKey, model, prompt });
  }

  const body = createCommentBody({ model, headSha, context, reviewText });
  const action = await upsertReviewComment({ repository, prNumber, body });
  await writeSummary(`## AI Code Review\n\nPR comment ${action}. Reviewed ${context.selectedFiles.length} files with \`${model}\`.`);
}

run().catch(async (error) => {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  console.error(message);
  await writeSummary(`## AI Code Review\n\nNon-blocking failure:\n\n\`\`\`text\n${truncate(message, 4000)}\n\`\`\``);
  process.exit(0);
});
