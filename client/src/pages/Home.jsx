import { Link, useNavigate } from 'react-router-dom';
import DateSearch from '../components/DateSearch.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const features = [
  { icon: '📅', title: 'Efficient booking management', text: 'Create, confirm, modify and cancel reservations in seconds, with automatic pricing, taxes and conflict checks.' },
  { icon: '⚡', title: 'Real-time availability', text: 'Live room inventory prevents double bookings and shows guests exactly what can be booked for their dates.' },
  { icon: '🔐', title: 'Secure authentication', text: 'Hashed passwords, signed session tokens, role-based access for admins, staff and guests, and rate-limited sign-in.' },
  { icon: '💳', title: 'Payment processing', text: 'Take card, cash, UPI or bank transfer payments, track partial balances and issue refunds — card data is never stored.' },
  { icon: '🛎️', title: 'Guest check-in & check-out', text: 'A front-desk workflow for arrivals and departures, walk-in reservations and balance settlement.' },
  { icon: '🧹', title: 'Staff workflows', text: 'Housekeeping and maintenance status for every room, plus a live room board for the whole property.' },
];

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const search = (params) => navigate(`/rooms?${new URLSearchParams(params)}`);

  return (
    <>
      <section className="hero">
        <div className="container">
          <p className="eyebrow">Your ultimate hotel management solution</p>
          <h1>Run your hotel with confidence — from reservation to check-out.</h1>
          <p>
            HotelPro streamlines hotel operations with a secure, scalable backend: efficient booking, guest
            management and payment processing behind an intuitive interface.
          </p>
        </div>
      </section>

      <div className="container hero-search">
        <DateSearch onSearch={search} />
      </div>

      <section className="section container">
        <div className="section-title">
          <h2>Everything your property needs</h2>
          <p className="muted">
            Whether you're tracking reservations, optimizing occupancy or managing staff workflows, HotelPro keeps
            every step efficient and accurate.
          </p>
        </div>
        <div className="features">
          {features.map((f) => (
            <div key={f.title} className="card feature">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p className="muted">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section container about">
        <div>
          <p className="eyebrow">Built for growth</p>
          <h2>From boutique hotels to large hospitality chains</h2>
          <p className="muted">
            HotelPro is designed for modern, digital-first hospitality. Every guest interaction is protected with
            data privacy and encryption best practices, and the platform scales to high booking volumes while
            staying fast and reliable.
          </p>
          <p className="muted">
            Each user gets a personalized, secure experience: guests manage their own stays, staff run the front
            desk and housekeeping, and administrators control rooms, rates, payments and team access.
          </p>
        </div>
        <div className="about-stats">
          <div className="card"><strong>24/7</strong><span className="muted">Online booking</span></div>
          <div className="card"><strong>3</strong><span className="muted">Access roles</span></div>
          <div className="card"><strong>0</strong><span className="muted">Double bookings</span></div>
          <div className="card"><strong>4</strong><span className="muted">Payment methods</span></div>
        </div>
      </section>

      <section className="section container">
        <div className="cta">
          <div>
            <h2>Ready for your next stay?</h2>
            <p>Browse rooms, check live availability and book securely in under a minute.</p>
          </div>
          <div className="btn-row">
            <Link to="/rooms" className="btn btn-accent">Browse rooms</Link>
            {!user && <Link to="/register" className="btn btn-ghost" style={{ color: '#fff' }}>Create account</Link>}
          </div>
        </div>
      </section>
    </>
  );
}
