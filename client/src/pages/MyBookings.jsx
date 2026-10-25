import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import { RoomImage } from '../components/RoomCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { Alert, EmptyState, StatusBadge } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, formatMoney, humanize } from '../utils/format.js';

const TABS = ['', 'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

export default function MyBookings() {
  const { isStaff } = useAuth();
  const [status, setStatus] = useState('');
  const [bookings, setBookings] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isStaff) return;
    setBookings(null);
    api
      .get('/bookings', { params: { limit: 100, ...(status && { status }) } })
      .then(({ data }) => setBookings(data.bookings))
      .catch((err) => {
        setError(errorMessage(err));
        setBookings([]);
      });
  }, [status, isStaff]);

  // Staff manage every booking from the operations area.
  if (isStaff) return <Navigate to="/admin/bookings" replace />;

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>My bookings</h1>
          <p className="muted">View, pay for and manage your reservations.</p>
        </div>
        <Link to="/rooms" className="btn btn-primary">New booking</Link>
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t || 'all'} className={`tab ${status === t ? 'active' : ''}`} onClick={() => setStatus(t)}>
            {t ? humanize(t) : 'All'}
          </button>
        ))}
      </div>

      <Alert onClose={() => setError('')}>{error}</Alert>
      {!bookings ? (
        <Spinner />
      ) : bookings.length === 0 ? (
        <EmptyState title="No bookings yet">
          <Link to="/rooms">Find a room</Link> to plan your next stay.
        </EmptyState>
      ) : (
        bookings.map((b) => (
          <Link key={b._id} to={`/bookings/${b._id}`} className="card booking-item" style={{ color: 'inherit', textDecoration: 'none' }}>
            {b.room && <RoomImage room={b.room} />}
            <div>
              <h3 style={{ marginBottom: 4 }}>
                {humanize(b.room?.type)} · Room {b.room?.number}
              </h3>
              <div className="muted small">
                {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {b.nights} night{b.nights > 1 ? 's' : ''} · Ref {b.bookingRef}
              </div>
              <div className="btn-row" style={{ marginTop: 8 }}>
                <StatusBadge status={b.status} />
                <StatusBadge status={b.paymentStatus} />
              </div>
            </div>
            <div className="right">
              <div className="price">{formatMoney(b.totalAmount)}</div>
              {b.balance > 0 && b.status !== 'cancelled' && <div className="small" style={{ color: 'var(--danger)' }}>{formatMoney(b.balance)} due</div>}
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
