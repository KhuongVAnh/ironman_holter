/**
 * Chuỗi hiển thị cho vai trò người dùng (backend trả về tiếng Việt)
 */
export const ROLE = {
  BENH_NHAN: 'bệnh nhân',
  BAC_SI: 'bác sĩ',
  GIA_DINH: 'gia đình',
  ADMIN: 'admin',
}

/** Nhãn vai trò dùng trong form/UI */
export const ROLE_LABELS = {
  [ROLE.BENH_NHAN]: 'Bệnh nhân',
  [ROLE.BAC_SI]: 'Bác sĩ',
  [ROLE.GIA_DINH]: 'Gia đình',
  [ROLE.ADMIN]: 'Admin',
}

/** Cấu hình badge cho từng vai trò */
export const ROLE_BADGE = {
  [ROLE.BENH_NHAN]: { class: 'bg-blue-600', icon: 'fas fa-user' },
  [ROLE.BAC_SI]: { class: 'bg-green-600', icon: 'fas fa-user-md' },
  [ROLE.GIA_DINH]: { class: 'bg-cyan-600', icon: 'fas fa-users' },
  [ROLE.ADMIN]: { class: 'bg-red-600', icon: 'fas fa-user-shield' },
}

/** Vai trò quyền truy cập (Access) */
export const ACCESS_ROLE = {
  BAC_SI: 'bác sĩ',
  GIA_DINH: 'gia đình',
}

export const ACCESS_ROLE_LABELS = {
  [ACCESS_ROLE.BAC_SI]: 'Bác sĩ',
  [ACCESS_ROLE.GIA_DINH]: 'Gia đình',
}

/** Trạng thái quyền truy cập */
export const ACCESS_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
}

export const ACCESS_STATUS_LABELS = {
  [ACCESS_STATUS.PENDING]: 'Chờ xử lý',
  [ACCESS_STATUS.ACCEPTED]: 'Đã chấp nhận',
  [ACCESS_STATUS.REJECTED]: 'Từ chối',
}

/** Trạng thái thiết bị */
export const DEVICE_STATUS = {
  DANG_HOAT_DONG: 'đang hoạt động',
  NGUNG_HOAT_DONG: 'ngừng hoạt động',
}

/** Đường dẫn dashboard theo vai trò */
export const getDashboardPath = (role) => {
  if (role === ROLE.BAC_SI) return '/doctor/dashboard'
  if (role === ROLE.GIA_DINH) return '/family/dashboard'
  if (role === ROLE.ADMIN) return '/admin/dashboard'
  return '/dashboard'
}

/** Loại cảnh báo ECG */
export const ALERT_TYPE = {
  NHIP_NHANH: 'nhịp nhanh',
  NHIP_CHAM: 'nhịp chậm',
  RUNG_NHI: 'rung nhĩ',
  NGOAI_TAM_THU: 'ngoại tâm thu',
  BINH_THUONG: 'bình thường',
  NORMAL: 'normal',
}
