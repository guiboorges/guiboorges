// Generates the SVG cards used by the profile README.
// Every card is static on purpose: no animation and no SVG filters, so the profile page
// costs the browser one paint per image instead of re-rendering blurs on every frame.
// Usage: node scripts/build.mjs            -> real stats from the GitHub API (needs GITHUB_TOKEN)
//        node scripts/build.mjs --sample   -> placeholder numbers, for previewing the design
// Options: --out=<dir> (default assets)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').split('=')[1] || d;
const OUT = resolve(ROOT, arg('out', 'assets'));
const USER = process.env.GH_USER || 'guiboorges';
const SAMPLE = process.argv.includes('--sample');

const FONT = `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Neutral surfaces that sit quietly on GitHub's own background, with rust as the only accent.
const THEMES = {
  light: {
    card: '#f5f5f7', line: 'rgba(0,0,0,0.08)', tile: '#ffffff',
    text: '#1d1d1f', sub: '#6e6e73', faint: '#86868b',
    accent: '#B7410E', role: ['#B7410E', '#FF7722'], glow: 0.14,
  },
  dark: {
    card: '#161b22', line: 'rgba(255,255,255,0.09)', tile: '#1f252d',
    text: '#f5f5f7', sub: '#a1a1a6', faint: '#86868b',
    accent: '#FF8A3D', role: ['#FF7722', '#FFC08F'], glow: 0.2,
  },
};

const textW = (s, size, k = 0.56) => Math.round(s.length * size * k);

// A rounded surface filling the whole image; `glow` adds a soft rust light from the top.
function card(w, h, t, body, { glow = false, r = 28 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">
  ${glow ? `<defs><radialGradient id="glow" cx=".5" cy="0" r=".9"><stop offset="0" stop-color="#FF7722" stop-opacity="${t.glow}"/><stop offset="1" stop-color="#FF7722" stop-opacity="0"/></radialGradient></defs>` : ''}
  <rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="${t.card}" stroke="${t.line}"/>
  ${glow ? `<rect x=".5" y=".5" width="${w - 1}" height="${h - 1}" rx="${r}" fill="url(#glow)"/>` : ''}
  ${body}
</svg>\n`;
}

const title = (x, y, s, t) => `<text x="${x}" y="${y}" font-size="28" font-weight="700" letter-spacing="-0.6" fill="${t.text}">${esc(s)}</text>`;

// ---------- header ----------
function header(t) {
  const W = 1200, H = 380, cx = W / 2;
  const pill = 'Open to projects', pw = 18 + 10 + 10 + textW(pill, 15, 0.5) + 18;
  return card(W, H, t, `
  <defs><linearGradient id="role" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${t.role[0]}"/><stop offset="1" stop-color="${t.role[1]}"/></linearGradient></defs>
  <rect x="${cx - pw / 2}" y="68" width="${pw}" height="36" rx="18" fill="${t.tile}" stroke="${t.line}"/>
  <circle cx="${cx - pw / 2 + 23}" cy="86" r="5" fill="#30D158"/>
  <text x="${cx - pw / 2 + 38}" y="91" font-size="15" font-weight="500" fill="${t.text}">${pill}</text>
  <text x="${cx}" y="198" text-anchor="middle" font-size="76" font-weight="700" letter-spacing="-2.5" fill="${t.text}">Guilherme Borges</text>
  <text x="${cx}" y="254" text-anchor="middle" font-size="36" font-weight="600" letter-spacing="-0.8" fill="url(#role)">AI Automation Developer</text>
  <text x="${cx}" y="304" text-anchor="middle" font-size="18" font-weight="500" fill="${t.sub}">AI agents · Automation · Full-stack web · Design</text>`, { glow: true });
}

// ---------- stack: app-style icon tiles ----------
// Grouped: languages → web → Apple → data → infra → design/AI.
// `file`/`vb` let an icon come from another set (Devicon uses a 128 viewBox); `k` = logo size as a fraction of the tile.
const STACK = [
  { slug: 'python', name: 'Python', g: ['#4B8BBE', '#2b5b84'], fg: '#FFD43B' },
  { slug: 'typescript', name: 'TypeScript', g: ['#4a90e2', '#235a97'], fg: '#fff' },
  { slug: 'swift', name: 'Swift', g: ['#F88A36', '#E0402A'], fg: '#fff' },
  { slug: 'c', name: 'C', g: ['#659AD2', '#283593'], fg: '#fff' },
  { slug: 'react', name: 'React', g: ['#2c3140', '#14161c'], fg: '#61DAFB' },
  { slug: 'nextdotjs', name: 'Next.js', g: ['#3a3a3c', '#000'], fg: '#fff' },
  { slug: 'nodedotjs', name: 'Node.js', g: ['#7cc26a', '#3d7a32'], fg: '#fff' },
  { slug: 'tailwindcss', name: 'Tailwind', g: ['#2c3140', '#14161c'], fg: '#38BDF8' },
  { slug: 'threedotjs', name: 'three.js', g: ['#3a3a3c', '#000'], fg: '#fff' },
  { slug: 'apple', name: 'SwiftUI', g: ['#3fa9f5', '#0a5fd6'], fg: '#fff' },
  { slug: 'supabase', name: 'Supabase', g: ['#2a2a2e', '#121214'], fg: '#3ECF8E' },
  { slug: 'postgresql', name: 'Postgres', g: ['#5b82ef', '#2f4fb0'], fg: '#fff' },
  { slug: 'aws', file: 'dev-amazonwebservices-plain-wordmark', vb: 128, k: 0.7, name: 'AWS', g: ['#37475a', '#232F3E'], fg: '#FF9900' },
  { slug: 'vercel', name: 'Vercel', g: ['#3a3a3c', '#000'], fg: '#fff' },
  { slug: 'git', name: 'Git', g: ['#F05032', '#b8361c'], fg: '#fff' },
  { slug: 'linux', name: 'Linux', g: ['#3a3a3c', '#111'], fg: '#FCC624' },
  { slug: 'figma', name: 'Figma', g: ['#F24E1E', '#A259FF'], fg: '#fff' },
  { slug: 'obsidian', name: 'Obsidian', g: ['#9a7cf5', '#4b2bbf'], fg: '#fff' },
  { slug: 'claude', name: 'Claude', g: ['#e8916f', '#c0603f'], fg: '#fff' },
];
const iconPath = (file) => readFileSync(join(ROOT, 'scripts/icons', `${file}.svg`), 'utf8').match(/<path[^>]*\sd="([^"]+)"/)[1];

function stack(t) {
  // Up to PER_ROW icons per row; a longer stack wraps into a second row, centred.
  const S = 56, COL = 104, PER_ROW = 10, ROW_H = 112, TOP = 116;
  const rows = [];
  for (let i = 0; i < STACK.length; i += PER_ROW) rows.push(STACK.slice(i, i + PER_ROW).map((s, k) => [s, i + k]));
  const W = 1200, H = TOP + rows.length * ROW_H + 20;
  return card(W, H, t, `${title(56, 76, 'Stack', t)}
  ${rows.map((row, r) => {
    const x0 = (W - row.length * COL) / 2, y = TOP + r * ROW_H;
    return row.map(([s, i], k) => {
      const x = x0 + k * COL + (COL - S) / 2, ls = S * (s.k || 0.52);
      return `<linearGradient id="ig${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.g[0]}"/><stop offset="1" stop-color="${s.g[1]}"/></linearGradient>
    <rect x="${x}" y="${y}" width="${S}" height="${S}" rx="${S * 0.235}" fill="url(#ig${i})"/>
    <path transform="translate(${x + (S - ls) / 2} ${y + (S - ls) / 2}) scale(${ls / (s.vb || 24)})" d="${iconPath(s.file || s.slug)}" fill="${s.fg}"/>
    <text x="${x + S / 2}" y="${y + S + 26}" text-anchor="middle" font-size="14" font-weight="500" fill="${t.sub}">${esc(s.name)}</text>`;
    }).join('');
  }).join('')}`);
}

// ---------- stats ----------
const LANG_COLORS = { TypeScript: '#3178C6', JavaScript: '#F7DF1E', Python: '#3572A5', HTML: '#E34C26', CSS: '#663399', Shell: '#89E051', Swift: '#F05138' };

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
  const W = 1200, H = 260, COL = 196;
  const nums = [[d.commits, 'commits this year'], [d.repos, 'repositories'], [d.stars, 'stars earned']];
  const figures = nums.map(([v, label], i) => {
    const x = 56 + i * COL;
    return `${i ? `<line x1="${x - 28}" x2="${x - 28}" y1="124" y2="204" stroke="${t.line}"/>` : ''}
  <text x="${x}" y="176" font-size="56" font-weight="700" letter-spacing="-2" fill="${t.text}">${v}</text>
  <text x="${x + 2}" y="206" font-size="15" font-weight="500" fill="${t.sub}">${label}</text>`;
  }).join('');
  const x = 56 + 3 * COL + 28, bw = W - 56 - x;
  const langs = d.langs.length ? d.langs : [['No code yet', 100]];
  let off = 0;
  const bar = langs.map(([n, p]) => {
    const w = (p / 100) * bw, r = `<rect x="${x + off}" y="132" width="${Math.max(w - 4, 4)}" height="10" rx="5" fill="${LANG_COLORS[n] || '#8E8E93'}"/>`;
    off += w; return r;
  }).join('');
  const legend = langs.map(([n, p], i) => {
    const lx = x + (i % 2) * (bw / 2), ly = 182 + Math.floor(i / 2) * 30;
    return `<circle cx="${lx + 5}" cy="${ly - 5}" r="5" fill="${LANG_COLORS[n] || '#8E8E93'}"/>
  <text x="${lx + 18}" y="${ly}" font-size="15" font-weight="500" fill="${t.text}">${esc(n)} <tspan fill="${t.sub}">${d.langs.length ? p + '%' : ''}</tspan></text>`;
  }).join('');
  return card(W, H, t, `${title(56, 76, 'GitHub', t)}
  <text x="${x}" y="104" font-size="15" font-weight="500" fill="${t.sub}">Top languages</text>
  ${figures}${bar}${legend}`);
}

// ---------- contact buttons: one pill per link (README links need one image each) ----------
const BUTTONS = [
  { file: 'btn-linkedin', label: 'LinkedIn', icon: (x, y, s, t) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${s * 0.22}" fill="${t.accent}"/>
    <text x="${x + s * 0.5}" y="${y + s * 0.78}" text-anchor="middle" font-size="${s * 0.74}" font-weight="800" letter-spacing="-0.5" fill="#fff">in</text>` },
  { file: 'btn-instagram', label: 'Instagram', icon: (x, y, s, t) => `<path transform="translate(${x} ${y}) scale(${s / 24})" d="${iconPath('instagram')}" fill="${t.accent}"/>` },
];

function button(t, b) {
  const W = 168, H = 48, ICON = 20, GAP = 10, TL = textW(b.label, 16, 0.58);
  const sx = (W - (ICON + GAP + TL)) / 2;
  return card(W, H, t, `${b.icon(sx, (H - ICON) / 2, ICON, t)}
  <text x="${sx + ICON + GAP}" y="${H / 2 + 5.5}" font-size="16" font-weight="600" fill="${t.text}">${esc(b.label)}</text>`, { r: H / 2 });
}

// ---------- projects: one card per repo, grouped by area ----------
// Every public repo gets a card automatically, built from its GitHub description, topics,
// languages and homepage. CURATED entries replace that with hand-written copy.
// A repo with the topic `hide-from-profile` (or an archived one) is left out.
const AREAS = {
  ensino: { icon: 'school', label: 'Education' },
  sites: { icon: 'world-www', label: 'Web' },
  motion: { icon: 'movie', label: 'Motion & Video' },
  ia: { icon: 'sparkles', label: 'AI' },
  apps: { icon: 'device-laptop', label: 'Mac apps' },
  code: { icon: 'code', label: 'Code' },
};
const CURATED = [
  {
    repo: 'plataforma-engenharia-ia', area: 'ensino', title: 'AI Engineering Platform',
    desc: 'Self-study platform: lessons, widgets, exams, review',
    detail: 'My own AI Engineering course, with a live demo',
    tags: ['React', 'TypeScript', 'Vite'], metric: '30 modules · 7 phases', link: 'Demo',
  },
  {
    repo: 'inn-aroma', area: 'sites', title: 'INN AROMA · Concept',
    desc: 'Website concept for a scent brand, with a 3D diffuser',
    detail: 'Unofficial redesign proposal built with three.js',
    tags: ['React', 'three.js', 'Vite'], metric: 'unofficial concept', link: 'Site',
  },
  {
    repo: 'summit-home', area: 'sites', title: 'Summit Home',
    desc: 'Smart home dashboard running on a simulated lake house',
    detail: 'Built on Summit, my design system made in Figma',
    tags: ['React', 'TypeScript', 'Figma'], metric: '4 views · 14 components', link: 'Demo',
  },
  {
    repo: 'borg-business-os', area: 'ia', title: 'BORG Business OS',
    desc: 'Business dashboard with 6 AI agents and long memory',
    detail: 'Built for solo founders: pipeline, goals, roadmap',
    tags: ['Next.js', 'Supabase', 'Claude'], metric: '6 agents · 9 tools', link: 'Repo',
  },
  {
    repo: 'memoria-ia-obsidian', area: 'ia', title: 'AI Memory with Obsidian',
    desc: 'Tutorial: long-term memory for Claude, per project',
    detail: 'One vault per project, MCP and Claude Code hooks',
    tags: ['Claude Code', 'Obsidian', 'MCP'], metric: 'tutorial · template', link: 'Guide',
  },
  {
    repo: 'design-studio', area: 'ia', title: 'Design Studio',
    desc: 'A design team of AI agents for Claude Code and Codex',
    detail: 'Creative director, specialists, cited knowledge base',
    tags: ['Claude Code', 'Codex', 'Figma'], metric: '9 specialists · 8 skills', link: 'Repo',
  },
  {
    repo: 'kit-editar', area: 'motion', title: 'Kit EDITAR',
    desc: 'Prompt kit to edit reels with motion and karaoke captions',
    detail: 'Step by step with AI, every cue synced to the word',
    tags: ['Claude Code', 'HyperFrames', 'GSAP'], metric: '11 prompts · 7 agents', link: 'Site',
  },
  {
    repo: 'lustro', area: 'apps', title: 'Lustro',
    desc: 'Open-source Mac cleaner that shows what it removes',
    detail: 'Native SwiftUI, no network, Trash by default',
    tags: ['Swift', 'SwiftUI', 'macOS'], metric: '8 modules · 92 tests', link: 'Download',
  },
];

// First matching area wins, so the more specific ones come first.
const AREA_TOPICS = [
  ['apps', ['macos', 'ios', 'swiftui', 'mac-app']],
  ['motion', ['motion', 'motion-design', 'video', 'video-editing']],
  ['ensino', ['education', 'ensino', 'course', 'self-study']],
  ['sites', ['website', 'sites', 'landing-page']],
  ['ia', ['ai', 'ai-agents', 'claude', 'llm', 'mcp']],
];

async function fetchRepos() {
  if (SAMPLE) return CURATED.map((p, i) => ({ name: p.repo, topics: [], languages: [], release: i % 2 ? 'v1.0.0' : null }));
  const query = `query($login:String!){user(login:$login){
    repositories(first:100, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC, orderBy:{field:CREATED_AT, direction:ASC}){nodes{
      name description homepageUrl isArchived latestRelease{tagName}
      repositoryTopics(first:20){nodes{topic{name}}}
      languages(first:3, orderBy:{field:SIZE, direction:DESC}){nodes{name}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const { data, errors } = await res.json();
  if (errors) throw new Error(JSON.stringify(errors));
  return data.user.repositories.nodes.map((r) => ({
    name: r.name, description: r.description || '', homepage: r.homepageUrl, archived: r.isArchived,
    release: r.latestRelease?.tagName || null,
    topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
    languages: r.languages.nodes.map((n) => n.name),
  }));
}

// Splits text into lines of at most `max` characters at word boundaries; the last line gets an ellipsis if cut.
function wrap(text, max, lines) {
  const out = [''];
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const cur = out[out.length - 1];
    if ((cur ? cur.length + 1 : 0) + word.length <= max) out[out.length - 1] = cur ? `${cur} ${word}` : word;
    else if (out.length < lines) out.push(word);
    else { out[out.length - 1] = clip(`${cur} ${word}`, max); break; }
  }
  return out;
}

// Topics that make good card tags; anything else falls back to the repo's main languages.
const TOPIC_LABELS = {
  react: 'React', nextjs: 'Next.js', vite: 'Vite', threejs: 'three.js', tailwindcss: 'Tailwind',
  supabase: 'Supabase', postgres: 'Postgres', swift: 'Swift', swiftui: 'SwiftUI', macos: 'macOS',
  python: 'Python', typescript: 'TypeScript', claude: 'Claude', 'claude-code': 'Claude Code',
  mcp: 'MCP', obsidian: 'Obsidian', hyperframes: 'HyperFrames', gsap: 'GSAP',
};

function autoProject(r) {
  const fromTopics = r.topics.map((tp) => TOPIC_LABELS[tp]).filter(Boolean);
  const fromLangs = r.languages.filter((l) => !['HTML', 'CSS'].includes(l));
  const [desc, detail = ''] = wrap(r.description || 'No description yet', 52, 2);
  return {
    repo: r.name,
    area: (AREA_TOPICS.find(([, topics]) => topics.some((tp) => r.topics.includes(tp))) || ['code'])[0],
    title: r.name.split(/[-_]/).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    desc, detail,
    tags: [...new Set([...fromTopics, ...fromLangs])].slice(0, 3),
    metric: '',
    link: r.homepage ? 'Site' : 'Repo',
  };
}

function buildProjects(repos) {
  const areaOrder = Object.keys(AREAS);
  return repos
    .filter((r) => r.name !== USER && !r.archived && !r.topics.includes('hide-from-profile'))
    .map((r) => ({ ...(CURATED.find((p) => p.repo === r.name) || autoProject(r)), release: r.release }))
    // curated cards keep their hand-picked order; new repos follow, oldest first
    .sort((a, b) => areaOrder.indexOf(a.area) - areaOrder.indexOf(b.area)
      || (CURATED.findIndex((p) => p.repo === a.repo) + 1 || 1e3) - (CURATED.findIndex((p) => p.repo === b.repo) + 1 || 1e3));
}

const tablerPaths = (name) => [...readFileSync(join(ROOT, 'scripts/icons', `tabler-${name}.svg`), 'utf8')
  .matchAll(/<path (?!stroke="none")[^>]*d="([^"]+)"/g)].map((m) => `<path d="${m[1]}"/>`).join('');
const outlineIcon = (name, x, y, size, color) =>
  `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${tablerPaths(name)}</g>`;

function projectCard(t, p) {
  const W = 600, H = 290, a = AREAS[p.area];
  const meta = [p.release, p.metric].filter(Boolean).join(' · ');
  return card(W, H, t, `${outlineIcon(a.icon, 40, 38, 20, t.accent)}
  <text x="68" y="54" font-size="15" font-weight="600" fill="${t.accent}">${esc(a.label)}</text>
  <text x="${W - 40}" y="54" text-anchor="end" font-size="15" font-weight="600" fill="${t.accent}">${esc(p.link)} ↗</text>
  <text x="40" y="128" font-size="${p.title.length > 24 ? 30 : 34}" font-weight="700" letter-spacing="-1" fill="${t.text}">${esc(p.title)}</text>
  <text x="41" y="166" font-size="17" font-weight="500" fill="${t.text}">${esc(p.desc)}</text>
  <text x="41" y="192" font-size="16" font-weight="500" fill="${t.sub}">${esc(p.detail)}</text>
  <line x1="40" x2="${W - 40}" y1="222" y2="222" stroke="${t.line}"/>
  <text x="41" y="256" font-size="14" font-weight="500" fill="${t.sub}">${esc(p.tags.join(' · '))}</text>
  <text x="${W - 40}" y="256" text-anchor="end" font-size="14" font-weight="500" fill="${t.faint}">${esc(meta)}</text>`);
}

// Section title above the project grid: plain type on GitHub's own background, no card.
function projectsHeader(t) {
  const W = 1200, H = 96;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <text x="4" y="66" font-size="40" font-weight="700" letter-spacing="-1.2" fill="${t.text}">Projects</text>
  <text x="${W - 4}" y="64" text-anchor="end" font-size="17" font-weight="600" fill="${t.accent}">All repositories ↗</text>
</svg>\n`;
}

// ---------- now building: latest activity across public repos, refreshed by the workflow ----------
// Housekeeping commits (stats refresh, CI, licence, badges) are skipped so each row shows real work.
const NOISE = /^(chore|ci|build|docs)(\(.+\))?:|^merge\b|licen[cs]e|badge|dependabot|issue template|^translate\b/i;

async function fetchActivity() {
  if (SAMPLE) return [
    { repo: 'borg-business-os', msg: 'Add weekly digest to the Strategy agent', at: Date.now() - 864e5, tag: 'v1.0.0' },
    { repo: 'kit-editar', msg: 'New prompt: B-roll with auto zoom', at: Date.now() - 3 * 864e5, tag: 'v1.0.0' },
    { repo: 'inn-aroma', msg: 'Mobile menu: hamburger and header on scroll', at: Date.now() - 9 * 864e5, tag: null },
  ];
  const query = `query($login:String!){user(login:$login){
    repositories(first:8, ownerAffiliations:OWNER, isFork:false, privacy:PUBLIC, orderBy:{field:PUSHED_AT, direction:DESC}){nodes{
      name latestRelease{tagName}
      defaultBranchRef{target{... on Commit{history(first:15){nodes{messageHeadline committedDate}}}}}}}}}`;
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { Authorization: `bearer ${process.env.GITHUB_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { login: USER } }),
  });
  const { data, errors } = await res.json();
  if (errors) throw new Error(JSON.stringify(errors));
  return data.user.repositories.nodes
    .filter((r) => r.name !== USER)
    .map((r) => {
      const c = (r.defaultBranchRef?.target.history.nodes || []).find((n) => !NOISE.test(n.messageHeadline));
      return c && { repo: r.name, msg: c.messageHeadline, at: Date.parse(c.committedDate), tag: r.latestRelease?.tagName || null };
    })
    .filter(Boolean)
    .sort((a, b) => b.at - a.at)
    .slice(0, 3);
}

function ago(ms) {
  const d = Math.floor((Date.now() - ms) / 864e5);
  if (d < 1) return 'today';
  if (d < 2) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  if (d < 60) return `${Math.floor(d / 7)} weeks ago`;
  return `${Math.floor(d / 30)} months ago`;
}
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

function nowCard(t, items) {
  const W = 1200, ROW = 74, TOP = 108, H = TOP + Math.max(items.length, 1) * ROW + 24;
  const rows = items.map((it, i) => {
    const y = TOP + i * ROW, name = PROJECTS.find((p) => p.repo === it.repo)?.title || it.repo;
    return `${i ? `<line x1="56" x2="${W - 56}" y1="${y}" y2="${y}" stroke="${t.line}"/>` : ''}
  ${outlineIcon('git-commit', 56, y + 24, 24, t.accent)}
  <text x="96" y="${y + 34}" font-size="19" font-weight="600" fill="${t.text}">${esc(name)}</text>
  <text x="96" y="${y + 58}" font-size="15" font-weight="500" fill="${t.sub}">${esc(clip(it.msg, 80))}</text>
  <text x="${W - 56}" y="${y + 41}" text-anchor="end" font-size="15" font-weight="500" fill="${t.faint}">${esc([it.tag, ago(it.at)].filter(Boolean).join(' · '))}</text>`;
  }).join('');
  return card(W, H, t, `${title(56, 76, 'Now building', t)}
  <circle cx="${W - 56 - textW('Latest commits', 15, 0.5) - 14}" cy="71" r="5" fill="#30D158"/>
  <text x="${W - 56}" y="76" text-anchor="end" font-size="15" font-weight="500" fill="${t.sub}">Latest commits</text>
  ${rows || `<text x="56" y="${TOP + 36}" font-size="16" fill="${t.sub}">Nothing pushed lately</text>`}`);
}

// Rewrites the README block between the projects markers from PROJECTS.
function projectsSection() {
  const base = `https://raw.githubusercontent.com/${USER}/${USER}/main/assets`;
  const pic = (file, alt, width) => `<picture><source media="(prefers-color-scheme: dark)" srcset="${base}/${file}-dark.svg"><img alt="${alt}" src="${base}/${file}-light.svg" width="${width}"></picture>`;
  const cards = PROJECTS.map((p) => `<a href="https://github.com/${USER}/${p.repo}">${pic(`project-${p.repo}`, esc(`${p.title}: ${p.desc}`), '49%')}</a>`);
  const rows = [];
  for (let i = 0; i < cards.length; i += 2) rows.push(cards.slice(i, i + 2).join('\n'));
  return `<!-- projects:start -->
<a href="https://github.com/${USER}?tab=repositories">${pic('projects', 'Projects', '100%')}</a>

${rows.join('\n\n')}
<!-- projects:end -->`;
}

const data = await fetchStats();
const activity = await fetchActivity();
const PROJECTS = buildProjects(await fetchRepos());
mkdirSync(OUT, { recursive: true });
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(join(OUT, `header-${name}.svg`), header(t));
  writeFileSync(join(OUT, `stack-${name}.svg`), stack(t));
  writeFileSync(join(OUT, `stats-${name}.svg`), stats(t, data));
  for (const b of BUTTONS) writeFileSync(join(OUT, `${b.file}-${name}.svg`), button(t, b));
  writeFileSync(join(OUT, `now-${name}.svg`), nowCard(t, activity));
  writeFileSync(join(OUT, `projects-${name}.svg`), projectsHeader(t));
  for (const p of PROJECTS) writeFileSync(join(OUT, `project-${p.repo}-${name}.svg`), projectCard(t, p));
}
// Stamp each asset URL in the README with a content hash, so browsers fetch the new
// image as soon as it changes instead of showing a cached copy for a few minutes.
const README = join(ROOT, 'README.md');
if (OUT === join(ROOT, 'assets') && existsSync(README)) {
  const md = readFileSync(README, 'utf8').replace(/<!-- projects:start -->[\s\S]*?<!-- projects:end -->/, () => projectsSection()).replace(/assets\/([\w-]+\.svg)(\?v=\w+)?/g, (_, f) =>
    `assets/${f}?v=${createHash('sha1').update(readFileSync(join(OUT, f))).digest('hex').slice(0, 8)}`);
  writeFileSync(README, md);
}
console.log('assets written:', data, activity, PROJECTS.map((p) => `${p.repo} [${p.area}] ${p.release || '-'}`));
