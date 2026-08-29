import type { ArchitecturePreset, ArchitectureRuleConfig } from '../types';

/**
 * Định nghĩa cấu hình mặc định cho các Architecture Presets
 */
export const ARCHITECTURE_PRESETS: Partial<
  Record<ArchitecturePreset, Partial<ArchitectureRuleConfig>>
> = {
  // 1. Next.js App Router Standard
  nextjs: {
    enabled: true,
    severity: 'error',
    preset: 'nextjs',
    allow_type_imports: true,
    server_client_boundary: {
      enabled: true,
      client_identifiers: ['"use client"', "'use client'"],
      disallowed_imports: [
        '@/lib/db',
        'prisma',
        '@prisma/client',
        'server-only',
        'fs',
        'path',
        'crypto',
      ],
    },
  },

  // 2. Clean Architecture (Domain -> Application -> Infrastructure -> Presentation)
  'clean-architecture': {
    enabled: true,
    severity: 'error',
    preset: 'clean-architecture',
    allow_type_imports: true,
    layers: [
      {
        name: 'domain',
        path: 'src/domain/**',
        can_import: [], // Domain không được import bất kỳ tầng nào
        disallowed_packages: [
          '@prisma/*',
          'prisma',
          'typeorm',
          'mongoose',
          '@nestjs/*',
          'axios',
          'express',
        ],
        message: 'Domain layer must be pure TypeScript. No ORM, HTTP clients, or framework dependencies allowed.',
      },
      {
        name: 'application',
        path: 'src/application/**',
        can_import: ['domain'], // Application chỉ được phụ thuộc Domain
        disallowed_packages: ['@prisma/*', 'typeorm', 'mongoose', 'express'],
        message: 'Application layer (Use Cases) must depend on Domain Ports (interfaces) only, not direct Infrastructure.',
      },
      {
        name: 'infrastructure',
        path: 'src/infrastructure/**',
        can_import: ['domain', 'application'], // Infrastructure implement Ports của Domain & Application
      },
      {
        name: 'presentation',
        path: 'src/presentation/**',
        can_import: ['domain', 'application'], // Presentation gọi Use Cases
      },
    ],
  },

  // 3. Feature-Sliced Design (FSD)
  fsd: {
    enabled: true,
    severity: 'error',
    preset: 'fsd',
    allow_type_imports: true,
    layers: [
      {
        name: 'shared',
        path: 'src/shared/**',
        can_import: [], // Tầng đáy, chỉ import chính nó
        message: 'FSD Violation: "shared" is the lowest layer and cannot import from higher slices.',
      },
      {
        name: 'entities',
        path: 'src/entities/**',
        can_import: ['shared'],
        message: 'FSD Violation: "entities" can only import from "shared".',
      },
      {
        name: 'features',
        path: 'src/features/**',
        can_import: ['entities', 'shared'],
        message: 'FSD Violation: "features" can only import from "entities" or "shared".',
      },
      {
        name: 'widgets',
        path: 'src/widgets/**',
        can_import: ['features', 'entities', 'shared'],
        message: 'FSD Violation: "widgets" cannot import from "pages" or "app".',
      },
      {
        name: 'pages',
        path: 'src/pages/**',
        can_import: ['widgets', 'features', 'entities', 'shared'],
      },
      {
        name: 'app',
        path: 'src/app/**',
        can_import: ['pages', 'widgets', 'features', 'entities', 'shared'],
      },
    ],
  },

  // 4. Domain-Driven Design (DDD) & Event-Driven
  ddd: {
    enabled: true,
    severity: 'error',
    preset: 'ddd',
    allow_type_imports: true,
    layers: [
      {
        name: 'domain',
        path: 'src/domain/**',
        can_import: [],
        disallowed_packages: [
          '@prisma/*',
          'prisma',
          'typeorm',
          'mongoose',
          '@nestjs/*',
          'kafkajs',
          'amqplib',
          'ioredis',
          'axios',
        ],
        message: 'DDD Domain model must be pure business logic. Message brokers, ORMs, and network libraries are prohibited.',
      },
      {
        name: 'application',
        path: 'src/application/**',
        can_import: ['domain'],
        message: 'Application services orchestrate Use Cases and Domain Events via Ports.',
      },
      {
        name: 'infrastructure',
        path: 'src/infrastructure/**',
        can_import: ['domain', 'application'],
      },
    ],
  },

  // 5. Custom
  custom: {
    enabled: true,
    severity: 'warn',
    preset: 'custom',
    allow_type_imports: true,
  },
};
