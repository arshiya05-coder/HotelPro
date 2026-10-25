import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { errorMessage } from '../api/client.js';
import { Alert, Field } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setError('Passwords do not match');
    setBusy(true);
    setError('');
    try {
      const { confirm: _confirm, ...payload } = form;
      await register(payload);
      navigate('/rooms', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card">
        <h2>Create your account</h2>
        <p className="muted">Book rooms and manage your stays in one place.</p>
        <Alert onClose={() => setError('')}>{error}</Alert>
        <form onSubmit={submit}>
          <Field label="Full name">
            <input autoComplete="name" value={form.name} onChange={set('name')} required minLength={2} />
          </Field>
          <Field label="Email">
            <input type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
          </Field>
          <Field label="Phone (optional)">
            <input type="tel" autoComplete="tel" value={form.phone} onChange={set('phone')} />
          </Field>
          <Field label="Password" hint="At least 8 characters, including a letter and a number.">
            <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
          </Field>
          <Field label="Confirm password">
            <input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} required />
          </Field>
          <button className="btn btn-primary btn-block" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        </form>
        <p className="muted small" style={{ marginTop: '1rem' }}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
