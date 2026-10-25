import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { Alert, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { formatDate, formatMoney, humanize, todayInput } from '../../utils/format.js';

const STATUSES = ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];

export default function ManageBookings() {
  const [filters, setFilters] = useState({ status: '', q: '', date: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    const params = { page, limit: 20 };
    for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;
    return api
      .get('/bookings', { params })
      .then(({ data }) => setResult(data))
      .catch((err) => setError(errorMessage(err)));
  }, [filters, page]);

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
  }, [load]);

  const setFilter = (key) => (e) => {
    setPage(1);
    setFilters({ ...filters, [key]: e.target.value });
  };

  const run = async (booking, path, success) => {
    setBusyId(booking._id);
    setError('');
    try {
      await api.post(`/bookings/${booking._id}/${path}`);
      setNotice(`${booking.bookingRef}: ${success}`);
      await load();
    } catch (err) {
      setError(`${booking.bookingRef}: ${errorMessage(err)}`);
    } finally {
      setBusyId(null);
    }
  };

  const actionsFor = (b) => {
    const busy = busyId === b._id;
    switch (b.status) {
      case 'pending':
        return <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => run(b, 'confirm', 'confirmed')}>Confirm</button>;
      case 'confirmed':
        return <button className="btn btn-success btn-sm" disabled={busy} onClick={() => run(b, 'check-in', 'checked in')}>Check in</button>;
      case 'checked_in':
        return b.balance > 0 ? (
          <Link className="btn btn-accent btn-sm" to={`/bookings/${b._id}`}>Collect {formatMoney(b.balance)}</Link>
        ) : (
          <button className="btn btn-success btn-sm" disabled={busy} onClick={() => run(b, 'check-out', 'checked out')}>Check out</button>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bookings & front desk</h1>
          <p className="muted">Search reservations, confirm, check guests in and out.</p>
        </div>
        <Link to="/rooms" className="btn btn-primary">+ New reservation</Link>
      </div>

      <div className="filters">
        <input placeholder="Search ref, guest name or email" value={filters.q} onChange={setFilter('q')} />
        <select value={filters.status} onChange={setFilter('status')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
        </select>
        <input type="date" value={filters.date} onChange={setFilter('date')} title="Bookings in-house on this date" />
        <button className="btn btn-ghost" onClick={() => { setPage(1); setFilters({ status: '', q: '', date: todayInput() }); }}>In-house today</button>
        <button className="btn btn-ghost" onClick={() => { setPage(1); setFilters({ status: '', q: '', date: '' }); }}>Clear</button>
      </div>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {!result ? (
        <Spinner />
      ) : result.bookings.length === 0 ? (
        <EmptyState title="No bookings match these filters" />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Ref</th><th>Guest</th><th>Room</th><th>Stay</th><th>Total</th><th>Payment</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {result.bookings.map((b) => (
                <tr key={b._id}>
                  <td><Link to={`/bookings/${b._id}`}>{b.bookingRef}</Link></td>
                  <td>{b.guestDetails.name}<div className="muted small">{b.guestDetails.email}</div></td>
                  <td>{b.room?.number} <span className="muted small">{humanize(b.room?.type)}</span></td>
                  <td>{formatDate(b.checkIn)} – {formatDate(b.checkOut)}<div className="muted small">{b.nights} night{b.nights > 1 ? 's' : ''}</div></td>
                  <td>{formatMoney(b.totalAmount)}</td>
                  <td><StatusBadge status={b.paymentStatus} /></td>
                  <td><StatusBadge status={b.status} /></td>
                  <td className="right">{actionsFor(b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.pages > 1 && (
        <div className="btn-row section-gap" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="muted small">Page {result.page} of {result.pages} · {result.total} bookings</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= result.pages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </>
  );
}
