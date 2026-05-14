const urls = process.argv.slice(2);
const timeoutMs = Number(process.env.WAIT_TIMEOUT_MS || 60000);
const intervalMs = Number(process.env.WAIT_INTERVAL_MS || 1000);

if (urls.length === 0) {
  console.error('Usage: node scripts/wait-http.mjs <url> [url...]');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function isReady(url) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    return response.ok;
  } catch {
    return false;
  }
}

const startedAt = Date.now();

while (Date.now() - startedAt < timeoutMs) {
  const results = await Promise.all(urls.map(isReady));
  if (results.every(Boolean)) {
    console.log(`Ready: ${urls.join(', ')}`);
    process.exit(0);
  }
  await sleep(intervalMs);
}

console.error(`Timed out waiting for: ${urls.join(', ')}`);
process.exit(1);
