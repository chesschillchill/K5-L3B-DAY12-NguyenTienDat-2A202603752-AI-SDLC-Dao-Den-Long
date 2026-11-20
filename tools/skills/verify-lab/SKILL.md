---
name: verify-lab
description: Kiểm chứng thay đổi gameplay và Test Contract của Đảo Đèn Lồng, chạy hồi quy và lưu bằng chứng thật cho từng phase.
---

# Kiểm chứng Đảo Đèn Lồng

1. Xác định ticket và contract đang áp dụng. Liệt kê yêu cầu bị ảnh hưởng, phép thử cần chạy và kỳ vọng cụ thể. Chỉ cập nhật kỳ vọng cũ khi ticket nêu rõ thay đổi, kèm lý do.
2. Chạy `npm run verify`. Với gameplay hoặc contract, chạy thêm từng scenario qua chính `headless_cmd` và cờ do contract quy định. Kiểm tra mã thoát, trạng thái và dữ liệu sự kiện liên quan. Tách lỗi môi trường khỏi lỗi gameplay khi báo cáo.
3. Khi contract yêu cầu tính tất định, chạy cùng lệnh với cùng seed, inputs và scenario vào hai tệp riêng rồi so từng byte bằng `cmp`. Đọc [ma trận Phase 1](../../../docs/phase-1-plan.md#ma-trận-kiểm-thử) khi làm contract v1.0.
4. Với phần chỉ quan sát được qua giao diện, mở lệnh chạy trong README và chơi đúng đoạn cần kiểm. Ghi lý do nếu môi trường chưa cho chơi thử. Khi chốt phase, để người dùng hoặc reviewer khác người viết đối chiếu các ca chính nếu có thể.
5. Lưu bằng chứng cần nộp vào `docs/proof/phase-N/`: lệnh chạy lại hoặc đường dẫn test, inputs/scenario, JSONL hoặc ảnh thật phù hợp, và kết quả đạt/chưa đạt. Đối chiếu với commit dự định gắn tag và ghi lại các lỗi còn tồn tại. Giữ output thô do chương trình tạo.
