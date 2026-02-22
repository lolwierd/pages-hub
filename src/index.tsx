import { Hono } from 'hono';
import { html, raw } from 'hono/html';

interface Env {
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CACHE: KVNamespace;
}

interface Project {
  name: string;
  subdomain: string;
  domains: string[];
  latest_deployment?: {
    created_on: string;
    aliases?: string[];
    url?: string;
  };
  created_on: string;
}

const app = new Hono<{ Bindings: Env }>();
const CACHE_KEY = 'projects_data';
const CACHE_TTL = 300;

app.get('/', async (c) => {
  const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = c.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return c.html(
      <Shell title="Error">
        <div class="err-box">Missing CLOUDFLARE_ACCOUNT_ID or CLOUDFLARE_API_TOKEN.</div>
      </Shell>
    );
  }

  try {
    let projects: Project[];
    const cached = await c.env.CACHE.get(CACHE_KEY, 'json') as Project[] | null;
    if (cached) {
      projects = cached;
    } else {
      projects = await fetchProjects(accountId, apiToken);
      c.executionCtx.waitUntil(
        c.env.CACHE.put(CACHE_KEY, JSON.stringify(projects), { expirationTtl: CACHE_TTL })
      );
    }

    const sorted = projects.sort((a, b) => {
      const da = new Date(a.latest_deployment?.created_on || a.created_on).getTime();
      const db = new Date(b.latest_deployment?.created_on || b.created_on).getTime();
      return db - da;
    });

    return c.html(
      <Shell title="pages · lolwierd">
        {Board({ projects: sorted })}
      </Shell>
    );
  } catch (err: any) {
    return c.html(
      <Shell title="Error">
        <div class="err-box">{err.message}</div>
      </Shell>
    );
  }
});

app.post('/purge', async (c) => {
  await c.env.CACHE.delete(CACHE_KEY);
  return c.json({ ok: true });
});

async function fetchProjects(accountId: string, apiToken: string): Promise<Project[]> {
  const all: Project[] = [];
  let page = 1;
  while (true) {
    const r = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects?page=${page}`,
      { headers: { 'Authorization': `Bearer ${apiToken}`, 'Content-Type': 'application/json' } }
    );
    if (!r.ok) throw new Error(`API ${r.status} ${r.statusText}`);
    const d: any = await r.json();
    const results = d.result || [];
    all.push(...results);
    if (!d.result_info || page >= d.result_info.total_pages || !results.length) break;
    page++;
  }
  return all;
}

// ══════════════════════════════════════════════════
// THE SHELL
// ══════════════════════════════════════════════════

const Shell = (props: { title: string; children: any }) => html`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${props.title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    [x-cloak] { display: none !important; }

    /* ─── Tokens: Light ─── */
    :root {
      --bg: #F8F7F4;
      --card-bg: #FFFFFF;
      --text: #111110;
      --text-2: #6B6965;
      --text-3: #A5A19B;
      --border: #E5E2DC;
      --border-subtle: rgba(0,0,0,0.04);
      --search-bg: #EFEEE9;
      --search-focus: #FFFFFF;
      --accent: #E05A33;

      --mesh-s: 60%;
      --mesh-l: 72%;
      --mesh-a: 0.35;
      --glow-s: 60%;
      --glow-l: 52%;
      --glow-a: 0.25;
      --hl-a: 0.06;
      --shadow: 0 1px 2px rgba(0,0,0,0.04);
      --shadow-hover: 0 12px 32px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04);
      --fresh-color: #1A8C35;
      --stale-color: #A5A19B;
      --title-a: #111;
      --title-b: #666;
      --bg-glow-1: transparent;
      --bg-glow-2: transparent;

      color-scheme: light dark;
    }

    /* ─── Tokens: Dark ─── */
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0C0C0B;
        --card-bg: #161615;
        --text: #ECECEA;
        --text-2: #8A8884;
        --text-3: #555350;
        --border: #252422;
        --border-subtle: rgba(255,255,255,0.04);
        --search-bg: #1A1918;
        --search-focus: #1E1D1C;
        --accent: #F27044;

        --mesh-s: 65%;
        --mesh-l: 52%;
        --mesh-a: 0.18;
        --glow-s: 65%;
        --glow-l: 58%;
        --glow-a: 0.4;
        --hl-a: 0.08;
        --shadow: 0 1px 3px rgba(0,0,0,0.3);
        --shadow-hover: 0 16px 40px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2);
        --fresh-color: #4ADE6B;
        --stale-color: #555350;
        --title-a: #fff;
        --title-b: #777;
        --bg-glow-1: hsla(260, 30%, 15%, 0.35);
        --bg-glow-2: hsla(340, 25%, 12%, 0.3);
      }
    }

    /* ─── Base ─── */
    html { font-size: 16px; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

    body {
      font-family: 'Syne', system-ui, sans-serif;
      background: var(--bg);
      color: var(--text);
      min-height: 100vh;
      position: relative;
    }

    /* Atmospheric background glow (dark mode) */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse at 15% 10%, var(--bg-glow-1) 0%, transparent 50%),
        radial-gradient(ellipse at 85% 80%, var(--bg-glow-2) 0%, transparent 50%);
      pointer-events: none;
      z-index: 0;
    }

    /* Film grain overlay */
    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.7' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
      opacity: 0.025;
      pointer-events: none;
      z-index: 10000;
      mix-blend-mode: overlay;
    }

    ::selection { background: var(--accent); color: #fff; }
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: var(--bg); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .page {
      max-width: 1120px;
      margin: 0 auto;
      padding: 3rem 1.5rem 5rem;
      position: relative;
      z-index: 1;
    }

    /* ─── Header ─── */
    .hdr {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2rem;
      margin-bottom: 2.5rem;
      flex-wrap: wrap;
    }
    .hdr-title {
      font-weight: 800;
      font-size: clamp(3.25rem, 7vw, 5rem);
      line-height: 1;
      letter-spacing: -0.04em;
      text-transform: lowercase;
      background: linear-gradient(135deg, var(--title-a), var(--title-b));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .hdr-sub {
      font-family: 'DM Mono', monospace;
      font-size: 0.7rem;
      color: var(--text-3);
      margin-top: 0.4rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .hdr-sub .sep { opacity: 0.4; }

    /* ─── Search ─── */
    .search {
      width: 240px;
      flex-shrink: 0;
    }
    .search input {
      width: 100%;
      font-family: 'Syne', sans-serif;
      font-size: 0.85rem;
      font-weight: 500;
      padding: 0.65rem 0.85rem;
      background: var(--search-bg);
      border: 1.5px solid transparent;
      border-radius: 10px;
      color: var(--text);
      outline: none;
      transition: all 0.25s;
    }
    .search input::placeholder { color: var(--text-3); font-weight: 400; }
    .search input:focus {
      border-color: var(--accent);
      background: var(--search-focus);
      box-shadow: 0 0 0 3px rgba(224, 90, 51, 0.1);
    }

    /* ─── Section Labels ─── */
    .label {
      font-family: 'DM Mono', monospace;
      font-size: 0.6rem;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-3);
      margin-bottom: 0.75rem;
    }
    .label:not(:first-child) { margin-top: 1.5rem; }

    /* ─── Grid ─── */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: 10px;
      position: relative;
    }

    /* ─── Card Wrapper (border glow) ─── */
    .cw {
      padding: 1px;
      border-radius: 16px;
      cursor: pointer;
      background: radial-gradient(
        320px circle at var(--bx, -999px) var(--by, -999px),
        hsla(var(--h1, 0), var(--glow-s), var(--glow-l), var(--glow-a)),
        var(--border)
      );
      transition: background 0.1s;
    }

    /* ─── Card ─── */
    .card {
      position: relative;
      border-radius: 15px;
      background: var(--card-bg);
      overflow: hidden;
      box-shadow: var(--shadow);
      transform: perspective(800px) rotateX(var(--rx, 0deg)) rotateY(var(--ry, 0deg));
      transition: transform 0.5s cubic-bezier(0.03, 0.98, 0.52, 0.99), box-shadow 0.3s;
    }
    .card:hover {
      box-shadow: var(--shadow-hover);
    }

    /* Gradient mesh — unique per project */
    .card::before {
      content: '';
      position: absolute;
      inset: 0;
      background:
        radial-gradient(ellipse at var(--x1, 25%) var(--y1, 20%),
          hsla(var(--h1, 0), var(--mesh-s), var(--mesh-l), var(--mesh-a)) 0%, transparent 55%),
        radial-gradient(ellipse at var(--x2, 75%) var(--y2, 70%),
          hsla(var(--h2, 180), var(--mesh-s), var(--mesh-l), var(--mesh-a)) 0%, transparent 55%);
      border-radius: inherit;
      z-index: 0;
      opacity: 0.85;
      transition: opacity 0.4s;
    }
    .card:hover::before { opacity: 1; }

    /* Mouse-following highlight */
    .card::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(
        280px circle at var(--mx, 50%) var(--my, 50%),
        hsla(0, 0%, 100%, var(--hl-a)),
        transparent 60%
      );
      border-radius: inherit;
      z-index: 1;
      opacity: 0;
      transition: opacity 0.2s;
      pointer-events: none;
    }
    .card:hover::after { opacity: 1; }

    /* Card content */
    .card-inner {
      position: relative;
      z-index: 2;
      padding: 1.1rem 1.1rem 1rem;
      display: flex;
      flex-direction: column;
      min-height: 155px;
    }
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .card-name {
      font-weight: 700;
      font-size: 1.05rem;
      line-height: 1.25;
      letter-spacing: -0.01em;
      word-break: break-word;
    }
    .card-bottom {
      margin-top: auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 0.6rem;
      border-top: 1px solid var(--border-subtle);
    }
    .card-url {
      font-family: 'DM Mono', monospace;
      font-size: 0.6rem;
      color: var(--text-2);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 70%;
      transition: color 0.2s;
    }
    .cw:hover .card-url { color: var(--accent); }
    .card-time {
      font-family: 'DM Mono', monospace;
      font-size: 0.6rem;
      font-weight: 500;
      white-space: nowrap;
    }
    .card-time.fresh { color: var(--fresh-color); }
    .card-time.stale { color: var(--stale-color); }

    /* ─── Pin ─── */
    .pin {
      flex-shrink: 0;
      background: none;
      border: none;
      cursor: pointer;
      width: 24px; height: 24px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 6px;
      color: var(--text-3);
      opacity: 0;
      transition: opacity 0.15s, color 0.15s, background 0.15s;
    }
    .cw:hover .pin { opacity: 0.6; }
    .pin:hover { opacity: 1 !important; background: var(--border-subtle); color: var(--accent); }
    .pin.on { opacity: 1 !important; color: var(--accent); }

    /* ─── Empty ─── */
    .empty {
      grid-column: 1 / -1;
      text-align: center;
      padding: 5rem 2rem;
      color: var(--text-3);
      font-size: 1rem;
      font-weight: 500;
    }

    /* ─── Error ─── */
    .err-box {
      border-left: 3px solid var(--accent);
      padding: 1rem 1.25rem;
      font-family: 'DM Mono', monospace;
      font-size: 0.8rem;
      color: var(--accent);
      background: var(--search-bg);
      border-radius: 0 8px 8px 0;
    }

    /* ─── Footer ─── */
    .foot {
      margin-top: 3.5rem;
      padding-top: 1rem;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      font-family: 'DM Mono', monospace;
      font-size: 0.6rem;
      color: var(--text-3);
    }

    /* ─── Entrance animation ─── */
    @media (prefers-reduced-motion: no-preference) {
      .cw {
        animation: cardIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
      }
      @keyframes cardIn {
        from { opacity: 0; transform: translateY(16px) scale(0.95); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
    }

    /* ─── Responsive ─── */
    @media (max-width: 640px) {
      .page { padding: 2rem 1rem 3.5rem; }
      .hdr { flex-direction: column; align-items: flex-start; gap: 1.25rem; }
      .hdr-title { font-size: 2.75rem; }
      .search { width: 100%; }
      .grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
      .card-inner { min-height: 130px; padding: 0.9rem; }
      .card-name { font-size: 0.9rem; }
    }
    @media (max-width: 380px) {
      .grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="page">
    ${props.children}
  </div>
</body>
</html>
`;

// ══════════════════════════════════════════════════
// THE BOARD
// ══════════════════════════════════════════════════

const Board = ({ projects }: { projects: Project[] }) => html`
<script>window.__P__ = ${raw(JSON.stringify(projects))};</script>

<div x-data="{
  q: '',
  pinned: JSON.parse(localStorage.getItem('ph_pins') || '[]'),
  projects: window.__P__,

  toggle(n) {
    this.pinned.includes(n)
      ? (this.pinned = this.pinned.filter(x => x !== n))
      : this.pinned.push(n);
    localStorage.setItem('ph_pins', JSON.stringify(this.pinned));
  },
  is(n) { return this.pinned.includes(n); },

  get list() {
    const t = this.q.toLowerCase();
    return this.projects.filter(p => p.name.toLowerCase().includes(t));
  },
  get pins() { return this.list.filter(p => this.is(p.name)); },
  get rest() { return this.list.filter(p => !this.is(p.name)); },

  url(p) {
    if (p.domains && p.domains.length) return 'https://' + p.domains[0];
    if (p.latest_deployment && p.latest_deployment.url) return p.latest_deployment.url;
    return 'https://' + p.subdomain + '.pages.dev';
  },
  short(p) { return this.url(p).replace('https://', ''); },

  hv(name) {
    var h = 0;
    for (var i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    var h1 = Math.abs(h) % 360;
    var h2 = (h1 + 30 + Math.abs(h >> 8) % 60) % 360;
    var x1 = 15 + Math.abs(h >> 3) % 35;
    var y1 = 10 + Math.abs(h >> 5) % 30;
    var x2 = 55 + Math.abs(h >> 7) % 35;
    var y2 = 55 + Math.abs(h >> 9) % 35;
    return '--h1:' + h1 + ';--h2:' + h2 + ';--x1:' + x1 + '%;--y1:' + y1 + '%;--x2:' + x2 + '%;--y2:' + y2 + '%';
  },

  age(p) {
    var d = (p.latest_deployment && p.latest_deployment.created_on) || p.created_on;
    if (!d) return { t: '\u2014', c: 'stale' };
    var ms = Date.now() - new Date(d).getTime();
    var hr = Math.floor(ms / 3.6e6);
    if (hr < 1) return { t: 'just now', c: 'fresh' };
    if (hr < 24) return { t: hr + 'h', c: 'fresh' };
    var days = Math.floor(hr / 24);
    if (days <= 7) return { t: days + 'd', c: 'fresh' };
    return { t: days + 'd', c: 'stale' };
  },

  tilt(e, el) {
    var r = el.getBoundingClientRect();
    var x = e.clientX - r.left;
    var y = e.clientY - r.top;
    el.style.setProperty('--rx', ((y / r.height - 0.5) * -8) + 'deg');
    el.style.setProperty('--ry', ((x / r.width - 0.5) * 8) + 'deg');
    el.style.setProperty('--mx', x + 'px');
    el.style.setProperty('--my', y + 'px');
  },
  untilt(el) {
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  },

  gm(e) {
    var cards = this.\$refs.g.querySelectorAll('.cw');
    for (var i = 0; i < cards.length; i++) {
      var r = cards[i].getBoundingClientRect();
      cards[i].style.setProperty('--bx', (e.clientX - r.left) + 'px');
      cards[i].style.setProperty('--by', (e.clientY - r.top) + 'px');
    }
  },
  gl() {
    var cards = this.\$refs.g.querySelectorAll('.cw');
    for (var i = 0; i < cards.length; i++) {
      cards[i].style.removeProperty('--bx');
      cards[i].style.removeProperty('--by');
    }
  },

  go(p) { window.open(this.url(p), '_blank'); }
}">

  <!-- Header -->
  <div class="hdr">
    <div>
      <h1 class="hdr-title">pages</h1>
      <div class="hdr-sub">
        <span x-text="projects.length + ' projects'"></span>
        <span class="sep">/</span>
        <span>lolwierd.com</span>
      </div>
    </div>
    <div class="search">
      <input type="text" x-model="q" placeholder="Search projects…" />
    </div>
  </div>

  <div x-ref="g" @mousemove="gm($event)" @mouseleave="gl()">

    <!-- Pinned -->
    <template x-if="pins.length > 0">
      <div>
        <div class="label">Pinned</div>
        <div class="grid">
          <template x-for="(p, i) in pins" :key="'pin-' + p.name">
            <div class="cw"
              :style="hv(p.name) + ';animation-delay:' + (i * 35) + 'ms'"
              @click="go(p)"
              role="link" tabindex="0"
              @keydown.enter="go(p)">
              <div class="card"
                @mousemove="tilt($event, $el)"
                @mouseleave="untilt($el)">
                <div class="card-inner">
                  <div class="card-top">
                    <span class="card-name" x-text="p.name"></span>
                    <button class="pin on" @click.stop="toggle(p.name)" title="Unpin">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="5"/></svg>
                    </button>
                  </div>
                  <div class="card-bottom">
                    <span class="card-url" x-text="short(p)"></span>
                    <span class="card-time" :class="age(p).c" x-text="age(p).t"></span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </template>

    <!-- All -->
    <div>
      <template x-if="pins.length > 0"><div class="label">Everything</div></template>
      <div class="grid">
        <template x-for="(p, i) in rest" :key="'rest-' + p.name">
          <div class="cw"
            :style="hv(p.name) + ';animation-delay:' + ((pins.length + i) * 35) + 'ms'"
            @click="go(p)"
            role="link" tabindex="0"
            @keydown.enter="go(p)">
            <div class="card"
              @mousemove="tilt($event, $el)"
              @mouseleave="untilt($el)">
              <div class="card-inner">
                <div class="card-top">
                  <span class="card-name" x-text="p.name"></span>
                  <button class="pin" @click.stop="toggle(p.name)" title="Pin">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4.5"/></svg>
                  </button>
                </div>
                <div class="card-bottom">
                  <span class="card-url" x-text="short(p)"></span>
                  <span class="card-time" :class="age(p).c" x-text="age(p).t"></span>
                </div>
              </div>
            </div>
          </div>
        </template>

        <div x-show="list.length === 0" class="empty" x-cloak>No projects match that.</div>
      </div>
    </div>

  </div>

  <footer class="foot">
    <span>pages-hub</span>
    <span>cached · 5m ttl</span>
  </footer>

</div>
`;

export default app;
