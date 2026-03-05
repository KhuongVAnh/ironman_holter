# Cải Tiến Tiềm Năng Firmware MQTT (ESP32)

## 1) Mục đích tài liệu
Tài liệu này ghi lại **vấn đề kỹ thuật cốt lõi** và **giải pháp đề xuất** cho cơ chế retry telemetry MQTT trên ESP32.  
Mục tiêu là để sau này (kể cả vài năm nữa) đọc lại vẫn hiểu:
- Hệ thống đang làm gì.
- Điểm yếu hiện tại nằm ở đâu.
- Vì sao cần cải tiến.
- Cần triển khai theo thứ tự nào để an toàn.

---

## 2) Bối cảnh hiện tại
Firmware `main_mqtt_pubsub_ack.cpp` đang có các đặc điểm:
- Thu mẫu ECG + MPU theo batch 5 giây.
- Dùng **double-buffer A/B** để vừa thu mẫu vừa gửi.
- Gửi MQTT theo cơ chế stream JSON (tránh tạo String payload lớn).
- Có ACK từ server, có retry (`MAX_RETRY`) và có queue retry trong RAM.

### Điểm mạnh hiện tại
- Gửi payload lớn nhanh hơn nhiều nhờ chunk writer.
- Không cần giữ payload JSON lớn trên heap.
- Có ACK để biết server đã ingest thành công hay chưa.

---

## 3) Vấn đề gốc cần giải quyết
### Vấn đề
Retry queue hiện tại chỉ lưu:
- `messageId`
- cờ `useBufferA/useBufferB`

Queue **không lưu snapshot dữ liệu batch gốc**.

### Hệ quả
Khi retry xảy ra muộn:
- Buffer A/B có thể đã bị batch mới ghi đè.
- `messageId` cũ nhưng data gửi lại không còn là data gốc.

Kết luận: retry hiện tại là **best-effort**, chưa đảm bảo **data integrity** cho resend.

---

## 4) Giải pháp đề xuất (ưu tiên cao)
## Dùng ring buffer snapshot payload
Ý tưởng:
- Ngay khi batch hoàn tất, copy dữ liệu batch đó vào một slot trong ring buffer.
- Mọi lần retry dùng dữ liệu từ slot snapshot, không đọc từ buffer A/B đang quay vòng.
- Khi nhận ACK `ok` thì giải phóng slot.

### Thiết kế dữ liệu đề xuất
- `RetrySlot`:
  - `inUse`
  - `acked`
  - `messageId`
  - `ecg[NUM_SAMPLES]`
  - `accelX/Y/Z[MPU_NUM_SAMPLES]`
  - `gyroX/Y/Z[MPU_NUM_SAMPLES]`
  - `attemptCount`
  - `createdAt`

---

## 5) Tính toán RAM để chọn số slot hợp lý
## Công thức dung lượng 1 slot (float32)
`slot_bytes = 4 * (NUM_SAMPLES + 6 * MPU_NUM_SAMPLES)`

Với config hiện tại:
- `SAMPLE_RATE_ECG=250`, `BATCH_DURATION_SEC=5` -> `NUM_SAMPLES=1250`
- `MPU_SAMPLE_RATE=50` -> `MPU_NUM_SAMPLES=250`
- `slot_bytes = 4 * (1250 + 6*250) = 11000 bytes` (~10.7 KB/slot)

### Bảng ước lượng
- 1 slot: ~11 KB
- 2 slot: ~22 KB
- 4 slot: ~44 KB
- 8 slot: ~88 KB

### Khuyến nghị nếu KHÔNG có PSRAM
- Bắt đầu với `1-2 slot`.
- Giữ vùng an toàn tối thiểu ~50 KB cho TLS/WiFi/MQTT + task stack + biến động heap.
- Chỉ tăng slot khi đo runtime ổn định.

---

## 6) Cách đo runtime để ra quyết định đúng
Đo các chỉ số sau sau khi firmware chạy thật:
- `ESP.getFreeHeap()`
- `ESP.getMinFreeHeap()`

Đo ở 3 trạng thái:
1. Sau khi WiFi + MQTT connected, chưa gửi.
2. Đang gửi liên tục bình thường.
3. Mạng lỗi (ACK timeout) để ép retry queue hoạt động.

Nếu `min_free_heap` tụt thấp hoặc dao động mạnh, giảm số slot ngay.

---

## 7) Lộ trình triển khai an toàn
1. Tạo `RetrySlot` và ring buffer snapshot.
2. Sửa luồng gửi:
   - Lần gửi đầu tạo snapshot slot.
   - Retry đọc từ slot.
3. ACK `ok` -> giải phóng slot.
4. Thêm log:
   - `slot_index`
   - `attempt_count`
   - `queue_depth`
   - `free_heap/min_free_heap`
5. Chạy soak test >= 30 phút với mạng ổn định và mạng chập chờn.

---

## 8) Tiêu chí hoàn thành (Definition of Done)
- Retry gửi lại đúng payload gốc theo cùng `messageId`.
- Không còn tình trạng resend nhầm dữ liệu do buffer A/B bị ghi đè.
- Không reset ngẫu nhiên do thiếu RAM.
- `publish_ms` vẫn ở mức chấp nhận được sau khi thêm snapshot.

---

## 9) Rủi ro và phương án fallback
## Rủi ro
- Snapshot nhiều slot làm tăng dùng RAM.
- Heap phân mảnh nếu vẫn dùng nhiều `String`.

## Fallback
- Nếu không đủ RAM: giảm slot xuống 1, hoặc tắt retry queue.
- Nếu vẫn bất ổn: giữ cơ chế hiện tại (best-effort) và ưu tiên realtime.

---

## 10) Trạng thái hiện tại
- Trạng thái: `Chưa triển khai`.
- Lý do hoãn: ưu tiên ổn định đường gửi và ACK hiện tại trước.
- Mốc xem xét lại: khi cần đảm bảo resend đúng payload trong điều kiện mạng xấu.
