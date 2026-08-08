# Cantin AI Next v5.2.3 Restore v5.1.9

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


## v4.8
- Thêm mục CHI.
- Nhập kho tự tính Tổng tiền phải chi theo số lượng nhập × giá nhập/giá vốn.
- Lưu phiếu nhập tự tạo khoản chi Nhập kho.
- Xóa phiếu nhập xóa luôn khoản chi liên kết.
- Có thể thêm/sửa/xóa khoản chi khác thủ công.


## v4.9 – Tài chính hoàn chỉnh
- Sửa luồng Nhập kho → CHI: phiếu nhập tự tạo khoản CHI liên kết chính xác.
- Mỗi dòng nhập kho có thể chỉnh giá nhập/đơn vị; lưu giá vốn mới cho mặt hàng.
- Xóa phiếu nhập hoàn lại tồn và xóa khoản CHI liên kết.
- Tổng quan tài chính có: Doanh thu, Tiền thực thu, Tổng CHI, Lợi nhuận gộp, Lợi nhuận ròng, Dòng tiền.
- Tiền khách trả nợ được tính vào Tiền thực thu tại ngày thanh toán.
- CHI nhập kho được tính vào dòng tiền, nhưng KHÔNG trừ thêm lần nữa khỏi lợi nhuận ròng để tránh tính trùng với giá vốn hàng bán.
- CHI thủ công có nhóm: Nguyên liệu cà phê, Điện/nước, Vận chuyển, Vật tư, Chi khác.
- Có phương thức thanh toán cho khoản chi và lọc CHI theo khoảng ngày.


## v5.0 – Giao diện tối giản
- Thanh điều hướng dưới chỉ còn 5 mục: Tổng quan, Bán hàng, Công nợ, Kho, Khác.
- CHI không còn ở thanh điều hướng; chuyển vào Báo cáo tài chính.
- Kho gom: Kiểm kho, Nhập kho, Mặt hàng, Nguyên liệu.
- Khác gom: AI, Dữ liệu, Nhật ký.
- Tổng quan chỉ còn 4 thẻ tài chính: Doanh thu, Thực thu, Chi, Lợi nhuận.
- Công nợ và số mặt hàng sắp hết chuyển thành dòng tóm tắt nhỏ.
- Báo cáo tài chính có 3 tab: Tổng hợp, Doanh thu, Chi tiêu.
- AI đề xuất trên Tổng quan được rút gọn để không chiếm toàn màn hình.


## v5.1
- Quỹ tiền mặt.
- Báo cáo theo Hôm nay/Hôm qua/7 ngày/Tháng này/Tùy chọn.
- Lãi theo danh mục và mặt hàng.
- Nhà cung cấp & khoản phải trả.
- Ngân sách tháng.
- Biểu đồ 7 ngày và nút hành động nổi.


## v5.1.1 – Hotfix Công nợ
- Sửa lỗi nút Công nợ trỏ nhầm `customers` trong khi trang thật là `debts`.
- Khôi phục hiển thị toàn bộ khách hàng và lịch sử công nợ hiện có.
- Nút + trong Công nợ tiếp tục dùng để thêm khách.
- Không thay đổi, reset hay migrate dữ liệu công nợ.
- Thêm tương thích ngược nếu mã cũ vẫn gọi `customers`.


## v5.1.2 – Báo cáo nợ đã trả
- Trong Công nợ thêm khối tổng tiền khách đã trả.
- Xem Tháng này, Tháng trước hoặc chọn tháng cụ thể.
- Có chế độ Từ ngày – Đến ngày.
- Hiện số lần thanh toán và có thể mở danh sách chi tiết từng lần trả.
- Chỉ đọc lịch sử thanh toán; không thay đổi số dư công nợ.


## v5.1.3
- Giữ báo cáo Tổng nợ đã trả theo tháng / khoảng ngày trong Công nợ.
- Bỏ hoàn toàn phần Quỹ tiền mặt khỏi Tổng quan và backend.
- Giữ biểu đồ 7 ngày, báo cáo tài chính, nhà cung cấp và ngân sách.


## v5.1.4 – Hotfix Tổng quan
- Khôi phục hàm `renderFinanceDashboard()` bị mất khi bỏ Quỹ tiền ở v5.1.3.
- Giữ nguyên việc bỏ Quỹ tiền.
- Tổng quan tiếp tục hiển thị Doanh thu, Thực thu, Chi, Lợi nhuận, Công nợ, Sắp hết và biểu đồ 7 ngày.
- Không thay đổi dữ liệu cửa hàng hay công nợ.


## v5.1.5 – Sửa giá nhập theo thùng
- Giá nhập sản phẩm được hiểu là **giá 1 thùng**, không phải giá 1 chai.
- Nhập kho: tổng chi = số thùng × giá thùng + số lẻ × (giá thùng ÷ quy cách).
- Quản lý mặt hàng đổi nhãn thành Giá nhập/thùng.
- Backend lưu `purchasePackPrice` và tự suy ra `unitCost`.
- Giá vốn bán hàng dùng giá thùng ÷ số lượng/thùng, tránh nhân giá thùng cho từng chai.


## v5.1.6 – Hotfix Cloudflare build
- Xóa đoạn mã cũ bị dính sau `saleTotals()` gây lỗi `Expected ";" but found "còn"`.
- Giữ nguyên logic giá nhập theo thùng của v5.1.5.
- Đã kiểm tra cú pháp cả frontend và Pages Functions bằng `node --check`.


## v5.1.7 – Khôi phục đúng giá nhập/thùng
- Sửa nguyên nhân gốc: dữ liệu cũ có `purchasePrice` = giá thùng, `costPrice` = giá đơn vị.
- App ưu tiên `purchasePrice` cũ khi chưa có `purchasePackPrice`.
- Tự migrate giá: `purchasePackPrice` và `purchasePrice` = giá thùng; `unitCost` = giá thùng / quy cách.
- Không yêu cầu nhập lại giá từng sản phẩm.
- Nhập kho, giá vốn và lợi nhuận cùng dùng một mô hình giá thống nhất.


## v5.1.8
- Sửa `Invalid Date` trong lịch sử nhập kho.
- Tự chuẩn hóa ngày phiếu nhập cũ nếu ngày không hợp lệ.
- Thêm nút Sửa cho từng phiếu nhập.
- Cho sửa ngày, ghi chú, nhà cung cấp, trạng thái thanh toán, phương thức, số thùng, số lẻ và giá/thùng.
- Khi sửa, app hoàn tác tồn/CHI/phải trả cũ rồi áp dụng lại phiếu mới để giữ số liệu nhất quán.


## v5.1.9 – Dọn Tổng quan
- Xóa bộ thẻ thống kê cũ bị lặp: Doanh thu hôm nay, Lợi nhuận hôm nay, Tổng công nợ, Sắp hết hàng.
- Giữ duy nhất bộ mới: Doanh thu, Thực thu, Chi, Lợi nhuận.
- Công nợ và Sắp hết tiếp tục hiển thị dạng tóm tắt nhỏ.
- Giữ biểu đồ 7 ngày.


## v5.2 – Dọn giao diện & sửa nút chết
- Sửa nút Chi tiết biểu đồ 7 ngày.
- Kho trở thành 4 tab thật: Kiểm kho, Nhập kho, Mặt hàng, Nguyên liệu.
- Bỏ routing Mặt hàng/Nguyên liệu kiểu trang riêng gây quay lại Kho bị trắng.
- Bỏ dropdown danh mục trùng; giữ bộ lọc dạng nút.
- Tài chính chỉ dùng một bộ lọc thời gian chung.
- Chi tiêu tách 3 tab: Chi phí, Nhà cung cấp, Ngân sách.
- Đổi “Làm mới” AI thành “Tính lại”.
- Ẩn phần kiểm tra package kỹ thuật khỏi giao diện dùng hằng ngày.


## v5.2.1 – Hotfix kẹt “Đang đồng bộ dữ liệu”
- Xóa JavaScript còn gọi `#validatePackage` sau khi phần kiểm tra package đã bị ẩn ở v5.2.
- Lỗi này làm JavaScript dừng trước `boot()`, khiến app đứng ở “Đang đồng bộ dữ liệu…” và số liệu tạm thời hiện 0.
- Bổ sung trạng thái lỗi đồng bộ rõ ràng và cho phép bấm ↻ thử lại.
- Không thay đổi hay reset dữ liệu Supabase.


## v5.2.2 Recovery
- Chặn mọi thao tác ghi nếu Supabase trả về cửa hàng rỗng.
- Có nút tải bản sao dữ liệu hiện tại.
- Import file JSON/Node JSON để xem trước số mặt hàng, khách hàng, khoản nợ, tổng công nợ, đơn bán, phiếu nhập.
- Chỉ khi bấm xác nhận mới ghi dữ liệu phục hồi vào Supabase.
- Có endpoint /api/recovery/export và /api/recovery/restore.


## v5.2.3 Restore v5.1.9
- Nhúng sẵn bản backup trước v5.2.
- Backup xác nhận: 41 mặt hàng, 36 khách, 19 khoản nợ, tổng công nợ 3643893đ.
- Nút “Xem trước & khôi phục dữ liệu v5.1.9”.
- Luôn hiển thị preview trước khi xác nhận.
- Trước khi restore, backend giữ tối đa 3 bản root cũ trong `restoreBackups` để có đường lui.
