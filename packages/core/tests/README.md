# Danh Mục & Tài Liệu Kiểm Thử (Unit Tests Documentation)

Thư mục này chứa toàn bộ bộ unit test cho gói `@agent-lint/core`. Mỗi file test tập trung vào một đơn vị chức năng cụ thể nhằm đảm bảo tính ổn định cao nhất trước khi đóng gói lên npm.

---

## 1. Mục lục các Test Suites

| File Test | Module Kiểm Thử | Mục đích / Kịch bản Kiểm Thử |
| :--- | :--- | :--- |
| **`config.test.ts`** | `src/config/*` | - Đọc và parse file YAML cấu hình.<br/>- Kiểm tra giá trị mặc định của Zod Schema.<br/>- Kiểm tra cơ chế tự động nhận diện (Auto-detect) thư mục `locales/`, framework `next-intl` / `react-i18next`. |
| **`slug.test.ts`** | `src/i18n/slug.ts` | - Chuyển đổi tiếng Việt có dấu sang ASCII.<br/>- Sinh key theo các chiến lược: `slug`, `camelCase`, `file_scoped`, `hash`.<br/>- Kiểm tra giới hạn độ dài `maxLength` và tiền tố `prefix`. |
| **`locales.test.ts`** | `src/i18n/locales.ts` | - Đọc file dictionary JSON đa ngôn ngữ.<br/>- Tìm kiếm key theo giá trị (tránh duplicate keys).<br/>- Thêm key mới vào locale chính và thêm placeholder `[TODO: TRANSLATE]` vào các locale phụ. |
| **`i18n-scanner.test.ts`** | `src/i18n/scanner.ts` | - Bắt chính xác text cứng trong thẻ JSX (`<div>Xin chào</div>`).<br/>- Bắt text cứng trong attributes (`placeholder`, `title`, `alt`, `aria-label`).<br/>- Bỏ qua các chuỗi trong whitelist, regex số, url, mã màu, và các thẻ kỹ thuật (`code`, `script`). |
| **`i18n-transformer.test.ts`**| `src/i18n/transformer.ts` | - Thay thế chuỗi JSX thành `{t('key')}`.<br/>- Tự động chèn câu lệnh `import { useTranslations } from 'next-intl'`.<br/>- Tự động chèn câu lệnh `const t = useTranslations()` vào phần đầu của React Component. |
| **`interpolation.test.ts`** | `src/i18n/interpolation.ts` | - Quét và bóc tách chuỗi động Template Literal chứa biến `${user.name}`, `${count}`.<br/>- Tự động sinh format ICU Message `{name}`, `{count}` và truyền object tham số vào hàm `{t('key', { ... })}`. |
| **`dead-keys.test.ts`** | `src/i18n/dead-keys.ts` | - Quét đối chiếu mã nguồn tìm các translation keys không còn được sử dụng (Dead/Orphaned Keys).<br/>- Tự động dọn dẹp và xóa (Prune) key thừa khỏi file JSON từ điển. |
| **`translator.test.ts`** | `src/i18n/translator.ts` | - Kiểm thử các AI Translation Provider (Mock, Google Gemini, Cached Provider).<br/>- Tự động điền bản dịch chuẩn sang các ngôn ngữ phụ (`en.json`). |
| **`color-utils.test.ts`** | `src/tokens/color-utils.ts` | - Parse mã hex (3 ký tự, 6 ký tự) và rgb/rgba.<br/>- Tính khoảng cách màu có trọng số ($\Delta E$).<br/>- Tìm token màu gần nhất trong bảng màu Tailwind. |
| **`tokens-scanner.test.ts`** | `src/tokens/scanner.ts` | - Phát hiện Tailwind arbitrary color (`bg-[#1e293b]`), spacing (`p-[15px]`), font size (`text-[18px]`).<br/>- Phát hiện mã hex và pixel cứng trong thuộc tính `style={{ ... }}`.<br/>- Xác nhận CSS variables (`var(--...)`) không bị xem là hardcode. |
| **`css-scanner.test.ts`** | `src/tokens/css-scanner.ts` | - Quét các file stylesheet rời (`.css`, `.scss`, `.module.css`) tìm mã hex và pixel thô.<br/>- Gợi ý thay thế bằng biến CSS `var(--...)`. |
| **`heuristics.test.ts`** | `src/i18n/heuristics.ts` | - Phân loại chính xác chuỗi ngôn ngữ tự nhiên vs code kỹ thuật (CSS units, SVG paths, UUID, regex, email...).<br/>- Kiểm tra loại bỏ 100% false positives trên các thẻ và thuộc tính kỹ thuật. |
| **`reporter.test.ts`** | `src/reporter/index.ts` | - Kiểm tra tính hợp lệ của định dạng OASIS SARIF v2.1.0 cho Oxlint và GitHub Code Scanning. |
| **`component-enforcer.test.ts`** | `src/tokens/component-enforcer.ts` | - Phát hiện các thẻ HTML trần (`<button>`, `<a>`, `<img>`) bị hạn chế bởi Design System.<br/>- Tự động thay thế sang Custom Component (`<Button>`, `<Link>`, `<Image>`) và inject import.<br/>- Miễn trừ file định nghĩa component gốc. |
| **`engine.test.ts`** | `src/engine.ts` | - Kiểm thử toàn diện luồng quét (Scan) và sửa tự động (Fix) đa file. |

---

## 2. Hướng dẫn Chạy Tests

```bash
# Chạy toàn bộ tests một lần
pnpm test

# Chạy test ở chế độ theo dõi (Watch mode)
pnpm run test:watch
```
