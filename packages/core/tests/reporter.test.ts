import { describe, it, expect } from 'vitest';
import { formatSarifReport } from '../src/reporter';
import type { ScanResult } from '../src/types';

describe('SARIF & Oxlint Ecosystem Integration', () => {
  it('should generate valid OASIS SARIF v2.1.0 report', () => {
    const mockScanResult: ScanResult = {
      filesScanned: 1,
      violations: [
        {
          ruleId: 'i18n-hardcoded',
          severity: 'error',
          message: 'Hardcoded string found in JSX: "Đăng nhập"',
          file: 'src/components/Header.tsx',
          loc: { line: 10, column: 5, start: 100, end: 110 },
          rawText: 'Đăng nhập',
          suggestedFix: {
            type: 'replace',
            replacement: "{t('dang_nhap')}",
            generatedKey: 'dang_nhap',
          },
        },
      ],
      startTime: 1000,
      endTime: 1050,
      durationMs: 50,
    };

    const sarifOutput = formatSarifReport(mockScanResult);
    const parsed = JSON.parse(sarifOutput);

    expect(parsed.version).toBe('2.1.0');
    expect(parsed.$schema).toContain('sarif-schema-2.1.0.json');
    expect(parsed.runs.length).toBe(1);
    expect(parsed.runs[0].tool.driver.name).toBe('agent-lint');
    expect(parsed.runs[0].results.length).toBe(1);
    expect(parsed.runs[0].results[0].ruleId).toBe('i18n-hardcoded');
    expect(parsed.runs[0].results[0].locations[0].physicalLocation.region.startLine).toBe(10);
  });
});
