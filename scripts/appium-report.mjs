import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_REPORT_DIR = 'reports/appium';

function safeName(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatDuration(ms) {
  if (!Number.isFinite(ms)) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function renderMarkdown(report) {
  const lines = [
    `# ${report.title || report.name || 'Appium Test Report'}`,
    '',
    `- Status: ${report.status}`,
    `- Started: ${report.startedAt}`,
    `- Ended: ${report.endedAt}`,
    `- Duration: ${formatDuration(report.durationMs)}`,
    `- Platform: ${report.platform}`,
    `- Device: ${report.device?.name || ''}${report.device?.udid ? ` (${report.device.udid})` : ''}`,
    `- App: ${report.app?.id || ''}`,
    `- Server: ${report.appiumServerUrl || ''}`,
    `- Username: ${report.login?.username || ''}`,
  ];

  if (report.sessionSummary) {
    lines.push('', '## Session', '', '```text', report.sessionSummary, '```');
  }

  if (report.response) {
    lines.push('', '## Response', '', '```text', report.response, '```');
  }

  if (report.error) {
    lines.push('', '## Error', '', '```text', report.error.message || String(report.error), '```');
  }

  return `${lines.join('\n')}\n`;
}

export async function writeAppiumReport(report) {
  const reportDir = process.env.APPIUM_REPORT_DIR || DEFAULT_REPORT_DIR;
  await mkdir(reportDir, { recursive: true });

  const name = safeName(report.name || 'appium-test');
  const timestamp = safeName(report.startedAt || new Date().toISOString());
  const baseName = `${timestamp}-${name}`;
  const jsonPath = path.join(reportDir, `${baseName}.json`);
  const mdPath = path.join(reportDir, `${baseName}.md`);
  const latestJsonPath = path.join(reportDir, `latest-${name}.json`);
  const latestMdPath = path.join(reportDir, `latest-${name}.md`);

  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, renderMarkdown(report), 'utf8');
  await copyFile(jsonPath, latestJsonPath);
  await copyFile(mdPath, latestMdPath);

  return { jsonPath, mdPath, latestJsonPath, latestMdPath };
}
