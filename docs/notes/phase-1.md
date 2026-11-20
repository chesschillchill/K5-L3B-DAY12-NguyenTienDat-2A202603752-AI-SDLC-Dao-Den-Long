# Ghi chép Phase 1

## Giả định đã dùng

- Đêm 1 dài 180 giây, có ba lửa. Đèn cần bốn đom đóm. Mây nhặt tự động đến sức chứa 12, rồi nạp vào đèn chưa sáng gần nhất khi bấm E. Mỗi lần nạp chỉ dùng vừa đủ lượng thiếu của đèn.
- Đo khoảng cách ngang XZ cho nhặt, nạp, tỏa sáng, va chạm và vùng an toàn, kể cả khi Mây đang nhảy. Bóng Mực bị chặn ở rìa vùng sáng của đèn đã thắp. Trong vùng sáng, Mây không mất lửa do chạm Bóng Mực.
- Tỏa sáng tiêu hai đom đóm nếu đủ tài nguyên và đã hết hồi chiêu, kể cả khi vùng tỏa sáng trống. Mỗi Bóng Mực trong bán kính bị đẩy và choáng. Một lần chạm làm mất một lửa, giữ số đom đóm và cho 1,5 giây miễn nhiễm. Rìa đảo chặn Mây, nên không phát sinh phạt rơi. Dash chưa dùng trong Phase 1.
- Khi yêu cầu xảy ra trong cùng tick, xử lý di chuyển, nhặt, nạp, tỏa sáng rồi mới đến Bóng Mực. Nếu đèn cuối đã sáng sau bước nạp, lượt chơi kết thúc ngay. Nếu chưa thắng, mất hết lửa kết thúc lượt trước kiểm hết giờ. Thưởng thời gian nguyên và lửa còn lại chỉ áp dụng khi thắng.
- Các đèn đặt sẵn sáng qua scenario có mức nạp đầy nếu không khai `deposited`. Snapshot ban đầu ghi trạng thái đã dựng, chưa phát sự kiện. Phần ngẫu nhiên dùng seed. Bản web dùng seed 12 và quay lại cùng bố trí khi chơi lại.
- Đặt đom đóm dọc các lối từ tâm và giữa các đèn. Khi danh sách xuống dưới tám, thế giới ngẫu nhiên có thể sinh lại ở mốc tám giây. Bóng Mực ban đầu hoạt động sẵn, sinh thêm tối đa bốn con trong thế giới ngẫu nhiên. Các cờ `random_motes` và `random_shades` tắt lần sinh tự động tương ứng.

## Đánh giá và nhật ký AI

- Ca đầu chạy một tick để kiểm thứ tự snapshot và sự kiện. Bộ test sau đó chạy qua lệnh CLI thật, gồm thắng, thua, so JSONL theo seed, lỗi đầu vào và các ranh giới XZ. [Bằng chứng](../proof/phase-1/README.md)
- Kịch bản đầu quay về tâm sau mỗi đèn làm Mây hết lửa trước đèn thứ năm. Bổ sung đường đom đóm giữa các đèn rồi kiểm tra lại với bản đồ mặc định.
- Kiểm bằng Chrome phát hiện thao tác kéo camera bỏ qua bước xoay đầu tiên vì kiểm tra pointer capture. Dùng vòng đời kéo với `pointerId` và `clientX`, sau đó chạy lại từ đầu bằng nút, bàn phím và chuột qua Chrome DevTools.
- Ước tính phần mã và test bàn giao do Codex tạo là khoảng **10–17 nghìn token văn bản**, tính từ xấp xỉ 50 kB mã nguồn, cấu hình và ca kiểm thử với giả định thô 3–5 byte/token. Số này chỉ mô tả phần mã đầu ra được lưu. Số token sử dụng toàn phiên và chi phí chưa đo được.
- Tiết kiệm ngữ cảnh bằng cách tra đúng mục contract, chỉ đọc phần WebGL cần dùng, dùng ca một tick để kiểm CLI sớm và lọc JSONL khi chẩn đoán. Log thô được lưu trong thư mục bằng chứng để chạy lại.
