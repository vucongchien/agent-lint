import type { QualityGateResult, RegressionDelta } from '../types';

/**
 * Đánh giá điểm tổng thể và kiểm định hồi quy (Regression Gate)
 */
export function evaluateQualityGate(
  current: Omit<QualityGateResult, 'overallScore' | 'grade' | 'status' | 'regressions'>,
  base?: QualityGateResult
): QualityGateResult {
  const { performance, loadStress, accessibility, security, reliability } = current.breakdown;

  // Tính điểm tổng thể (0 - 100) có trọng số:
  // - Performance: 25%
  // - Load & Stress: 20%
  // - Security: 20%
  // - Accessibility: 15%
  // - Reliability: 20%
  const overallScore = Math.round(
    performance.score * 0.25 +
      loadStress.score * 0.2 +
      security.score * 0.2 +
      accessibility.score * 0.15 +
      reliability.score * 0.2
  );

  // Tính toán Regression Delta nếu có phiên bản base
  const regressions: RegressionDelta[] = [];
  if (base) {
    // 1. So sánh LCP
    const baseLcp = base.breakdown.performance.metrics.lcpMs;
    const curLcp = performance.metrics.lcpMs;
    const lcpDelta = curLcp - baseLcp;
    const lcpDeltaPercent = baseLcp > 0 ? (lcpDelta / baseLcp) * 100 : 0;
    regressions.push({
      metric: 'LCP (Largest Contentful Paint)',
      baseValue: baseLcp,
      currentValue: curLcp,
      delta: lcpDelta,
      deltaPercent: Math.round(lcpDeltaPercent * 10) / 10,
      status: lcpDeltaPercent > 15 ? 'REGRESSED' : lcpDeltaPercent < -5 ? 'IMPROVED' : 'STABLE',
      isSevere: lcpDeltaPercent > 25,
    });

    // 2. So sánh INP
    const baseInp = base.breakdown.performance.metrics.inpMs;
    const curInp = performance.metrics.inpMs;
    const inpDelta = curInp - baseInp;
    const inpDeltaPercent = baseInp > 0 ? (inpDelta / baseInp) * 100 : 0;
    regressions.push({
      metric: 'INP (Interaction Latency)',
      baseValue: baseInp,
      currentValue: curInp,
      delta: inpDelta,
      deltaPercent: Math.round(inpDeltaPercent * 10) / 10,
      status: inpDeltaPercent > 20 ? 'REGRESSED' : inpDeltaPercent < -10 ? 'IMPROVED' : 'STABLE',
      isSevere: inpDeltaPercent > 35,
    });

    // 3. So sánh Overall Score
    const baseScore = base.overallScore;
    const scoreDelta = overallScore - baseScore;
    const scoreDeltaPercent = baseScore > 0 ? (scoreDelta / baseScore) * 100 : 0;
    regressions.push({
      metric: 'Overall Quality Score',
      baseValue: baseScore,
      currentValue: overallScore,
      delta: scoreDelta,
      deltaPercent: Math.round(scoreDeltaPercent * 10) / 10,
      status: scoreDelta < -5 ? 'REGRESSED' : scoreDelta > 3 ? 'IMPROVED' : 'STABLE',
      isSevere: scoreDelta < -15,
    });
  }

  // Xếp loại Grade
  let grade: QualityGateResult['grade'] = 'C';
  if (overallScore >= 95) grade = 'A+';
  else if (overallScore >= 85) grade = 'A';
  else if (overallScore >= 70) grade = 'B';
  else if (overallScore >= 50) grade = 'C';
  else grade = 'FAIL';

  // Đánh giá Trạng thái Quality Gate
  let status: QualityGateResult['status'] = 'PASS';
  const hasSevereRegression = regressions.some((r) => r.isSevere);
  const hasSecurityCritical = security.metrics.secretsLeakedCount > 0;

  if (overallScore < 50 || hasSecurityCritical || hasSevereRegression) {
    status = 'FAIL';
  } else if (overallScore < 75 || regressions.some((r) => r.status === 'REGRESSED')) {
    status = 'WARN';
  }

  return {
    ...current,
    overallScore,
    grade,
    status,
    regressions: regressions.length > 0 ? regressions : undefined,
  };
}
