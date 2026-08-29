import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { scanAccessibility } from '../src/accessibility/a11y-scanner';

describe('Accessibility Scanner', () => {
  const tempDir = path.resolve(__dirname, '__temp_a11y__');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('should detect missing alt on images and missing aria-label on icon buttons', () => {
    fs.writeFileSync(
      path.join(tempDir, 'src', 'App.tsx'),
      `export function App() {
         return (
           <div>
             <img src="/avatar.png" />
             <button><svg /></button>
           </div>
         );
       }`
    );

    const metrics = scanAccessibility(tempDir);
    expect(metrics.violations.length).toBe(2);
    expect(metrics.violations.some((v) => v.ruleId === 'a11y-img-has-alt')).toBe(true);
    expect(metrics.violations.some((v) => v.ruleId === 'a11y-button-has-name')).toBe(true);
    expect(metrics.score).toBeLessThan(100);
  });
});
