# Cantin AI Next v4.5

App mới hoàn toàn, không phụ thuộc mã nguồn v3.x.

## Điểm chính
- Mobile-first, tối ưu iPhone.
- Một nguồn sự thật duy nhất: Supabase.
- Ghi dữ liệu có revision + read-back verify.
- Optimistic concurrency: nếu 2 thiết bị sửa cùng lúc, app bắt đồng bộ lại thay vì ghi đè.
- Bán hàng nhanh, công nợ thu gọn, nhập kho, kiểm kho, sản phẩm, nhiều cửa hàng.
- AI Command Center: hỏi dữ liệu + lập kế hoạch + Xác nhận trước khi ghi.
- Transaction log + snapshot/restore.
- Import/Export: dữ liệu cửa hàng, config, package validation.
- PWA/offline shell; API không cache.

## Deploy
1. Upload toàn bộ nội dung repo lên GitHub/Cloudflare Pages.
2. Functions dùng Supabase RPC hiện có:
   - cantin_read_store_public()
   - cantin_write_store_public(p_data jsonb)
3. Có thể đặt Cloudflare env vars:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   Nếu chưa đặt, bản này đang dùng Supabase project hiện tại làm fallback.
4. Không cần chạy SQL mới nếu 2 RPC trên đang hoạt động.
5. Lần đầu mở, app tự migrate dữ liệu hiện tại sang cấu trúc `__nextV4`.

## Lưu ý migration
App không xóa dữ liệu cũ. Root hiện tại sẽ được bọc vào cấu trúc v4 và lưu lại sau lần ghi đầu tiên.


## v4.1
- Quản lý nguyên liệu cà phê theo dữ liệu Excel.
- Trả nợ tự điền tổng còn nợ và chọn ngày trả.
- Ghi nợ được chọn ngày.
- Sửa ngày/tiền/ghi chú khoản nợ và từng lần thanh toán.


## v4.2
- Nâng cấp mục Quản lý mặt hàng.
- Chỉnh tồn trực tiếp bằng + / − hoặc nhập số lượng mới.
- Điều chỉnh tồn độc lập KHÔNG tạo đơn bán, không thay doanh thu/lợi nhuận, không tạo kiểm kho, không ảnh hưởng công nợ.
- Mọi lần chỉnh chỉ được ghi vào transaction log để truy vết.
- Lọc tồn ít → nhiều / nhiều → ít.


## v4.3
- Đưa mục **Mặt hàng** ra thanh điều hướng dưới để dễ tìm trên iPhone/iPad.
- Bộ lọc danh mục dạng nút: Tất cả, Cà phê, Nước, Bánh Oishi, Kem và các danh mục tự tạo.
- Dropdown danh mục + tìm kiếm + sắp xếp tồn.
- Hiện số lượng mặt hàng, tổng tồn và số mặt hàng sắp/hết theo danh mục.
- Mỗi mặt hàng hiện badge danh mục.


## v4.4
- Công nợ rút gọn: mở khách hàng chỉ hiện 2 nút Ghi nợ / Trả nợ và lịch sử.
- Form nhập tiền chỉ mở khi bấm Ghi nợ hoặc Trả nợ.
- Bộ lọc danh mục được thêm ở Bán hàng, Nhập kho, Kiểm kho, Quản lý mặt hàng.
- Nguyên liệu cũng có bộ lọc nhóm.


## v4.5
- Bộ lọc lấy trực tiếp từ dữ liệu sản phẩm.
- Thêm bộ lọc **Tất cả mặt hàng / từng mặt hàng cụ thể** ở Bán hàng, Nhập kho, Kiểm kho, Quản lý mặt hàng.
- Nhập kho được gộp vào Kiểm kho thành 2 tab con: Kiểm kho | Nhập kho.
- Bỏ nút Nhập kho riêng khỏi thanh điều hướng dưới.
