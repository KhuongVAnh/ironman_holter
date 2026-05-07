const {
  PrismaClient,
  UserRole,
  DeviceStatus,
  AccessRole,
  AccessStatus,
  ChatRole,
  NotificationType,
} = require("@prisma/client")
const { hashPass } = require("../services/authService")

const prisma = new PrismaClient()

const toDate = (value) => new Date(value)

const buildConversationKey = (leftUserId, rightUserId) => {
  const left = Number(leftUserId)
  const right = Number(rightUserId)
  return left < right ? `${left}_${right}` : `${right}_${left}`
}

async function main() {
  // Xóa dữ liệu theo thứ tự an toàn để tránh lỗi khóa ngoại khi seed lại nhiều lần.
  await prisma.notificationRecipient.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.directMessage.deleteMany()
  await prisma.alert.deleteMany()
  await prisma.reading.deleteMany()
  await prisma.device.deleteMany()
  await prisma.report.deleteMany()
  await prisma.chatLog.deleteMany()
  await prisma.accessPermission.deleteMany()
  await prisma.medication.deleteMany()
  await prisma.medicationPlan.deleteMany()
  await prisma.medicalVisit.deleteMany()
  await prisma.user.deleteMany()

  const commonPasswordHash = await hashPass("123456")

  // Tạo người dùng mẫu với tên tiếng Việt có dấu để UI nhìn tự nhiên hơn.
  const patient = await prisma.user.create({
    data: {
      name: "Nguyễn Văn An",
      email: "patient@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BENH_NHAN,
      is_active: true,
      created_at: toDate("2025-11-10T08:00:00.000Z"),
    },
  })

  const doctor = await prisma.user.create({
    data: {
      name: "BS. Trần Thị Mai",
      email: "doctor@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.BAC_SI,
      is_active: true,
      created_at: toDate("2025-10-22T02:30:00.000Z"),
    },
  })

  const family = await prisma.user.create({
    data: {
      name: "Lê Thị Hạnh",
      email: "family@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.GIA_DINH,
      is_active: true,
      created_at: toDate("2025-11-12T03:15:00.000Z"),
    },
  })

  const admin = await prisma.user.create({
    data: {
      name: "Quản trị viên hệ thống",
      email: "admin@example.com",
      password_hash: commonPasswordHash,
      role: UserRole.ADMIN,
      is_active: true,
      created_at: toDate("2025-09-01T01:00:00.000Z"),
    },
  })

  const device = await prisma.device.create({
    data: {
      user_id: patient.user_id,
      serial_number: "SN-ECG-0001",
      status: DeviceStatus.DANG_HOAT_DONG,
      created_at: toDate("2025-11-15T07:00:00.000Z"),
    },
  })

  // Seed một chuỗi reading theo thời gian để mô phỏng hành trình theo dõi thực tế nhiều tháng.
  const seededReadings = []
  const readingInputs = [
    {
      key: "reading_baseline",
      timestamp: "2025-11-18T01:20:00.000Z",
      heart_rate: 72,
      ecg_signal: [0.01, 0.02, 0.03, 0.02, 0.01, 0.0, -0.01, 0.0, 0.03, 0.07, 0.12, 0.05, -0.02, 0.01, 0.02, 0.01],
      abnormal_detected: false,
      ai_result: "Bình thường",
      ai_status: "DONE",
      ai_completed_at: "2025-11-18T01:20:08.000Z",
    },
    {
      key: "reading_stress",
      timestamp: "2025-12-06T13:45:00.000Z",
      heart_rate: 96,
      ecg_signal: [0.02, 0.03, 0.02, 0.04, 0.08, 0.14, 0.18, 0.09, 0.01, -0.03, 0.02, 0.06, 0.1, 0.04, 0.01, 0.0],
      abnormal_detected: false,
      ai_result: "Nhịp nhanh xoang nhẹ",
      ai_status: "DONE",
      ai_completed_at: "2025-12-06T13:45:09.000Z",
    },
    {
      key: "reading_pvc",
      timestamp: "2026-01-14T04:10:00.000Z",
      heart_rate: 104,
      ecg_signal: [0.01, 0.04, 0.09, 0.16, 0.07, -0.05, 0.03, 0.11, 0.19, 0.06, -0.08, 0.02, 0.13, 0.22, 0.08, -0.04],
      abnormal_detected: true,
      ai_result: "Ngoại tâm thu thất rải rác",
      ai_status: "DONE",
      ai_completed_at: "2026-01-14T04:10:10.000Z",
    },
    {
      key: "reading_followup",
      timestamp: "2026-03-22T02:25:00.000Z",
      heart_rate: 78,
      ecg_signal: [0.0, 0.01, 0.03, 0.08, 0.12, 0.05, 0.0, -0.01, 0.01, 0.05, 0.11, 0.04, 0.0, -0.02, 0.01, 0.03],
      abnormal_detected: false,
      ai_result: "Bình thường",
      ai_status: "DONE",
      ai_completed_at: "2026-03-22T02:25:06.000Z",
    },
  ]

  for (const readingInput of readingInputs) {
    const createdReading = await prisma.reading.create({
      data: {
        device_id: device.device_id,
        timestamp: toDate(readingInput.timestamp),
        heart_rate: readingInput.heart_rate,
        ecg_signal: readingInput.ecg_signal,
        abnormal_detected: readingInput.abnormal_detected,
        ai_result: readingInput.ai_result,
        ai_status: readingInput.ai_status,
        ai_completed_at: toDate(readingInput.ai_completed_at),
      },
    })

    seededReadings.push({
      key: readingInput.key,
      ...createdReading,
    })
  }

  const readingMap = Object.fromEntries(seededReadings.map((item) => [item.key, item]))

  const pvcAlert = await prisma.alert.create({
    data: {
      user_id: patient.user_id,
      reading_id: readingMap.reading_pvc.reading_id,
      alert_type: "PVC",
      message: "Phát hiện ngoại tâm thu thất rải rác. Bệnh nhân cần nghỉ ngơi, tránh chất kích thích và theo dõi thêm.",
      segment_start_sample: 120,
      segment_end_sample: 168,
      resolved: false,
      timestamp: toDate("2026-01-14T04:10:12.000Z"),
    },
  })

  await prisma.alert.createMany({
    data: [
      {
        user_id: patient.user_id,
        reading_id: readingMap.reading_stress.reading_id,
        alert_type: "TACHYCARDIA",
        message: "Nhịp tim tăng cao thoáng qua sau căng thẳng và uống cà phê, nên theo dõi thêm tại nhà.",
        segment_start_sample: 64,
        segment_end_sample: 110,
        resolved: true,
        timestamp: toDate("2025-12-06T13:45:12.000Z"),
      },
      {
        user_id: patient.user_id,
        reading_id: readingMap.reading_followup.reading_id,
        alert_type: "FOLLOW_UP",
        message: "Tín hiệu ECG lần tái khám ổn định hơn, tiếp tục duy trì lối sống hiện tại.",
        segment_start_sample: null,
        segment_end_sample: null,
        resolved: true,
        timestamp: toDate("2026-03-22T02:25:08.000Z"),
      },
    ],
  })

  await prisma.report.createMany({
    data: [
      {
        user_id: patient.user_id,
        doctor_id: doctor.user_id,
        summary: "Đợt khám tháng 01/2026 ghi nhận ngoại tâm thu thất rải rác, chưa có chỉ định nhập viện. Khuyến nghị giảm cà phê, ngủ đúng giờ và tái khám sau 2 tuần.",
        created_at: toDate("2026-01-15T03:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        doctor_id: doctor.user_id,
        summary: "Tái khám tháng 03/2026 cho thấy tần suất hồi hộp giảm rõ, Holter không ghi nhận cơn nguy hiểm kéo dài. Tiếp tục theo dõi định kỳ mỗi 3 tháng.",
        created_at: toDate("2026-03-22T04:30:00.000Z"),
      },
    ],
  })

  await prisma.chatLog.createMany({
    data: [
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Tôi hay thấy hồi hộp vào cuối buổi chiều, có cần đi cấp cứu không?",
        timestamp: toDate("2026-01-14T04:20:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Nếu chỉ hồi hộp thoáng qua và không kèm đau ngực, khó thở hay ngất thì bạn có thể nghỉ ngơi, đo lại nhịp tim và theo dõi. Nếu triệu chứng kéo dài hoặc nặng lên, hãy đi khám sớm.",
        timestamp: toDate("2026-01-14T04:20:10.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Tôi đã giảm cà phê một tuần nay, nhịp tim có vẻ ổn hơn.",
        timestamp: toDate("2026-03-22T05:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Đó là tín hiệu tích cực. Bạn nên tiếp tục ngủ đủ giấc, hạn chế chất kích thích và ghi lại thời điểm xuất hiện triệu chứng để bác sĩ dễ đánh giá khi tái khám.",
        timestamp: toDate("2026-03-22T05:00:12.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Bác sĩ có thể giải thích chi tiết hơn về tình trạng ngoại tâm thu thất rải rác của tôi không? Tôi rất lo lắng vì nghe nói có thể dẫn đến đột quỵ nếu không điều trị kịp thời. Các triệu chứng của nó là gì? Nó xuất hiện như thế nào? Tôi có cần điều trị bằng thuốc không hay chỉ cần thay đổi lối sống? Tôi có nên tránh những hoạt động nào không?",
        timestamp: toDate("2026-01-14T04:30:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Ngoại tâm thu thất rải rác (PVC - Premature Ventricular Contractions) là những nhịp tim bất thường xuất phát từ tâm thất sớm hơn so với nhịp tim bình thường. Các triệu chứng thường gặp bao gồm: cảm giác hồi hộp hoặc tim đập loạn xạ, chóng mặt thoáng qua, khó chịu ở ngực, hoặc thậm chí không có triệu chứng gì cả và chỉ được phát hiện qua các bản ghi ECG. Mức độ nguy hiểm phụ thuộc vào tần suất xuất hiện của những cơn này. Nếu chúng xuất hiện rải rác (dưới 1000 cơn/ngày) và bạn không có tiền sử bệnh tim nặng nề, thì nguy hiểm thấp hơn. Tuy nhiên, nếu tần suất tăng cao hoặc bạn có tiền sử suy tim, thì cần điều trị ngay. Trong trường hợp của bạn, việc giảm cà phê, uống đủ nước, ngủ đủ giấc và tránh stress là rất quan trọng. Bác sĩ sẽ quyết định có cần dùng thuốc hay không dựa trên các bản ghi ECG liên tục mà bạn cung cấp.",
        timestamp: toDate("2026-01-14T04:30:30.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Cảm ơn bác sĩ. Vậy những việc tôi nên tránh là gì? Chế độ ăn uống thế nào là tốt nhất? Tôi có thể tiếp tục tập thể dục bình thường không? Tôi đi bộ khoảng 30 phút mỗi sáng, và đó là thói quen mà tôi muốn duy trì. Liệu nó có làm tăng nguy hiểm không? Tôi có cần hạn chế bất kỳ loại thực phẩm nào không?",
        timestamp: toDate("2026-01-14T04:45:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Bạn nên tránh: (1) Chất kích thích như cà phê, trà đen, năng lượng, nicotine - những thứ này có thể kích thích các cơn PVC rất mạnh. (2) Rượu bia, đặc biệt là uống nhiều - có thể gây rối loạn nhịp tim. (3) Stress tâm lý - cố gắng thực hành các kỹ thuật thư giãn như yoga, thiền định hoặc tập thở sâu. (4) Thay đổi đột ngột trong hoạt động thể chất. Về chế độ ăn: ăn nhiều rau xanh, cá, đặc biệt là cá có chứa omega-3 như cá hồi, cá thu, cá trích. Hạn chế muối, chất béo bão hòa, đồ ăn nhanh. Uống đủ nước (khoảng 2-3 lít/ngày). Tránh những thực phẩm giàu cholesterol và chất béo. Về tập thể dục: 30 phút đi bộ mỗi sáng là rất tốt và không có vấn đề gì. Tuy nhiên, hãy chú ý lắng nghe cơ thể của mình. Nếu cảm thấy hồi hộp hoặc khó chịu trong lúc tập luyện, hãy dừng lại và nghỉ ngơi. Hãy tăng cường độ dần dần, không bao giờ quá sức.",
        timestamp: toDate("2026-01-14T04:45:45.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Tôi hiểu rồi. Vậy loại thuốc nào thường được dùng để điều trị PVC? Có tác dụng phụ nào không? Bác sĩ có thể coi xét cho tôi dùng gì không? Tôi sợ các loại thuốc sẽ gây ảnh hưởng đến công việc của tôi.",
        timestamp: toDate("2026-01-14T05:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Có một số loại thuốc thường được dùng điều trị PVC: (1) Beta-blockers (như metoprolol, atenolol) - giảm tần số tim, giảm tác động của hormone căng thẳng lên tim. Tác dụng phụ: mệt mỏi, tay chân lạnh, thậm chí suy giảm khả năng tình dục ở một số bệnh nhân. (2) Calcium channel blockers (như diltiazem, verapamil) - làm chậm nhịp tim bằng cách ảnh hưởng đến các kênh canxi. Tác dụng phụ: ngáp, táo bón, chóng mặt. (3) Thuốc chống loạn nhịp khác (như flecainide, sotalol) - những loại này được sử dụng khi PVC nặng hơn. Tuy nhiên, trước hết, bác sĩ sẽ muốn bạn thử thay đổi lối sống trong 2-4 tuần để xem hiệu quả. Nếu PVC vẫn tiếp tục thường xuyên sau đó, mới xem xét dùng thuốc. Hãy chờ đợi lịch tái khám với bác sĩ để thảo luận chi tiết về điều này.",
        timestamp: toDate("2026-01-14T05:00:50.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Cảm ơn bác sĩ rất nhiều. Thông tin này rất hữu ích và giúp tôi yên tâm hơn. Tôi sẽ cố gắng tuân theo những lời khuyên của bác sĩ.",
        timestamp: toDate("2026-01-14T05:15:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Không có gì. Đó là công việc của tôi. Hãy luôn ghi lại các triệu chứng, thời điểm xuất hiện và những yếu tố có thể kích thích (như cà phê, stress, thiếu ngủ). Những thông tin này sẽ rất có giá trị cho bác sĩ lâm sàng của bạn. Nếu có bất cứ câu hỏi hay lo lắng nào khác, đừng ngần ngại liên hệ lại. Chúc bạn bình an.",
        timestamp: toDate("2026-01-14T05:15:20.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Tôi muốn hỏi thêm về việc theo dõi tại nhà. Tôi cần mua máy đo huyết áp thêm hay chỉ cần theo dõi nhịp tim? Loại máy nào tốt? Máy nào có độ chính xác cao nhất?",
        timestamp: toDate("2026-02-01T10:30:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Cả hai đều tốt để theo dõi. Bạn nên có: (1) Thiết bị Holter hoặc smartwatch có khả năng ghi nhận ECG liên tục - thứ mà bạn đã có từ bệnh viện. (2) Máy đo huyết áp bắp tay tự động - loại này chính xác hơn máy đo cổ tay. Các thương hiệu uy tín gồm: Omron, Beurer, Braun. Nên chọn máy có khả năng lưu trữ dữ liệu để theo dõi xu hướng theo thời gian. (3) Một cuốn nhật ký thành nghi để ghi lại: - Thời điểm hồi hộp xuất hiện - Nhịp tim (nếu có máy đo) - Huyết áp - Những gì bạn đang làm lúc đó - Những gì bạn đã ăn/uống - Mức độ stress - Chất lượng giấc ngủ đêm hôm trước. Những dữ liệu này sẽ giúp bác sĩ nhận diện những yếu tố khích thích và điều chỉnh điều trị phù hợp.",
        timestamp: toDate("2026-02-01T10:31:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Máy đo Holter tôi vừa mua về, nhưng nó rất nặng và không thoải mái khi đeo quanh ngực. Có cách nào để mặc nó thoải mái hơn không? Liệu nó có làm ảnh hưởng đến kết quả đo lường không? Tôi lo sợ nó sẽ ghi lại các cơn hồi hộp do bất thoải mái mà gây ra chứ không phải do bệnh của tôi.",
        timestamp: toDate("2026-02-15T14:20:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Đó là lo lắng rất hợp lý. Để mặc máy Holter thoải mái hơn, bạn có thể thử: (1) Mặc một chiếc áo cotton mềm bên dưới các điện cực để bảo vệ da khỏi kích ứng. (2) Sử dụng lót bảo vệ hoặc miếng dán mỏng để phân tán áp lực. (3) Điều chỉnh vị trí các điện cực để tìm vị trí thoải mái nhất. (4) Đeo lại thiết bị ngoài áo áp lực nếu có thể, điều này sẽ giảm sự chà xát trực tiếp. Tuy nhiên, có thể bất thoải mái ban đầu là bình thường và cơ thể sẽ thích ứng sau 1-2 ngày. Về kết quả: một số cơn hồi hộp nhẹ do bất thoải mái là bình thường, nhưng máy Holter sẽ ghi lại tất cả các nhịp tim bất thường, bất kể nguyên nhân là gì. Điều quan trọng là bạn ghi nhận lại những cơn nào do bất thoải mái, để bác sĩ có thể loại trừ chúng khỏi phân tích. Hãy viết lại thời gian bất thoải mái xuất hiện trong nhật ký của bạn.",
        timestamp: toDate("2026-02-15T14:21:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Cảm ơn bác sĩ. Tôi bắt đầu cảm thấy yên tâm hơn về tình trạng của tôi. Ngoài ra, có thực phẩm hoặc thảo dược nào giúp cải thiện sức khỏe tim mạch không? Tôi nghe nói về các loại trà thảo dược, khoai lang, các loại quả, v.v.",
        timestamp: toDate("2026-03-01T08:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Có rất nhiều thực phẩm tốt cho tim mạch mà bạn có thể bổ sung vào chế độ ăn hàng ngày: (1) Cá: Cá hồi, cá thu, cá halsibut - giàu omega-3 giúp giảm viêm và hỗ trợ chức năng tim. (2) Hạt/Hạt cẩm thạch: Hạt lanh, hạt chia, hạt óc chó - cũng chứa omega-3 thực vật. (3) Trái cây: Quả bơ (giàu kalium, chất chống oxy hóa), quả mâm xôi, quả mâm xôi đen, quả nho đỏ. (4) Rau xanh: Cải xoăn, rau chân vịt, bông cải xanh - giàu canxi, magie. (5) Ngũ cốc nguyên hạt: Yến mạch, gạo lứt - giúp hạ cholesterol. (6) Gia vị: Tỏi, gừng, nghệ - có tính chống viêm mạnh mẽ. Về trà thảo dược: Trà xanh rất tốt cho tim mạch (nhưng hạn chế caffein nên chỉ uống 1-2 tách/ngày). Trà gừng ấm có tính chống viêm. Tuy nhiên, hãy thận trọng với một số trà thảo dược có thể tương tác với các loại thuốc. Hãy tham khảo ý kiến bác sĩ trước khi bổ sung bất cứ thứ gì mới.",
        timestamp: toDate("2026-03-01T08:01:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Rất cảm ơn bác sĩ! Những thông tin bạn cung cấp rất chi tiết và hữu ích. Tôi sẽ thử áp dụng những lời khuyên này vào cuộc sống hàng ngày. Chúc bạn có một ngày tốt lành!",
        timestamp: toDate("2026-03-22T09:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Tôi rất vui vì có thể giúp được bạn. Việc bạn chủ động tìm hiểu và thay đổi lối sống là bước rất quan trọng trong điều trị. Hãy nhớ rằng sức khỏe là thứ quý báu nhất, nên luôn chăm sóc nó cẩn thận. Nếu có bất cứ câu hỏi nào trong tương lai, đừng ngần ngại quay lại để trao đổi. Chúc bạn mạnh khỏe!",
        timestamp: toDate("2026-03-22T09:01:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Bác sĩ có thể cho tôi biết thêm về các bài tập thở không? Tôi nghe nói rằng thở sâu có thể giúp giảm căng thẳng và hồi hộp. Tôi nên thở như thế nào? Bao lâu thì thực hiện một lần?",
        timestamp: toDate("2026-03-25T10:15:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Bài tập thở sâu (deep breathing) là một kỹ thuật rất hiệu quả để giảm căng thẳng và hồi hộp. Đây là cách thực hiện: (1) Ngồi hoặc nằm yên trong một vị trí thoải mái. (2) Thở vào từ từ qua mũi trong 4 giây, giữ hơi trong 4 giây, sau đó thở ra từ từ qua miệng trong 4 giây. (3) Lặp lại quy trình này 10 lần, 2-3 lần mỗi ngày. (4) Thực hiện đặc biệt khi bạn cảm thấy căng thẳng hoặc có cơn hồi hộp. Ngoài ra, còn có một kỹ thuật khác gọi là 4-7-8 breathing: thở vào 4 giây, giữ 7 giây, thở ra 8 giây. Điều này giúp kích thích hệ thần kinh phó giao cảm, giúp cơ thể thư giãn. Hãy thực hiện một trong hai kỹ thuật này mỗi sáng khi thức dậy và trước khi đi ngủ.",
        timestamp: toDate("2026-03-25T10:16:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Tôi sẽ thực hiện các bài tập này. Còn việc tập yoga có giúp ích không? Tôi chưa bao giờ tập yoga trước đây, nên tôi không biết nên bắt đầu từ đâu. Có nên tập yoga nhẹ hay yoga mạnh? Bao lâu thì nên tập một lần?",
        timestamp: toDate("2026-03-25T11:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Yoga là một lựa chọn tuyệt vời để giảm căng thẳng và cải thiện sức khỏe tim mạch. Tuy nhiên, vì bạn có tình trạng PVC, tôi khuyên bạn nên bắt đầu với yoga nhẹ, tập trung vào các tư thế thư giãn chứ không phải các tư thế có cường độ cao. Các tư thế phù hợp gồm: (1) Tư thế Savasana (nằm yên) - giúp thư giãn toàn bộ cơ thể. (2) Tư thế Con mèo - giải phóng căng thẳng ở lưng và bụng. (3) Tư thế Trẻ con (Child's pose) - giúp bình tĩnh tâm trí. (4) Tư thế Chuối (Banana pose) - tạo sự cân bằng và linh hoạt. Nên tập yoga 2-3 lần mỗi tuần, mỗi buổi khoảng 20-30 phút. Hãy tránh các tư thế gập người quá sâu hoặc yêu cầu sức mạnh lớn. Nếu bạn cảm thấy hồi hộp trong lúc tập, hãy dừng lại ngay và nằm yên. Nên tham gia các lớp yoga dành cho người mới bắt đầu hoặc hãy tìm các video hướng dẫn trên YouTube để thực hiện ở nhà.",
        timestamp: toDate("2026-03-25T11:01:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.user,
        message: "Cảm ơn các lời khuyên rất quý báu. Tôi sẽ tìm các video yoga trên YouTube và bắt đầu tập. Một câu hỏi cuối cùng: liệu tình trạng của tôi sẽ khỏi hoàn toàn không? Hay tôi sẽ phải sống chung với nó trong suốt cuộc đời?",
        timestamp: toDate("2026-03-25T12:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        role: ChatRole.bot,
        message: "Đây là câu hỏi rất thực tế và phổ biến ở bệnh nhân có PVC. Câu trả lời phụ thuộc vào nguyên nhân gốc rễ của PVC của bạn. Nếu PVC liên quan đến stress, thiếu ngủ, và sử dụng chất kích thích (như trong trường hợp của bạn), thì việc điều chỉnh những yếu tố này có thể giúp giảm đáng kể hoặc thậm chí loại bỏ hoàn toàn các cơn hồi hộp. Tuy nhiên, không phải tất cả bệnh nhân đều đạt được kết quả giống nhau. Một số người có thể cần điều trị dài hạn hoặc thậm chí phải dùng thuốc suốt đời. Tuy nhiên, điều quan trọng là hiểu rằng, miễn là bạn không có tiền sử suy tim hoặc bệnh tim nặng khác, PVC thường không gây tử vong. Hầu hết bệnh nhân có thể sống một cuộc sống bình thường với PVC được kiểm soát tốt. Hãy tiếp tục theo dõi, duy trì lối sống lành mạnh, và tái khám định kỳ. Nếu triệu chứng cải thiện đáng kể sau 3-6 tháng thay đổi lối sống, thì có khả năng bạn sẽ cải thiện hơn nữa. Hãy lạc quan và kiên trì nhé.",
        timestamp: toDate("2026-03-25T12:01:00.000Z"),
      },
    ],
  })

  await prisma.accessPermission.createMany({
    data: [
      {
        patient_id: patient.user_id,
        viewer_id: doctor.user_id,
        role: AccessRole.BAC_SI,
        status: AccessStatus.accepted,
        created_at: toDate("2025-11-16T08:00:00.000Z"),
      },
      {
        patient_id: patient.user_id,
        viewer_id: family.user_id,
        role: AccessRole.GIA_DINH,
        status: AccessStatus.accepted,
        created_at: toDate("2025-11-17T08:30:00.000Z"),
      },
    ],
  })

  const conversationKey = buildConversationKey(patient.user_id, doctor.user_id)
  await prisma.directMessage.createMany({
    data: [
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Bác sĩ ơi, tối qua em lại có cơn hồi hộp khoảng 7 phút sau khi làm việc khuya.",
        is_read: true,
        created_at: toDate("2026-01-14T04:40:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Em nghỉ ngơi, tránh cà phê hôm nay và đo lại nhịp tim lúc ngồi yên. Nếu có đau ngực hoặc khó thở thì đi khám ngay.",
        is_read: true,
        created_at: toDate("2026-01-14T04:48:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Kết quả tái khám hôm nay ổn hơn nhiều. Em tiếp tục giữ nếp sinh hoạt hiện tại và nhắn lại nếu triệu chứng tăng lên nhé.",
        is_read: false,
        created_at: toDate("2026-03-22T05:10:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Bác sĩ ơi, em muốn hỏi kỹ hơn vì em hay bị hồi hộp vào ban đêm. Cảm giác đó kéo dài khoảng 10 đến 15 phút, có lúc kèm mệt nhẹ và khó ngủ. Em cần theo dõi gì trong những lần tới để biết nó nguy hiểm hay chỉ là do căng thẳng?",
        is_read: true,
        created_at: toDate("2026-03-26T14:05:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Em nên ghi lại 4 thứ: thời điểm xuất hiện, hoàn cảnh lúc đó, triệu chứng đi kèm, và nhịp tim nếu đo được. Nếu chỉ hồi hộp thoáng qua, không đau ngực, không khó thở, không ngất thì thường chưa phải dấu hiệu nguy hiểm ngay. Nhưng nếu triệu chứng kéo dài hơn, xuất hiện liên tục hoặc làm em choáng váng, em cần đi khám sớm để kiểm tra thêm.",
        is_read: true,
        created_at: toDate("2026-03-26T14:10:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em có để ý là những hôm ngủ dưới 6 tiếng thì tình trạng nặng hơn rất rõ. Vậy thiếu ngủ có thể là nguyên nhân chính không? Em làm văn phòng, nhiều hôm phải họp muộn nên rất khó ngủ sớm.",
        is_read: true,
        created_at: toDate("2026-03-26T20:15:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Thiếu ngủ là một yếu tố kích hoạt rất thường gặp. Khi cơ thể mệt, hệ thần kinh giao cảm hoạt động mạnh hơn, tim dễ đập nhanh và dễ xuất hiện cảm giác hồi hộp. Em nên cố gắng tạo khung giờ ngủ cố định, giảm màn hình trước khi ngủ, và nếu phải họp muộn thì hãy bù bằng một khoảng nghỉ ngắn ban ngày thay vì kéo dài thức khuya liên tục.",
        is_read: true,
        created_at: toDate("2026-03-26T20:18:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em đang dùng đồng hồ thông minh để đo nhịp tim. Có cần gửi log cho bác sĩ mỗi tuần không, hay chỉ khi nào em thấy bất thường mới gửi? Em muốn theo dõi cho kỹ vì sợ bỏ sót cơn nào đó.",
        is_read: true,
        created_at: toDate("2026-03-27T08:30:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Nếu em có log, tốt nhất là gửi định kỳ mỗi tuần một lần để bác sĩ nhìn được xu hướng. Còn nếu xuất hiện cơn hồi hộp kéo dài, đau ngực, khó thở, hoặc cảm giác sắp ngất thì phải báo ngay trong ngày. Dữ liệu đều đặn sẽ giúp bác sĩ phân biệt được các cơn thoáng qua với vấn đề thực sự cần can thiệp.",
        is_read: true,
        created_at: toDate("2026-03-27T08:33:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em cũng muốn hỏi về việc uống nước. Em đọc trên mạng thấy có người bảo uống ít quá làm tim đập nhanh hơn. Điều đó có đúng với trường hợp của em không?",
        is_read: true,
        created_at: toDate("2026-03-28T06:45:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Đúng, mất nước có thể làm nhịp tim tăng và khiến em cảm giác hồi hộp hơn. Em nên uống nước đều trong ngày, không đợi khát mới uống. Với người trưởng thành bình thường, mục tiêu thực tế là chia đều nước trong ngày và tăng thêm khi trời nóng, vận động nhiều, hoặc khi uống cà phê. Em không cần ép uống quá nhiều một lúc, chỉ cần duy trì đều đặn.",
        is_read: true,
        created_at: toDate("2026-03-28T06:48:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Vậy nếu em vẫn còn hồi hộp nhưng không đau ngực thì em có thể tiếp tục đi bộ 30 phút mỗi sáng không? Em sợ tập thể dục làm tim em mệt hơn, nhưng nếu không vận động thì em lại thấy khó chịu và stress nhiều hơn.",
        is_read: true,
        created_at: toDate("2026-03-29T05:20:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Đi bộ 30 phút mỗi sáng là lựa chọn tốt, miễn là em thấy dễ chịu. Điều quan trọng là giữ mức vận động vừa phải, không cố gắng quá sức, và dừng lại nếu có đau ngực, khó thở, hoặc chóng mặt. Với tình trạng của em, vận động nhẹ đều đặn thường có lợi hơn là ngồi yên quá lâu.",
        is_read: true,
        created_at: toDate("2026-03-29T05:24:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em muốn lưu lại một danh sách triệu chứng để theo dõi lâu dài. Em nên ghi những gì vào sổ tay hoặc điện thoại thì hợp lý nhất? Em lo là mình ghi quá ít sẽ thiếu thông tin, mà ghi quá nhiều thì lại không dùng được.",
        is_read: true,
        created_at: toDate("2026-03-30T13:10:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Em chỉ cần ghi ngắn gọn nhưng đủ ý: thời gian xảy ra, em đang làm gì, có uống cà phê/rượu/trà không, ngủ bao nhiêu tiếng, cảm giác gì đi kèm, và kéo dài bao lâu. Nếu có số đo nhịp tim hoặc huyết áp thì thêm vào. Một danh sách nhất quán, dễ đọc sẽ hữu ích hơn là ghi quá dài và lộn xộn.",
        is_read: true,
        created_at: toDate("2026-03-30T13:15:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em hiểu rồi. Em sẽ ghi lại đều hơn và giữ lịch sinh hoạt ổn định. Nếu sau 2 tuần mà em vẫn còn cảm giác tim đập nhanh vào tối muộn thì em nên đặt lịch khám sớm lại đúng không ạ?",
        is_read: true,
        created_at: toDate("2026-04-01T07:40:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Đúng rồi, nếu sau 2 tuần triệu chứng vẫn lặp lại thường xuyên hoặc nặng hơn thì em nên đặt lịch sớm. Còn nếu tần suất giảm dần và em cảm thấy ổn hơn thì cứ tiếp tục theo dõi, duy trì lối sống hiện tại và báo bác sĩ trong lần tái khám tiếp theo.",
        is_read: false,
        created_at: toDate("2026-04-01T07:45:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em muốn hỏi thêm về cà phê vì công việc của em hay phải thức khuya và cần tỉnh táo. Nếu em giảm dần thay vì dừng hẳn thì có ổn không, hay em nên ngưng hoàn toàn trong bao lâu để xem tim có bớt hồi hộp không?",
        is_read: true,
        created_at: toDate("2026-04-02T08:15:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Giảm dần thường dễ duy trì hơn là ngưng đột ngột. Em có thể bắt đầu bằng cách giảm 1/2 lượng cà phê trong vài ngày, sau đó chuyển sang loại ít caffein hơn hoặc chỉ uống vào buổi sáng. Nếu muốn kiểm tra xem cà phê có phải yếu tố kích hoạt chính hay không, em nên thử ngưng hoàn toàn trong 2 tuần và ghi lại xem triệu chứng thay đổi thế nào.",
        is_read: true,
        created_at: toDate("2026-04-02T08:19:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em làm việc trên máy tính gần như cả ngày nên cổ và vai rất căng. Em thấy mỗi lần ngồi lâu là ngực cũng khó chịu hơn. Điều đó có liên quan đến tình trạng tim của em không hay chỉ là do tư thế xấu?",
        is_read: true,
        created_at: toDate("2026-04-03T09:05:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Tư thế ngồi xấu và căng cơ vùng cổ vai lưng có thể làm em thấy khó chịu nhiều hơn, khiến em để ý tới tim mạnh hơn và cảm giác hồi hộp cũng dễ bị phóng đại. Nó không trực tiếp gây bệnh tim, nhưng có thể làm triệu chứng cảm nhận rõ hơn. Em nên đứng dậy giãn cơ mỗi 45 đến 60 phút, chỉnh ghế làm việc và giữ màn hình ngang tầm mắt để giảm căng thẳng toàn thân.",
        is_read: true,
        created_at: toDate("2026-04-03T09:09:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em đang phân vân có nên tập thiền hay không vì trước giờ em chưa quen ngồi yên lâu. Nếu chỉ có 5 đến 10 phút mỗi ngày thì có đủ để hỗ trợ giảm stress không?",
        is_read: true,
        created_at: toDate("2026-04-04T07:20:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Có, 5 đến 10 phút mỗi ngày là đã có ích rồi nếu em làm đều. Thiền không cần phải kéo dài mới có hiệu quả; điều quan trọng là tính nhất quán. Em có thể ngồi yên, tập trung vào nhịp thở, hoặc dùng các bài hướng dẫn ngắn. Mục tiêu là làm cơ thể hạ nhịp căng thẳng chứ không phải ép bản thân phải ‘trống rỗng’ ngay từ đầu.",
        is_read: true,
        created_at: toDate("2026-04-04T07:24:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Nếu một hôm em thấy tim đập nhanh hơn bình thường, em có nên tự đo huyết áp liên tục không? Hay việc đo quá nhiều cũng làm em lo hơn và khiến chỉ số xấu đi?",
        is_read: true,
        created_at: toDate("2026-04-05T13:00:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Đo quá nhiều trong lúc lo lắng có thể khiến em căng hơn và chỉ số khó ổn định. Khi em thấy tim đập nhanh, hãy ngồi yên vài phút, thở chậm rồi đo một lần. Nếu kết quả vẫn cao bất thường hoặc kèm triệu chứng đáng ngại thì mới cần lặp lại và liên hệ bác sĩ. Đừng đo liên tục nhiều lần trong vài phút vì điều đó thường làm tăng lo âu.",
        is_read: true,
        created_at: toDate("2026-04-05T13:04:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em muốn hỏi thêm về thực phẩm chức năng vì bạn em giới thiệu rất nhiều loại như omega-3, magie, vitamin B, CoQ10. Em có nên tự mua thử không hay phải hỏi bác sĩ trước?",
        is_read: true,
        created_at: toDate("2026-04-06T08:40:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Em không nên tự dùng quá nhiều loại cùng lúc. Một số chất bổ sung có thể hữu ích, nhưng cũng có thể làm em chủ quan hoặc tương tác với thuốc khác. Nếu muốn dùng, em nên chọn một thứ cần thiết nhất, ví dụ magie nếu bác sĩ đã gợi ý, và dùng theo liều rõ ràng. Các loại như omega-3 hay CoQ10 có thể cân nhắc sau khi bác sĩ xem xét toàn bộ tình trạng của em.",
        is_read: true,
        created_at: toDate("2026-04-06T08:44:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Gần đây em có cảm giác lo âu trước khi ngủ, dù ban ngày khá ổn. Em nên làm gì để không cứ nằm xuống là nghĩ tới nhịp tim nữa? Cảm giác đó làm em ngủ muộn hơn rất nhiều.",
        is_read: true,
        created_at: toDate("2026-04-07T21:10:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Em nên tạo một chuỗi thói quen trước khi ngủ: tắt màn hình sớm, giảm ánh sáng phòng, không xem lại số đo tim ngay trước khi lên giường, và dùng 5 phút thở chậm hoặc nghe âm thanh thư giãn. Nếu tâm trí vẫn quay vòng, em có thể viết ra những điều đang lo rồi để đó, sáng hôm sau mới xem lại. Mục tiêu là tách thời gian nghỉ ngơi khỏi việc theo dõi bệnh.",
        is_read: true,
        created_at: toDate("2026-04-07T21:14:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Nếu em đi công tác xa vài ngày thì có cần mang theo máy đo nhịp tim không? Em sợ thay đổi lịch sinh hoạt, ăn uống và giấc ngủ sẽ khiến tình trạng của em tệ hơn khi đi xa.",
        is_read: true,
        created_at: toDate("2026-04-08T10:20:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Nếu em đã quen dùng thiết bị thì mang theo là tốt, nhất là khi đi công tác dài ngày. Nhưng đừng biến chuyến đi thành một đợt kiểm tra liên tục. Em chỉ cần duy trì sinh hoạt tương đối ổn định, mang theo thuốc hoặc thực phẩm bổ sung nếu có, và lưu số liên hệ bác sĩ để báo khi có triệu chứng khác thường. Đi xa vài ngày không phải vấn đề lớn nếu em vẫn giữ thói quen nghỉ ngơi và uống nước đều.",
        is_read: true,
        created_at: toDate("2026-04-08T10:24:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em thấy có hôm tim đập nhanh nhưng khi đo lại thì số đo vẫn bình thường. Vậy có phải cảm giác chủ quan của em đang phóng đại không, hay máy đo có thể bỏ sót cơn ngắn?",
        is_read: true,
        created_at: toDate("2026-04-09T16:30:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Cả hai đều có thể xảy ra. Có những cơn rất ngắn nên khi em đo lại thì đã hết, và cũng có lúc cảm giác hồi hộp đến từ căng thẳng chứ không phải rối loạn nhịp rõ ràng. Vì vậy, bác sĩ thường cần cả nhật ký triệu chứng lẫn dữ liệu thiết bị. Em đừng quá phụ thuộc vào một lần đo duy nhất; hãy xem nó như một phần của bức tranh lớn hơn.",
        is_read: true,
        created_at: toDate("2026-04-09T16:34:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em có nên hạn chế xem tin tức hay nội dung căng thẳng trên mạng không? Dạo này em thấy chỉ cần lướt vài phút là đầu óc đã căng và tim cũng khó chịu hơn.",
        is_read: true,
        created_at: toDate("2026-04-10T11:00:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Nên hạn chế. Nội dung căng thẳng, tranh luận quá nhiều hoặc đọc tin liên tục trước giờ ngủ đều có thể làm hệ thần kinh bị kích thích. Em có thể đặt giới hạn thời gian dùng mạng xã hội, chọn khung giờ cụ thể để xem tin, và tránh đọc nội dung gây căng thẳng vào buổi tối. Đây là cách đơn giản nhưng rất có ích cho giấc ngủ và nhịp tim.",
        is_read: true,
        created_at: toDate("2026-04-10T11:04:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Bác sĩ cho em hỏi thật là nếu em làm tốt mọi thứ thì bao lâu mới có thể thấy cải thiện rõ? Em muốn có mốc thời gian để biết mình đang đi đúng hướng chứ không bị sốt ruột mỗi ngày.",
        is_read: true,
        created_at: toDate("2026-04-11T09:45:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Nhiều người bắt đầu thấy đỡ hơn trong vài tuần nếu kiểm soát được cà phê, thiếu ngủ và stress. Tuy nhiên, một số người cần vài tháng để cơ thể ổn định hoàn toàn. Điều quan trọng là xu hướng phải đi xuống dần: cơn ít hơn, ngắn hơn, và ít làm em lo hơn. Nếu em thấy điều đó, nghĩa là hướng đi hiện tại đang phù hợp.",
        is_read: true,
        created_at: toDate("2026-04-11T09:49:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: patient.user_id,
        receiver_id: doctor.user_id,
        message: "Em cảm ơn bác sĩ. Em sẽ ghi lại kỹ hơn, giữ lịch ngủ ổn định và giảm cà phê từ từ. Nếu có cơn nào kéo dài hoặc khác thường, em sẽ báo ngay. Em chỉ mong có thể sinh hoạt bình thường trở lại mà không phải lo quá nhiều.",
        is_read: true,
        created_at: toDate("2026-04-12T20:05:00.000Z"),
      },
      {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
        message: "Em đang làm đúng hướng rồi. Mục tiêu không phải là theo dõi từng nhịp tim một cách ám ảnh, mà là hiểu điều gì làm triệu chứng tăng lên và giảm nó xuống bằng những thay đổi thực tế. Cứ giữ nhịp sống đều, báo lại khi có dấu hiệu mới, và đừng ngần ngại hỏi nếu em thấy mình bị quá lo lắng về bệnh.",
        is_read: false,
        created_at: toDate("2026-04-12T20:09:00.000Z"),
      },
    ],
  })

  const latestDirectMessage = await prisma.directMessage.findFirst({
    where: {
      conversation_key: conversationKey,
      sender_id: doctor.user_id,
      receiver_id: patient.user_id,
    },
    orderBy: { created_at: "desc" },
  })

  const alertNotification = await prisma.notification.create({
    data: {
      type: NotificationType.ALERT,
      title: "Cảnh báo ECG",
      message: "Phát hiện ngoại tâm thu thất rải rác trên bản ghi ngày 14/01/2026.",
      actor_id: doctor.user_id,
      entity_type: "alert",
      entity_id: pvcAlert.alert_id,
      payload: {
        user_id: patient.user_id,
        reading_id: readingMap.reading_pvc.reading_id,
        ai_result_summary: "Ngoại tâm thu thất rải rác",
      },
      created_at: toDate("2026-01-14T04:12:00.000Z"),
    },
  })

  const messageNotification = await prisma.notification.create({
    data: {
      type: NotificationType.DIRECT_MESSAGE,
      title: "Tin nhắn mới",
      message: latestDirectMessage?.message || "Bác sĩ vừa gửi tin nhắn mới.",
      actor_id: doctor.user_id,
      entity_type: "direct_message",
      entity_id: latestDirectMessage?.message_id || null,
      payload: {
        conversation_key: conversationKey,
        sender_id: doctor.user_id,
        receiver_id: patient.user_id,
      },
      created_at: toDate("2026-03-22T05:10:05.000Z"),
    },
  })

  await prisma.notificationRecipient.createMany({
    data: [
      {
        notification_id: alertNotification.notification_id,
        user_id: patient.user_id,
        is_read: false,
        created_at: toDate("2026-01-14T04:12:00.000Z"),
      },
      {
        notification_id: alertNotification.notification_id,
        user_id: doctor.user_id,
        is_read: true,
        read_at: toDate("2026-01-14T04:20:00.000Z"),
        created_at: toDate("2026-01-14T04:12:00.000Z"),
      },
      {
        notification_id: alertNotification.notification_id,
        user_id: family.user_id,
        is_read: false,
        created_at: toDate("2026-01-14T04:12:00.000Z"),
      },
      {
        notification_id: messageNotification.notification_id,
        user_id: patient.user_id,
        is_read: false,
        created_at: toDate("2026-03-22T05:10:05.000Z"),
      },
    ],
  })

  // Hồ sơ khám chữa bệnh được seed theo dòng thời gian để tạo cảm giác theo dõi thật.
  await prisma.medicalVisit.createMany({
    data: [
      {
        user_id: patient.user_id,
        doctor_id: null,
        facility: "Theo dõi tại nhà",
        doctor_name: null,
        visit_date: toDate("2025-11-18T02:00:00.000Z"),
        diagnosis: "Nhịp nhanh xoang nhẹ sau gắng sức",
        reason: "Hồi hộp sau khi leo cầu thang 4 tầng, tim đập nhanh khoảng 5 đến 7 phút rồi tự giảm.",
        diagnosis_details: "Triệu chứng mức độ nhẹ, xuất hiện không thường xuyên, chưa kèm đau ngực hoặc ngất.",
        tests: [
          {
            name: "ECG Holter",
            imageUrl: "https://placehold.co/1200x800/e0f2fe/0f172a?text=ECG+Holter+18-11-2025",
            doctorComment: "AI ghi nhận nhịp nhanh xoang nhẹ, chưa thấy dấu hiệu nguy hiểm tức thời.",
          },
          {
            name: "Chụp X-quang ngực",
            imageUrl: "https://placehold.co/1200x800/f8fafc/334155?text=X-quang+nguc",
            doctorComment: "Phim chụp chưa ghi nhận bất thường cấp tính ở tim phổi.",
          },
        ],
        prescription: [{ name: "Theo dõi không dùng thuốc", dosage: "Uống đủ nước, hạn chế cà phê, nghỉ ngơi sớm." }],
        advice: "Tiếp tục ghi lại thời điểm xuất hiện triệu chứng và nhịp tim đo được.",
        appointment: "Tái đánh giá nếu triệu chứng tăng hoặc kéo dài.",
        created_at: toDate("2025-11-18T02:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        doctor_id: null,
        facility: "Theo dõi tại nhà",
        doctor_name: null,
        visit_date: toDate("2025-12-06T14:10:00.000Z"),
        diagnosis: "Nhịp nhanh xoang thoáng qua",
        reason: "Đánh trống ngực sau khi uống 2 ly cà phê, cảm giác bồn chồn, khó tập trung vào cuối buổi chiều.",
        diagnosis_details: "Liên quan nhiều đến chất kích thích và thiếu ngủ, tần suất tăng nhẹ trong giai đoạn áp lực công việc cao.",
        tests: [
          {
            name: "ECG Holter",
            imageUrl: "https://placehold.co/1200x800/fef3c7/92400e?text=ECG+Holter+06-12-2025",
            doctorComment: "AI tiếp tục ghi nhận cơn nhịp nhanh xoang thoáng qua.",
          },
        ],
        prescription: [{ name: "Theo dõi không dùng thuốc", dosage: "Tạm ngưng cà phê sau 15 giờ, tăng thời gian nghỉ giữa giờ làm việc." }],
        advice: "Ngồi nghỉ, tập thở chậm khi có cơn; theo dõi thêm tại nhà.",
        appointment: "Khám chuyên khoa nếu xuất hiện đau ngực, khó thở hoặc choáng.",
        created_at: toDate("2025-12-06T14:10:00.000Z"),
      },
      {
        user_id: patient.user_id,
        doctor_id: doctor.user_id,
        facility: "Phòng khám Tim mạch Ironman",
        doctor_name: doctor.name,
        visit_date: toDate("2026-01-15T02:30:00.000Z"),
        diagnosis: "Nhịp nhanh xoang từng cơn kèm ngoại tâm thu thất rải rác",
        reason: "Hồi hộp rõ hơn vào ban đêm, đôi lúc cảm giác hẫng nhịp, mất ngủ sau các hôm làm việc muộn.",
        diagnosis_details: "Nhiều khả năng liên quan căng thẳng kéo dài và sử dụng chất kích thích. Hiện chưa cần nhập viện hay dùng thuốc chống loạn nhịp.",
        tests: [
          {
            name: "Holter ECG",
            imageUrl: "https://placehold.co/1200x800/fee2e2/991b1b?text=Holter+ECG+15-01-2026",
            doctorComment: "Ngoại tâm thu thất rải rác, chưa ghi nhận cơn nguy hiểm kéo dài.",
          },
          {
            name: "Xét nghiệm điện giải đồ",
            imageUrl: "https://placehold.co/1200x800/ecfdf5/065f46?text=Dien+giai+do",
            doctorComment: "Kali và magie trong giới hạn tham chiếu, chưa gợi ý rối loạn điện giải.",
          },
        ],
        prescription: [{ name: "Magie B6", dosage: "Buổi tối trong 14 ngày" }],
        advice: "Hạn chế cà phê, nước tăng lực và rượu bia; tập thở chậm 2 lần mỗi ngày.",
        appointment: "Tái khám sau 2 tuần hoặc sớm hơn nếu xuất hiện đau ngực, khó thở, choáng váng.",
        created_at: toDate("2026-01-15T02:30:00.000Z"),
      },
      {
        user_id: patient.user_id,
        doctor_id: null,
        facility: "Theo dõi tại nhà",
        doctor_name: null,
        visit_date: toDate("2026-02-02T12:00:00.000Z"),
        diagnosis: "Cải thiện sau thay đổi lối sống",
        reason: "Thi thoảng còn hồi hộp ngắn dưới 2 phút khi thức khuya, nhìn chung đỡ hơn trước.",
        diagnosis_details: "AI không ghi nhận thêm bất thường nguy hiểm trong tuần theo dõi gần nhất.",
        tests: [
          {
            name: "Theo dõi ECG",
            imageUrl: "https://placehold.co/1200x800/e0f2fe/075985?text=Theo+doi+ECG+02-02-2026",
            doctorComment: "Không ghi nhận bất thường nguy hiểm mới.",
          },
        ],
        prescription: [{ name: "Magie B6", dosage: "Duy trì theo hướng dẫn" }],
        advice: "Ngủ trước 23 giờ, đi bộ nhẹ 20 phút mỗi ngày.",
        appointment: "Tiếp tục theo lịch tái khám đã hẹn.",
        created_at: toDate("2026-02-02T12:00:00.000Z"),
      },
      {
        user_id: patient.user_id,
        doctor_id: doctor.user_id,
        facility: "Phòng khám Tim mạch Ironman",
        doctor_name: doctor.name,
        visit_date: toDate("2026-03-22T04:45:00.000Z"),
        diagnosis: "Ổn định sau thay đổi lối sống",
        reason: "Chỉ còn hồi hộp nhẹ khi căng thẳng kéo dài, không đau ngực, không khó thở, không giới hạn vận động thường ngày.",
        diagnosis_details: "Tái khám cho thấy đáp ứng tốt với thay đổi lối sống, Holter lần gần nhất ổn định hơn, chưa ghi nhận cơn nguy hiểm kéo dài.",
        tests: [
          {
            name: "Holter ECG",
            imageUrl: "https://placehold.co/1200x800/dcfce7/166534?text=Holter+ECG+22-03-2026",
            doctorComment: "Ổn định hơn, chưa ghi nhận cơn nguy hiểm kéo dài.",
          },
        ],
        prescription: [{ name: "Magie B6", dosage: "Ngưng sau đợt hiện tại nếu không còn triệu chứng" }],
        advice: "Tiếp tục hạn chế chất kích thích và duy trì vận động vừa phải.",
        appointment: "Tái khám định kỳ sau 3 tháng hoặc sớm hơn nếu triệu chứng quay lại dày hơn.",
        created_at: toDate("2026-03-22T04:45:00.000Z"),
      },
    ],
  })

  await prisma.medicationPlan.create({
    data: {
      user_id: patient.user_id,
      doctor_id: doctor.user_id,
      title: "Đợt hỗ trợ giảm hồi hộp sau khám tháng 01/2026",
      start_date: toDate("2026-01-15T00:00:00.000Z"),
      end_date: toDate("2026-01-29T00:00:00.000Z"),
      notes: "Theo dõi đáp ứng, ngưng và tái khám sớm nếu có triệu chứng bất thường.",
      is_active: false,
      medications: {
        create: [
          {
            name: "Magie B6",
            dosage: "1 viên",
            times: ["Buổi tối sau ăn"],
            type: "Khoáng chất bổ sung",
            description: "Hỗ trợ giảm hồi hộp liên quan căng thẳng và thiếu ngủ.",
          },
        ],
      },
    },
  })

  await prisma.medicationPlan.create({
    data: {
      user_id: patient.user_id,
      doctor_id: doctor.user_id,
      title: "Duy trì lối sống và theo dõi sau tái khám",
      start_date: toDate("2026-03-22T00:00:00.000Z"),
      end_date: null,
      notes: "Không có thuốc chống loạn nhịp thường quy; ưu tiên theo dõi triệu chứng và điều chỉnh lối sống.",
      is_active: true,
      medications: {
        create: [
          {
            name: "Magie B6",
            dosage: "1 viên",
            times: ["Buổi tối sau ăn", "Dừng sau đợt hiện tại nếu không còn triệu chứng"],
            type: "Khoáng chất bổ sung",
            description: "Duy trì ngắn hạn theo hướng dẫn bác sĩ.",
          },
        ],
      },
    },
  })

  console.log(
    "Seed thành công: 4 người dùng, 1 thiết bị, 4 reading, 3 alert, 2 report, 4 chat AI, 2 quyền truy cập, 3 direct message, 2 notification, 5 lần khám và 2 kế hoạch thuốc."
  )
  console.log(
    `Tài khoản mẫu: ${patient.email}, ${doctor.email}, ${family.email}, ${admin.email} | mật khẩu chung: 123456`
  )
}

main()
  .catch((error) => {
    console.error("Seed lỗi:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
