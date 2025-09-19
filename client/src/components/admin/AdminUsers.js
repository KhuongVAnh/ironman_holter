"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { toast } from "react-toastify"

const AdminUsers = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
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
    filterUsers()
  }, [users, searchTerm, roleFilter, statusFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get("http://localhost:4000/api/users")
      setUsers(response.data.users)
    } catch (error) {
      console.error("Lỗi lấy danh sách người dùng:", error)
      toast.error("Không thể tải danh sách người dùng")
    } finally {
      setLoading(false)
    }
  }

  const filterUsers = () => {
    let filtered = users

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    // Filter by role
    if (roleFilter !== "all") {
      filtered = filtered.filter((user) => user.role === roleFilter)
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((user) => {
        if (statusFilter === "active") return user.is_active
        if (statusFilter === "inactive") return !user.is_active
        return true
      })
    }

    setFilteredUsers(filtered)
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
      await axios.put(`http://localhost:4000/api/users/${editingUser.user_id}`, editForm)
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
        await axios.delete(`http://localhost:4000/api/users/${userId}`)
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
    const roleConfig = {
      "bệnh nhân": { class: "bg-primary", icon: "fas fa-user" },
      "bác sĩ": { class: "bg-success", icon: "fas fa-user-md" },
      "gia đình": { class: "bg-info", icon: "fas fa-users" },
      admin: { class: "bg-danger", icon: "fas fa-user-shield" },
    }

    const config = roleConfig[role] || roleConfig["bệnh nhân"]

    return (
      <span className={`badge ${config.class}`}>
        <i className={`${config.icon} me-1`}></i>
        {role}
      </span>
    )
  }

  if (loading) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Đang tải...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="fas fa-users-cog me-2 text-primary"></i>
              Quản lý người dùng
            </h1>
            <button className="btn btn-outline-primary" onClick={fetchUsers}>
              <i className="fas fa-sync-alt me-1"></i>
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="row mb-4">
        <div className="col-md-4">
          <div className="input-group">
            <span className="input-group-text">
              <i className="fas fa-search"></i>
            </span>
            <input
              type="text"
              className="form-control"
              placeholder="Tìm kiếm theo tên hoặc email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Tất cả vai trò</option>
            <option value="bệnh nhân">Bệnh nhân</option>
            <option value="bác sĩ">Bác sĩ</option>
            <option value="gia đình">Gia đình</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div className="col-md-3">
          <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Ngưng hoạt động</option>
          </select>
        </div>
        <div className="col-md-2">
          <div className="text-muted">
            Tổng: <strong>{filteredUsers.length}</strong>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {filteredUsers.length > 0 ? (
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
                      {filteredUsers.map((user) => (
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
                <div className="text-center py-5">
                  <i className="fas fa-users fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">Không tìm thấy người dùng nào</h5>
                  <p className="text-muted">
                    {searchTerm || roleFilter !== "all" || statusFilter !== "all"
                      ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
                      : "Chưa có người dùng nào trong hệ thống"}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
                      <option value="bệnh nhân">Bệnh nhân</option>
                      <option value="bác sĩ">Bác sĩ</option>
                      <option value="gia đình">Gia đình</option>
                      <option value="admin">Admin</option>
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
