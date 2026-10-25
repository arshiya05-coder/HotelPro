import { formatMoney, humanize } from '../utils/format.js';

export function RoomImage({ room, className = '' }) {
  if (room.imageUrl) return <img className={`room-img ${className}`} src={room.imageUrl} alt={`Room ${room.number}`} />;
  return (
    <div className={`room-img room-img-${room.type} ${className}`} aria-hidden="true">
      <span>{humanize(room.type)}</span>
    </div>
  );
}

export default function RoomCard({ room, nights, onBook }) {
  return (
    <article className="card room-card">
      <RoomImage room={room} />
      <div className="room-body">
        <div className="room-head">
          <h3>
            {humanize(room.type)} <span className="muted">· Room {room.number}</span>
          </h3>
          <div className="price">
            {formatMoney(room.pricePerNight)}
            <small>/night</small>
          </div>
        </div>
        <p className="muted room-desc">{room.description}</p>
        <div className="chips">
          <span className="chip">👤 Up to {room.capacity}</span>
          <span className="chip">Floor {room.floor}</span>
          {room.amenities?.slice(0, 4).map((a) => (
            <span key={a} className="chip">{a}</span>
          ))}
        </div>
        <div className="room-foot">
          {nights > 0 ? (
            <span>
              <strong>{formatMoney(room.pricePerNight * nights)}</strong>
              <span className="muted"> for {nights} night{nights > 1 ? 's' : ''} + tax</span>
            </span>
          ) : (
            <span className="muted">Select dates to check availability</span>
          )}
          <button className="btn btn-primary" onClick={() => onBook(room)}>
            {nights > 0 ? 'Book now' : 'Choose dates'}
          </button>
        </div>
      </div>
    </article>
  );
}
