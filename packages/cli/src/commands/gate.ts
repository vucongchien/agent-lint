import path from 'path';
import pc from 'picocolors';
import { runQualityGate, formatComparisonTerminal } from '@chien_swe/observatory';

export interface GateCommandOptions {
  compare?: boolean;
  url?: string;
  skipBrowser?: boolean;
}

export async function gateCommand(options: GateCommandOptions) {
  try {
    console.log(pc.bold(pc.cyan(`\n🛡️ Starting Agent-Lint Web Quality Gate & Observatory...`)));

    const result = await runQualityGate({
      rootDir: process.cwd(),
      compareWithBase: options.compare !== false,
      targetUrl: options.url,
      skipBrowser: options.skipBrowser,
    });

    console.log(`\n${pc.bold('📊 Quality Gate Scorecard Summary:')}`);
    console.log(`  🏆 ${pc.bold('Overall Score:')} ${pc.bold(pc.cyan(`${result.overallScore} / 100`))} (Grade: ${pc.bold(result.grade)})`);
    console.log(`  🔍 ${pc.bold('Discovery:')} Found ${result.routesDiscovered} routes, classified ${result.totalActionsClassified} UI interactive actions`);
    console.log(`  🔒 ${pc.bold('Security:')} ${result.breakdown.security.score}/100 (${result.breakdown.security.metrics.secretsLeakedCount} secrets leaked)`);
    console.log(`  ♿ ${pc.bold('Accessibility:')} ${result.breakdown.accessibility.score}/100 (${result.breakdown.accessibility.metrics.violations.length} violations)`);
    console.log(`  ⚡ ${pc.bold('Performance:')} LCP ${result.breakdown.performance.metrics.lcpMs}ms | INP ${result.breakdown.performance.metrics.inpMs}ms | CLS ${result.breakdown.performance.metrics.cls}`);
    console.log(`  🚀 ${pc.bold('Workload Stress:')} Max ${result.breakdown.loadStress.metrics.maxRps.toLocaleString()} RPS | P95 ${result.breakdown.loadStress.metrics.p95LatencyMs}ms`);

    if (result.regressions && result.regressions.length > 0) {
      console.log(`\n${pc.bold('📉 Regression Alerts:')}`);
      for (const reg of result.regressions) {
        const icon = reg.status === 'IMPROVED' ? pc.green('🟢') : reg.status === 'REGRESSED' ? pc.red('🔴') : pc.yellow('🟡');
        console.log(`  ${icon} ${reg.metric}: ${reg.baseValue} ➔ ${reg.currentValue} (${reg.deltaPercent > 0 ? `+${reg.deltaPercent}%` : `${reg.deltaPercent}%`})`);
      }
    }

    console.log(`\n${pc.bold('Gate Verdict:')} ${
      result.status === 'PASS'
        ? pc.bold(pc.green('✔ PASS (Approved for production)'))
        : result.status === 'WARN'
        ? pc.bold(pc.yellow('⚠️ WARNING (Review regressions before merge)'))
        : pc.bold(pc.red('❌ FAIL (Gate rejected due to severe regressions or security issues)'))
    }\n`);

    if (result.status === 'FAIL') {
      process.exit(1);
    }
  } catch (err: any) {
    console.error(pc.red(`Error running quality gate: ${err.message}`));
    process.exit(1);
  }
}
