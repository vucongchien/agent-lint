---
name: agent-lint
description: "AI-ready Linter and Auto-fixer for i18n and Design Tokens in React & Next.js projects"
---

# Agent Skill: `agent-lint`

Bộ công cụ kiểm tra và tự động tái cấu trúc (Auto-refactor) cho dự án **React / Next.js**, đảm bảo:
1. **i18n Compliance:** Không hardcode text hiển thị, tự động trích xuất chuỗi và đồng bộ vào file từ điển (`locales/*.json`, `messages/*.json`).
2. **Design Token Compliance:** Không hardcode màu sắc (mã hex/rgb), khoảng cách pixel lẻ, tự động đề xuất Token tương đương từ Tailwind / Design System.

---

## 1. Khi nào Agent nên sử dụng Skill này?
- Khi người dùng yêu cầu: *"Kiểm tra xem có text hardcode không"*, *"Chuyển project sang đa ngôn ngữ (i18n)"*, *"Kiểm tra Design Tokens"*.
- Khi chuẩn bị commit code mới để đảm bảo không vi phạm quy chuẩn thiết kế và ngôn ngữ.
- Khi cần batch-refactor toàn bộ UI components sang hàm `useTranslations()`.

---

## 2. Các Lệnh Thực thi Chính

### 2.1. Quét lỗi và xuất báo cáo cho AI Agent
```bash
# Quét và xuất báo cáo dạng Markdown chuyên dụng cho Agent
npx agent-lint scan --format=agent

# Quét và xuất báo cáo dạng JSON chi tiết
npx agent-lint scan --format=json

# Lưu báo cáo ra file để đọc và phân tích
npx agent-lint scan --format=json --output=lint-report.json
```

### 2.2. Tự động sửa lỗi & Đồng bộ Từ điển
```bash
# Tự động trích xuất text cứng trong JSX, thêm hook useTranslations(),
# và tự động thêm khóa vào locales/vi.json (hoặc ngôn ngữ mặc định)
npx agent-lint fix

# Sửa trên các file cụ thể
npx agent-lint fix src/components/Header.tsx src/app/page.tsx
```

### 2.3. Khởi tạo cấu hình mặc định
```bash
npx agent-lint init
```

---

## 3. Quy trình Chuẩn cho AI Agent (Agent Workflow)

Khi được giao nhiệm vụ chuẩn hóa mã nguồn, Agent nên thực hiện các bước sau:

1. **Bước 1 (Kiểm tra cấu hình):** Kiểm tra xem trong root dự án đã có `.agent-lint.yaml` chưa. Nếu chưa, chạy `npx agent-lint init`.
2. **Bước 2 (Chạy Scan):** Chạy `npx agent-lint scan --format=json` để lấy danh sách tất cả các điểm vi phạm.
3. **Bước 3 (Thực hiện Fix):**
   - Với các chuỗi đơn giản: Chạy `npx agent-lint fix` để tool tự động thêm key vào từ điển và sửa JSX.
   - Với các trường hợp phức tạp (chuỗi có biến lồng nhau, chuỗi cần đặt tên key theo ngữ cảnh nghiệp vụ đặc thù): Đọc danh sách từ report và tinh chỉnh lại tên key trong `locales/*.json` cho chuẩn xác nhất.
4. **Bước 4 (Xác minh):** Chạy lại `npx agent-lint scan` để đảm bảo 100% không còn lỗi vi phạm (`0 errors, 0 warnings`).
