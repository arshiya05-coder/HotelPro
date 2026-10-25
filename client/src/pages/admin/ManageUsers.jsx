import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../../api/client.js';
import Spinner from '../../components/Spinner.jsx';
import { Alert, Field, Modal, StatusBadge } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatDateTime } from '../../utils/format.js';

const EMPTY = { name: '', email: '', phone: '', password: '', role: 'staff' };

export default function ManageUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState(null);
  const [filters, setFilters] = useState({ role: '', q: '' });
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    const params = {};
    if (filters.role) params.role = filters.role;
    if (filters.q) params.q = filters.q;
    return api.get('/users', { params }).then(({ data }) => setUsers(data.users)).catch((err) => setError(errorMessage(err)));
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const update = async (u, patch, msg) => {
    try {
      await api.patch(`/users/${u._id}`, patch);
      setNotice(msg);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const create = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('/users', form);
      setCreating(false);
      setForm(EMPTY);
      setNotice(`Account created for ${form.email}.`);
      load();
    } catch (err) {
      setFormError(errorMessage(err));
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Users & staff</h1>
          <p className="muted">Manage team accounts, roles and access.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>+ Add staff member</button>
      </div>

      <div className="filters">
        <input placeholder="Search name or email" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} />
        <select value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="">All roles</option>
          <option value="admin">Admins</option>
          <option value="staff">Staff</option>
          <option value="guest">Guests</option>
        </select>
      </div>

      <Alert type="success" onClose={() => setNotice('')}>{notice}</Alert>
      <Alert onClose={() => setError('')}>{error}</Alert>

      {!users ? (
        <Spinner />
      ) : (
        <div className="card table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign-in</th><th /></tr></thead>
            <tbody>
              {users.map((u) => {
                const self = u._id === me._id;
                return (
                  <tr key={u._id}>
                    <td>{u.name}{self && <span className="muted small"> (you)</span>}</td>
                    <td>{u.email}</td>
                    <td>
                      {self ? (
                        <StatusBadge status={u.role} />
                      ) : (
                        <select value={u.role} onChange={(e) => update(u, { role: e.target.value }, `${u.name} is now ${e.target.value}.`)}>
                          <option value="admin">Admin</option>
                          <option value="staff">Staff</option>
                          <option value="guest">Guest</option>
                        </select>
                      )}
                    </td>
                    <td>{u.isActive ? <span className="badge badge-paid">Active</span> : <span className="badge badge-cancelled">Disabled</span>}</td>
                    <td>{formatDateTime(u.lastLoginAt)}</td>
                    <td className="right">
                      {!self && (
                        <button className="btn btn-ghost btn-sm" onClick={() => update(u, { isActive: !u.isActive }, `${u.name} ${u.isActive ? 'disabled' : 'enabled'}.`)}>
                          {u.isActive ? 'Disable' : 'Enable'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="Add staff member" onClose={() => setCreating(false)}>
          <form onSubmit={create}>
            <Alert onClose={() => setFormError('')}>{formError}</Alert>
            <div className="form-grid">
              <Field label="Full name"><input value={form.name} onChange={set('name')} required /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={set('email')} required /></Field>
              <Field label="Phone"><input type="tel" value={form.phone} onChange={set('phone')} /></Field>
              <Field label="Role">
                <select value={form.role} onChange={set('role')}>
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </Field>
            </div>
            <Field label="Temporary password" hint="8+ characters with a letter and a number. Ask them to change it after first sign-in.">
              <input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} required minLength={8} />
            </Field>
            <div className="btn-row">
              <button className="btn btn-primary">Create account</button>
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
