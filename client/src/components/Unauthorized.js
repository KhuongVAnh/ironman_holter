import { Link } from "react-router-dom"

const Unauthorized = () => {
  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="text-center">
        <div className="mb-4">
          <i className="fas fa-lock fa-5x text-danger"></i>
        </div>
        <h1 className="display-4 text-danger mb-3">Không có quyền truy cập</h1>
        <p className="lead mb-4">
          Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên nếu bạn cho rằng đây là lỗi.
        </p>
        <Link to="/dashboard" className="btn btn-primary">
          <i className="fas fa-home me-2"></i>
          Về trang chủ
        </Link>
      </div>
    </div>
  )
}

export default Unauthorized
