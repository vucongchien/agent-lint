# ⚡ agent-lint

> **Linter & Auto-Sync Engine chuyên dụng cho i18n và Design Tokens trên React / Next.js — Tối ưu cho AI Agent & Developer Workflow.**

---

## 🎯 1. Nghiệp vụ & Tiêu chuẩn Tuân thủ (Business Governance)

`agent-lint` được thiết kế để giải quyết 2 bài toán quản trị mã nguồn lớn nhất trong phát triển Frontend:

1. **Quản trị Quốc tế hóa (i18n Readiness Governance):**
   - **Mục tiêu:** Đảm bảo không có chuỗi văn bản cứng (hardcoded strings) nào lọt vào mã nguồn JSX/TSX.
   - **Tác động:** Giúp doanh nghiệp sẵn sàng mở rộng đa ngôn ngữ (Global Expansion) mà không cần mất hàng tuần refactor thủ công.
2. **Quản trị Hệ thống Thiết kế (Design System Consistency):**
   - **Mục tiêu:** Loại bỏ hoàn toàn mã màu tùy tiện (`#1e293b`), khoảng cách pixel lẻ (`p-[15px]`, `m-[23px]`).
   - **Tác động:** Duy trì tính đồng nhất tuyệt đối về UI/UX theo chuẩn Design Tokens đã được phê duyệt.

---

## 💡 2. Tính năng Cốt lõi & Kết quả Đạt được (Features & Outcomes)

### 🔹 Feature 1: i18n Hardcode Detection & Direct Dictionary Sync
* **Trước khi chạy:**
  ```tsx
  // ❌ Vi phạm: Text cứng trong JSX và thuộc tính
  export function Login() {
    return <input placeholder="Nhập email của bạn" title="Email" />;
  }
  ```
* **Sau khi chạy `npx agent-lint fix`:**
  ```tsx
  // ✅ Tự động chèn import, hook và thay thế khóa
  import { useTranslations } from 'next-intl';

  export function Login() {
    const t = useTranslations();
    return <input placeholder={t('nhap_email_cua_ban')} title={t('email')} />;
  }
  ```
  ```json
  // ✅ locales/vi.json (Tự động tạo key)
  {
    "nhap_email_cua_ban": "Nhập email của bạn",
    "email": "Email"
  }
  ```

---

### 🔹 Feature 2: Design Token Compliance & Nearest Suggestion
* **Khả năng:** Quét mã hex, pixel lẻ trong Tailwind arbitrary classes và `style={{ ... }}`.
* **Kết quả:** Tự động tính khoảng cách màu ($\Delta E$) và khoảng cách pixel để gợi ý Token gần nhất:
  - `bg-[#1e293b]` $\rightarrow$ Gợi ý `bg-slate-800`
  - `p-[15px]` $\rightarrow$ Gợi ý `p-4` (16px)
  - `m-[23px]` $\rightarrow$ Gợi ý `m-6` (24px)
  - `text-[15px]` $\rightarrow$ Gợi ý `text-sm` (14px)

---

### 🔹 Feature 3: AI Agent Native Integration
* **Báo cáo chuẩn hóa:** Hỗ trợ lệnh `npx agent-lint scan --format=agent` xuất Markdown Prompt hành động cho AI Agent (Antigravity, Cursor, Claude Code) tự động đọc và thực hiện refactor.
* **Skill đóng gói sẵn:** Cung cấp file `skills/agent-lint/SKILL.md` sẵn sàng sử dụng.

---

## 📂 3. Cấu trúc Thư mục Tối ưu nhất (Recommended Project Structures)

`agent-lint` hỗ trợ chế độ **Auto-Detect** thông minh cho 3 mô hình phổ biến:

### A. Next.js App Router (Khuyên dùng với `next-intl`)
```text
my-next-app/
├── .agent-lint.yaml           # File cấu hình (hoặc chạy agent-lint init)
├── messages/                  # Thư mục từ điển (Auto-detected)
│   ├── vi.json
│   └── en.json
└── src/
    └── app/[locale]/
        └── page.tsx
```

### B. Next.js Pages Router / React-i18next
```text
my-react-app/
├── locales/                   # Thư mục từ điển (Auto-detected)
│   ├── vi.json
│   └── en.json
└── src/
    └── components/
```

### C. Monorepo / Custom Structure
Có thể tùy chỉnh đường dẫn trong `.agent-lint.yaml`:
```yaml
rules:
  i18n:
    locales:
      dir: "src/shared/i18n/locales"
```

---

## 📊 4. Ma trận Hỗ trợ (Support Matrix)

| Danh mục | Hỗ trợ hiện tại |
| :--- | :--- |
| **Frameworks** | React 18 / 19, Next.js (App Router & Pages Router), Vite, Remix |
| **i18n Libraries** | `next-intl`, `react-i18next`, `i18next`, Custom translation hooks |
| **Styling & Tokens** | Tailwind CSS (v3 / v4), CSS Variables, Custom Token Maps |
| **Tooling & CI** | Standalone CLI, ESLint 8 / 9 (Flat Config), Oxlint CI Pipeline |
| **AI Agents** | Antigravity, Cursor, Claude Code, GitHub Copilot |

---

## 🚀 5. Bắt đầu Nhanh (Quick Start)

### Cài đặt
```bash
pnpm add -D agent-lint eslint-plugin-agent-lint
# hoặc: npm install -D agent-lint eslint-plugin-agent-lint
```

### Sử dụng CLI
```bash
# 1. Khởi tạo cấu hình
npx agent-lint init

# 2. Quét kiểm tra vi phạm
npx agent-lint scan

# 3. Tự động sửa lỗi & đồng bộ từ điển
npx agent-lint fix

# 4. Xuất báo cáo cho AI Agent
npx agent-lint scan --format=agent
```

### Cấu hình ESLint (Optional)
```js
// eslint.config.mjs
import agentLint from 'eslint-plugin-agent-lint';

export default [
  {
    plugins: { 'agent-lint': agentLint },
    rules: {
      'agent-lint/no-hardcoded-i18n': 'error',
      'agent-lint/enforce-design-tokens': 'warn',
    },
  },
];
```

---

## 📄 License
MIT © 2026 agent-lint
