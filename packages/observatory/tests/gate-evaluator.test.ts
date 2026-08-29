import { describe, it, expect } from 'vitest';
import { evaluateQualityGate } from '../src/telemetry/gate-evaluator';
import type { QualityGateResult } from '../types';

describe('Quality Gate Evaluator', () => {
  it('should compute weighted score and grade A for good metrics', () => {
    const mockRun = {
      id: 'run_1',
      timestamp: '2026-08-29T12:00:00Z',
      breakdown: {
        performance: {
          score: 95,
          metrics: { lcpMs: 1200, inpMs: 70, cls: 0.01, ttfbMs: 120, fcpMs: 500, initialJsKb: 120, rscPayloadKb: 20, hydrationMs: 80, longTasksCount: 0, frameRateFps: 60 },
        },
        loadStress: {
          score: 90,
          metrics: { concurrency: 500, totalRequests: 10000, durationSeconds: 30, maxRps: 8000, p50LatencyMs: 40, p90LatencyMs: 100, p95LatencyMs: 180, p99LatencyMs: 400, errorRatePercent: 0 },
        },
        accessibility: {
          score: 95,
          metrics: {
            score: 95,
            violations: [],
            focusTrapValid: true,
            keyboardNavScore: 95,
            colorContrastViolations: 0,
          },
        },
        security: {
          score: 100,
          metrics: {
            score: 100,
            violations: [],
            secretsLeakedCount: 0,
            sastIssuesCount: 0,
          },
        },
        reliability: {
          score: 95,
          metrics: { errorRatePercent: 0, timeoutCount: 0, gracefulDegradationValid: true, postGcRamSlopeMb: 0.1, detachedDomNodes: 0, selfHealingSeconds: 2 },
        },
      },
      routesDiscovered: 5,
      totalActionsClassified: 20,
      durationMs: 1200,
    };

    const result = evaluateQualityGate(mockRun);
    expect(result.overallScore).toBeGreaterThanOrEqual(90);
    expect(['A+', 'A']).toContain(result.grade);
    expect(result.status).toBe('PASS');
  });

  it('should flag severe regressions when LCP degrades by more than 25%', () => {
    const baseRun: QualityGateResult = {
      id: 'run_base',
      timestamp: '2026-08-29T10:00:00Z',
      overallScore: 92,
      grade: 'A',
      status: 'PASS',
      breakdown: {
        performance: {
          score: 95,
          metrics: { lcpMs: 1000, inpMs: 80, cls: 0.01, ttfbMs: 100, fcpMs: 400, initialJsKb: 100, rscPayloadKb: 20, hydrationMs: 80, longTasksCount: 0, frameRateFps: 60 },
        },
        loadStress: { score: 90, metrics: {} as any },
        accessibility: { score: 90, metrics: { score: 90, violations: [], focusTrapValid: true, keyboardNavScore: 90, colorContrastViolations: 0 } },
        security: { score: 100, metrics: { score: 100, violations: [], secretsLeakedCount: 0, sastIssuesCount: 0 } },
        reliability: { score: 90, metrics: {} as any },
      },
      routesDiscovered: 5,
      totalActionsClassified: 20,
      durationMs: 1000,
    };

    const currentRun = {
      id: 'run_current',
      timestamp: '2026-08-29T11:00:00Z',
      breakdown: {
        performance: {
          score: 60,
          metrics: { lcpMs: 2200, inpMs: 150, cls: 0.01, ttfbMs: 300, fcpMs: 900, initialJsKb: 250, rscPayloadKb: 80, hydrationMs: 180, longTasksCount: 2, frameRateFps: 45 },
        },
        loadStress: { score: 90, metrics: {} as any },
        accessibility: { score: 90, metrics: { score: 90, violations: [], focusTrapValid: true, keyboardNavScore: 90, colorContrastViolations: 0 } },
        security: { score: 100, metrics: { score: 100, violations: [], secretsLeakedCount: 0, sastIssuesCount: 0 } },
        reliability: { score: 90, metrics: {} as any },
      },
      routesDiscovered: 5,
      totalActionsClassified: 20,
      durationMs: 1000,
    };

    const result = evaluateQualityGate(currentRun, baseRun);
    expect(result.regressions).toBeDefined();
    const lcpReg = result.regressions?.find((r) => r.metric.includes('LCP'));
    expect(lcpReg?.status).toBe('REGRESSED');
    expect(lcpReg?.isSevere).toBe(true);
    expect(result.status).toBe('FAIL'); // Severe regression fails the gate
  });
});
