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
- **Framework:** `React 18` + `Vite`.
- **Routing/Auth UI:** `react-router-dom`, context auth, protected route theo vai trò.
- **UI toolkit:** `Bootstrap 5` + `React-Bootstrap`.
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
├─ ESP32/    # Firmware và thu thập telemetry từ thiết bị
├─ server/   # API, realtime, AI inference, database
└─ client/   # Giao diện web theo vai trò người dùng
```

### ESP32
- `ESP32/platformio.ini`: cấu hình board ESP32, framework Arduino, thư viện cảm biến và MQTT.
- `ESP32/src/main_mqtt_pubsub_ack.cpp`: firmware chính (MQTT + ACK ứng dụng + retry queue + double buffer + notch filter).
- `ESP32/src/main.cpp`: bản HTTP telemetry cũ (prototype, đang comment).
- `ESP32/include/README`: ghi chú thư mục header.
- `ESP32/lib/README`: ghi chú thư mục thư viện nội bộ.
- `ESP32/test/README`: ghi chú thư mục test firmware.

### Server
- `server/server.js`: entrypoint backend, khởi tạo Express + Socket.IO + MQTT ingest lifecycle.
- `server/prismaClient.js`: khởi tạo Prisma Client và kết nối DB.
- `server/package.json`: scripts/dev dependencies backend.
- `server/package-lock.json`: lock phiên bản package backend.
- `server/README.backend.md`: tài liệu đọc nhanh backend.
- `server/middleware/auth.js`: middleware xác thực token.
- `server/utils/enumMappings.js`: map enum DB/Prisma.
- `server/strings/ecgAiStrings.js`: map nhãn AI ECG.
- `server/views/readings.ejs`: trang test xem readings.

`server/routes/`:
- `auth.js`: route đăng ký/đăng nhập/xác thực user.
- `users.js`: route quản lý user.
- `devices.js`: route đăng ký/quản lý thiết bị.
- `readings.js`: route telemetry, lịch sử, chi tiết reading.
- `alerts.js`: route cảnh báo.
- `notifications.js`: route thông báo.
- `reports.js`: route báo cáo bác sĩ.
- `chat.js`: route chatbot/nhắn tin.
- `access.js`: route chia sẻ quyền truy cập.
- `medicalHistory.js`: route hồ sơ/bệnh sử.
- `doctorRoutes.js`: route nghiệp vụ bác sĩ.
- `familyRoutes.js`: route nghiệp vụ gia đình.
- `routesServer.js`: route test nội bộ.

`server/controllers/`:
- `authController.js`: xử lý đăng ký/đăng nhập.
- `userController.js`: xử lý user profile/admin user management.
- `deviceController.js`: xử lý thiết bị Holter.
- `readingController.js`: xử lý telemetry/readings.
- `alertController.js`: xử lý cảnh báo.
- `notificationController.js`: xử lý thông báo.
- `reportController.js`: xử lý báo cáo bác sĩ.
- `chatController.js`: xử lý chatbot/trao đổi tin nhắn.
- `accessController.js`: xử lý chia sẻ quyền bệnh án.
- `medicalHistoryController.js`: xử lý bệnh sử.
- `doctorController.js`: xử lý dashboard/chức năng bác sĩ.
- `familyController.js`: xử lý dashboard/chức năng gia đình.

`server/services/`:
- `mqttTelemetryService.js`: subscribe MQTT, ACK publish, dedupe message.
- `telemetryIngestService.js`: ingest telemetry dùng chung HTTP/MQTT.
- `telemetrySignalService.js`: chuẩn hóa ECG, suy ra heart rate.
- `ecgCnnService.js`: AI inference CNN với TensorFlow.js.
- `ecgCnnBaselineTestService.js`: kiểm thử baseline model.
- `fakeReadingDataService.js`: tạo dữ liệu đọc giả lập.
- `socketService.js`: quản lý room/event realtime.
- `socketEmitService.js`: helper emit socket theo user/role.
- `notificationService.js`: tạo và phát notification.
- `authService.js`: helper xác thực/token.

`server/prisma/`:
- `schema.prisma`: schema dữ liệu MySQL.
- `seed.js`: dữ liệu seed ban đầu.
- `migrations/*/migration.sql`: lịch sử thay đổi schema.
- `migrations/migration_lock.toml`: metadata migration.

`server/model_CNN/`:
- `ecg_tfjs/model.json` + `group1-shard1of1.bin`: artifact model CNN cho TFJS.
- `ecg/preprocess_config.json`: config tiền xử lý tín hiệu.
- `ecg/label_map.json`: map class code -> label.
- `ecg/readings_with_id.json`: dữ liệu mẫu phục vụ AI/dev.
- `baseline_p0_t05.csv` + `baseline_p0_t05.json`: dữ liệu baseline so sánh.
- `scripts/p0_t05_generate_baseline.py`: script tạo baseline.
- `README.md`: tài liệu thư mục model.

### Client
- `client/package.json`: scripts/dependencies frontend.
- `client/package-lock.json`: lock phiên bản package frontend.
- `client/vite.config.js`: cấu hình bundler Vite.
- `client/index.html`: HTML entry.
- `client/public/index.html`: static HTML dự phòng/legacy.
- `client/dist/index.html`: file build output.
- `client/dist/assets/index-*.js`: bundle JS sau build.
- `client/dist/assets/index-*.css`: bundle CSS sau build.

`client/src/`:
- `index.js`: bootstrap React app.
- `index.css`: style global.
- `App.js`: router chính và route theo vai trò.
- `config/env.js`: cấu hình biến môi trường frontend.
- `hooks/useSocket.js`: kết nối Socket.IO client.
- `contexts/AuthContext.js`: quản lý trạng thái đăng nhập.
- `styles/customNav.css`: style navbar.
- `services/api.js`: HTTP client gọi backend API.
- `services/string.js`: hằng số role + helper routing.
- `strings/ecgAiStrings.js`: map nhãn AI hiển thị UI.

`client/src/components/`:
- `Login.js`, `Register.js`: màn hình xác thực.
- `Navbar.js`: thanh điều hướng theo vai trò.
- `ProtectedRoute.js`: chặn route theo quyền.
- `Unauthorized.js`: trang không đủ quyền truy cập.

`client/src/components/admin/`:
- `AdminDashboard.js`: tổng quan quản trị.
- `AdminUsers.js`: quản lý tài khoản.
- `AdminDevices.js`: quản lý thiết bị.
- `AdminLogs.js`: theo dõi log/hệ thống.

`client/src/components/doctor/`:
- `DoctorDashboard.js`: dashboard bác sĩ.
- `DoctorPatients.js`: danh sách bệnh nhân.
- `PatientDetail.js`: chi tiết bệnh nhân.
- `DoctorReports.js`: tạo/xem báo cáo.
- `DoctorChat.js`: trao đổi tin nhắn.
- `DoctorAccessRequests.js`: xử lý yêu cầu truy cập.
- `DoctorHistoryPanel.jsx`: xem lịch sử tim mạch bệnh nhân.

`client/src/components/family/`:
- `FamilyDashboard.js`: dashboard người nhà.
- `FamilyMonitoring.js`: theo dõi realtime người thân.
- `FamilyAccessRequests.js`: yêu cầu truy cập bệnh án.
- `FamilyHistorySelector.jsx`: chọn bệnh nhân để xem lịch sử.
- `FamilyHistoryPanel.jsx`: lịch sử tim mạch bệnh nhân.

`client/src/components/patient/`:
- `PatientDashboard.js`: dashboard bệnh nhân.
- `PatientHistory.js`: lịch sử readings.
- `PatientAlerts.js`: danh sách cảnh báo.
- `PatientProfile.js`: thông tin cá nhân.
- `PatientChat.js`: chat hỗ trợ.
- `PatientAccess.js`: chia sẻ quyền cho bác sĩ/người nhà.
- `PatientMedicalHistory.jsx`: hồ sơ bệnh sử.
- `PatientDeviceRegistration.js`: đăng ký thiết bị.
- `ECGChart.js`: đồ thị ECG.
- `useECGStream.js`: hook đọc stream ECG realtime.

`client/src/components/notifications/`:
- `NotificationBell.jsx`: chuông thông báo.
- `NotificationsPage.jsx`: trang danh sách thông báo.

`client/src/components/shared/`:
- `Chatbot.js`: widget chatbot AI.
- `DiagnosisBadge.jsx`: badge nhãn chẩn đoán AI.
- `RecentAlertsPanel.jsx`: panel cảnh báo gần nhất.
- `ReadingDetailModal.jsx`: modal chi tiết reading.
- `MedicalHistoryForm.jsx`: form tạo/cập nhật bệnh sử.
- `MedicalHistoryList.jsx`: danh sách bệnh sử.

> Lưu ý: Đây là dự án kỹ thuật phục vụ học tập/nghiên cứu và trình diễn năng lực xây dựng hệ thống theo dõi tim mạch thông minh.
