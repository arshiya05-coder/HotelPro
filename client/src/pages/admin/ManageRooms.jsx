import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { Alert, Field, Modal } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROOM_TYPES, formatMoney, humanize } from '../../utils/format.js';

const EMPTY = { number: '', type: 'double', pricePerNight: 100, capacity: 2, floor: 1, amenities: '', description: '', imageUrl: '' };

function RoomForm({ room, onClose, onSaved }) {
  const [form, setForm] = useState(room ? { ...EMPTY, ...room, amenities: (room.amenities || []).join(', ') } : EMPTY);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const payload = {
      number: form.number,
      type: form.type,
      pricePerNight: Number(form.pricePerNight),
      capacity: Number(form.capacity),
      floor: Number(form.floor),
      amenities: form.amenities.split(',').map((a) => a.trim()).filter(Boolean),
      description: form.description,
      imageUrl: form.imageUrl,
    };
    try {
      if (room) await api.put(`/rooms/${room._id}`, payload);
      else await api.post('/rooms', payload);
      onSaved(room ? `Room ${payload.number} updated.` : `Room ${payload.number} added.`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={room ? `Edit room ${room.number}` : 'Add room'} onClose={onClose}>
      <form onSubmit={submit}>
        <Alert onClose={() => setError('')}>{error}</Alert>
        <div className="form-grid">
          <Field label="Room number"><input value={form.number} onChange={set('number')} required maxLength={10} /></Field>
          <Field label="Type">
            <select value={form.type} onChange={set('type')}>
              {ROOM_TYPES.map((t) => <option key={t} value={t}>{humanize(t)}</option>)}
            </select>
          </Field>
          <Field label="Price per night"><input type="number" min="1" step="0.01" value={form.pricePerNight} onChange={set('pricePerNight')} required /></Field>
          <Field label="Capacity"><input type="number" min="1" max="10" value={form.capacity} onChange={set('capacity')} required /></Field>
          <Field label="Floor"><input type="number" min="0" value={form.floor} onChange={set('floor')} /></Field>
        </div>
        <Field label="Amenities" hint="Comma separated, e.g. Wi-Fi, Smart TV, Mini bar"><input value={form.amenities} onChange={set('amenities')} /></Field>
        <Field label="Description"><textarea maxLength={1000} value={form.description} onChange={set('description')} /></Field>
        <Field label="Image URL (optional)"><input type="url" value={form.imageUrl} onChange={set('imageUrl')} /></Field>
        <div className="btn-row">
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save room'}</button>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </Modal>
  );
}

export default function ManageRooms() {
  const { isAdmin } = useAuth();
  const [rooms, setRooms] = useState(null);
  const [editing, setEditing] = useState(null); // null = closed, {} = new, room = edit
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(
    () => api.get('/dashboard/room-board').then(({ data }) => setRooms(data.rooms)).catch((err) => setError(errorMessage(err))),
    []
  );

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (room, patch) => {
    try {
      await api.patch(`/rooms/${room._id}/status`, patch);
      setNotice(`Room ${room.number} updated.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const remove = async (room) => {
    if (!window.confirm(`Remove room ${room.number}? It will no longer be bookable.`)) return;
    try {
      await api.delete(`/rooms/${room._id}`);
      setNotice(`Room ${room.number} removed.`);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Rooms & housekeeping</h1>
          <p className="muted">Manage room inventory, rates, maintenance and cleaning status.</p>
        </div>
        {isAdmin && <button className="btn btn-primary" onClick={() => setEditing({})}>+ Add room</button>}
      </div>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {!rooms ? (
        <Spinner />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Room</th><th>Type</th><th>Rate</th><th>Cap.</th><th>Occupancy</th><th>Status</th><th>Housekeeping</th>{isAdmin && <th />}</tr>
            </thead>
            <tbody>
              {rooms.map((r) => (
                <tr key={r._id}>
                  <td><strong>{r.number}</strong><div className="muted small">Floor {r.floor}</div></td>
                  <td>{humanize(r.type)}</td>
                  <td>{formatMoney(r.pricePerNight)}</td>
                  <td>{r.capacity}</td>
                  <td>{r.currentBooking ? <span className="badge badge-confirmed">{r.currentBooking.guestDetails.name}</span> : <span className="muted">Vacant</span>}</td>
                  <td>
                    <select value={r.status} onChange={(e) => updateStatus(r, { status: e.target.value })}>
                      <option value="operational">Operational</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="out_of_service">Out of service</option>
                    </select>
                  </td>
                  <td>
                    <select value={r.housekeeping} onChange={(e) => updateStatus(r, { housekeeping: e.target.value })}>
                      <option value="clean">Clean</option>
                      <option value="dirty">Dirty</option>
                      <option value="inspecting">Inspecting</option>
                    </select>
                  </td>
                  {isAdmin && (
                    <td className="right">
                      <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>Edit</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => remove(r)}>Remove</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <RoomForm
          room={editing._id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={(msg) => {
            setEditing(null);
            setNotice(msg);
            load();
          }}
        />
      )}
    </>
  );
}
