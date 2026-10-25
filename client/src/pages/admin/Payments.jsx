import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { Alert, EmptyState, StatusBadge } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateTime, formatMoney, humanize } from '../../utils/format.js';

export default function Payments() {
  const { isAdmin } = useAuth();
  const [status, setStatus] = useState('');
  const [payments, setPayments] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(
    () =>
      api
        .get('/payments', { params: status ? { status } : {} })
        .then(({ data }) => setPayments(data.payments))
        .catch((err) => setError(errorMessage(err))),
    [status]
  );

  useEffect(() => {
    load();
  }, [load]);

  const refund = async (p) => {
    if (!window.confirm(`Refund ${formatMoney(p.amount)} for ${p.booking?.bookingRef}?`)) return;
    try {
      await api.post(`/payments/${p._id}/refund`);
      setNotice('Payment refunded.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const total = (payments || []).filter((p) => p.status === 'succeeded').reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Payments</h1>
          <p className="muted">All transactions across bookings. Collected in view: <strong>{formatMoney(total)}</strong></p>
        </div>
        <select style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="succeeded">Succeeded</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {!payments ? (
        <Spinner />
      ) : payments.length === 0 ? (
        <EmptyState title="No payments yet" />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Booking</th><th>Guest</th><th>Method</th><th>Amount</th><th>Status</th><th>Processed by</th>{isAdmin && <th />}</tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id}>
                  <td>{formatDateTime(p.createdAt)}</td>
                  <td>{p.booking ? <Link to={`/bookings/${p.booking._id}`}>{p.booking.bookingRef}</Link> : '—'}</td>
                  <td>{p.booking?.guestDetails?.name}</td>
                  <td>{humanize(p.method)}{p.cardLast4 && <span className="muted small"> ···· {p.cardLast4}</span>}</td>
                  <td>{formatMoney(p.amount)}</td>
                  <td><StatusBadge status={p.status} />{p.failureReason && <div className="muted small">{p.failureReason}</div>}</td>
                  <td>{p.processedBy?.name || '—'}</td>
                  {isAdmin && <td className="right">{p.status === 'succeeded' && <button className="btn btn-ghost btn-sm" onClick={() => refund(p)}>Refund</button>}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
