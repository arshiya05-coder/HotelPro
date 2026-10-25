import { useState } from 'react';
import api, { TOKEN_KEY, errorMessage } from '../api/client.js';
import { Alert, Field, StatusBadge } from '../components/ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { formatDateTime } from '../utils/format.js';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone || '' });
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [msg, setMsg] = useState({ type: 'success', text: '' });

  const saveProfile = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.patch('/auth/me', profile);
      setUser(data.user);
      setMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setMsg({ type: 'error', text: errorMessage(err) });
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) return setMsg({ type: 'error', text: 'New passwords do not match' });
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setMsg({ type: 'success', text: 'Password changed.' });
    } catch (err) {
      setMsg({ type: 'error', text: errorMessage(err) });
    }
  };

  return (
    <div className="container page" style={{ maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1>My profile</h1>
          <p className="muted">{user.email} · <StatusBadge status={user.role} /> · Last sign-in {formatDateTime(user.lastLoginAt)}</p>
        </div>
      </div>
      <Alert type={msg.type} onClose={() => setMsg({ ...msg, text: '' })}>{msg.text}</Alert>

      <form className="card card-pad" onSubmit={saveProfile}>
        <h3>Personal details</h3>
        <div className="form-grid">
          <Field label="Full name"><input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} required minLength={2} /></Field>
          <Field label="Phone"><input type="tel" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></Field>
        </div>
        <button className="btn btn-primary">Save changes</button>
      </form>

      <form className="card card-pad section-gap" onSubmit={changePassword}>
        <h3>Change password</h3>
        <Field label="Current password">
          <input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
        </Field>
        <div className="form-grid">
          <Field label="New password" hint="8+ characters with a letter and a number">
            <input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} />
          </Field>
          <Field label="Confirm new password">
            <input type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
          </Field>
        </div>
        <button className="btn btn-primary">Update password</button>
      </form>
    </div>
  );
}
