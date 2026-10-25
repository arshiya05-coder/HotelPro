import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import { RoomImage } from '../components/RoomCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { Alert, Field } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { addDaysInput, formatMoney, humanize, nightsBetween, todayInput } from '../utils/format.js';

export default function BookRoom() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isStaff } = useAuth();

  const [room, setRoom] = useState(null);
  const [taxRate, setTaxRate] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    checkIn: params.get('checkIn') || todayInput(),
    checkOut: params.get('checkOut') || addDaysInput(todayInput(), 1),
    adults: Math.max(1, Number(params.get('guests')) || 1),
    children: 0,
    specialRequests: '',
  });
  const [onBehalf, setOnBehalf] = useState(false);
  const [guest, setGuest] = useState({ name: '', email: '', phone: '' });

  useEffect(() => {
    api
      .get(`/rooms/${id}`)
      .then(({ data }) => {
        setRoom(data.room);
        setTaxRate(data.taxRate);
        setForm((f) => ({ ...f, adults: Math.min(f.adults, data.room.capacity) }));
      })
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  if (!room) return error ? <div className="container page"><Alert>{error}</Alert></div> : <Spinner />;

  const nights = nightsBetween(form.checkIn, form.checkOut);
  const subtotal = room.pricePerNight * nights;
  const tax = Math.round(subtotal * taxRate * 100) / 100;
  const set = (key, number = false) => (e) => setForm({ ...form, [key]: number ? Number(e.target.value) : e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = { roomId: room._id, ...form };
      if (!payload.specialRequests) delete payload.specialRequests;
      if (isStaff && onBehalf) payload.guestDetails = guest;
      const { data } = await api.post('/bookings', payload);
      navigate(`/bookings/${data.booking._id}`, { state: { created: true } });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container page">
      <p><Link to={`/rooms?${params}`}>← Back to rooms</Link></p>
      <h1>Book {humanize(room.type)} · Room {room.number}</h1>
      <div className="split section-gap">
        <form className="card card-pad" onSubmit={submit}>
          <Alert onClose={() => setError('')}>{error}</Alert>
          <h3>Stay details</h3>
          <div className="form-grid">
            <Field label="Check-in">
              <input type="date" min={todayInput()} value={form.checkIn} onChange={(e) => {
                const checkIn = e.target.value;
                setForm((f) => ({ ...f, checkIn, checkOut: f.checkOut <= checkIn ? addDaysInput(checkIn, 1) : f.checkOut }));
              }} required />
            </Field>
            <Field label="Check-out">
              <input type="date" min={addDaysInput(form.checkIn, 1)} value={form.checkOut} onChange={set('checkOut')} required />
            </Field>
            <Field label="Adults">
              <input type="number" min={1} max={room.capacity} value={form.adults} onChange={set('adults', true)} required />
            </Field>
            <Field label="Children">
              <input type="number" min={0} max={room.capacity - 1} value={form.children} onChange={set('children', true)} />
            </Field>
          </div>
          <Field label="Special requests (optional)">
            <textarea maxLength={500} value={form.specialRequests} onChange={set('specialRequests')} placeholder="Late arrival, extra pillows, dietary needs…" />
          </Field>

          {isStaff && (
            <>
              <label className="checkbox">
                <input type="checkbox" checked={onBehalf} onChange={(e) => setOnBehalf(e.target.checked)} />
                Booking on behalf of a guest (phone / walk-in reservation)
              </label>
              {onBehalf && (
                <div className="form-grid">
                  <Field label="Guest name"><input value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} required /></Field>
                  <Field label="Guest email"><input type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} required /></Field>
                  <Field label="Guest phone"><input type="tel" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} /></Field>
                </div>
              )}
            </>
          )}

          <button className="btn btn-primary btn-block" disabled={busy || nights < 1}>
            {busy ? 'Reserving…' : 'Reserve room'}
          </button>
          <p className="muted small" style={{ marginTop: '0.75rem' }}>
            Your booking is held as <strong>pending</strong> and confirmed as soon as payment is received.
          </p>
        </form>

        <aside className="card" style={{ overflow: 'hidden' }}>
          <RoomImage room={room} />
          <div className="card-pad">
            <p className="muted">{room.description}</p>
            <div className="chips">
              <span className="chip">👤 Up to {room.capacity}</span>
              {room.amenities?.map((a) => <span key={a} className="chip">{a}</span>)}
            </div>
            <div className="summary-row"><span>{formatMoney(room.pricePerNight)} × {nights} night{nights === 1 ? '' : 's'}</span><span>{formatMoney(subtotal)}</span></div>
            <div className="summary-row"><span>Taxes ({Math.round(taxRate * 100)}%)</span><span>{formatMoney(tax)}</span></div>
            <div className="summary-row summary-total"><span>Total</span><span>{formatMoney(subtotal + tax)}</span></div>
          </div>
        </aside>
      </div>
    </div>
  );
}
