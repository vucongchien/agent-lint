import path from 'path';

/**
 * Bỏ dấu tiếng Việt và chuyển sang ký tự ASCII không dấu
 */
export function removeVietnameseAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Sinh key từ chuỗi văn bản theo chiến lược đã cấu hình
 */
export function generateI18nKey(
  rawText: string,
  options: {
    strategy?: 'slug' | 'camelCase' | 'file_scoped' | 'hash';
    maxLength?: number;
    prefix?: string;
    filePath?: string;
  } = {}
): string {
  const {
    strategy = 'slug',
    maxLength = 40,
    prefix = '',
    filePath,
  } = options;

  const cleanText = removeVietnameseAccents(rawText.trim());

  if (strategy === 'hash') {
    let hash = 0;
    for (let i = 0; i < rawText.length; i++) {
      hash = (hash << 5) - hash + rawText.charCodeAt(i);
      hash |= 0;
    }
    const hashStr = Math.abs(hash).toString(16).slice(0, 8);
    const shortPrefix = cleanText
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 15)
      .replace(/^_+|_+$/g, '');
    return `${prefix}${shortPrefix || 'text'}_${hashStr}`;
  }

  // Chuyển thành các từ
  const words = cleanText
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return `${prefix}item_${Date.now().toString(36)}`;
  }

  let generated = '';

  if (strategy === 'camelCase') {
    generated = words
      .map((w, idx) =>
        idx === 0
          ? w.toLowerCase()
          : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
      )
      .join('');
  } else {
    // default: slug (snake_case)
    generated = words.map((w) => w.toLowerCase()).join('_');
  }

  if (generated.length > maxLength) {
    generated = generated.slice(0, maxLength).replace(/_+$/, '');
  }

  if (strategy === 'file_scoped' && filePath) {
    const fileBase = path.basename(filePath, path.extname(filePath));
    const scope = fileBase.replace(/[^a-zA-Z0-9]/g, '_');
    return `${prefix}${scope}.${generated}`;
  }

  return `${prefix}${generated}`;
}
