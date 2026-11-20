# Đảo Đèn Lồng

Hướng dẫn này áp dụng cho cả bốn phase. Đề bài, Test Contract và ticket đã phát hành là nguồn yêu cầu; dùng [RULES.md](RULES.md), [RUBRIC.md](RUBRIC.md) và [SUBMISSION.md](SUBMISSION.md) khi cần đối chiếu cách làm và bàn giao.

## Checklist mỗi phase

- [ ] Đọc ticket và contract đang áp dụng. Với Phase 1, xem [PRD-0 và Test Contract](Đảo%20Đèn%20Lồng%20Lab%20%28Copy%29.md) và [kế hoạch triển khai](docs/phase-1-plan.md). Ghi phần thêm, luật bị thay và giả định cần kiểm chứng.
- [ ] Chọn thay đổi nhỏ nhất đáp ứng một yêu cầu bắt buộc, xác định kết quả mong đợi và cách kiểm trước khi sửa.
- [ ] Chạy ca liên quan trong lúc triển khai. Trước bàn giao, chạy cổng kiểm chứng chung và đối chiếu các ca hồi quy còn hiệu lực.
- [ ] Ghi bằng chứng, mục chưa đạt, lỗi AI và mức dùng token hoặc chi phí. Khi chuyển phase, ghi việc còn lại và test cần chạy để phiên sau tiếp tục được.

## Kiến trúc

- Giữ một nguồn trạng thái và luật gameplay dùng chung cho web và CLI. Mô phỏng chạy được trong Node, dùng bước cố định và RNG có seed theo contract hiện hành. Giữ DOM, Three.js, thời gian thực và hiệu ứng trong lớp giao diện.
- Khi dựng hoặc sửa scene, camera, renderer hoặc vòng lặp hiển thị trong `src/web/`, đọc [threejs-fundamentals](tools/skills/threejs-fundamentals/SKILL.md). Dùng phần WebGLRenderer và đối chiếu ví dụ với phiên bản Three.js trong lockfile.
- Lấy tuning của game từ cùng dữ liệu được công bố cho bộ chấm. Giữ CLI là lệnh Node chạy trực tiếp và nhận tham số nối ở cuối. Khi contract đổi, cập nhật parser, đầu ra và test liên quan cùng nhau. Giữ các kiểm thử cũ còn hiệu lực.

## Quản lý ngữ cảnh và token

- Bắt đầu từ yêu cầu đang làm, file liên quan và test hiện có. Nạp skill khi công việc cần nó. Tìm tên hoặc trường bằng `rg` rồi đọc đoạn liên quan. Giữ log đầy đủ trong file bằng chứng và đưa vào hội thoại phần lỗi hoặc kết quả cần phân tích.
- Nếu lỗi lặp lại, kiểm tra đầu ra thực tế hoặc chạy một ca nhỏ để kiểm tra giả thuyết mới. Nếu gần hết thời gian hoặc quota, ưu tiên yêu cầu bắt buộc và dành thời gian kiểm chứng, lưu bằng chứng.
- Ghi số liệu công cụ cung cấp hoặc ước tính có căn cứ, kèm nguồn hoặc cách ước tính và một việc đã giúp giảm lãng phí. Nếu thiếu dữ liệu, ghi rõ phần chưa đo được.

## Lệnh trong repo

| Việc | Lệnh |
|---|---|
| Cài theo lockfile | `npm ci` |
| Mở bản web cục bộ | `npm run dev` |
| Build bản web | `npm run build` |
| Kiểm chứng cục bộ và CI | `npm run verify` |
| Chạy CLI chấm | Dùng `headless_cmd` trong `game.contract.json` sau khi có CLI |

## Kiểm chứng và bàn giao

- Dùng [quy trình verify-lab](tools/skills/verify-lab/SKILL.md) khi sửa gameplay, contract, chạy hồi quy hoặc chuẩn bị bằng chứng. Chạy `npm run verify` cho thay đổi mã nguồn. Khi test được thêm, đưa chúng vào lệnh này để local và CI dùng cùng một cổng kiểm tra.
- Ghi kết quả theo từng yêu cầu, gồm lệnh chạy lại, bằng chứng thật và mục chưa đạt. Kết quả build chỉ xác nhận bản web build được. Dùng chạy CLI thật và chơi thử để kiểm chứng gameplay. Nếu kiểm tra thất bại, sửa và chạy lại trong thời gian còn lại. Đến hạn, ghi rõ phần chưa đạt trước khi bàn giao.
- Giữ tệp harness trong lịch sử Git. Khi lỗi AI lặp lại, thêm phép kiểm tra tái lập được nếu phù hợp. Thực hiện tag, push và Release theo yêu cầu của người dùng và lịch nộp.
