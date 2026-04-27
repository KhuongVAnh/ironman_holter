"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "react-toastify"
import { usersApi } from "../../services/api"
import { ROLE, ROLE_BADGE } from "../../services/string"
import PaginationBar from "../shared/PaginationBar"

const ITEMS_PER_PAGE = 10

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "",
    is_active: true,
  })

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, roleFilter, statusFilter])

  const filteredUsers = useMemo(() => {
    let filtered = users

    if (searchTerm) {
      const keyword = searchTerm.toLowerCase()
      filtered = filtered.filter((user) => user.name.toLowerCase().includes(keyword) || user.email.toLowerCase().includes(keyword))
    }

    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => (statusFilter === "active" ? user.is_active : !user.is_active))
    }

    return filtered
  }, [users, searchTerm, roleFilter, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE))
  const paginatedUsers = useMemo(
    () => filteredUsers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [filteredUsers, currentPage]
  )

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await usersApi.getAll({ limit: 1000, offset: 0 })
      setUsers(response.data.users)
    } catch (error) {
      console.error("Lỗi lấy danh sách người dùng:", error)
      toast.error("Không thể tải danh sách người dùng")
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (user) => {
    setEditingUser(user)
    setEditForm({
      name: user.name,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
    })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    try {
      await usersApi.update(editingUser.user_id, editForm)
      toast.success("Cập nhật người dùng thành công")
      setEditingUser(null)
      fetchUsers()
    } catch (error) {
      console.error("Lỗi cập nhật người dùng:", error)
      toast.error(error.response?.data?.message || "Không thể cập nhật người dùng")
    }
  }

  const handleDelete = async (userId, userName) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa người dùng "${userName}"?`)) {
      try {
        await usersApi.delete(userId)
        toast.success("Xóa người dùng thành công")
        fetchUsers()
      } catch (error) {
        console.error("Lỗi xóa người dùng:", error)
        toast.error(error.response?.data?.message || "Không thể xóa người dùng")
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("vi-VN")
  }

  const getRoleBadge = (role) => {
    const config = ROLE_BADGE[role] || ROLE_BADGE[ROLE.BENH_NHAN]

    return (
      <span className={`badge ${config.class}`}>
        <i className={`${config.icon} me-1`}></i>
        {role}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="page-shell">
        <div className="empty-state-rich">
          <div className="empty-state-rich-icon info"><i className="fas fa-spinner fa-spin"></i></div>
          <h3>Đang tải người dùng</h3>
          <p>Hệ thống đang lấy danh sách tài khoản.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <div className="page-hero-icon"><i className="fas fa-users-cog"></i></div>
        <div className="min-w-0 flex-1">
          <p className="panel-eyebrow">User operations</p>
          <h1 className="page-hero-title">Quản lý người dùng</h1>
          <p className="page-hero-subtitle">Theo dõi vai trò, trạng thái tài khoản và thao tác nhanh với từng người dùng.</p>
        </div>
        <button className="btn btn-outline-primary" onClick={fetchUsers}>
          <i className="fas fa-sync-alt me-1"></i>
          Làm mới
        </button>
      </section>

      <section className="metric-grid">
        <div className="priority-metric metric-info"><div className="metric-icon"><i className="fas fa-users"></i></div><p className="metric-label">Tổng tài khoản</p><p className="metric-value">{users.length}</p><p className="metric-helper">Toàn bộ người dùng</p></div>
        <div className="priority-metric metric-success"><div className="metric-icon"><i className="fas fa-user-check"></i></div><p className="metric-label">Đang hoạt động</p><p className="metric-value">{users.filter((item) => item.is_active).length}</p><p className="metric-helper">Có thể đăng nhập</p></div>
        <div className="priority-metric metric-warning"><div className="metric-icon"><i className="fas fa-filter"></i></div><p className="metric-label">Kết quả lọc</p><p className="metric-value">{filteredUsers.length}</p><p className="metric-helper">Theo bộ lọc hiện tại</p></div>
      </section>

      {/* Filters */}
      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header"><div><h2 className="section-title">Bộ lọc tài khoản</h2><p className="section-subtitle">Tìm theo tên/email, vai trò và trạng thái.</p></div></div>
        <div className="clinical-panel-body grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div className="relative">
            <i className="fas fa-search absolute left-4 top-1/2 -translate-y-1/2 text-ink-400"></i>
            <input
              type="text"
              className="form-control pl-11"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value={ROLE.BENH_NHAN}>Bệnh nhân</option>
            <option value={ROLE.BAC_SI}>Bác sĩ</option>
            <option value={ROLE.GIA_DINH}>Gia đình</option>
            <option value={ROLE.ADMIN}>Admin</option>
          </select>
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngưng hoạt động</option>
          </select>
        </div>
      </section>

      {/* Users Table */}
      <section className="clinical-panel overflow-hidden">
        <div className="clinical-panel-header"><div><h2 className="section-title">Danh sách người dùng</h2><p className="section-subtitle">Chip màu thể hiện vai trò và trạng thái tài khoản.</p></div></div>
        <div className="clinical-panel-body">
          {paginatedUsers.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Người dùng</th>
                    <th>Email</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Ngày tạo</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((user) => (
                    <tr key={user.user_id}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="avatar-circle bg-primary text-white me-3">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h6 className="mb-0">{user.name}</h6>
                            <small className="text-muted">ID: {user.user_id}</small>
                          </div>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td>{getRoleBadge(user.role)}</td>
                      <td>
                        {user.is_active ? (
                          <span className="badge bg-success">
                            <i className="fas fa-check-circle me-1"></i>
                            Hoạt động
                          </span>
                        ) : (
                          <span className="badge bg-secondary">
                            <i className="fas fa-pause-circle me-1"></i>
                            Ngưng
                          </span>
                        )}
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            onClick={() => handleEdit(user)}
                            title="Chỉnh sửa"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => handleDelete(user.user_id, user.name)}
                            title="Xóa"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state-rich">
              <div className="empty-state-rich-icon info"><i className="fas fa-users"></i></div>
              <h3>Không tìm thấy người dùng nào</h3>
              <p>
                {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                  ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                  : "Chưa có người dùng nào trong hệ thống"}
              </p>
            </div>
          )}
          <PaginationBar
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            summaryText={filteredUsers.length > 0 ? `Hiển thị ${Math.min((currentPage - 1) * ITEMS_PER_PAGE + 1, filteredUsers.length)}-${Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} / ${filteredUsers.length} tài khoản` : "Chưa có dữ liệu để phân trang"}
            className="mt-4"
          />
        </div>
      </section>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>
                  Chỉnh sửa người dùng
                </h5>
                <button type="button" className="btn-close" onClick={() => setEditingUser(null)}></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="editName" className="form-label">
                      Họ và tên
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="editName"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editEmail" className="form-label">
                      Email
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="editEmail"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="editRole" className="form-label">
                      Vai trò
                    </label>
                    <select
                      className="form-select"
                      id="editRole"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    >
                      <option value={ROLE.BENH_NHAN}>Bệnh nhân</option>
                      <option value={ROLE.BAC_SI}>Bác sĩ</option>
                      <option value={ROLE.GIA_DINH}>Gia đình</option>
                      <option value={ROLE.ADMIN}>Admin</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="editActive"
                        checked={editForm.is_active}
                        onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                      />
                      <label className="form-check-label" htmlFor="editActive">
                        Tài khoản hoạt động
                      </label>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                    Hủy
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-save me-1"></i>
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
