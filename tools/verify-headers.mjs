import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const headersPath = path.join(root, '_headers');

console.log('--- Verifying _headers configuration ---');

if (!fs.existsSync(headersPath)) {
  console.error('FAIL: _headers file not found at', headersPath);
  process.exit(1);
}

const content = fs.readFileSync(headersPath, 'utf8');
const lines = content.split(/\r?\n/);

const rules = [];
let currentRule = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    continue;
  }

  if (!line.startsWith(' ') && !line.startsWith('\t')) {
    // Path definition
    currentRule = { path: trimmed, headers: {}, lineNum: i + 1 };
    rules.push(currentRule);
  } else {
    // Header definition
    if (!currentRule) {
      console.error(`FAIL [Line ${i + 1}]: Header without preceding path rule: "${line}"`);
      process.exit(1);
    }
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
      console.error(`FAIL [Line ${i + 1}]: Header missing colon separator: "${line}"`);
      process.exit(1);
    }
    const headerName = trimmed.slice(0, colonIdx).trim();
    const headerValue = trimmed.slice(colonIdx + 1).trim();

    // Validate header name format
    if (!/^[a-zA-Z0-9\-_]+$/.test(headerName)) {
      console.error(`FAIL [Line ${i + 1}]: Invalid header name "${headerName}"`);
      process.exit(1);
    }
    currentRule.headers[headerName.toLowerCase()] = { name: headerName, value: headerValue, lineNum: i + 1 };
  }
}

console.log(`Parsed ${rules.length} path rule blocks from _headers.`);

let passed = true;
function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    passed = false;
  } else {
    console.log(`PASS: ${message}`);
  }
}

// 1. Verify root rule `/*`
const rootRule = rules.find(r => r.path === '/*');
assert(rootRule, 'Rule for "/*" exists');

// Check security headers on `/*`
const rootH = rootRule.headers;
assert(rootH['x-content-type-options']?.value === 'nosniff', 'X-Content-Type-Options is nosniff');
assert(rootH['x-frame-options']?.value === 'deny' || rootH['x-frame-options']?.value === 'DENY', 'X-Frame-Options is DENY');
assert(rootH['referrer-policy']?.value === 'strict-origin-when-cross-origin', 'Referrer-Policy is strict-origin-when-cross-origin');
assert(rootH['strict-transport-security']?.value?.includes('max-age=31536000'), 'Strict-Transport-Security is enabled');
assert(!rootH['access-control-allow-origin'], 'Access-Control-Allow-Origin is NOT restricted on "/*" (avoids breaking preview deployments)');

// 2. Verify CSP on `/*`
const csp = rootH['content-security-policy']?.value;
assert(csp, 'Content-Security-Policy header exists on "/*"');

const cspDirectives = {};
csp.split(';').forEach(dir => {
  const parts = dir.trim().split(/\s+/);
  const name = parts[0];
  const values = parts.slice(1);
  if (name) {
    cspDirectives[name] = values;
  }
});

assert(cspDirectives['default-src']?.includes("'self'"), "CSP default-src includes 'self'");
assert(cspDirectives['script-src']?.includes("https://cdn.tailwindcss.com"), "CSP script-src includes Tailwind CDN");
assert(cspDirectives['script-src']?.includes("https://cdnjs.cloudflare.com"), "CSP script-src includes cdnjs (Tone.js)");
assert(cspDirectives['script-src']?.includes("https://static.cloudflareinsights.com"), "CSP script-src includes static.cloudflareinsights.com");

// Verify OSM tiles
assert(cspDirectives['img-src']?.includes("https://tile.openstreetmap.org"), "CSP img-src includes bare tile.openstreetmap.org");
assert(cspDirectives['img-src']?.includes("https://*.tile.openstreetmap.org"), "CSP img-src includes *.tile.openstreetmap.org");

// Verify ArcGIS
assert(cspDirectives['connect-src']?.includes("https://server.arcgisonline.com"), "CSP connect-src includes server.arcgisonline.com");
assert(cspDirectives['connect-src']?.includes("https://*.arcgisonline.com"), "CSP connect-src includes *.arcgisonline.com");

// Verify Supabase
assert(cspDirectives['connect-src']?.includes("https://*.supabase.co"), "CSP connect-src includes https://*.supabase.co");
assert(cspDirectives['connect-src']?.includes("wss://*.supabase.co"), "CSP connect-src includes wss://*.supabase.co");

// Verify Cloudflare Insights
assert(cspDirectives['connect-src']?.includes("https://cloudflareinsights.com"), "CSP connect-src includes cloudflareinsights.com");

// 3. Verify Cache-Control for HTML
const htmlRule = rules.find(r => r.path === '/*.html');
assert(htmlRule, 'Rule for "/*.html" exists');
assert(htmlRule?.headers['cache-control']?.value?.includes('must-revalidate'), 'HTML caching forces must-revalidate (prevents stale client pages)');

// 4. Verify Static Asset Rules (CORS & Immutable Cache)
['/models/*', '/assets/*', '/vendor/*'].forEach(pathPattern => {
  const rule = rules.find(r => r.path === pathPattern);
  assert(rule, `Rule for "${pathPattern}" exists`);
  assert(rule?.headers['access-control-allow-origin']?.value === '*', `${pathPattern} allows CORS for preview and cross-origin usage`);
  assert(rule?.headers['cache-control']?.value?.includes('immutable'), `${pathPattern} has immutable long-term caching`);
});

// 5. Verify Script & Stylesheet Asset Rules (CORS & Caching)
['/js/*', '/css/*'].forEach(pathPattern => {
  const rule = rules.find(r => r.path === pathPattern);
  assert(rule, `Rule for "${pathPattern}" exists`);
  assert(rule?.headers['access-control-allow-origin']?.value === '*', `${pathPattern} allows CORS for preview and cross-origin usage`);
  assert(rule?.headers['cache-control']?.value?.includes('max-age='), `${pathPattern} has long-term max-age caching`);
});

if (!passed) {
  console.error('\nVerification FAILED: One or more assertions did not pass.');
  process.exit(1);
}

console.log('\nVerification SUCCESSFUL: All _headers syntax, security, CORS, and caching rules verified!');
