# Ironman Holter

**AI Model (Kaggle):** https://www.kaggle.com/code/vitanhkhng/project-i-cnn  
**Website:** https://iron-holter.up.railway.app/  
**Video demo:** updating

## Mô tả dự án
**Ironman Holter** là hệ thống theo dõi sức khỏe tim mạch theo thời gian thực. Thiết bị ESP32 thu tín hiệu ECG và dữ liệu chuyển động, gửi telemetry lên server; mô hình **Deep Learning (CNN)** phân tích tín hiệu để phát hiện bất thường và kích hoạt cảnh báo cho **bệnh nhân, người nhà và bác sĩ**.

Dự án tập trung vào một luồng end-to-end hoàn chỉnh: **IoT device -> Cloud backend -> AI phân tích -> Realtime dashboard & cảnh báo**.

## Tính năng
### 1) Hệ thống gồm 3 vai trò chính
- **Bệnh nhân:** là chủ sở hữu dữ liệu, trực tiếp sử dụng thiết bị IoT để đo tín hiệu điện tim, theo dõi kết quả AI, ghi chú tình trạng sức khỏe và quản lý hồ sơ bệnh sử cá nhân.
- **Bác sĩ:** được bệnh nhân cấp quyền để theo dõi dữ liệu ECG, đọc kết quả phân tích AI, xem cảnh báo bất thường và nắm bắt lịch sử khám chữa bệnh của bệnh nhân.
- **Gia đình bệnh nhân:** được bệnh nhân chia sẻ quyền truy cập để theo dõi tình trạng tim mạch, nhận cảnh báo nguy hiểm và đồng hành chăm sóc từ xa.

### 2) Thiết bị IoT đo điện tim và gửi dữ liệu về server
- Mỗi người dùng có một **thiết bị IoT** dùng để thu tín hiệu **điện tim (ECG)** trong quá trình sử dụng hằng ngày.
- Dữ liệu thu được sẽ được gửi từ thiết bị lên **server** theo thời gian thực để xử lý và lưu trữ.
- Hệ thống được thiết kế theo hướng end-to-end: từ đo đạc trên thiết bị, truyền dữ liệu, phân tích AI đến hiển thị kết quả trên giao diện web.

### 3) AI phân tích tín hiệu ECG và phát hiện nguy cơ bất thường
- Server sử dụng **mô hình AI** để phân tích tín hiệu điện tim nhận được từ thiết bị.
- Khi phát hiện dấu hiệu bất thường hoặc nguy cơ bệnh lý tim mạch, hệ thống sẽ tạo **cảnh báo** kèm kết quả phân tích để người dùng có thể theo dõi và phản ứng kịp thời.
- Các bản ghi có bất thường quan trọng sẽ được lưu lại trong cơ sở dữ liệu như một phần của hồ sơ sức khỏe số của bệnh nhân.

### 4) Lưu trữ dữ liệu phục vụ khám chữa bệnh thực tế
- Những bản ghi ECG đã được AI phân tích có thể được bệnh nhân sử dụng như **tài liệu tham khảo khi đi khám tại các cơ sở y tế**.
- Hệ thống không chỉ giúp phát hiện sớm nguy cơ mà còn hỗ trợ bệnh nhân **tích lũy dữ liệu sức khỏe có hệ thống**, thay vì chỉ xem cảnh báo rồi bỏ qua.

### 5) Ghi chú cảm nhận sức khỏe tại thời điểm nhận cảnh báo
- Khi AI phát hiện dấu hiệu bất thường, bệnh nhân có thể **ghi chú lại cảm nhận của bản thân** tại thời điểm đó, ví dụ:
  - có hồi hộp, đau ngực, khó thở hay chóng mặt hay không
  - đang nghỉ ngơi, vận động hay làm việc
  - mức độ mệt mỏi hoặc các biểu hiện đi kèm
- Các ghi chú này sẽ được gắn với **bản ghi ECG tương ứng**, giúp bác sĩ có thêm ngữ cảnh khi đánh giá tình trạng bệnh nhân.

### 6) Nhật ký bệnh sử giúp theo dõi điều trị lâu dài
- Hệ thống cung cấp chức năng **bệnh sử** để bệnh nhân ghi chép lại:
  - tình trạng sức khỏe qua từng giai đoạn
  - chẩn đoán của bác sĩ
  - thuốc đang sử dụng hoặc đã sử dụng
  - các mốc tái khám quan trọng
- Khi tái khám, bệnh nhân có thể sử dụng phần nhật ký này để bác sĩ **nhanh chóng nắm bắt chính xác thể trạng và tiến trình điều trị**, thay vì phải nhớ lại bằng lời.

### 7) Chia sẻ dữ liệu có kiểm soát cho bác sĩ và gia đình
- Toàn bộ dữ liệu sức khỏe của bệnh nhân là **dữ liệu riêng tư** và chỉ được chia sẻ khi bệnh nhân chủ động cấp quyền.
- Sau khi được cấp quyền, bác sĩ hoặc người thân có thể xem các thông tin quan trọng như:
  - bản ghi điện tim
  - kết quả phân tích và chẩn đoán từ AI
  - cảnh báo bất thường
  - nhật ký bệnh sử
- Cơ chế này giúp bệnh nhân giữ quyền kiểm soát dữ liệu, đồng thời vẫn tạo điều kiện để bác sĩ và gia đình theo dõi sát sao khi cần.

### 8) Cảnh báo nguy hiểm được đồng bộ cho các bên liên quan
- Khi AI phát hiện dấu hiệu nguy hiểm, hệ thống sẽ gửi **cảnh báo** không chỉ cho bệnh nhân mà còn cho:
  - bác sĩ được cấp quyền
  - thành viên gia đình được cấp quyền
- Điều này giúp tạo nên một mạng lưới theo dõi nhiều lớp: bệnh nhân nhận biết tình trạng của mình, gia đình có thể hỗ trợ kịp thời, bác sĩ có thêm dữ liệu để đưa ra quyết định chính xác hơn.

### 9) Giá trị cốt lõi của hệ thống
- **Theo dõi liên tục:** hỗ trợ giám sát tim mạch ngoài môi trường bệnh viện.
- **Phát hiện sớm:** dùng AI để nhận diện dấu hiệu bất thường ngay từ dữ liệu ECG.
- **Lưu trữ có hệ thống:** biến dữ liệu đo và lịch sử điều trị thành hồ sơ sức khỏe số có thể tra cứu lại.
- **Kết nối nhiều bên:** bệnh nhân, bác sĩ và gia đình cùng tham gia theo dõi trên cùng một nền tảng, với quyền truy cập rõ ràng.
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




