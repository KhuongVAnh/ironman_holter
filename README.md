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
- **Kiến trúc end-to-end thực thụ:** project bao trọn toàn bộ chuỗi từ thiết bị ESP32, truyền telemetry, backend cloud, AI inference, realtime gateway cho đến dashboard web theo vai trò.
- **AI pipeline tách worker riêng:** web server không còn phải chờ CNN suy luận; telemetry được đẩy qua queue để xử lý bất đồng bộ, giúp ingest nhanh hơn và kiến trúc dễ mở rộng hơn.
- **Realtime nhiều lớp:** hệ thống vừa có `reading-update` cho dữ liệu sống, vừa có `reading-ai-updated`, `alert`, `notification:new` để phản ánh đầy đủ vòng đời của một bản ghi ECG.
- **Độ tin cậy cho dữ liệu IoT:** MQTT có `message_id`, ACK ở tầng ứng dụng, chống trùng bản tin và khả năng retry, giúp pipeline chịu lỗi tốt hơn so với chỉ nhận dữ liệu một chiều.
- **Mô hình dữ liệu sát nghiệp vụ y tế:** tách rõ `reading`, `alert`, `notification`, `medical history`, `access permission`; bệnh nhân giữ quyền sở hữu dữ liệu, bác sĩ và gia đình chỉ xem khi được cấp quyền.
- **Frontend không chỉ hiển thị kết quả cuối:** giao diện phản ánh cả trạng thái `PENDING`, `DONE`, `FAILED` của AI, nên người dùng nhìn thấy đúng tiến trình xử lý thay vì chỉ nhận một kết luận đen-trắng.
- **Test gần với production:** fake telemetry được đưa đi qua luồng MQTT thật thay vì chèn thẳng vào DB, giúp việc kiểm thử sát với hành vi hệ thống khi có thiết bị ngoài đời.

## Công nghệ sử dụng
### 1) IoT firmware và thiết bị
- **Phần cứng:** `ESP32 DevKit` kết hợp cảm biến ECG analog và `MPU6050`.
- **Môi trường phát triển:** `PlatformIO` với `Arduino framework`.
- **Kỹ thuật trên thiết bị:** lấy mẫu theo batch, lọc nhiễu cơ bản, đóng gói telemetry có `message_id`, gửi theo cửa sổ thời gian cố định.
- **Kết nối uplink:** `MQTT over TLS`, có topic telemetry và ACK riêng để thiết bị biết server đã nhận dữ liệu ở mức ứng dụng.

### 2) Backend web process
- **Runtime/API:** `Node.js` + `Express`.
- **ORM và database:** `Prisma` + `MySQL`.
- **Xác thực và bảo mật:** `jsonwebtoken`, `bcrypt`, `helmet`, `cors`, `cookie-parser`.
- **Realtime:** `Socket.IO` cho `reading-update`, `reading-ai-updated`, `alert`, `notification:new`, chat và các sự kiện đồng bộ giao diện.
- **MQTT server-side integration:** package `mqtt`, subscribe `devices/+/telemetry`, parse payload, dedupe theo `message_id`, publish ACK về `devices/{serial}/ack`.
- **View layer phụ trợ:** `EJS` cho một số màn admin/debug phía server.

### 3) AI worker và hàng đợi bất đồng bộ
- **Queue:** `BullMQ`.
- **Message broker / queue backend:** `Redis`.
- **Worker riêng:** AI inference không còn chạy trong web process; worker xử lý job riêng qua `node workers/ecgInferenceWorker.js`.
- **Mục tiêu kiến trúc:** giảm latency của ingest path, cho phép web server nhận telemetry nhanh rồi đẩy suy luận CNN sang background worker.
- **Kết quả nghiệp vụ:** web process tạo `reading` ở trạng thái `PENDING`, worker cập nhật `DONE/FAILED`, tạo alert khi cần và bridge các kết quả trở lại Socket.IO.

### 4) AI/Deep Learning cho ECG
- **Inference engine:** `TensorFlow.js` (`@tensorflow/tfjs`) chạy model CNN trong worker Node.js.
- **Tiền xử lý tín hiệu:** làm sạch signal, chuẩn hóa dữ liệu ECG và dựng feature phù hợp cho mô hình.
- **Kết quả AI:** sinh `ai_result`, `ai_status`, gom nhóm segment bất thường, tạo alert có ngữ cảnh để hiển thị trên dashboard và modal ECG.
- **Model assets:** các artifact `model.json`, `.bin`, baseline/test data và label map được lưu ngay trong repo server.

### 5) Frontend web
- **Frontend duy nhất hiện tại:** `another-client/`.
- **Framework:** `React 18` + `Vite`.
- **UI layer:** `Tailwind CSS` kết hợp token/style chung trong `src/index.css`.
- **Router và data client:** `react-router-dom`, `axios`.
- **Realtime client:** `socket.io-client`.
- **Thông báo giao diện:** `react-toastify`.
- **Biểu đồ ECG:** `Chart.js` + `react-chartjs-2`.
- **Định hướng UX hiện tại:** dashboard theo vai trò, dữ liệu realtime cho bệnh nhân, lịch sử đo, modal chi tiết ECG, inbox thông báo và cảnh báo đồng bộ theo quyền truy cập.

## Kỹ thuật nổi bật trong project
### 1) Kỹ thuật trong server
- **Queue-based AI pipeline:** web process chỉ nhận telemetry, tạo `reading(PENDING)` và đẩy job vào `BullMQ`; worker riêng xử lý CNN và cập nhật kết quả sau. Đây là kỹ thuật quan trọng nhất để tách `ingest latency` khỏi `AI latency`.
- **Realtime fan-out theo user room:** Socket.IO được tổ chức theo `user-{id}` room, nên `reading-ai-updated`, `alert`, `notification:new` chỉ emit tới đúng recipients thay vì broadcast toàn hệ thống.
- **Tách web process và AI worker:** backend không còn là một tiến trình làm tất cả; phần API/realtime và phần suy luận AI được tách thành hai runtime độc lập, giúp dễ scale và dễ cô lập lỗi hơn.
- **Domain model theo vòng đời xử lý:** reading, alert và notification được tách vai trò rõ ràng; reading phản ánh tiến trình xử lý AI, alert lưu bất thường nghiệp vụ, còn notification phục vụ inbox và chuông thông báo realtime.

### 2) Kỹ thuật trong firmware
- **Xử lý đa luồng trên ESP32:** firmware tách riêng các trách nhiệm đọc cảm biến, đóng gói dữ liệu và gửi telemetry để giảm nguy cơ block toàn bộ vòng lặp khi mạng chậm.
- **Double buffer A/B:** thiết bị sử dụng hai buffer luân phiên để một buffer tiếp tục thu mẫu trong khi buffer còn lại được chuẩn bị để gửi đi, giúp hạn chế mất mẫu khi stream liên tục.
- **MQTT telemetry có ACK ứng dụng:** sau khi publish, thiết bị còn chờ ACK ở tầng ứng dụng để biết server đã thực sự nhận và xử lý bản tin.

## Kiến trúc tổng thể
```text
ESP32 Device
  -> MQTT / HTTP telemetry
  -> Express ingest layer
  -> Prisma + MySQL create reading(PENDING)
  -> BullMQ queue on Redis
  -> ECG AI worker (TensorFlow.js)
  -> update reading / create alerts / notifications
  -> Socket.IO bridge
  -> React dashboard theo vai trò
```

## Triển khai và vận hành
### Backend
- Web process và AI worker là hai tiến trình độc lập.
- Khi deploy cần cấu hình env cho cả hai, đặc biệt:
  - `DATABASE_URL`
  - `REDIS_URL`
  - các biến MQTT
  - các biến secret/auth
- Prisma Client cần được generate trước khi chạy runtime:
  - `npx prisma generate`
- Nếu có migration mới:
  - `npx prisma migrate deploy`

### Worker
- Worker hiện chạy qua:
```bash
npm run worker:ai
```
- Có thể scale bằng nhiều worker process nếu tài nguyên máy đủ, vì queue đã tách rời khỏi web process.

### Frontend
- Frontend production hiện là `another-client`.
- Client này đã được cập nhật để hiểu contract queue-based:
  - `reading-update` có thể tới với `ai_status = PENDING`
  - `reading-ai-updated` sẽ chốt trạng thái `DONE/FAILED`

## Cấu trúc project hiện tại
```text
ironman_holter/
├─ ESP32/          # Firmware và logic telemetry trên thiết bị
├─ server/         # API, MQTT ingest, Prisma, BullMQ, AI worker, realtime
└─ another-client/ # Frontend React/Vite/Tailwind đang sử dụng
```

## Gợi ý chạy local
### 1) Backend web
```bash
cd server
npm install
npx prisma generate
npm run dev
```

### 2) AI worker
```bash
cd server
npm run worker:ai:dev
```

### 3) Frontend
```bash
cd another-client
npm install
npm run dev
```

> Lưu ý: Project này phục vụ học tập, nghiên cứu và trình diễn kỹ thuật xây dựng một hệ thống tim mạch thông minh theo hướng end-to-end, có thiết bị IoT, backend realtime và pipeline AI tách worker.


