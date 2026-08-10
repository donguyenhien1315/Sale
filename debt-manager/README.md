# Sổ Nợ Thông Minh v1

Ứng dụng quản lý công nợ độc lập, mobile-first, chạy trên Cloudflare Workers + D1 và lưu mã nguồn trên GitHub.

## Tính năng
- Tổng quan: còn phải thu, đã thu, số khách đang nợ.
- Khách hàng: tên, điện thoại, ghi chú, tìm kiếm nhanh.
- Ghi nợ theo từng khoản: số tiền, ngày, món nợ/ghi chú.
- Trả nợ: số tiền, ngày, ghi chú; giữ lịch sử từng lần trả.
- Xóa khoản ghi nhầm hoặc lần thanh toán ghi nhầm.
- Lịch sử từng khách được sắp theo ngày.
- Audit log ở D1 để truy vết thay đổi backend.
- Câu lệnh nhanh: `Chất nợ 30k 2c`, `Chất trả 20k`.
- Giao diện responsive/mobile-first, bottom actions, sheet popup và animation nhẹ.

## Kiến trúc
- Frontend: `public/index.html`
- API: `src/worker.js`
- Database: Cloudflare D1
- Schema: `schema.sql`
- Deploy/config: `wrangler.jsonc`

## Triển khai Cloudflare

### 1. Tạo D1
Trong Cloudflare Dashboard có thể tạo D1 Database tên `debt-manager-db`, hoặc dùng Wrangler:

```bash
npx wrangler d1 create debt-manager-db
```

Lấy `database_id` Cloudflare trả về và thay `REPLACE_WITH_D1_DATABASE_ID` trong `wrangler.jsonc`.

### 2. Tạo bảng

```bash
npm install
npm run db:init
```

Hoặc mở D1 Console trên Cloudflare và chạy toàn bộ nội dung `schema.sql`.

### 3. Deploy

```bash
npm run deploy
```

Hoặc tạo Worker từ GitHub, chọn repository `donguyenhien1315/Sale`, đặt Root directory là `debt-manager` và dùng Wrangler config trong thư mục này.

### 4. Bảo vệ dữ liệu
Nên bật Cloudflare Access cho hostname của app để chỉ tài khoản được phép mới truy cập. Không lưu mật khẩu quản trị trong JavaScript frontend.

## Dữ liệu tiền
Tất cả số tiền lưu dưới dạng số nguyên VND, tránh lỗi số thực. Frontend tự hiển thị định dạng `30.000 ₫`.

## Câu lệnh nhanh
- `Chất nợ 30k 2c` → khách Chất ghi nợ 30.000, ghi chú `2c`.
- `Chất trả 20k` → ghi nhận Chất trả 20.000.
- Nếu tên khách chưa tồn tại, app hỏi trước khi tạo khách mới.
