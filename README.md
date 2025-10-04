# Ironman Holter – Hệ thống theo dõi tim mạch liên tục

## 🚀 Cài đặt

### 1. Backend
\`\`\`bash
cd server
npm install
cp .env.example .env
# Chỉnh sửa .env
DB_HOST=localhost
DB_USER=root
DB_PASS=123456
DB_NAME=ironman_holter
JWT_SECRET=your_secret
GEMINI_API_KEY=your_gemini_api_key

# Tạo database và migrate
npx sequelize db:create
npx sequelize db:migrate
npx sequelize-cli db:seed:all

npm run dev
\`\`\`

### 2. Frontend
\`\`\`bash
cd client
npm install
npm start
\`\`\`

### 3. Truy cập

- Backend: http://localhost:4000
- Frontend: http://localhost:3000

## 📋 Tính năng

### Bệnh nhân
- Dashboard theo dõi ECG realtime
- Lịch sử nhịp tim và cảnh báo
- Chatbot tư vấn sức khỏe với AI Gemini
- Quản lý hồ sơ cá nhân

### Gia đình
- Theo dõi người thân realtime
- Nhận cảnh báo khẩn cấp
- Xem lịch sử sức khỏe

### Bác sĩ
- Quản lý danh sách bệnh nhân
- Phân tích dữ liệu ECG chi tiết
- Tạo báo cáo y tế
- Theo dõi cảnh báo

### Admin
- Quản lý người dùng hệ thống
- Quản lý thiết bị Holter
- Thống kê và báo cáo tổng quan

## 🛠️ Công nghệ sử dụng

- **Frontend**: React, Bootstrap 5, React Router v6
- **Backend**: Node.js, Express
- **Database**: MySQL, Sequelize ORM
- **Realtime**: Socket.IO
- **Security**: JWT, bcrypt, helmet, cors
- **AI**: Google Gemini API
- **Charts**: Chart.js, react-chartjs-2
