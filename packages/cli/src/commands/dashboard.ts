import http from 'http';
import pc from 'picocolors';
import { HistoryManager, generateDashboardHtml, QualityGateResult } from '@chien_swe/observatory';

export interface DashboardCommandOptions {
  port?: string;
}

export function dashboardCommand(options: DashboardCommandOptions) {
  try {
    const port = parseInt(options.port || '4200', 10);
    const historyManager = new HistoryManager(process.cwd());
    const history = historyManager.listHistory();

    const runs: QualityGateResult[] = [];
    for (const h of history) {
      const r = historyManager.getRun(h.id);
      if (r) runs.push(r);
    }

    const server = http.createServer((req, res) => {
      if (req.url === '/api/runs') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(runs));
        return;
      }

      const html = generateDashboardHtml(runs);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(html);
    });

    server.listen(port, () => {
      console.log(pc.bold(pc.green(`\n🚀 Web Quality Gate & Observatory Dashboard is live!`)));
      console.log(`  🌐 URL: ${pc.bold(pc.cyan(`http://localhost:${port}`))}`);
      console.log(`  📁 Loaded ${runs.length} historical run snapshots from .agent-perf/\n`);
    });
  } catch (err: any) {
    console.error(pc.red(`Error starting dashboard: ${err.message}`));
    process.exit(1);
  }
}
