# Ironman Holter

**AI Model (Kaggle):** https://www.kaggle.com/code/vitanhkhng/project-i-cnn  
**Website:** https://iron-holter.up.railway.app/  
**Video demo:** updating

## Mô tả dự án
**Ironman Holter** là hệ thống theo dõi sức khỏe tim mạch theo thời gian thực. Thiết bị ESP32 thu tín hiệu ECG và dữ liệu chuyển động, gửi telemetry lên server; mô hình **Deep Learning (CNN)** phân tích tín hiệu để phát hiện bất thường và kích hoạt cảnh báo cho **bệnh nhân, người nhà và bác sĩ**.

Dự án tập trung vào một luồng end-to-end hoàn chỉnh: **IoT device -> Cloud backend -> AI phân tích -> Realtime dashboard & cảnh báo**.

## Điểm nổi bật
- **Realtime thực chiến:** truyền dữ liệu liên tục qua MQTT/HTTP, cập nhật giao diện bằng Socket.IO gần như tức thời.
- **AI ECG pipeline:** tiền xử lý tín hiệu, suy luận CNN, gom nhóm vùng bất thường để tạo cảnh báo có ngữ cảnh.
- **Độ tin cậy dữ liệu thiết bị:** ACK ứng dụng, retry khi lỗi mạng, chống trùng bản tin (deduplication).
- **Role-based platform:** dashboard riêng cho bệnh nhân, bác sĩ, gia đình, admin; có phân quyền chia sẻ hồ sơ y tế.
- **Full-stack hoàn chỉnh:** từ firmware ESP32 đến backend API/database và frontend trực quan.

## Công nghệ sử dụng
### 1) IoT Firmware (ESP32)
- **Board & framework:** `ESP32 DevKit` + `Arduino framework` (quản lý bằng `PlatformIO`).
- **Sensors:** `ECG analog` + `MPU6050` (gia tốc kế/con quay) qua `Adafruit MPU6050` và `Adafruit Unified Sensor`.
- **Transport:** MQTT over TLS với `PubSubClient` (topic telemetry/ack), có `message_id`, retry queue và app-level ACK.
- **Signal handling trên thiết bị:** thu mẫu theo batch (`250Hz ECG`, `50Hz MPU`, cửa sổ 5s), notch filter `50Hz`, double-buffer để tách luồng đọc/gửi.

### 2) Backend & API
- **Runtime/API:** `Node.js` + `Express`.
- **ORM & DB:** `Prisma` + `MySQL` (schema, migration, seed).
- **Realtime:** `Socket.IO` để push `reading-update`, `alert`, `notification` theo user/role.
- **MQTT ingest:** `mqtt` client trên server, subscribe `devices/+/telemetry`, kiểm tra payload, chống trùng message (dedupe TTL), phản hồi ACK về thiết bị.
- **Data pipeline:** service ingest chung cho cả HTTP/MQTT, chuẩn hóa tín hiệu, lưu reading, tạo alert/notification và emit realtime.

### 3) AI/Deep Learning cho ECG
- **Inference engine:** `TensorFlow.js` (`@tensorflow/tfjs`) chạy model CNN ngay trên backend Node.js.
- **Model artifacts:** `model.json` + `.bin` (TFJS format).
- **Tiền xử lý:** bandpass filter và xử lý tín hiệu bằng `fili`, detect peak, cắt segment theo nhịp tim, chuẩn hóa và suy luận batch.
- **Kết quả AI:** phân loại segment-level, gom nhóm bất thường liên tiếp, sinh `ai_result_summary` để cảnh báo có ngữ cảnh.

### 4) Frontend Web
- **Framework:** cả hai frontend đều dùng `React 18` + `Vite`.
- **Frontend chính mới:** `another-client/` dùng `Tailwind CSS`, `react-router-dom`, dashboard mới theo concept sidebar + card system.
- **Frontend cũ/legacy:** `client/` là bản UI cũ, dùng `Bootstrap 5` + `React-Bootstrap`.
- **Charts:** `Chart.js` + `react-chartjs-2` để hiển thị waveform ECG.
- **Realtime client:** `socket.io-client`.
- **HTTP client:** `axios`.
- **UX notifications:** `react-toastify`.

### 5) Security, Integration, Deployment
- **Auth & security middleware:** `JWT` (`jsonwebtoken`), `bcrypt`, `helmet`, `cors`.
- **AI assistant integration:** `Google Gemini API` (`@google/generative-ai`) cho chatbot hỗ trợ người dùng.
- **Environment management:** `dotenv`.
- **Deployment (web):** frontend/backend public qua `Railway` (URL production đặt ở đầu README).

## Kiến trúc ngắn gọn
`ESP32 Sensors -> MQTT/HTTP Ingest -> AI + Database -> Alert Engine -> Web Dashboard (Patient/Doctor/Family/Admin)`

## Cấu trúc project
```text
ironman_holter/
├─ ESP32/          # Firmware và thu thập telemetry từ thiết bị
├─ server/         # API, realtime, AI inference, database
├─ another-client/ # Frontend mới dùng Tailwind CSS
└─ client/         # Frontend cũ/legacy
```

> Lưu ý: Đây là dự án kỹ thuật phục vụ học tập/nghiên cứu và trình diễn năng lực xây dựng hệ thống theo dõi tim mạch thông minh.


