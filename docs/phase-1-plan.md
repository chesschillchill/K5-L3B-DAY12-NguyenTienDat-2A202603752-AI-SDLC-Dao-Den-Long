# Kế hoạch triển khai Phase 1

Đích của Phase 1 là chơi được Đêm 1 từ đầu đến thắng hoặc thua, chơi lại được và chạy được Test Contract v1.0 bằng CLI. Chốt bằng chứng trước khi push `phase-1` ở mốc một giờ. [PRD-0 và Test Contract](../Đảo%20Đèn%20Lồng%20Lab%20%28Copy%29.md) · [Rubric](../RUBRIC.md)

## Môi trường và công cụ

| Dùng | Vai trò |
|---|---|
| Node.js 24 và npm | Chạy CLI, cài phụ thuộc theo lockfile và chạy `node --test` khi có ca kiểm thử. Dùng bản trong `.nvmrc` cho local và CI. |
| Three.js và Vite | Dựng cảnh 3D bằng hình khối đơn giản, HUD bằng HTML/CSS. Vite phục vụ bản chạy cục bộ và tạo bản web tĩnh ở `dist/`. Tham khảo [threejs-fundamentals](../tools/skills/threejs-fundamentals/SKILL.md) khi nối phần 3D. [Nguồn skill, giấy phép MIT](https://github.com/CloudAI-X/threejs-skills/tree/0e181866f095b5f06d005133876e926515390d95/skills/threejs-fundamentals) |
| Chrome hoặc Firefox | Chơi thử góc camera, HUD, vòng chơi và khởi động lại. |
| Git, GitHub và GitHub Actions | Lưu các mốc phase và chạy cùng cổng kiểm tra với local. GitHub CLI và FFmpeg hữu ích ở phase bàn giao video. |
| Codex | Dùng [AGENTS.md](../AGENTS.md) cho hướng dẫn xuyên suốt và [verify-lab](../tools/skills/verify-lab/SKILL.md) khi cần kiểm chứng. |

Nếu dùng nvm, chạy `nvm use`. Chạy `npm ci` rồi `npm run dev` và mở URL Vite in ra. Chạy `npm run verify` để kiểm thử CLI và build bản web. Ưu tiên dùng các công cụ đã có và PRD hiện hành trong 60 phút đầu.

## Checklist theo thời gian

| Mốc | Việc | Điều kiện qua bước |
|---|---|---|
| 0–8 phút | Xác nhận repo public, mở bản web thử, đọc PRD-0 và ghi giả định về nạp đèn, nhặt đom đóm, va chạm, vùng an toàn, điểm và hết giờ. | Có quy tắc đủ cụ thể để viết kỳ vọng test. |
| 8–21 phút | Tạo `game.contract.json`, lõi trạng thái chung và CLI. Dựng scenario, kiểm tra inputs, bước mô phỏng và xuất JSONL. Thêm `npm test` dùng `node --test` và đưa vào `verify`. | Một ca một tick qua CLI thật, đúng snapshot tick 0 và dòng `end`. Ca input sai trả mã 2. |
| 21–35 phút | Thêm luật nhặt, nạp, thắp 5 đèn, Bóng Mực, tỏa sáng, mất máu, thắng, thua và tính điểm. Hoàn thiện test chính. | Có đường thắng và thua qua CLI, kiểm tra seed và các sự kiện chính. |
| 35–49 phút | Nối input, nhảy và camera góc nhìn thứ ba vào lõi chung. Dựng đảo tròn, Mây đội nón lá treo đèn, Bóng Mực, HUD và chơi lại. Thể hiện đảo sáng dần khi thắp đèn. | Chơi được một lượt đến thắng và một lượt đến thua, chơi lại được. |
| 49–57 phút | Chạy `npm run verify`, chơi thử và nhờ người dùng đối chiếu các ca chính. Lưu bằng chứng, giả định, đánh giá và token/chi phí. Cập nhật README với cách cài/chạy tối đa ba lệnh, điều khiển, tính điểm và lệnh test/headless. | Người khác có thể lặp lại các kiểm tra từ bản clone sạch. Các mục chưa đạt được ghi rõ. |
| 57–60 phút | Kiểm tra commit đúng để gắn tag, sau đó push `phase-1` và kiểm tra tag trên GitHub. | Tag đúng commit, trước khi Phase 2 bắt đầu. |

## Ma trận kiểm thử

| Ca | Kỳ vọng chính | Bằng chứng |
|---|---|---|
| Tick và dừng | Snapshot 0 có trạng thái sau dựng scenario. Input tick 0 tạo trạng thái tick 1. `--ticks N` chạy đủ N bước trừ khi đã kết thúc. `sim_tick` bằng `tick`. Dòng cuối là `end`. | JSONL từ CLI, dùng `--snapshot-every 1` cho ca ngắn. |
| Điều khiển và khoảng cách | Y hướng lên, phép xoay camera và chuẩn hóa đi chéo đúng contract. Input thiếu trường giữ giá trị cũ. Giữ nút chỉ kích hoạt một lần cho đến khi nhả và bấm lại. Khoảng cách ngang XZ tính cả điểm trên biên. | Scenario tối giản, so tọa độ và số sự kiện. |
| Dựng scenario | Cập nhật đèn theo ID, giữ các đèn khác. Mảng rỗng thay thế toàn bộ danh sách tương ứng. Đèn đặt sẵn sáng không phát sự kiện và không cộng điểm lúc dựng. | Snapshot 0 và danh sách sự kiện. |
| Vòng chơi | Nhặt đom đóm, nạp và thắp đèn, tỏa sáng làm choáng, Bóng Mực chạm làm mất máu, vùng quanh đèn hoạt động theo tuning. Có ca thắng `all_lit`, thua `no_flames` và hết giờ `dawn`. Điểm khớp tuning. | Scenario riêng cho từng ca, kiểm trạng thái và payload sự kiện. |
| JSONL, lỗi và tính tất định | Tên trường và sự kiện đúng, tọa độ làm tròn 3 chữ số. Lặp nguyên đầu vào cho kết quả giống từng byte, gồm ID tự sinh. Inputs/scenario sai định dạng trả mã 2 và ghi stderr. | File JSONL, `cmp`, mã thoát và stderr. |
| Giao diện | Đi, nhảy, camera bám Mây, HUD cập nhật, đèn thắp làm đảo sáng dần và chơi lại đặt lại lượt chơi. | Ảnh/clip thật hoặc ghi chép chơi thử có bước tái hiện. |

Giữ một dòng cho mỗi mục nghiệm thu với cấu trúc **yêu cầu → cách chạy lại → kết quả → bằng chứng**. Bằng chứng lưu ở `docs/proof/phase-1/`. Ghi những gì Phase 2 cần biết trong ghi chép Phase 1, gồm giả định, điểm còn thiếu, lỗi AI, hành động cải thiện và token hoặc chi phí ước tính.

Mẫu một dòng cho nhật ký AI mỗi phase: `Công cụ/model | token hoặc chi phí | nguồn số liệu hoặc cách ước tính | việc đã giúp tiết kiệm`. Nếu thiếu số liệu cho một phần công việc, ghi rõ phạm vi đã đo.

## Tệp cần có khi chốt Phase 1

- [ ] `game.contract.json` ở gốc, đủ khai báo A và dùng các giá trị tuning thực tế.
- [ ] `src/sim/` chứa luật chung, `src/headless.js` chạy v1.0 và `src/web/` chạy bản 3D.
- [ ] `test/` chứa unit test, ca CLI và fixtures cần thiết. `npm run verify` chạy test và build.
- [ ] `README.md` cập nhật hướng dẫn sử dụng. `docs/notes/phase-1.md` ghi giả định, AI và đánh giá. `docs/proof/phase-1/` lưu bằng chứng.
- [ ] `AGENTS.md` và quy trình kiểm chứng còn trong repo. Tag `phase-1` trên GitHub trỏ đúng bản bàn giao.
