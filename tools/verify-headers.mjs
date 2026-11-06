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
    currentRule = { path: trimmed, headers: {}, detach: [], lineNum: i + 1 };
    rules.push(currentRule);
  } else {
    // Header definition
    if (!currentRule) {
      console.error(`FAIL [Line ${i + 1}]: Header without preceding path rule: "${line}"`);
      process.exit(1);
    }
    if (trimmed.startsWith('!')) {
      const detached = trimmed.slice(1).trim();
      if (!/^[a-zA-Z0-9\-_]+$/.test(detached)) {
        console.error(`FAIL [Line ${i + 1}]: Invalid detached header "${detached}"`);
        process.exit(1);
      }
      currentRule.detach.push(detached.toLowerCase());
      continue;
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
assert(!cspDirectives['script-src']?.includes("https://cdn.tailwindcss.com"), "CSP script-src no longer allows the unused Tailwind CDN");
assert(!cspDirectives['script-src']?.includes("https://cdnjs.cloudflare.com"), "CSP script-src no longer allows the unused cdnjs host");
assert(!cspDirectives['script-src']?.includes("'unsafe-inline'"), "CSP script-src no longer allows arbitrary inline scripts");
assert(cspDirectives['script-src']?.some(v => /^'sha256-/.test(v)), "CSP script-src carries sha256 hashes for the site's own inline scripts");
assert(cspDirectives['script-src']?.includes("https://static.cloudflareinsights.com"), "CSP script-src includes static.cloudflareinsights.com");
assert(cspDirectives['script-src']?.includes("https://challenges.cloudflare.com"), "CSP script-src includes challenges.cloudflare.com for Turnstile");
assert(cspDirectives['frame-src']?.includes("https://challenges.cloudflare.com"), "CSP frame-src includes challenges.cloudflare.com for Turnstile");

lines.forEach((line, i) => {
  assert(line.length <= 1950, `_headers line ${i + 1} is ${line.length} characters; Cloudflare Pages drops any line over 2,000, so keep a margin`);
});

// Verify OSM tiles
assert(cspDirectives['img-src']?.includes("https://tile.openstreetmap.org"), "CSP img-src includes bare tile.openstreetmap.org");
assert(cspDirectives['img-src']?.includes("https://*.tile.openstreetmap.org"), "CSP img-src includes *.tile.openstreetmap.org");

// Verify ArcGIS
assert(cspDirectives['img-src']?.includes("https://*.arcgisonline.com"), "CSP img-src covers server.arcgisonline.com through *.arcgisonline.com");
assert(cspDirectives['connect-src']?.includes("https://*.arcgisonline.com"), "CSP connect-src includes *.arcgisonline.com");

// Verify Supabase
const authConfig = fs.readFileSync(path.join(root, 'js', 'shared', 'auth-config.js'), 'utf8');
const supabaseHost = (/https:\/\/([a-z0-9-]+\.supabase\.co)/.exec(authConfig) || [])[1];
assert(supabaseHost, 'js/shared/auth-config.js names the Supabase project host');
assert(cspDirectives['connect-src']?.includes(`https://${supabaseHost}`), `CSP connect-src includes https://${supabaseHost}`);
assert(cspDirectives['connect-src']?.includes(`wss://${supabaseHost}`), `CSP connect-src includes wss://${supabaseHost}`);
assert(!cspDirectives['connect-src']?.some(v => v.includes('*.supabase.co')), 'CSP connect-src no longer allows every Supabase project');

// Verify Cloudflare Insights
assert(cspDirectives['connect-src']?.includes("https://cloudflareinsights.com"), "CSP connect-src includes cloudflareinsights.com");
assert(cspDirectives['connect-src']?.includes("blob:"), "CSP connect-src includes blob: so GLB textures can load");

// 3. Verify Cache-Control for HTML
const htmlRule = rules.find(r => r.path === '/*.html');
assert(htmlRule, 'Rule for "/*.html" exists');
assert(htmlRule?.headers['cache-control']?.value?.includes('must-revalidate'), 'HTML caching forces must-revalidate (prevents stale client pages)');

function effectiveHeaders(urlPath) {
  const out = new Map();
  const seen = new Set();
  for (const rule of rules) {
    const pattern = new RegExp('^' + rule.path.split('*').map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');
    if (!pattern.test(urlPath)) continue;
    rule.detach.forEach(name => out.delete(name));
    for (const [key, h] of Object.entries(rule.headers)) {
      if (seen.has(key) && out.has(key)) out.set(key, out.get(key) + ', ' + h.value);
      else out.set(key, h.value);
      seen.add(key);
    }
  }
  return out;
}

const IMMUTABLE = 'public, max-age=31536000, immutable';
const REVALIDATE = 'public, max-age=3600, stale-while-revalidate=86400';
['/models/*', '/assets/*', '/vendor/*', '/js/*', '/css/*', '/bible/*'].forEach(pathPattern => {
  const rule = rules.find(r => r.path === pathPattern);
  assert(rule, `Rule for "${pathPattern}" exists`);
  assert(rule?.headers['access-control-allow-origin']?.value === '*', `${pathPattern} allows CORS for preview and cross-origin usage`);
});

const expectations = [
  ['/models/full_body.0123456789ab.glb', IMMUTABLE, 'hashed models are immutable'],
  ['/js/shared/boot.0123456789ab.js', IMMUTABLE, 'hashed scripts are immutable'],
  ['/css/site.0123456789ab.css', IMMUTABLE, 'hashed stylesheets are immutable'],
  ['/assets/shelf/covers/vol-00-cf920485.jpg', IMMUTABLE, 'content-hashed shelf covers are immutable'],
  ['/assets/shelf/covers/thumbs/vol-00-edbaa5a8.webp', IMMUTABLE, 'content-hashed cover thumbnails are immutable'],
  ['/assets/study/audio/sitting-07-readalong.mp3', REVALIDATE, 'unhashed assets revalidate within an hour'],
  ['/assets/site/hero-main.jpg', REVALIDATE, 'unhashed site images revalidate within an hour'],
  ['/vendor/three/build/three.module.min.js', REVALIDATE, 'unhashed vendor files revalidate within an hour'],
  ['/bible/kjv.0123456789ab.json', IMMUTABLE, 'hashed Bible data is immutable'],
  ['/vendor/supabase/supabase.0123456789ab.js', IMMUTABLE, 'the hashed Supabase bundle is immutable'],
  ['/vendor/leaflet/leaflet.0123456789ab.js', IMMUTABLE, 'the hashed Leaflet script is immutable'],
  ['/vendor/three/build/three.core.min.js', REVALIDATE, 'three keeps its name, so it revalidates within an hour'],
  ['/study.html', 'public, max-age=0, must-revalidate', 'pages always revalidate'],
  ['/', 'public, max-age=0, must-revalidate', 'the home page always revalidates']
];
for (const [urlPath, expected, label] of expectations) {
  const got = effectiveHeaders(urlPath).get('cache-control');
  assert(got === expected, `${label}: ${urlPath} -> "${got}"`);
}
['/assets/*', '/vendor/*'].forEach(pathPattern => {
  const rule = rules.find(r => r.path === pathPattern);
  assert(!rule?.headers['cache-control']?.value?.includes('immutable'), `${pathPattern} is not immutable, because its files change in place`);
});
const coversRule = rules.find(r => r.path === '/assets/shelf/covers/*');
const assetsRule = rules.find(r => r.path === '/assets/*');
assert(coversRule && coversRule.detach.includes('cache-control'), '/assets/shelf/covers/* detaches the /assets/* Cache-Control before setting its own');
assert(coversRule && assetsRule && rules.indexOf(coversRule) > rules.indexOf(assetsRule), '/assets/shelf/covers/* comes after /assets/* so its detach applies');
assert(effectiveHeaders('/assets/shelf/covers/vol-00-cf920485.jpg').get('access-control-allow-origin') === '*', 'shelf covers keep CORS from /assets/*');

if (!passed) {
  console.error('\nVerification FAILED: One or more assertions did not pass.');
  process.exit(1);
}

console.log('\nVerification SUCCESSFUL: All _headers syntax, security, CORS, and caching rules verified!');
