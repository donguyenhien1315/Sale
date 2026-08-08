# Cantin AI Next v4.10.2

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


## v4.6
- Bỏ bộ lọc theo từng mặt hàng cụ thể vừa thêm ở v4.5.
- Giữ bộ lọc theo danh mục.
- Giữ Nhập kho là tab con trong Kiểm kho.


## v4.7
- Bộ lọc sản phẩm ở Bán hàng, Kiểm kho và Nhập kho chuyển sang dạng nút giống mục Mặt hàng.
- Tự lấy danh mục hiện có: Tất cả, Kem, Nước, Cà phê, Bánh Oishi, ...
- Mỗi nút hiện số lượng mặt hàng trong danh mục.
- Bỏ dropdown “Tất cả danh mục” ở các khu vực này.


## v4.8 Recovery
- Sửa migration để giữ toàn bộ cửa hàng cũ, không chỉ cửa hàng đang active.
- Giữ và chuyển dữ liệu legacy: products, customers, debts, sales, stockReceipts, stockAdjustments, weeklyAudits.
- `weeklyAudits` được chuyển sang `audits` mới nhưng dữ liệu cũ vẫn được giữ.
- Tạo rolling backup của toàn bộ root trước mỗi lần ghi, giữ 10 bản gần nhất.
- Chặn ghi một root hoàn toàn trắng đè lên root đang có dữ liệu.
- Thêm mục Khôi phục dữ liệu trong trang Dữ liệu.
- Thêm cảnh báo khi ứng dụng bất ngờ thấy cửa hàng trống.


## v4.8.1 Hotfix ghi dữ liệu
- Bỏ rolling backup lồng toàn bộ root vì làm payload Supabase tăng rất nhanh.
- Giữ snapshot trước từng action để có thể rollback.
- Dùng persist token + read-back giống cơ chế ổn định trước đó.
- Chuẩn hóa kết quả RPC nếu Supabase trả wrapper một dòng.
- Hiển thị lỗi backend rõ hơn thay vì chỉ “Có lỗi xảy ra”.


## v4.8.2
- Sửa nút Tải backup: trước đó gọi nhầm `downloadJson()` trong khi app chỉ có `download()`.
- Cải thiện tải file JSON trên Safari/iPhone bằng cách gắn thẻ tải vào DOM trước khi click.


## v4.9 AI Smart
- Hiểu tên gần đúng, sai chính tả và alias sản phẩm.
- Bộ nhớ alias có UI thêm/xóa; AI cũng hiểu câu “gọi Rockstar là rs”.
- Ngữ cảnh hội thoại: hỏi Rockstar rồi nói “cho về 0” vẫn hiểu Rockstar.
- Lệnh bán nhiều mặt hàng trong một câu và có thể ghi nợ khách.
- Nhập kho hiểu thùng/két + số lẻ theo packSize.
- Công nợ thông minh: trả hết, lịch sử nợ, ai trả nợ hôm nay, hỏi lại số tiền nhỏ mơ hồ.
- Phân tích doanh thu/lợi nhuận hôm nay, top bán chạy/lợi nhuận 7 ngày, bán chậm/tồn nhiều.
- Dự báo nhập hàng từ tốc độ bán 14 ngày.
- Phát hiện bất thường: nợ quá nhỏ, giá bán dưới vốn, tồn âm, phiếu nhập quá lớn, kiểm kho no-op.
- Ước tính tiêu hao nguyên liệu cà phê từ công thức sản phẩm và số ly bán.
- AI đọc ảnh (OCR), Excel, CSV, JSON trên trình duyệt rồi đưa nội dung vào Command Center để phân tích/xem trước.
- Khi AI không chắc sẽ hỏi lại, không tự ghi.
- Mọi action AI vẫn preview + xác nhận.
- Sau action AI có nút Hoàn tác bằng snapshot trước thao tác.


## v4.10
- Bán hàng: sản phẩm đã chọn hiện số lượng ngay trên ô sản phẩm.
- Giỏ hàng có − / số lượng bấm để sửa / + / × xóa.
- Khi tạo đơn có thể chọn khách hàng, kể cả tiền mặt/chuyển khoản; nếu ghi nợ thì khách hàng được dùng cho khoản nợ.
- Kiểm kho có bộ lọc danh mục dạng nút: Tất cả, Kem, Nước, Cà phê, Bánh... theo dữ liệu thực tế.


## v4.10.1 Stable Fix
- Khôi phục toàn bộ backend action bị thiếu ở v4.10.
- Chọn khách hàng cho tiền mặt/chuyển khoản/ghi nợ; ghi nợ bắt buộc có khách.
- Xóa đơn ghi nợ hoàn kho + xóa đúng công nợ liên kết, chặn nếu đã có trả nợ.
- Chỉnh/xóa kiểm kho lịch sử theo delta, không reset tồn hiện tại.
- Khôi phục bộ lọc danh mục ở Kiểm kho và Nhập kho.
- Chặn giỏ hàng vượt tồn khi bấm + hoặc nhập trực tiếp.
- Tách AI context khỏi khách đang chọn ở Bán hàng.
- Sửa runtime Supabase env cho Cloudflare Pages.
- Xóa sản phẩm có lịch sử thành ngừng sử dụng để giữ liên kết dữ liệu.
- Chặn xóa phiếu nhập nếu làm tồn âm.
- Ghi log khi thay đổi tồn từ biểu mẫu sản phẩm.

## v4.10.2
- Điều khiển − / số lượng / + / × ngay trên sản phẩm đã chọn.
- Bấm số lượng để nhập trực tiếp.
- Trợ lý AI có nút nổi và popup chat nhanh ở mọi trang.
- Popup AI vẫn xem trước → xác nhận → hoàn tác.
