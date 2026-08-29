export type ActionRiskLevel = 'SAFE' | 'DESTRUCTIVE' | 'EXTERNAL';

export interface ActionElement {
  id: string;
  tag: string;
  text: string;
  selector?: string;
  location?: { file: string; line: number; column: number };
  riskLevel: ActionRiskLevel;
  riskReason?: string;
  type?: string;
}

export interface RouteDiscoveryInfo {
  path: string;
  filePath: string;
  type: 'page' | 'api' | 'action';
  elements: ActionElement[];
  isDynamic: boolean;
}

export interface WebVitalsMetrics {
  lcpMs: number;
  inpMs: number;
  cls: number;
  ttfbMs: number;
  fcpMs: number;
}

export interface PerformanceMetrics extends WebVitalsMetrics {
  initialJsKb: number;
  rscPayloadKb: number;
  hydrationMs: number;
  longTasksCount: number;
  frameRateFps: number;
}

export interface WorkloadEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  weight: number; // e.g. 0.6 for 60%
  expectedStatus?: number;
}

export interface LoadStressMetrics {
  concurrency: number;
  totalRequests: number;
  durationSeconds: number;
  maxRps: number;
  p50LatencyMs: number;
  p90LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  errorRatePercent: number;
  breakpointRps?: number;
}

export interface AccessibilityViolation {
  ruleId: string;
  element: string;
  message: string;
  file?: string;
  line?: number;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
}

export interface AccessibilityMetrics {
  score: number; // 0 - 100
  violations: AccessibilityViolation[];
  focusTrapValid: boolean;
  keyboardNavScore: number;
  colorContrastViolations: number;
}

export interface SecurityViolation {
  id: string;
  type: 'sast' | 'secret_leak' | 'dast' | 'dependency';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  location?: { file: string; line: number };
  evidence?: string;
}

export interface SecurityMetrics {
  score: number; // 0 - 100
  violations: SecurityViolation[];
  secretsLeakedCount: number;
  sastIssuesCount: number;
}

export interface ReliabilityMetrics {
  errorRatePercent: number;
  timeoutCount: number;
  gracefulDegradationValid: boolean;
  postGcRamSlopeMb: number;
  detachedDomNodes: number;
  selfHealingSeconds: number;
}

export interface RegressionDelta {
  metric: string;
  baseValue: number;
  currentValue: number;
  delta: number;
  deltaPercent: number;
  status: 'IMPROVED' | 'STABLE' | 'REGRESSED';
  isSevere: boolean;
}

export interface QualityGateResult {
  id: string;
  timestamp: string;
  git?: {
    commit: string;
    branch: string;
    tag?: string;
    message?: string;
  };
  overallScore: number; // 0 - 100
  grade: 'A+' | 'A' | 'B' | 'C' | 'FAIL';
  status: 'PASS' | 'WARN' | 'FAIL';
  breakdown: {
    performance: { score: number; metrics: PerformanceMetrics };
    loadStress: { score: number; metrics: LoadStressMetrics };
    accessibility: { score: number; metrics: AccessibilityMetrics };
    security: { score: number; metrics: SecurityMetrics };
    reliability: { score: number; metrics: ReliabilityMetrics };
  };
  regressions?: RegressionDelta[];
  routesDiscovered: number;
  totalActionsClassified: number;
  durationMs: number;
}
