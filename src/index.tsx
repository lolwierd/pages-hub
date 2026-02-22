import { Hono } from 'hono';
import { html, raw } from 'hono/html';

interface Env {
  CLOUDFLARE_API_TOKEN: string;
  CLOUDFLARE_ACCOUNT_ID: string;
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

app.get('/', async (c) => {
  const accountId = c.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = c.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    return c.html(
      <Layout title="Configuration Error">
        <div class="border border-red-900/50 bg-red-950/20 p-6 rounded-none">
          <div class="flex items-start gap-4">
            <div class="flex-shrink-0 text-red-500 mt-1">
              <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="square" stroke-linejoin="miter" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 class="text-red-500 font-mono text-lg mb-2">SYSTEM ALERT: MISSING CREDENTIALS</h3>
              <p class="text-red-400/80 font-mono text-sm leading-relaxed">
                Environment variables CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are not set.
                <br/>
                Please configure secrets in your deployment environment.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  try {
    const projects = await fetchProjects(accountId, apiToken);
    
    // Sort by latest deployment time descending
    const sortedProjects = projects.sort((a, b) => {
      const dateA = new Date(a.latest_deployment?.created_on || a.created_on).getTime();
      const dateB = new Date(b.latest_deployment?.created_on || b.created_on).getTime();
      return dateB - dateA;
    });

    return c.html(<Dashboard projects={sortedProjects} />);
  } catch (err: any) {
    return c.html(
      <Layout title="System Error">
         <div class="border border-red-900/50 bg-red-950/20 p-6">
            <h3 class="text-red-500 font-mono text-lg mb-2">API CONNECTION FAILURE</h3>
            <p class="text-red-400/80 font-mono text-sm">Error fetching projects: {err.message}</p>
         </div>
      </Layout>
    );
  }
});

async function fetchProjects(accountId: string, apiToken: string): Promise<Project[]> {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, {
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Cloudflare API Error: ${response.status} ${response.statusText}`);
  }

  const data: any = await response.json();
  return data.result;
}

const Layout = (props: { title: string; children: any }) => html`
  <!DOCTYPE html>
  <html lang="en" class="dark">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title} // FLIGHT DECK</title>
    <script src="https://cdn.tailwindcss.com?plugins=typography"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            fontFamily: {
              mono: ['"JetBrains Mono"', 'monospace'],
              sans: ['"JetBrains Mono"', 'monospace'], 
            },
            colors: {
              zinc: {
                850: '#1f1f22',
                950: '#09090b', 
              },
              neon: {
                green: '#10b981',
                amber: '#f59e0b',
                red: '#ef4444',
              }
            }
          }
        }
      }
    </script>
    <style>
      [x-cloak] { display: none !important; }
      body { background-color: #09090b !important; color: #e4e4e7 !important; margin: 0; }
      
      /* Custom Scrollbar - Minimal & Dark */
      ::-webkit-scrollbar { width: 6px; }
      ::-webkit-scrollbar-track { background: #09090b; }
      ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 0; }
      ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }

      /* Utilities */
      .border-panel { border: 1px solid #27272a; }
      .bg-panel { background-color: #09090b; }
      .hover-panel:hover { border-color: #3f3f46; background-color: #101012; }
      
      /* Grid Pattern Overlay */
      .bg-grid {
        background-size: 40px 40px;
        background-image: linear-gradient(to right, #18181b 1px, transparent 1px),
                          linear-gradient(to bottom, #18181b 1px, transparent 1px);
        background-color: #09090b !important;
        min-height: 100vh;
      }
    </style>
    <!-- Alpine.js -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  </head>
  <body class="min-h-screen font-mono antialiased selection:bg-neon-green selection:text-black bg-grid bg-[#09090b] text-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      ${props.children}
    </div>
    
    <footer class="mt-20 border-t border-zinc-800 py-8 text-center text-zinc-600 text-xs uppercase tracking-widest relative z-10">
      <div class="flex items-center justify-center gap-4">
        <span>SYS.STATUS: ONLINE</span>
        <span class="text-zinc-800">|</span>
        <span>VER: 1.0.0-BETA</span>
        <span class="text-zinc-800">|</span>
        <span>${new Date().toISOString().split('T')[0]}</span>
      </div>
    </footer>

    <script>
      lucide.createIcons();
    </script>
  </body>
  </html>
`;

const Dashboard = ({ projects }: { projects: Project[] }) => html`
  <Layout title="Dashboard">
    <script>
      window.PROJECTS_DATA = ${raw(JSON.stringify(projects))};
    </script>

    <div x-data="{ 
      search: '', 
      starred: JSON.parse(localStorage.getItem('starred_projects') || '[]'),
      projects: window.PROJECTS_DATA,
      
      toggleStar(name) {
        if (this.starred.includes(name)) {
          this.starred = this.starred.filter(p => p !== name);
        } else {
          this.starred.push(name);
        }
        localStorage.setItem('starred_projects', JSON.stringify(this.starred));
      },
      
      isStarred(name) {
        return this.starred.includes(name);
      },

      get filteredProjects() {
        const term = this.search.toLowerCase();
        let filtered = this.projects.filter(p => p.name.toLowerCase().includes(term));
        
        return filtered.sort((a, b) => {
          const aStarred = this.isStarred(a.name);
          const bStarred = this.isStarred(b.name);
          if (aStarred && !bStarred) return -1;
          if (!aStarred && bStarred) return 1;
          return 0; 
        });
      },
      
      formatDate(dateStr) {
        if (!dateStr) return 'NO_DEPLOY';
        const date = new Date(dateStr);
        // Format: YYYY-MM-DD HH:MM
        return date.toISOString().replace('T', ' ').substring(0, 16);
      },

      formatDateRelative(dateStr) {
        if (!dateStr) return 'NEVER';
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
        
        if (diffHrs < 1) return '< 1H AGO';
        if (diffHrs < 24) return \`\${diffHrs}H AGO\`;
        const diffDays = Math.floor(diffHrs / 24);
        return \`\${diffDays}D AGO\`;
      },
      
      getProjectUrl(project) {
        if (project.domains && project.domains.length > 0) {
           return \`https://\${project.domains[0]}\`;
        }
        if (project.latest_deployment && project.latest_deployment.url) {
           return project.latest_deployment.url;
        }
        return \`https://\${project.subdomain}.pages.dev\`;
      }
    }">
      
      <!-- Header -->
      <header class="mb-16 border-b border-zinc-800 pb-8">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div class="flex items-center gap-3 text-neon-green mb-2">
              <i data-lucide="terminal" class="w-5 h-5"></i>
              <span class="text-xs font-bold tracking-[0.2em] uppercase">Control Plane</span>
            </div>
            <h1 class="text-4xl font-bold text-white tracking-tight uppercase">
              Deployments<span class="text-zinc-600">.LOG</span>
            </h1>
          </div>
          
          <div class="w-full md:w-96 relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i data-lucide="search" class="h-4 w-4 text-zinc-500 group-focus-within:text-neon-green transition-colors"></i>
            </div>
            <input 
              x-model="search"
              type="text" 
              class="block w-full pl-10 pr-3 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-neon-green focus:ring-1 focus:ring-neon-green transition-all text-sm font-mono uppercase tracking-wide" 
              placeholder="FILTER_BY_NAME..."
            >
          </div>
        </div>
      </header>

      <!-- Projects Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-zinc-800 border border-zinc-800">
        <template x-for="project in filteredProjects" :key="project.name">
          <div class="bg-panel p-6 flex flex-col h-full relative group hover:bg-zinc-850 transition-colors">
            
            <!-- Header: Name + Star -->
            <div class="flex justify-between items-start mb-6">
              <div>
                <h3 class="text-lg font-bold text-white tracking-wide" x-text="project.name"></h3>
                <a :href="getProjectUrl(project)" target="_blank" class="text-xs text-zinc-500 hover:text-neon-green transition-colors flex items-center gap-1.5 mt-1 truncate max-w-[200px]">
                  <span x-text="getProjectUrl(project).replace('https://', '')"></span>
                  <i data-lucide="external-link" class="w-3 h-3"></i>
                </a>
              </div>
              
              <button 
                @click.prevent="toggleStar(project.name)"
                class="p-1.5 -mr-2 -mt-2 text-zinc-700 hover:text-yellow-500 transition-colors focus:outline-none"
                :class="{ 'text-yellow-500': isStarred(project.name) }"
              >
                <i data-lucide="star" class="w-4 h-4" :fill="isStarred(project.name) ? 'currentColor' : 'none'"></i>
              </button>
            </div>

            <!-- Status Indicators -->
            <div class="mt-auto grid grid-cols-2 gap-4 border-t border-zinc-800/50 pt-4">
              <div>
                <div class="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Last Deploy</div>
                <div class="text-xs text-zinc-300 font-medium" x-text="formatDateRelative(project.latest_deployment?.created_on || project.created_on)"></div>
              </div>
              
              <div>
                <div class="text-[10px] text-zinc-600 uppercase tracking-wider mb-1">Status</div>
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_rgba(16,185,129,0.4)]"></span>
                  <span class="text-xs text-neon-green font-medium tracking-wide">ACTIVE</span>
                </div>
              </div>
            </div>
            
            <!-- Technical Detail (Full timestamp on hover/visible) -->
            <div class="mt-3 text-[10px] text-zinc-700 font-mono truncate" x-text="project.latest_deployment?.created_on || project.created_on"></div>

            <!-- Decorative corner accent -->
            <div class="absolute top-0 right-0 w-3 h-3 border-t border-r border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div class="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        </template>
        
        <!-- Empty State -->
        <div x-show="filteredProjects.length === 0" class="col-span-full py-24 text-center bg-panel" x-cloak>
          <div class="inline-flex items-center justify-center w-12 h-12 border border-zinc-800 bg-zinc-900 mb-6">
            <i data-lucide="terminal" class="w-6 h-6 text-zinc-600"></i>
          </div>
          <h3 class="text-sm font-bold text-zinc-400 uppercase tracking-widest">No Signals Found</h3>
          <p class="text-zinc-600 text-xs mt-2 font-mono">Adjust search parameters.</p>
        </div>
      </div>

    </div>
  </Layout>
`;

export default app;
