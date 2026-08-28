export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function parseHexColor(hex: string): RGB | null {
  let clean = hex.trim().replace(/^#/, '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length === 6) {
    const num = parseInt(clean, 16);
    if (isNaN(num)) return null;
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  }
  return null;
}

export function parseRgbString(str: string): RGB | null {
  const match = str.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (match) {
    return {
      r: parseInt(match[1], 10),
      g: parseInt(match[2], 10),
      b: parseInt(match[3], 10),
    };
  }
  return null;
}

export function parseAnyColor(str: string): RGB | null {
  if (str.startsWith('#')) {
    return parseHexColor(str);
  }
  if (str.startsWith('rgb')) {
    return parseRgbString(str);
  }
  return null;
}

/**
 * Tính khoảng cách màu theo Euclidean RGB có trọng số (weighted color distance)
 * Trả về giá trị từ 0 (giống hệt) đến 1 (khác biệt lớn nhất)
 */
export function calculateColorDistance(c1: RGB, c2: RGB): number {
  const rmean = (c1.r + c2.r) / 2;
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;

  const weightR = 2 + rmean / 256;
  const weightG = 4.0;
  const weightB = 2 + (255 - rmean) / 256;

  const distance = Math.sqrt(
    weightR * dr * dr + weightG * dg * dg + weightB * db * db
  );

  // Max theoretical distance is ~765
  return distance / 765;
}

export function findNearestColorToken(
  targetColor: string,
  tokenMap: Record<string, string>,
  tolerance: number = 0.85
): { tokenName: string; tokenValue: string; distance: number } | null {
  const targetRgb = parseAnyColor(targetColor);
  if (!targetRgb) return null;

  let closest: { tokenName: string; tokenValue: string; distance: number } | null = null;

  for (const [tokenName, tokenValue] of Object.entries(tokenMap)) {
    const tokenRgb = parseAnyColor(tokenValue);
    if (!tokenRgb) continue;

    const dist = calculateColorDistance(targetRgb, tokenRgb);
    if (closest === null || dist < closest.distance) {
      closest = { tokenName, tokenValue, distance: dist };
    }
  }

  // 1 - distance >= tolerance nghĩa là độ tương đồng đủ lớn
  if (closest && 1 - closest.distance >= tolerance) {
    return closest;
  }

  return closest; // Trả về token gần nhất
}
