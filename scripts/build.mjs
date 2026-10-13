// Generates the "Liquid Glass" SVG assets used by the profile README.
// Usage: node scripts/build.mjs            -> real stats from the GitHub API (needs GITHUB_TOKEN)
//        node scripts/build.mjs --sample   -> placeholder numbers, for previewing the design
// Options: --palette=neutral|rust (default rust), --out=<dir> (default assets)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const OUT = join(ROOT, arg('out', 'assets'));
const USER = process.env.GH_USER || 'guiboorges';
const SAMPLE = process.argv.includes('--sample');

const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PALETTES = {
 neutral: {
  dark: {
    base: '#0b0b0d', blobs: ['#3a3a3c', '#636366', '#2c2c2e', '#8e8e93', '#48484a'], blobOpacity: 0.55,
    grid: 'rgba(255,255,255,0.09)',
    text: '#f5f5f7', sub: 'rgba(245,245,247,0.62)',
    tint: 'rgba(28,28,30,0.38)', shine: 0.14, shadow: 0.55,
    role: ['#ffffff', '#d1d1d6', '#8e8e93'],
  },
  light: {
    base: '#e8e8ed', blobs: ['#ffffff', '#c7c7cc', '#f5f5f7', '#aeaeb2', '#d1d1d6'], blobOpacity: 0.9,
    grid: 'rgba(0,0,0,0.07)',
    text: '#1d1d1f', sub: 'rgba(29,29,31,0.58)',
    tint: 'rgba(255,255,255,0.5)', shine: 0.6, shadow: 0.12,
    role: ['#1d1d1f', '#48484a', '#8e8e93'],
  },
 },
 // "Industrial Rust Glow": #B7410E -> #FF7722 -> #FFE8D6 at 45 degrees
 rust: {
  dark: {
    base: ['#FF8A3D', '#E0600F', '#A63D0C'], blobs: ['#FF8A3D', '#FF7722', '#FF9A50', '#D9560F', '#FFB37A'], blobOpacity: 0.35,
    grid: 'rgba(255,232,214,0.10)',
    text: '#ffffff', sub: 'rgba(255,240,230,0.75)',
    tint: 'rgba(40,12,2,0.34)', shine: 0.16, shadow: 0.28,
    role: ['#ffffff', '#FFE8D6', '#FFB37A'],
  },
  light: {
    base: ['#FFE8D6', '#FF7722', '#B7410E'], blobs: ['#FFE8D6', '#FF9A50', '#FF7722', '#FFD1B0', '#B7410E'], blobOpacity: 0.3,
    grid: 'rgba(255,255,255,0.16)',
    text: '#ffffff', sub: 'rgba(255,255,255,0.9)',
    tint: 'rgba(120,36,4,0.26)', shine: 0.4, shadow: 0.2,
    role: ['#ffffff', '#FFF3EA', '#FFE8D6'],
  },
 },
};
const THEMES = PALETTES[arg('palette', 'rust')];

// Soft graphite / silver light pools (positions + drift path, relative to the canvas)
const BLOBS = [
  { r: 0.30, x: [0.15, 0.30, 0.10, 0.15], y: [0.30, 0.65, 0.55, 0.30] },
  { r: 0.26, x: [0.45, 0.60, 0.40, 0.45], y: [0.75, 0.35, 0.20, 0.75] },
  { r: 0.22, x: [0.80, 0.65, 0.85, 0.80], y: [0.25, 0.55, 0.70, 0.25] },
  { r: 0.18, x: [0.92, 0.80, 0.70, 0.92], y: [0.85, 0.20, 0.50, 0.85] },
  { r: 0.14, x: [0.35, 0.20, 0.55, 0.35], y: [0.10, 0.30, 0.90, 0.10] },
];

// Neutral wallpaper: drifting light pools plus a faint grid, defined once as #wall and
// reused inside every glass pane, so the glass visibly bends the lines behind it.
function wallpaper(w, h, t, dur = 24) {
  const blobs = BLOBS.map((b, i) => {
    const r = Math.round(b.r * Math.max(w, h * 2.2));
    const xs = b.x.map((v) => Math.round(v * w)).join(';');
    const ys = b.y.map((v) => Math.round(v * h)).join(';');
    return `<circle r="${r}" fill="${t.blobs[i]}" opacity="${t.blobOpacity}">
      <animate attributeName="cx" values="${xs}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1"/>
      <animate attributeName="cy" values="${ys}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1;.45 0 .55 1"/>
    </circle>`;
  }).join('');
  return `
    <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${Math.round(h / 5)}"/></filter>
    <filter id="refract" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.004 0.008" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="46" xChannelSelector="R" yChannelSelector="G" result="d"/>
      <feGaussianBlur in="d" stdDeviation="2.5"/>
    </filter>
    <pattern id="grid" width="36" height="36" patternUnits="userSpaceOnUse">
      <path d="M36 0H0V36" fill="none" stroke="${t.grid}" stroke-width="1"/>
    </pattern>
    <radialGradient id="fade" cx=".5" cy=".5" r=".75"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <mask id="gridmask"><rect width="${w}" height="${h}" fill="url(#fade)"/></mask>
    ${Array.isArray(t.base) ? `<linearGradient id="baseg" x1="0" y1="${h}" x2="${h}" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="scale(${w / h} 1)">
      ${t.base.map((c, i) => `<stop offset="${i / (t.base.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient>` : ''}
    <g id="wall"><rect width="${w}" height="${h}" fill="${Array.isArray(t.base) ? 'url(#baseg)' : t.base}"/><g filter="url(#soft)">${blobs}</g><rect width="${w}" height="${h}" fill="url(#grid)" mask="url(#gridmask)"/></g>`;
}

// A pane of liquid glass: refracted + frosted copy of the wallpaper,
// a tint, a specular sheen on top and a light-catching rim.
let paneId = 0;
function glass(x, y, w, h, r, t, { magnify = 1.12 } = {}) {
  const id = `p${paneId++}`;
  const cx = x + w / 2, cy = y + h / 2;
  return `
  <defs>
    <clipPath id="${id}c"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="${t.shine}"/>
      <stop offset=".45" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${id}r" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".95"/>
      <stop offset=".3" stop-color="#fff" stop-opacity=".18"/>
      <stop offset=".7" stop-color="#fff" stop-opacity=".06"/>
      <stop offset="1" stop-color="#fff" stop-opacity=".6"/>
    </linearGradient>
    <filter id="${id}d" x="-20%" y="-20%" width="140%" height="160%">
      <feDropShadow dx="0" dy="${Math.round(h / 12)}" stdDeviation="${Math.round(h / 8)}" flood-color="#000" flood-opacity="${t.shadow}"/>
    </filter>
  </defs>
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="#000" filter="url(#${id}d)" opacity=".5"/>
  <g clip-path="url(#${id}c)">
    <g transform="translate(${cx} ${cy}) scale(${magnify}) translate(${-cx} ${-cy})"><use href="#wall" filter="url(#refract)"/></g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${t.tint}"/>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}s)"/>
  </g>
  <rect x="${x + 0.75}" y="${y + 0.75}" width="${w - 1.5}" height="${h - 1.5}" rx="${r}" fill="none" stroke="url(#${id}r)" stroke-width="1.5"/>`;
}

function svg(w, h, t, body, dur) {
  paneId = 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">
  <defs>${wallpaper(w, h, t, dur)}<clipPath id="frame"><rect width="${w}" height="${h}" rx="28"/></clipPath></defs>
  <g clip-path="url(#frame)"><use href="#wall"/>${body()}</g>
</svg>\n`;
}

// ---------- header: name + typing role, alternating EN / PT ----------
function typing(x, y, lines, size, t) {
  const CH = size * 0.5, PER = 0.06, HOLD = 2.6, ERASE = 0.5;
  const segs = lines.map((s) => ({ s, w: Math.ceil(s.length * CH) + 8 }));
  const total = segs.reduce((a, g) => a + g.s.length * PER + HOLD + ERASE, 0);
  const times = [], widths = [], vis = segs.map(() => []);
  let at = 0;
  segs.forEach((g, i) => {
    const steps = g.s.length;
    for (let k = 0; k <= steps; k++) { times.push(at + k * PER); widths.push(Math.round((k / steps) * g.w)); }
    at += steps * PER + HOLD; times.push(at); widths.push(g.w);
    at += ERASE; times.push(at); widths.push(0);
  });
  const kt = times.map((v) => (v / total).toFixed(4));
  kt[0] = '0'; kt[kt.length - 1] = '1';
  // which line is visible at each keyframe
  let idx = 0, acc = 0;
  const bounds = segs.map((g) => (acc += g.s.length * PER + HOLD + ERASE));
  const lineAt = times.map((v) => { while (idx < bounds.length - 1 && v >= bounds[idx] - 1e-6) idx++; return idx; });
  segs.forEach((_, i) => lineAt.forEach((l) => vis[i].push(l === i ? 1 : 0)));
  vis.forEach((v, i) => { v[v.length - 1] = i === 0 ? 1 : 0; });

  const anim = (attr, vals, extra = '') => `<animate attributeName="${attr}" values="${vals.join(';')}" keyTimes="${kt.join(';')}" dur="${total.toFixed(2)}s" repeatCount="indefinite" calcMode="discrete"${extra}/>`;
  return `
  <defs>
    <clipPath id="type"><rect x="${x}" y="${y - size}" width="0" height="${size * 1.4}">${anim('width', widths)}</rect></clipPath>
    <linearGradient id="role" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${t.role[0]}"/><stop offset=".5" stop-color="${t.role[1]}"/><stop offset="1" stop-color="${t.role[2]}"/>
    </linearGradient>
  </defs>
  <g clip-path="url(#type)" font-size="${size}" font-weight="600" letter-spacing="-0.5" fill="url(#role)">
    ${segs.map((g, i) => `<text x="${x}" y="${y}" textLength="${g.w - 8}" lengthAdjust="spacing" opacity="${i === 0 ? 1 : 0}">${anim('opacity', vis[i])}${esc(g.s)}</text>`).join('')}
  </g>
  <rect y="${y - size * 0.82}" width="3" height="${size * 0.98}" rx="1.5" fill="${t.text}" x="${x}">
    ${anim('x', widths.map((v) => x + v + 3))}
    <animate attributeName="opacity" values="1;1;0;0" keyTimes="0;.5;.5;1" dur="1s" repeatCount="indefinite"/>
  </rect>`;
}

function header(t) {
  const W = 1200, H = 420;
  return svg(W, H, t, () => `
  ${glass(56, 56, W - 112, H - 112, 44, t)}
  <g transform="translate(100 104)">
    <circle r="7" fill="#FF5F57"/><circle cx="24" r="7" fill="#FEBC2E"/><circle cx="48" r="7" fill="#28C840"/>
  </g>
  ${glass(W - 396, 84, 296, 40, 20, t, { magnify: 1.3 })}
  <g transform="translate(${W - 372} 104)">
    <circle r="5" fill="#30D158"><animate attributeName="opacity" values="1;.35;1" dur="2s" repeatCount="indefinite"/></circle>
    <text x="16" y="5.5" font-size="15" font-weight="500" textLength="230" lengthAdjust="spacingAndGlyphs" fill="${t.text}">Open to projects · Disponível</text>
  </g>
  <text x="100" y="212" font-size="68" font-weight="700" letter-spacing="-2" fill="${t.text}">Guilherme Borges</text>
  ${typing(102, 268, ['AI Automation Developer', 'Dev & Automação com IA'], 32, t)}
  <text x="102" y="322" font-size="18" font-weight="500" fill="${t.sub}">AI agents · Automation · Full-stack web · Design</text>`);
}

// ---------- dock: tech stack as app icons ----------
const STACK = [
  { slug: 'python', name: 'Python', g: ['#4B8BBE', '#2b5b84'], fg: '#FFD43B' },
  { slug: 'typescript', name: 'TypeScript', g: ['#4a90e2', '#235a97'], fg: '#fff' },
  { slug: 'react', name: 'React', g: ['#2c3140', '#14161c'], fg: '#61DAFB' },
  { slug: 'nextdotjs', name: 'Next.js', g: ['#3a3a3c', '#000'], fg: '#fff' },
  { slug: 'nodedotjs', name: 'Node.js', g: ['#7cc26a', '#3d7a32'], fg: '#fff' },
  { slug: 'supabase', name: 'Supabase', g: ['#2a2a2e', '#121214'], fg: '#3ECF8E' },
  { slug: 'postgresql', name: 'Postgres', g: ['#5b82ef', '#2f4fb0'], fg: '#fff' },
  { slug: 'vercel', name: 'Vercel', g: ['#3a3a3c', '#000'], fg: '#fff' },
  { slug: 'figma', name: 'Figma', g: ['#F24E1E', '#A259FF'], fg: '#fff' },
  { slug: 'claude', name: 'Claude', g: ['#e8916f', '#c0603f'], fg: '#fff' },
];
const iconPath = (slug) => readFileSync(join(ROOT, 'scripts/icons', `${slug}.svg`), 'utf8').match(/<path d="([^"]+)"/)[1];

function dock(t) {
  const W = 1200, H = 230, S = 76, GAP = 20, PAD = 22;
  const dw = STACK.length * S + (STACK.length - 1) * GAP + PAD * 2, dh = S + PAD * 2;
  const dx = (W - dw) / 2, dy = 36;
  return svg(W, H, t, () => `
  ${glass(dx, dy, dw, dh, 38, t, { magnify: 1.18 })}
  ${STACK.map((s, i) => {
    const x = dx + PAD + i * (S + GAP), y = dy + PAD;
    return `<g>
      <animateTransform attributeName="transform" type="translate" values="0 0;0 0;0 -10;0 0;0 0" keyTimes="0;${(0.05 + i * 0.03).toFixed(2)};${(0.09 + i * 0.03).toFixed(2)};${(0.14 + i * 0.03).toFixed(2)};1" dur="7s" repeatCount="indefinite"/>
      <defs>
        <linearGradient id="ig${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.g[0]}"/><stop offset="1" stop-color="${s.g[1]}"/></linearGradient>
        <linearGradient id="ih${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".38"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
      </defs>
      <rect x="${x}" y="${y}" width="${S}" height="${S}" rx="${S * 0.235}" fill="url(#ig${i})"/>
      <rect x="${x}" y="${y}" width="${S}" height="${S}" rx="${S * 0.235}" fill="url(#ih${i})"/>
      <rect x="${x + 0.5}" y="${y + 0.5}" width="${S - 1}" height="${S - 1}" rx="${S * 0.235}" fill="none" stroke="#fff" stroke-opacity=".28"/>
      <path transform="translate(${x + S * 0.24} ${y + S * 0.24}) scale(${(S * 0.52) / 24})" d="${iconPath(s.slug)}" fill="${s.fg}"/>
      <text x="${x + S / 2}" y="${dy + dh + 30}" text-anchor="middle" font-size="14" font-weight="500" fill="${t.sub}">${esc(s.name)}</text>
    </g>`;
  }).join('')}`, 30);
}

// ---------- stats: iOS-style widgets ----------
const LANG_COLORS = { TypeScript: '#3178C6', JavaScript: '#F7DF1E', Python: '#3572A5', HTML: '#E34C26', CSS: '#663399', Shell: '#89E051' };

async function fetchStats() {
  if (SAMPLE) return { repos: 12, commits: 248, stars: 37, followers: 21, langs: [['TypeScript', 46], ['Python', 31], ['JavaScript', 15], ['CSS', 8]] };
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN is required (or pass --sample)');
  const query = `query($login:String!){user(login:$login){
    followers{totalCount}
    contributionsCollection{totalCommitContributions restrictedContributionsCount}
    repositories(first:100, ownerAffiliations:OWNER, isFork:false){totalCount nodes{stargazerCount languages(first:10){edges{size node{name}}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const { data, errors } = await res.json();
  if (errors) throw new Error(JSON.stringify(errors));
  const u = data.user, bytes = {};
  for (const r of u.repositories.nodes) for (const e of r.languages.edges) bytes[e.node.name] = (bytes[e.node.name] || 0) + e.size;
  const sum = Object.values(bytes).reduce((a, b) => a + b, 0) || 1;
  const langs = Object.entries(bytes).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([n, b]) => [n, Math.round((b / sum) * 100)]);
  return {
    repos: u.repositories.totalCount,
    commits: u.contributionsCollection.totalCommitContributions + u.contributionsCollection.restrictedContributionsCount,
    stars: u.repositories.nodes.reduce((a, r) => a + r.stargazerCount, 0),
    followers: u.followers.totalCount,
    langs,
  };
}

function stats(t, d) {
  const W = 1200, H = 280, Y = 40, WH = 200, R = 34, GAP = 20;
  const small = [
    ['Commits', 'this year · este ano', d.commits, '#30D158'],
    ['Repos', 'public · públicos', d.repos, '#0A84FF'],
    ['Stars', 'earned · recebidas', d.stars, '#FF9F0A'],
  ];
  const sw = 210, ww = 1200 - 120 - 3 * sw - 3 * GAP;
  const widgets = small.map(([k, sub, v, c], i) => {
    const x = 60 + i * (sw + GAP);
    return `${glass(x, Y, sw, WH, R, t)}
    <circle cx="${x + 34}" cy="${Y + 38}" r="10" fill="${c}"/>
    <text x="${x + 54}" y="${Y + 44}" font-size="17" font-weight="600" fill="${t.text}">${k}</text>
    <text x="${x + 24}" y="${Y + 132}" font-size="60" font-weight="700" letter-spacing="-2" fill="${t.text}">${v}</text>
    <text x="${x + 26}" y="${Y + 168}" font-size="14" font-weight="500" fill="${t.sub}">${esc(sub)}</text>`;
  }).join('');
  const x = 60 + 3 * (sw + GAP), bw = ww - 52;
  let off = 0;
  const langs = d.langs.length ? d.langs : [['No code yet · Sem código ainda', 100]];
  const bar = langs.map(([n, p]) => {
    const w = (p / 100) * bw, r = `<rect x="${x + 26 + off}" y="${Y + 76}" width="${Math.max(w - 3, 2)}" height="12" rx="6" fill="${LANG_COLORS[n] || '#8E8E93'}"/>`;
    off += w; return r;
  }).join('');
  const legend = langs.map(([n, p], i) => {
    const lx = x + 26 + (i % 2) * (bw / 2), ly = Y + 128 + Math.floor(i / 2) * 34;
    return `<circle cx="${lx + 6}" cy="${ly - 5}" r="6" fill="${LANG_COLORS[n] || '#8E8E93'}"/>
    <text x="${lx + 20}" y="${ly}" font-size="15" font-weight="500" fill="${t.text}">${esc(n)} <tspan fill="${t.sub}">${d.langs.length ? p + '%' : ''}</tspan></text>`;
  }).join('');
  return svg(W, H, t, () => `${widgets}
  ${glass(x, Y, ww, WH, R, t)}
  <text x="${x + 26}" y="${Y + 44}" font-size="17" font-weight="600" fill="${t.text}">Top languages <tspan fill="${t.sub}" font-weight="500">· linguagens</tspan></text>
  ${bar}${legend}`, 28);
}

const data = await fetchStats();
mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(OUT, `header-${name}.svg`), header(t));
  writeFileSync(join(OUT, `stack-${name}.svg`), dock(t));
  writeFileSync(join(OUT, `stats-${name}.svg`), stats(t, data));
}
// Stamp each asset URL in the README with a content hash, so browsers fetch the new
// image as soon as it changes instead of showing a cached copy for a few minutes.
const README = join(ROOT, 'README.md');
if (OUT === join(ROOT, 'assets') && existsSync(README)) {
  const md = readFileSync(README, 'utf8').replace(/assets\/([\w-]+\.svg)(\?v=\w+)?/g, (_, f) =>
    `assets/${f}?v=${createHash('sha1').update(readFileSync(join(OUT, f))).digest('hex').slice(0, 8)}`);
  writeFileSync(README, md);
}
console.log('assets written:', data);
