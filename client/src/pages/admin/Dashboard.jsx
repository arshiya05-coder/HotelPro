import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { Alert, StatusBadge } from '../../components/ui.jsx';
import { formatDate, formatMoney, humanize } from '../../utils/format.js';

function tileState(room) {
  if (room.status !== 'operational') return 'blocked';
  if (room.currentBooking) return 'occupied';
  if (room.housekeeping !== 'clean') return 'dirty';
  return 'vacant';
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [board, setBoard] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.get('/dashboard/stats'), api.get('/dashboard/room-board')])
      .then(([s, b]) => {
        setStats(s.data);
        setBoard(b.data.rooms);
      })
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <Alert>{error}</Alert>;
  if (!stats) return <Spinner />;

  const cards = [
    { label: 'Occupancy', value: `${stats.occupancyRate}%`, sub: `${stats.inHouse} of ${stats.totalRooms - stats.outOfOrder} sellable rooms`, bar: stats.occupancyRate },
    { label: 'Arrivals today', value: stats.arrivalsToday, sub: 'Pending & confirmed' },
    { label: 'Departures today', value: stats.departuresToday, sub: 'Due to check out' },
    { label: 'Pending bookings', value: stats.pendingBookings, sub: 'Awaiting payment / confirmation' },
    { label: 'Revenue this month', value: formatMoney(stats.revenueThisMonth), sub: 'Successful payments' },
    { label: 'Out of order', value: stats.outOfOrder, sub: 'Maintenance / out of service' },
  ];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Overview</h1>
          <p className="muted">Today's operations at a glance.</p>
        </div>
        <Link to="/rooms" className="btn btn-primary">+ New reservation</Link>
      </div>

      <div className="stats">
        {cards.map((c) => (
          <div key={c.label} className="card stat">
            <div className="stat-label">{c.label}</div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-sub">{c.sub}</div>
            {c.bar !== undefined && <div className="bar"><span style={{ width: `${Math.min(100, c.bar)}%` }} /></div>}
          </div>
        ))}
      </div>

      <div className="card card-pad">
        <h3>Room board</h3>
        <div className="legend">
          <span className="l-vacant">Vacant & clean</span>
          <span className="l-occupied">Occupied</span>
          <span className="l-dirty">Needs housekeeping</span>
          <span className="l-blocked">Out of order</span>
        </div>
        <div className="room-board">
          {board.map((r) => (
            <div key={r._id} className={`board-tile ${tileState(r)}`}>
              <strong>{r.number}</strong>
              <div>{humanize(r.type)}</div>
              <div className="muted small">
                {r.currentBooking
                  ? `${r.currentBooking.guestDetails.name} · out ${formatDate(r.currentBooking.checkOut)}`
                  : r.status !== 'operational'
                    ? humanize(r.status)
                    : humanize(r.housekeeping)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card section-gap">
        <div className="card-pad" style={{ paddingBottom: 0, display: 'flex', justifyContent: 'space-between' }}>
          <h3>Recent bookings</h3>
          <Link to="/admin/bookings">View all →</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Ref</th><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th></tr></thead>
            <tbody>
              {stats.recentBookings.map((b) => (
                <tr key={b._id}>
                  <td><Link to={`/bookings/${b._id}`}>{b.bookingRef}</Link></td>
                  <td>{b.guestDetails.name}</td>
                  <td>{b.room?.number}</td>
                  <td>{formatDate(b.checkIn)} – {formatDate(b.checkOut)}</td>
                  <td>{formatMoney(b.totalAmount)}</td>
                  <td><StatusBadge status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
