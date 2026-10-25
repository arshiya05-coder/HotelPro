export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <span>© {new Date().getFullYear()} HotelPro — secure, scalable hotel management.</span>
        <span className="muted">Bookings · Guests · Rooms · Payments</span>
      </div>
    </footer>
  );
}
