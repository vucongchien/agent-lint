import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { findDeadTranslationKeys, pruneDeadKeysFromFile } from '../src/i18n/dead-keys';

describe('Dead Translation Keys Cleaner', () => {
  const tempDir = path.resolve(__dirname, '__temp_dead_keys__');

  beforeEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(path.join(tempDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'locales'), { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should detect unused keys in dictionary files', () => {
    // 1. Tạo file source TSX chỉ dùng key 'used_key'
    const code = `
      export function Component() {
        const t = useTranslations();
        return <div>{t('used_key')}</div>;
      }
    `;
    fs.writeFileSync(path.join(tempDir, 'src', 'Component.tsx'), code, 'utf-8');

    // 2. Tạo file locale chứa 'used_key' và 2 dead keys ('orphaned_one', 'orphaned_two')
    const localeContent = {
      used_key: 'Đang được dùng',
      orphaned_one: 'Không ai dùng 1',
      orphaned_two: 'Không ai dùng 2',
    };
    fs.writeFileSync(
      path.join(tempDir, 'locales', 'vi.json'),
      JSON.stringify(localeContent, null, 2),
      'utf-8'
    );

    const result = findDeadTranslationKeys(tempDir, 'locales', ['src/**/*.{tsx,jsx}']);

    expect(result.usedKeys.has('used_key')).toBe(true);
    expect(result.deadKeys.length).toBe(2);
    expect(result.deadKeys).toContain('orphaned_one');
    expect(result.deadKeys).toContain('orphaned_two');
  });

  it('should prune dead keys and keep used keys intact', () => {
    const viJsonPath = path.join(tempDir, 'locales', 'vi.json');
    const initialData = {
      active_key: 'Active',
      dead_key_1: 'Dead 1',
      dead_key_2: 'Dead 2',
    };
    fs.writeFileSync(viJsonPath, JSON.stringify(initialData, null, 2), 'utf-8');

    const { removedCount } = pruneDeadKeysFromFile(viJsonPath, ['dead_key_1', 'dead_key_2']);

    expect(removedCount).toBe(2);

    const updatedData = JSON.parse(fs.readFileSync(viJsonPath, 'utf-8'));
    expect(updatedData['active_key']).toBe('Active');
    expect(updatedData['dead_key_1']).toBeUndefined();
    expect(updatedData['dead_key_2']).toBeUndefined();
  });
});
