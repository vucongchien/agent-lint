import fs from 'fs';
import path from 'path';

/**
 * Bảng Token màu cơ bản theo chuẩn Tailwind CSS (Default Theme Fallback)
 * Được sử dụng làm giá trị dự phòng khi project không cung cấp custom theme.
 */
export const DEFAULT_TAILWIND_COLORS: Record<string, string> = {
  'white': '#ffffff',
  'black': '#000000',
  'slate-50': '#f8fafc',
  'slate-100': '#f1f5f9',
  'slate-200': '#e2e8f0',
  'slate-300': '#cbd5e1',
  'slate-400': '#94a3b8',
  'slate-500': '#64748b',
  'slate-600': '#475569',
  'slate-700': '#334155',
  'slate-800': '#1e293b',
  'slate-900': '#0f172a',
  'slate-950': '#020617',
  'gray-50': '#f9fafb',
  'gray-100': '#f3f4f6',
  'gray-200': '#e5e7eb',
  'gray-300': '#d1d5db',
  'gray-400': '#9ca3af',
  'gray-500': '#6b7280',
  'gray-600': '#4b5563',
  'gray-700': '#374151',
  'gray-800': '#1f2937',
  'gray-900': '#111827',
  'gray-950': '#030712',
  'zinc-500': '#71717a',
  'zinc-800': '#27272a',
  'red-500': '#ef4444',
  'red-600': '#dc2626',
  'orange-500': '#f97316',
  'amber-500': '#f59e0b',
  'yellow-500': '#eab308',
  'green-500': '#22c55e',
  'green-600': '#16a34a',
  'emerald-500': '#10b981',
  'teal-500': '#14b8a6',
  'cyan-500': '#06b6d4',
  'sky-500': '#0ea5e9',
  'blue-500': '#3b82f6',
  'blue-600': '#2563eb',
  'indigo-500': '#6366f1',
  'violet-500': '#8b5cf6',
  'purple-500': '#a855f7',
  'pink-500': '#ec4899',
  'rose-500': '#f43f5e',
};

// Export alias for backwards-compatibility
export const TAILWIND_COLORS = DEFAULT_TAILWIND_COLORS;

export const TAILWIND_SPACING_PX: Record<string, number> = {
  '0': 0,
  '0.5': 2,
  '1': 4,
  '1.5': 6,
  '2': 8,
  '2.5': 10,
  '3': 12,
  '3.5': 14,
  '4': 16,
  '5': 20,
  '6': 24,
  '7': 28,
  '8': 32,
  '9': 36,
  '10': 40,
  '11': 44,
  '12': 48,
  '14': 56,
  '16': 64,
  '20': 80,
  '24': 96,
};

export const TAILWIND_FONT_SIZES_PX: Record<string, number> = {
  'xs': 12,
  'sm': 14,
  'base': 16,
  'lg': 18,
  'xl': 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
};

export const TAILWIND_RADII_PX: Record<string, number> = {
  'none': 0,
  'sm': 2,
  'DEFAULT': 4,
  'md': 6,
  'lg': 8,
  'xl': 12,
  '2xl': 16,
  '3xl': 24,
  'full': 9999,
};

/**
 * Tự động nạp động các token từ tailwind.config.* nếu có trong project
 */
export function resolveProjectTailwindTokens(rootDir: string = process.cwd()): Record<string, string> {
  const configNames = [
    'tailwind.config.js',
    'tailwind.config.cjs',
    'tailwind.config.mjs',
    'tailwind.config.ts',
  ];

  for (const name of configNames) {
    const configPath = path.join(rootDir, name);
    if (fs.existsSync(configPath)) {
      try {
        // Nếu project có file config, có thể nạp thêm màu custom
        // Tạm thời fallback về default palette kết hợp
        return { ...DEFAULT_TAILWIND_COLORS };
      } catch {
        // Fallback
      }
    }
  }

  return DEFAULT_TAILWIND_COLORS;
}

export function findNearestSpacingToken(pxValue: number): { tokenName: string; tokenPx: number } {
  let closestName = '4';
  let minDiff = Infinity;

  for (const [name, px] of Object.entries(TAILWIND_SPACING_PX)) {
    const diff = Math.abs(px - pxValue);
    if (diff < minDiff) {
      minDiff = diff;
      closestName = name;
    }
  }

  return { tokenName: closestName, tokenPx: TAILWIND_SPACING_PX[closestName] };
}

export function findNearestFontSizeToken(pxValue: number): { tokenName: string; tokenPx: number } {
  let closestName = 'base';
  let minDiff = Infinity;

  for (const [name, px] of Object.entries(TAILWIND_FONT_SIZES_PX)) {
    const diff = Math.abs(px - pxValue);
    if (diff < minDiff) {
      minDiff = diff;
      closestName = name;
    }
  }

  return { tokenName: closestName, tokenPx: TAILWIND_FONT_SIZES_PX[closestName] };
}
