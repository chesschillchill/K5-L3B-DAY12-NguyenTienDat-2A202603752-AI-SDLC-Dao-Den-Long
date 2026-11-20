# Bằng chứng kiểm chứng Phase 1

| Yêu cầu | Kết quả thực tế | Bằng chứng |
|---|---|---|
| Đi, nhặt, nạp đèn, HUD, cảnh 3D và ánh sáng | Bấm W đi tới đèn đầu, bấm E, HUD báo 1/5. Mây, Bóng Mực, nón lá, đèn và vòng an toàn hiện trên canvas. | [Ảnh chơi](browser-playing.png) · [Kết quả Chrome](browser-checks.json) |
| Xoay camera, thắp đủ đèn, thua và chơi lại | Chrome thắp 5/5 đèn với 1.023 điểm qua bàn phím và kéo chuột. Sau khi chơi lại, đứng yên khiến lửa về 0. Chơi lại lần nữa đưa HUD về 3 lửa, 0/5 đèn, 0 điểm. | [Ảnh thắng](browser-won.png) · [Kết quả Chrome](browser-checks.json) |
| Headless thắng, thua và dừng sớm | Bản đồ mặc định và lộ trình ghi sẵn thắng ở tick 689. Cùng seed, đứng yên thua ở tick 563. Cả hai dừng trước giới hạn 1.500 tick. | [JSONL thắng](win.jsonl) · [JSONL thua](loss.jsonl) |
| Contract v1.0, nhảy, hồi quy và tính tất định | 11/11 test đạt. Bao phủ tick, input giữ nguyên, cạnh kích hoạt, góc camera, scenario, nhặt ở biên, pulse, vùng an toàn, mất lửa, hết giờ, tính điểm và file sai. Hai lượt chạy thắng cho JSONL giống từng byte. | [Báo cáo kiểm chứng](verification.txt) · [Ca kiểm thử](../../../test/contract.test.js) |

## Chạy lại

Từ gốc repo, sau `npm ci`:

```sh
npm run verify
node src/headless.js --seed 12 --night 1 --inputs test/fixtures/walk-the-lanterns.json --ticks 1500 --snapshot-every 60 --out /tmp/lanterns-win.jsonl
cmp /tmp/lanterns-win.jsonl docs/proof/phase-1/win.jsonl
node src/headless.js --seed 12 --night 1 --ticks 1500 --snapshot-every 60 --out /tmp/lanterns-loss.jsonl
cmp /tmp/lanterns-loss.jsonl docs/proof/phase-1/loss.jsonl
```

Sau khi build, chạy `node tools/verify-browser.mjs` để tái tạo ảnh và kết quả Chrome. Nếu trình duyệt có tên hoặc đường dẫn khác, đặt biến `CHROME_BIN` trỏ tới file thực thi Chrome. Ca browser mở bản build qua localhost, gửi thao tác chuột và bàn phím qua Chrome DevTools, rồi điều khiển thời điểm khung hình để tái lập đúng các bước kiểm thử. Dữ liệu gameplay đến từ bản đồ mặc định của game.
