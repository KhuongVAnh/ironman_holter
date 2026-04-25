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
