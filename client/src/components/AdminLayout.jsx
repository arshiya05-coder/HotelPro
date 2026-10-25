import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function AdminLayout() {
  const { isAdmin } = useAuth();
  return (
    <div className="container admin">
      <aside className="sidebar">
        <p className="sidebar-title">Operations</p>
        <NavLink end to="/admin">📊 Overview</NavLink>
        <NavLink to="/admin/bookings">📅 Bookings & front desk</NavLink>
        <NavLink to="/admin/rooms">🛏️ Rooms & housekeeping</NavLink>
        <NavLink to="/admin/payments">💳 Payments</NavLink>
        {isAdmin && <NavLink to="/admin/users">👥 Users & staff</NavLink>}
      </aside>
      <section className="admin-content">
        <Outlet />
      </section>
    </div>
  );
}
