import { Link } from "react-router-dom"

const Unauthorized = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="max-w-2xl rounded-[36px] border border-surface-line bg-white p-10 text-center shadow-panel">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-red-50 text-4xl text-red-600"><i className="fas fa-lock"></i></div>
        <h1 className="mt-6 text-4xl font-black text-ink-900">Khong co quyen truy cap</h1>
        <p className="mt-4 text-base text-ink-600">Ban khong co quyen vao trang nay. Neu day la sai sot phan quyen, hay kiem tra lai tai khoan hoac lien he quan tri vien.</p>
        <div className="mt-8 flex justify-center"><Link to="/" className="btn btn-primary"><i className="fas fa-house me-2"></i>Ve trang chinh</Link></div>
      </div>
    </div>
  )
}

export default Unauthorized
