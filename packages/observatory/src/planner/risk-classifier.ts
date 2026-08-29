import type { ActionRiskLevel } from '../types';

const DESTRUCTIVE_KEYWORDS = [
  'delete',
  'remove',
  'destroy',
  'drop',
  'wipe',
  'cancel account',
  'close account',
  'reset password',
  'buy',
  'purchase',
  'pay',
  'checkout',
  'transfer',
  'publish',
  'deploy',
  'terminate',
  'unsubscribe',
  'xóa',
  'hủy',
  'thanh toán',
  'mua ngay',
  'chuyển tiền',
];

const EXTERNAL_PATTERNS = [
  /^https?:\/\//i,
  /oauth/i,
  /google\.com/i,
  /github\.com/i,
  /facebook\.com/i,
  /stripe\.com/i,
  /paypal\.com/i,
  /twitter\.com/i,
  /x\.com/i,
  /linkedin\.com/i,
];

/**
 * Phân loại mức độ rủi ro của hành động tương tác trên giao diện
 */
export function classifyActionRisk(params: {
  tag: string;
  text?: string;
  href?: string;
  ariaLabel?: string;
  onClickSource?: string;
}): { riskLevel: ActionRiskLevel; reason?: string } {
  const textLower = (params.text || '').toLowerCase().trim();
  const labelLower = (params.ariaLabel || '').toLowerCase().trim();
  const hrefLower = (params.href || '').toLowerCase().trim();
  const onClickLower = (params.onClickSource || '').toLowerCase().trim();

  const combined = `${textLower} ${labelLower} ${onClickLower}`;

  // 1. Kiểm tra EXTERNAL (Liên kết ra ngoài hoặc luồng xác thực bên thứ 3)
  if (params.tag === 'a' && hrefLower) {
    for (const pattern of EXTERNAL_PATTERNS) {
      if (pattern.test(hrefLower)) {
        return {
          riskLevel: 'EXTERNAL',
          reason: `External navigation to: ${params.href}`,
        };
      }
    }
  }

  // 2. Kiểm tra DESTRUCTIVE (Các hành động nguy hiểm: Xóa, Mua hàng, Chuyển tiền)
  for (const keyword of DESTRUCTIVE_KEYWORDS) {
    if (combined.includes(keyword)) {
      return {
        riskLevel: 'DESTRUCTIVE',
        reason: `Matches destructive intent keyword: "${keyword}"`,
      };
    }
  }

  // 3. Mặc định là SAFE (Tabs, Modals, Accordions, Form thông thường, Navigation nội bộ)
  return {
    riskLevel: 'SAFE',
    reason: 'Safe non-destructive interaction',
  };
}
