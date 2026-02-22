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
        <div class="bg-red-50 border-l-4 border-red-400 p-4">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">
                Please set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN environment variables.
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
      <Layout title="Error">
         <div class="bg-red-50 border-l-4 border-red-400 p-4">
            <p class="text-red-700">Error fetching projects: {err.message}</p>
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
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${props.title} - My Pages Hub</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/lucide@latest"></script>
    <script>
      tailwind.config = {
        theme: {
          extend: {
            colors: {
              brand: '#f6821f', // Cloudflare Orange-ish
            }
          }
        }
      }
    </script>
    <style>
      [x-cloak] { display: none !important; }
      .project-card { transition: all 0.2s ease-in-out; }
      .project-card:hover { transform: translateY(-2px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }
      /* Custom Scrollbar */
      ::-webkit-scrollbar { width: 8px; }
      ::-webkit-scrollbar-track { background: #f1f1f1; }
      ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
      ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
    </style>
    <!-- Alpine.js for interactivity -->
    <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>
  </head>
  <body class="bg-slate-50 text-slate-900 min-h-screen font-sans antialiased">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      ${props.children}
    </div>
    <footer class="mt-12 text-center text-slate-400 text-sm py-6 border-t border-slate-200">
      <p>Built with Hono & Cloudflare Workers</p>
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
        
        // Sort: Starred first, then by date (already sorted by date from server)
        return filtered.sort((a, b) => {
          const aStarred = this.isStarred(a.name);
          const bStarred = this.isStarred(b.name);
          if (aStarred && !bStarred) return -1;
          if (!aStarred && bStarred) return 1;
          return 0; // Keep original sort order (date)
        });
      },
      
      formatDate(dateStr) {
        if (!dateStr) return 'Never deployed';
        const date = new Date(dateStr);
        return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric' }).format(date);
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
      <div class="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <i data-lucide="cloud" class="w-8 h-8 text-brand"></i>
            My Pages Hub
          </h1>
          <p class="text-slate-500 mt-1">Manage and access all your Cloudflare Pages deployments</p>
        </div>
        
        <div class="relative w-full md:w-96">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <i data-lucide="search" class="h-5 w-5 text-slate-400"></i>
          </div>
          <input 
            x-model="search"
            type="text" 
            class="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg leading-5 bg-white placeholder-slate-500 focus:outline-none focus:placeholder-slate-400 focus:ring-1 focus:ring-brand focus:border-brand sm:text-sm shadow-sm transition-all" 
            placeholder="Search projects..."
          >
        </div>
      </div>

      <!-- Projects Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <template x-for="project in filteredProjects" :key="project.name">
          <div class="project-card bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full relative group">
            
            <!-- Star Button -->
            <button 
              @click.prevent="toggleStar(project.name)"
              class="absolute top-4 right-4 z-10 p-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
              :class="{ 'text-yellow-400': isStarred(project.name), 'text-slate-300 group-hover:text-slate-400': !isStarred(project.name) }"
            >
              <i data-lucide="star" class="w-5 h-5 fill-current"></i>
            </button>

            <div class="p-6 flex-1 flex flex-col">
              <div class="flex items-center justify-between mb-2 pr-8"> <!-- pr-8 to avoid overlap with star -->
                <h3 class="text-lg font-semibold text-slate-900 truncate" x-text="project.name"></h3>
              </div>
              
              <div class="mb-4">
                 <a :href="getProjectUrl(project)" target="_blank" class="text-sm text-brand hover:text-orange-600 font-medium hover:underline flex items-center gap-1 break-all">
                    <span x-text="getProjectUrl(project).replace('https://', '')"></span>
                    <i data-lucide="external-link" class="w-3 h-3"></i>
                 </a>
              </div>

              <div class="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div class="flex items-center gap-1.5" :title="project.latest_deployment?.created_on">
                  <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                  <span x-text="formatDate(project.latest_deployment?.created_on || project.created_on)"></span>
                </div>
                
                <div class="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
                  Active
                </div>
              </div>
            </div>
            
            <!-- Quick Actions (optional, maybe link to dash in future) -->
            <!-- <div class="bg-slate-50 px-6 py-3 border-t border-slate-100"></div> -->
          </div>
        </template>
        
        <!-- Empty State -->
        <div x-show="filteredProjects.length === 0" class="col-span-full py-12 text-center" x-cloak>
          <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 mb-4">
            <i data-lucide="search-x" class="w-8 h-8 text-slate-400"></i>
          </div>
          <h3 class="text-lg font-medium text-slate-900">No projects found</h3>
          <p class="text-slate-500 mt-1">Try adjusting your search terms.</p>
        </div>
      </div>

    </div>
  </Layout>
`;

export default app;
