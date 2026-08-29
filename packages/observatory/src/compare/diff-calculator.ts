import pc from 'picocolors';
import type { QualityGateResult, RegressionDelta } from '../types';

/**
 * Tạo bảng hiển thị so sánh đối đầu 2 phiên bản trên Terminal
 */
export function formatComparisonTerminal(base: QualityGateResult, current: QualityGateResult): string {
  const lines: string[] = [];

  const baseCommit = base.git?.commit ? base.git.commit.substring(0, 7) : base.id.substring(0, 8);
  const curCommit = current.git?.commit ? current.git.commit.substring(0, 7) : current.id.substring(0, 8);

  lines.push('');
  lines.push(
    pc.bold(
      pc.cyan(`========================================================================================`)
    )
  );
  lines.push(
    pc.bold(
      pc.cyan(`🛡️ AGENT-LINT QUALITY GATE COMPARISON: ${baseCommit} ➔ ${curCommit}`)
    )
  );
  lines.push(
    pc.bold(
      pc.cyan(`========================================================================================`)
    )
  );

  lines.push(
    `${pc.bold('CHỈ SỐ ĐO LƯỜNG'.padEnd(32))} ${pc.bold('BASE'.padEnd(14))} ${pc.bold('HEAD'.padEnd(14))} ${pc.bold('CHÊNH LỆCH (DELTA)'.padEnd(20))} ${pc.bold('ĐÁNH GIÁ')}`
  );
  lines.push(
    `----------------------------------------------------------------------------------------`
  );

  // 1. Overall Score
  const scoreDelta = current.overallScore - base.overallScore;
  const scoreSign = scoreDelta > 0 ? `+${scoreDelta}` : `${scoreDelta}`;
  const scoreEval =
    scoreDelta >= 0
      ? pc.green('🟢 CẢI THIỆN')
      : scoreDelta > -5
      ? pc.yellow('🟡 GIẢM NHẸ')
      : pc.red('🔴 HỒI QUY (REGRESSED)');
  lines.push(
    `${'🏆 Overall Quality Score'.padEnd(32)} ${`${base.overallScore}/100`.padEnd(14)} ${`${current.overallScore}/100`.padEnd(14)} ${scoreSign.padEnd(20)} ${scoreEval}`
  );

  // 2. LCP
  const bLcp = base.breakdown.performance.metrics.lcpMs;
  const cLcp = current.breakdown.performance.metrics.lcpMs;
  const lcpDelta = cLcp - bLcp;
  const lcpDeltaStr = lcpDelta <= 0 ? `${lcpDelta}ms` : `+${lcpDelta}ms`;
  const lcpEval = lcpDelta <= 0 ? pc.green('🟢 NHANH HƠN') : pc.red('🔴 CHẬM HƠN');
  lines.push(
    `${'⚡ LCP (Largest Contentful)'.padEnd(32)} ${`${bLcp}ms`.padEnd(14)} ${`${cLcp}ms`.padEnd(14)} ${lcpDeltaStr.padEnd(20)} ${lcpEval}`
  );

  // 3. INP
  const bInp = base.breakdown.performance.metrics.inpMs;
  const cInp = current.breakdown.performance.metrics.inpMs;
  const inpDelta = cInp - bInp;
  const inpDeltaStr = inpDelta <= 0 ? `${inpDelta}ms` : `+${inpDelta}ms`;
  const inpEval = inpDelta <= 0 ? pc.green('🟢 PHẢN HỒI TỐT') : pc.red('🔴 ĐỘ TRỄ CAO');
  lines.push(
    `${'⚡ INP (Interaction Latency)'.padEnd(32)} ${`${bInp}ms`.padEnd(14)} ${`${cInp}ms`.padEnd(14)} ${inpDeltaStr.padEnd(20)} ${inpEval}`
  );

  // 4. Security Leaks
  const bSec = base.breakdown.security.metrics.secretsLeakedCount;
  const cSec = current.breakdown.security.metrics.secretsLeakedCount;
  const secDelta = cSec - bSec;
  const secEval = cSec === 0 ? pc.green('🟢 AN TOÀN') : pc.red('🚨 LỘ SECRET');
  lines.push(
    `${'🔒 Secrets Leaked Count'.padEnd(32)} ${`${bSec}`.padEnd(14)} ${`${cSec}`.padEnd(14)} ${`${secDelta > 0 ? `+${secDelta}` : secDelta}`.padEnd(20)} ${secEval}`
  );

  lines.push(
    `----------------------------------------------------------------------------------------`
  );

  if (current.status === 'PASS') {
    lines.push(pc.bold(pc.green(`✔ CI GATE STATUS: APPROVED TO MERGE (Score: ${current.overallScore}/100, Grade: ${current.grade})`)));
  } else if (current.status === 'WARN') {
    lines.push(pc.bold(pc.yellow(`⚠️ CI GATE STATUS: WARNING (Score: ${current.overallScore}/100 - Review regressions before merging)`)));
  } else {
    lines.push(pc.bold(pc.red(`❌ CI GATE STATUS: FAILED (Score: ${current.overallScore}/100 - Regressions or Security issues detected)`)));
  }

  lines.push(
    pc.bold(
      pc.cyan(`========================================================================================\n`)
    )
  );

  return lines.join('\n');
}
