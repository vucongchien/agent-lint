import { describe, it, expect } from 'vitest';
import { scanCompositionViolations } from '../src/architecture/composition-scanner';
import { CleanCompositionSchema } from '../src/config/schema';

describe('Clean Composition Architecture Scanner', () => {
  const config = CleanCompositionSchema.parse({
    enabled: true,
    severity: 'warn',
    targets: ['**/page.{tsx,jsx}', '**/layout.{tsx,jsx}'],
    max_raw_jsx_depth: 3,
    max_raw_element_ratio: 0.6,
  });

  it('should flag deeply nested raw HTML elements inside a page.tsx', () => {
    const dirtyPageCode = `
      export default function DashboardPage() {
        return (
          <main>
            <div>
              <section>
                <div>
                  <ul>
                    <li>Deep Item</li>
                  </ul>
                </div>
              </section>
            </div>
          </main>
        );
      }
    `;

    const violations = scanCompositionViolations({
      filePath: 'src/app/dashboard/page.tsx',
      code: dirtyPageCode,
      config,
    });

    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].ruleId).toBe('composition-violation');
    expect(violations[0].message).toContain('deeply nested raw HTML elements');
  });

  it('should pass a clean composition-only page.tsx with custom components', () => {
    const cleanPageCode = `
      import { Header } from '@/components/Header';
      import { DashboardStats } from '@/components/DashboardStats';
      import { RecentOrders } from '@/components/RecentOrders';
      import { Footer } from '@/components/Footer';

      export default function DashboardPage() {
        return (
          <main className="min-h-screen">
            <Header />
            <DashboardStats />
            <RecentOrders />
            <Footer />
          </main>
        );
      }
    `;

    const violations = scanCompositionViolations({
      filePath: 'src/app/dashboard/page.tsx',
      code: cleanPageCode,
      config,
    });

    expect(violations.length).toBe(0);
  });

  it('should ignore regular component files outside page/layout targets', () => {
    const cardCode = `
      export function ComplexCard() {
        return (
          <div>
            <div>
              <div>
                <div>
                  <span>Allowed inside dedicated component</span>
                </div>
              </div>
            </div>
          </div>
        );
      }
    `;

    const violations = scanCompositionViolations({
      filePath: 'src/components/ComplexCard.tsx',
      code: cardCode,
      config,
    });

    expect(violations.length).toBe(0);
  });
});
