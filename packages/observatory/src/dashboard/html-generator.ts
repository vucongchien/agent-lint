import type { QualityGateResult } from '../types';

/**
 * Sinh mã HTML hoàn chỉnh cho Web Observatory Dashboard
 */
export function generateDashboardHtml(runs: QualityGateResult[]): string {
  const latest = runs[0] || null;
  const runsJson = JSON.stringify(runs);

  return `<!DOCTYPE html>
<html lang="vi" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Agent-Lint Quality Gate & Observatory</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 500: '#3b82f6', 600: '#2563eb' }
          }
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    body { font-family: 'Inter', sans-serif; }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <!-- Header -->
  <header class="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
        🛡️
      </div>
      <div>
        <h1 class="font-bold text-lg leading-none">Web Quality Gate & Observatory</h1>
        <p class="text-xs text-slate-400 mt-1">Autonomous Measurement & Continuous Regression Gate</p>
      </div>
    </div>
    <div class="flex items-center gap-4">
      <span class="px-3 py-1 text-xs font-semibold rounded-full ${
        latest?.status === 'PASS'
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : latest?.status === 'WARN'
          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
      }">
        GATE STATUS: ${latest?.status || 'NO RUNS'} (GRADE ${latest?.grade || 'N/A'})
      </span>
      <span class="text-xs text-slate-400">Total Runs: ${runs.length}</span>
    </div>
  </header>

  <!-- Main Content -->
  <main class="max-w-7xl mx-auto p-6 space-y-6">
    <!-- Top KPI Cards -->
    <div class="grid grid-cols-1 md:grid-cols-5 gap-4">
      <!-- 1. Overall Score -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-xs font-medium text-slate-400">Overall Quality Score</span>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-blue-400">${latest?.overallScore ?? 0}</span>
          <span class="text-sm text-slate-500">/ 100</span>
        </div>
        <div class="mt-2 text-xs text-emerald-400">Grade ${latest?.grade || 'N/A'}</div>
      </div>

      <!-- 2. Performance (LCP) -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-xs font-medium text-slate-400">LCP (Mobile)</span>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-slate-100">${latest ? latest.breakdown.performance.metrics.lcpMs : 0}</span>
          <span class="text-sm text-slate-500">ms</span>
        </div>
        <div class="mt-2 text-xs text-slate-400">Target &le; 2500ms</div>
      </div>

      <!-- 3. INP -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-xs font-medium text-slate-400">INP (Interaction)</span>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-slate-100">${latest ? latest.breakdown.performance.metrics.inpMs : 0}</span>
          <span class="text-sm text-slate-500">ms</span>
        </div>
        <div class="mt-2 text-xs text-slate-400">Target &le; 200ms</div>
      </div>

      <!-- 4. Security Score -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-xs font-medium text-slate-400">Security & Secrets</span>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold ${
            latest && latest.breakdown.security.metrics.secretsLeakedCount > 0 ? 'text-rose-400' : 'text-emerald-400'
          }">
            ${latest ? latest.breakdown.security.score : 100}
          </span>
          <span class="text-sm text-slate-500">/ 100</span>
        </div>
        <div class="mt-2 text-xs text-slate-400">${latest?.breakdown.security.metrics.secretsLeakedCount ?? 0} Leaks Detected</div>
      </div>

      <!-- 5. Accessibility -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <span class="text-xs font-medium text-slate-400">Accessibility (a11y)</span>
        <div class="mt-2 flex items-baseline gap-2">
          <span class="text-3xl font-extrabold text-purple-400">${latest ? latest.breakdown.accessibility.score : 100}</span>
          <span class="text-sm text-slate-500">/ 100</span>
        </div>
        <div class="mt-2 text-xs text-slate-400">WCAG 2.2 AA Standard</div>
      </div>
    </div>

    <!-- Charts Section -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 class="font-semibold text-sm text-slate-200 mb-4">📈 Quality Score Trend Over Commits</h3>
        <div class="h-64">
          <canvas id="scoreChart"></canvas>
        </div>
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 class="font-semibold text-sm text-slate-200 mb-4">⚡ Core Web Vitals Latency (ms)</h3>
        <div class="h-64">
          <canvas id="vitalsChart"></canvas>
        </div>
      </div>
    </div>
  </main>

  <script>
    const runsData = ${runsJson};
    if (runsData.length > 0) {
      const reversed = [...runsData].reverse();
      const labels = reversed.map((r, i) => r.git?.commit?.substring(0, 7) || 'Run ' + (i + 1));
      
      // Score Chart
      new Chart(document.getElementById('scoreChart'), {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Overall Score (0-100)',
            data: reversed.map(r => r.overallScore),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { min: 0, max: 100, grid: { color: '#1e293b' } },
            x: { grid: { color: '#1e293b' } }
          }
        }
      });

      // Vitals Chart
      new Chart(document.getElementById('vitalsChart'), {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: 'LCP (ms)',
              data: reversed.map(r => r.breakdown.performance.metrics.lcpMs),
              backgroundColor: '#10b981'
            },
            {
              label: 'INP (ms)',
              data: reversed.map(r => r.breakdown.performance.metrics.inpMs),
              backgroundColor: '#f59e0b'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { grid: { color: '#1e293b' } },
            x: { grid: { color: '#1e293b' } }
          }
        }
      });
    }
  </script>
</body>
</html>`;
}
