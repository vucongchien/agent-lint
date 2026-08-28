import { describe, it, expect } from 'vitest';
import { scanDuplicateLayoutViolations } from '../src/architecture/deduplication-scanner';
import { ComponentDeduplicationSchema } from '../src/config/schema';

describe('Component & Layout Deduplication Scanner (Rule of Three)', () => {
  const config = ComponentDeduplicationSchema.parse({
    enabled: true,
    severity: 'warn',
    min_occurrences: 3,
    min_element_count: 4,
    similarity_threshold: 0.8,
  });

  it('should flag duplicate component layouts when repeated 3 or more times across files', () => {
    const cardSnippet = `
      export function CardA() {
        return (
          <div className="rounded-lg shadow p-4">
            <img src="/img.jpg" className="h-40" />
            <div>
              <h3 className="text-lg font-bold">Title</h3>
              <p className="text-sm">Description</p>
              <button className="btn">Action</button>
            </div>
          </div>
        );
      }
    `;

    const files = [
      { filePath: 'src/components/ProductCard.tsx', code: cardSnippet },
      { filePath: 'src/components/ArticleCard.tsx', code: cardSnippet },
      { filePath: 'src/components/UserCard.tsx', code: cardSnippet },
    ];

    const violations = scanDuplicateLayoutViolations(files, config);

    expect(violations.length).toBeGreaterThanOrEqual(1);
    expect(violations[0].ruleId).toBe('duplicate-layout');
    expect(violations[0].message).toContain('Duplicate component layout detected');
    expect(violations[0].message).toContain('3 occurrences across files');
  });

  it('should tolerate layout duplication when only repeated twice (Rule of Three compliance)', () => {
    const cardSnippet = `
      export function CardA() {
        return (
          <div className="rounded-lg shadow p-4">
            <img src="/img.jpg" className="h-40" />
            <div>
              <h3 className="text-lg">Title</h3>
              <p className="text-sm">Desc</p>
            </div>
          </div>
        );
      }
    `;

    // Only 2 files -> Under the Rule of Three threshold (min_occurrences: 3)
    const files = [
      { filePath: 'src/components/ProductCard.tsx', code: cardSnippet },
      { filePath: 'src/components/ArticleCard.tsx', code: cardSnippet },
    ];

    const violations = scanDuplicateLayoutViolations(files, config);

    expect(violations.length).toBe(0);
  });
});
