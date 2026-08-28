import { describe, it, expect } from 'vitest';
import { scanArchitectureViolations } from '../src/architecture/boundary-scanner';
import { ARCHITECTURE_PRESETS } from '../src/config/presets';
import type { ArchitectureRuleConfig } from '../src/types';

describe('Architecture & Boundary Governance Scanner', () => {
  it('should flag Domain Purity violations (ORM in Domain layer in Clean Arch)', () => {
    const config = ARCHITECTURE_PRESETS['clean-architecture'] as ArchitectureRuleConfig;
    const dirtyDomainCode = `
      import { Entity, Column } from 'typeorm';
      import { PrismaClient } from '@prisma/client';

      export class User {
        id: string;
      }
    `;

    const violations = scanArchitectureViolations({
      filePath: 'src/domain/entities/User.ts',
      code: dirtyDomainCode,
      config,
    });

    expect(violations.length).toBe(2);
    expect(violations[0].ruleId).toBe('domain-purity-violation');
    expect(violations[0].message).toContain('Domain layer must be pure TypeScript');
  });

  it('should flag Layer Inversion in FSD (shared layer importing from features)', () => {
    const config = ARCHITECTURE_PRESETS['fsd'] as ArchitectureRuleConfig;
    const invalidSharedCode = `
      import { AuthForm } from '@/features/auth';

      export function SharedButton() {
        return <button>Click</button>;
      }
    `;

    const violations = scanArchitectureViolations({
      filePath: 'src/shared/components/Button.tsx',
      code: invalidSharedCode,
      config,
    });

    expect(violations.length).toBe(1);
    expect(violations[0].ruleId).toBe('architecture-layer-inversion');
    expect(violations[0].message).toContain('FSD Violation');
  });

  it('should flag Server/Client boundary violations in Next.js', () => {
    const config = ARCHITECTURE_PRESETS['nextjs'] as ArchitectureRuleConfig;
    const dirtyClientCode = `
      "use client";
      import { db } from '@/lib/db';
      import fs from 'fs';

      export function ClientComponent() {
        return <div>Client</div>;
      }
    `;

    const violations = scanArchitectureViolations({
      filePath: 'src/components/UserProfile.client.tsx',
      code: dirtyClientCode,
      config,
    });

    expect(violations.length).toBe(2);
    expect(violations[0].ruleId).toBe('server-client-boundary');
    expect(violations[1].ruleId).toBe('server-client-boundary');
  });

  it('should allow pure type-only imports across layers when allow_type_imports is true', () => {
    const config = {
      ...(ARCHITECTURE_PRESETS['fsd'] as ArchitectureRuleConfig),
      allow_type_imports: true,
    };

    const typeOnlyCode = `
      import type { UserProps } from '@/entities/user';

      export function SharedCard(props: UserProps) {
        return <div>Card</div>;
      }
    `;

    const violations = scanArchitectureViolations({
      filePath: 'src/shared/components/Card.tsx',
      code: typeOnlyCode,
      config,
    });

    // import type is completely allowed!
    expect(violations.length).toBe(0);
  });
});
