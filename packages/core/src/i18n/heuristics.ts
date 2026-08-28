/**
 * Danh sách các thuộc tính kỹ thuật KHÔNG BAO GIỜ là text hiển thị đa ngôn ngữ
 */
export const NON_USER_FACING_PROPS = new Set([
  'id',
  'key',
  'ref',
  'classname',
  'class',
  'style',
  'type',
  'name',
  'target',
  'rel',
  'href',
  'src',
  'as',
  'variant',
  'size',
  'color',
  'role',
  'method',
  'action',
  'accept',
  'pattern',
  'autocomplete',
  'autocapitalize',
  'shape',
  'viewbox',
  'fill',
  'stroke',
  'd',
  'xmlns',
  'version',
  'charset',
  'httpequiv',
  'content',
  'property',
  'itemprop',
  'itemtype',
  'itemscope',
  'crossorigin',
  'integrity',
  'loading',
  'decoding',
  'fetchpriority',
  'width',
  'height',
  'rows',
  'cols',
  'span',
  'maxlength',
  'minlength',
  'tabindex',
  'accesskey',
  'draggable',
  'spellcheck',
  'inputmode',
  'enterkeyhint',
  'value', // Value của input/option kỹ thuật (sẽ được kiểm tra riêng nếu là button/submit)
]);

/**
 * Các thẻ kỹ thuật mà toàn bộ nội dung bên trong là code/kỹ thuật
 */
export const TECHNICAL_JSX_TAGS = new Set([
  'script',
  'style',
  'code',
  'pre',
  'svg',
  'path',
  'g',
  'circle',
  'rect',
  'polygon',
  'noscript',
  'template',
]);

/**
 * Các mẫu regex đại diện cho code, ký tự kỹ thuật, mã định danh, URL, định dạng ngày...
 */
export const TECHNICAL_PATTERNS = [
  /^[0-9]+$/,                                      // Số thuần túy (123)
  /^[0-9]+(\.[0-9]+)?(px|rem|em|%|vh|vw|ms|s|fr)$/, // Đơn vị CSS (100%, 16px, 1.5rem)
  /^[\\s\\-_/|:,.;!?()[\]{}<>=+*#@$%^&~`'"]+$/,    // Ký tự phân cách, toán tử
  /^https?:\/\//,                                  // URLs
  /^\/[a-zA-Z0-9_\-./]+$/,                         // File paths, route paths (/api/v1/users, ./images/logo.png)
  /\.(png|jpg|jpeg|gif|svg|webp|ico|css|js|ts|json|pdf|mp4)$/i, // File extensions
  /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/, // Hex colors
  /^[a-z0-9_-]+@[a-z0-9_-]+\.[a-z0-9_-]+$/i,       // Email mẫu test
  /^[A-Z0-9_]{3,}$/,                               // SCREAMING_SNAKE_CASE (Enums / Constants)
  /^[a-z]+[A-Z][a-zA-Z0-9]*$/,                     // camelCaseIdentifier (tên biến/hàm)
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
  /^(true|false|null|undefined|NaN)$/i,             // Boolean / primitive literals
  /^(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)$/,     // HTTP methods
  /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})$/,     // Date format values
  /^&[a-zA-Z0-9#]+;$/,                             // HTML entities (&copy;, &#39;)
];

/**
 * Kiểm tra xem một chuỗi có thực sự là văn bản hiển thị cho người dùng (True User-Facing Text) hay không
 */
export function isTranslatableText(
  text: string,
  options: {
    whitelist?: Set<string>;
    customIgnorePatterns?: RegExp[];
  } = {}
): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;

  // 1. Kiểm tra whitelist
  if (options.whitelist && options.whitelist.has(trimmed.toLowerCase())) {
    return false;
  }

  // 2. Kiểm tra custom ignore patterns
  if (options.customIgnorePatterns) {
    for (const regex of options.customIgnorePatterns) {
      if (regex.test(trimmed)) return false;
    }
  }

  // 3. Kiểm tra built-in technical patterns
  for (const regex of TECHNICAL_PATTERNS) {
    if (regex.test(trimmed)) return false;
  }

  // 4. Chuỗi phải chứa ít nhất 1 chữ cái (chữ Latin, Tiếng Việt hoặc bất kỳ ký tự Unicode chữ viết nào)
  const hasLetter = /\p{L}/u.test(trimmed);
  if (!hasLetter) {
    return false;
  }

  return true;
}
