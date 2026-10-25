import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api, { errorMessage } from '../api/client.js';
import DateSearch from '../components/DateSearch.jsx';
import RoomCard from '../components/RoomCard.jsx';
import Spinner from '../components/Spinner.jsx';
import { Alert, EmptyState } from '../components/ui.jsx';
import { formatDate } from '../utils/format.js';

export default function Rooms() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [nights, setNights] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const checkIn = params.get('checkIn');
  const checkOut = params.get('checkOut');
  const guests = params.get('guests');
  const type = params.get('type');
  const hasDates = Boolean(checkIn && checkOut);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const request = hasDates
      ? api.get('/rooms/availability', { params: { checkIn, checkOut, guests: guests || 1, ...(type && { type }) } })
      : api.get('/rooms', { params: type ? { type } : {} });
    request
      .then(({ data }) => {
        if (cancelled) return;
        setRooms(data.rooms);
        setNights(data.nights || 0);
      })
      .catch((err) => !cancelled && setError(errorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [checkIn, checkOut, guests, type, hasDates]);

  const book = (room) => {
    if (!hasDates) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return setError('Please choose your check-in and check-out dates first.');
    }
    navigate(`/rooms/${room._id}/book?${new URLSearchParams({ checkIn, checkOut, guests: guests || 1 })}`);
  };

  return (
    <div className="container page">
      <div className="page-head">
        <div>
          <h1>Rooms & availability</h1>
          <p className="muted">
            {hasDates
              ? `${rooms.length} room${rooms.length === 1 ? '' : 's'} available ${formatDate(checkIn)} – ${formatDate(checkOut)}`
              : 'Browse all rooms or pick dates to see live availability.'}
          </p>
        </div>
      </div>

      <DateSearch
        compact
        showType
        initial={{ checkIn, checkOut, guests: guests ? Number(guests) : undefined, type }}
        onSearch={(p) => setParams(p)}
      />

      <div className="section-gap">
        <Alert onClose={() => setError('')}>{error}</Alert>
        {loading ? (
          <Spinner label="Checking availability…" />
        ) : rooms.length === 0 ? (
          <EmptyState title="No rooms available">Try different dates, fewer guests, or another room type.</EmptyState>
        ) : (
          <div className="room-grid">
            {rooms.map((room) => (
              <RoomCard key={room._id} room={room} nights={nights} onBook={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
