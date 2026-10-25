import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, isStaff, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const close = () => setOpen(false);

  const handleLogout = () => {
    logout();
    close();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" onClick={close}>
          <span className="brand-mark">H</span> HotelPro
        </Link>
        <button className="nav-toggle" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>
          ☰
        </button>
        <nav className={`nav-links ${open ? 'open' : ''}`}>
          <NavLink to="/rooms" onClick={close}>Rooms</NavLink>
          {user && <NavLink to="/bookings" onClick={close}>{isStaff ? 'Bookings' : 'My Bookings'}</NavLink>}
          {isStaff && <NavLink to="/admin" onClick={close}>Dashboard</NavLink>}
          {user ? (
            <>
              <NavLink to="/profile" onClick={close} className="nav-user">
                {user.name.split(' ')[0]} <span className="role-chip">{user.role}</span>
              </NavLink>
              <button className="btn btn-ghost btn-sm" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>Log in</NavLink>
              <Link to="/register" className="btn btn-primary btn-sm" onClick={close}>Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
