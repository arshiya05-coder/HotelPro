import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
import { Alert, Field } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO = [
  ['Admin', 'admin@hotelpro.com', 'Admin@123'],
  ['Staff', 'staff@hotelpro.com', 'Staff@123'],
  ['Guest', 'guest@hotelpro.com', 'Guest@123'],
];

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const u = await login(form.email, form.password);
      const fallback = u.role === 'guest' ? '/bookings' : '/admin';
      navigate(location.state?.from?.pathname ? location.state.from.pathname + (location.state.from.search || '') : fallback, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card">
        <h2>Welcome back</h2>
        <p className="muted">Sign in to manage your bookings.</p>
        <Alert onClose={() => setError('')}>{error}</Alert>
        <form onSubmit={submit}>
          <Field label="Email">
            <input type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </Field>
          <Field label="Password">
            <input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="muted small" style={{ marginTop: '1rem' }}>
          New to HotelPro? <Link to="/register">Create an account</Link>
        </p>
        {import.meta.env.DEV && (
          <div className="demo-box">
            <strong>Demo accounts</strong> (after <code>npm run seed</code>):
            {DEMO.map(([role, email, password]) => (
              <div key={role}>
                <button type="button" onClick={() => setForm({ email, password })}>{role}</button> — {email}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
