import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import Spinner from '../components/Spinner.jsx';
import { Alert, Field, StatusBadge } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDate, formatDateTime, formatMoney, humanize } from '../utils/format.js';

const EMPTY_CARD = { name: '', number: '', expiry: '', cvc: '' };

function PaymentForm({ booking, isStaff, onPaid }) {
  const [method, setMethod] = useState('card');
  const [amount, setAmount] = useState(booking.balance);
  const [card, setCard] = useState(EMPTY_CARD);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => setAmount(booking.balance), [booking.balance]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { method };
      if (isStaff) payload.amount = Number(amount);
      if (method === 'card') payload.card = card;
      await api.post(`/bookings/${booking._id}/payments`, payload);
      setCard(EMPTY_CARD);
      onPaid('Payment received — thank you!');
    } catch (err) {
      setError(errorMessage(err));
      // A declined card is still recorded, so refresh the history.
      if (err.response?.status === 402) onPaid();
    } finally {
      setBusy(false);
    }
  };

  const setCardField = (key) => (e) => setCard({ ...card, [key]: e.target.value });

  return (
    <form className="card card-pad" onSubmit={submit}>
      <h3>Make a payment</h3>
      <Alert onClose={() => setError('')}>{error}</Alert>
      <div className="form-grid">
        <Field label="Method">
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            <option value="card">Credit / debit card</option>
            {isStaff && <option value="cash">Cash</option>}
            {isStaff && <option value="upi">UPI</option>}
            {isStaff && <option value="bank_transfer">Bank transfer</option>}
          </select>
        </Field>
        <Field label="Amount">
          {isStaff ? (
            <input type="number" step="0.01" min="0.01" max={booking.balance} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          ) : (
            <input value={formatMoney(booking.balance)} disabled />
          )}
        </Field>
      </div>
      {method === 'card' && (
        <>
          <Field label="Name on card">
            <input autoComplete="cc-name" value={card.name} onChange={setCardField('name')} />
          </Field>
          <Field label="Card number" hint="Test cards: 4242 4242 4242 4242 (success), 4000 0000 0000 0002 (declined)">
            <input inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" value={card.number} onChange={setCardField('number')} required />
          </Field>
          <div className="form-grid">
            <Field label="Expiry (MM/YY)">
              <input autoComplete="cc-exp" placeholder="12/29" value={card.expiry} onChange={setCardField('expiry')} required />
            </Field>
            <Field label="CVC">
              <input inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4} value={card.cvc} onChange={setCardField('cvc')} required />
            </Field>
          </div>
        </>
      )}
      <button className="btn btn-accent btn-block" disabled={busy}>
        {busy ? 'Processing…' : `Pay ${formatMoney(isStaff ? amount : booking.balance)}`}
      </button>
      <p className="muted small" style={{ marginTop: '0.75rem' }}>🔒 Card details are sent over an encrypted connection and never stored.</p>
    </form>
  );
}

export default function BookingDetail() {
  const { id } = useParams();
  const location = useLocation();
  const { isStaff, isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(location.state?.created ? 'Booking created! Complete payment to confirm your reservation.' : '');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    return api
      .get(`/bookings/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const action = async (path, body, success) => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/bookings/${id}/${path}`, body);
      setNotice(success);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const cancel = () => {
    const reason = window.prompt('Cancel this booking? Optionally tell us why:');
    if (reason === null) return;
    action('cancel', reason ? { reason } : {}, 'Booking cancelled.');
  };

  const refund = async (paymentId) => {
    if (!window.confirm('Refund this payment?')) return;
    try {
      await api.post(`/payments/${paymentId}/refund`);
      setNotice('Payment refunded.');
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (!data) return error ? <div className="container page"><Alert>{error}</Alert></div> : <Spinner />;

  const { booking, payments } = data;
  const canPay = booking.balance > 0 && !['cancelled', 'checked_out'].includes(booking.status);
  const canCancel = ['pending', 'confirmed'].includes(booking.status);

  return (
    <div className="container page">
      <p><Link to="/bookings">← All bookings</Link></p>
      <div className="page-head">
        <div>
          <h1>Booking {booking.bookingRef}</h1>
          <p className="muted">Created {formatDateTime(booking.createdAt)}</p>
        </div>
        <div className="btn-row">
          <StatusBadge status={booking.status} />
          <StatusBadge status={booking.paymentStatus} />
        </div>
      </div>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      <div className="split">
        <div>
          <div className="card card-pad">
            <h3>Stay</h3>
            <dl className="detail-grid">
              <div><dt>Room</dt><dd>{booking.room?.number} · {humanize(booking.room?.type)}</dd></div>
              <div><dt>Check-in</dt><dd>{formatDate(booking.checkIn)}</dd></div>
              <div><dt>Check-out</dt><dd>{formatDate(booking.checkOut)}</dd></div>
              <div><dt>Nights</dt><dd>{booking.nights}</dd></div>
              <div><dt>Guests</dt><dd>{booking.adults} adult{booking.adults > 1 ? 's' : ''}{booking.children ? `, ${booking.children} child${booking.children > 1 ? 'ren' : ''}` : ''}</dd></div>
              <div><dt>Guest</dt><dd>{booking.guestDetails.name}</dd></div>
              <div><dt>Email</dt><dd>{booking.guestDetails.email}</dd></div>
              {booking.guestDetails.phone && <div><dt>Phone</dt><dd>{booking.guestDetails.phone}</dd></div>}
            </dl>
            {booking.specialRequests && <p><strong>Special requests:</strong> {booking.specialRequests}</p>}
            {booking.cancellationReason && <p className="muted"><strong>Cancellation reason:</strong> {booking.cancellationReason}</p>}

            <div className="btn-row">
              {isStaff && booking.status === 'pending' && (
                <button className="btn btn-primary" disabled={busy} onClick={() => action('confirm', {}, 'Booking confirmed.')}>Confirm booking</button>
              )}
              {isStaff && booking.status === 'confirmed' && (
                <button className="btn btn-success" disabled={busy} onClick={() => action('check-in', {}, 'Guest checked in.')}>Check in guest</button>
              )}
              {isStaff && booking.status === 'checked_in' && (
                <button className="btn btn-success" disabled={busy || booking.balance > 0} title={booking.balance > 0 ? 'Settle the balance first' : ''} onClick={() => action('check-out', {}, 'Guest checked out. Room marked for housekeeping.')}>
                  Check out guest
                </button>
              )}
              {canCancel && <button className="btn btn-ghost" disabled={busy} onClick={cancel}>Cancel booking</button>}
            </div>
          </div>

          <div className="card section-gap">
            <div className="card-pad" style={{ paddingBottom: 0 }}><h3>Payment history</h3></div>
            {payments.length === 0 ? (
              <p className="muted card-pad">No payments yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th>{isAdmin && <th />}</tr></thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td>{formatDateTime(p.createdAt)}</td>
                        <td>{humanize(p.method)}{p.cardLast4 && ` ·••• ${p.cardLast4}`}</td>
                        <td>{formatMoney(p.amount)}</td>
                        <td><StatusBadge status={p.status} />{p.failureReason && <div className="muted small">{p.failureReason}</div>}</td>
                        {isAdmin && <td className="right">{p.status === 'succeeded' && booking.status !== 'checked_out' && <button className="btn btn-ghost btn-sm" onClick={() => refund(p._id)}>Refund</button>}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card card-pad">
            <h3>Charges</h3>
            <div className="summary-row"><span>{formatMoney(booking.pricePerNight)} × {booking.nights} nights</span><span>{formatMoney(booking.subtotal)}</span></div>
            <div className="summary-row"><span>Taxes</span><span>{formatMoney(booking.tax)}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(booking.totalAmount)}</span></div>
            <div className="summary-row"><span>Paid</span><span>{formatMoney(booking.amountPaid)}</span></div>
            <div className="summary-row" style={{ fontWeight: 700 }}><span>Balance due</span><span>{formatMoney(booking.balance)}</span></div>
          </div>
          {canPay && (
            <div className="section-gap">
              <PaymentForm booking={booking} isStaff={isStaff} onPaid={(msg) => { if (msg) setNotice(msg); load(); }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
