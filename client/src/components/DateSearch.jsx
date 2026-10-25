import { useState } from 'react';
import { addDaysInput, todayInput } from '../utils/format.js';

export default function DateSearch({ initial = {}, onSearch, compact = false, showType = false }) {
  const today = todayInput();
  const [checkIn, setCheckIn] = useState(initial.checkIn || today);
  const [checkOut, setCheckOut] = useState(initial.checkOut || addDaysInput(today, 1));
  const [guests, setGuests] = useState(initial.guests || 2);
  const [type, setType] = useState(initial.type || '');

  const changeCheckIn = (value) => {
    setCheckIn(value);
    if (value && checkOut <= value) setCheckOut(addDaysInput(value, 1));
  };

  const submit = (e) => {
    e.preventDefault();
    onSearch({ checkIn, checkOut, guests, ...(type && { type }) });
  };

  return (
    <form className={`search-bar ${compact ? 'compact' : ''}`} onSubmit={submit}>
      <label>
        <span>Check-in</span>
        <input type="date" value={checkIn} min={today} onChange={(e) => changeCheckIn(e.target.value)} required />
      </label>
      <label>
        <span>Check-out</span>
        <input
          type="date"
          value={checkOut}
          min={checkIn ? addDaysInput(checkIn, 1) : today}
          onChange={(e) => setCheckOut(e.target.value)}
          required
        />
      </label>
      <label>
        <span>Guests</span>
        <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>
          ))}
        </select>
      </label>
      {showType && (
        <label>
          <span>Room type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Any</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="deluxe">Deluxe</option>
            <option value="suite">Suite</option>
          </select>
        </label>
      )}
      <button className="btn btn-accent" type="submit">Check availability</button>
    </form>
  );
}
