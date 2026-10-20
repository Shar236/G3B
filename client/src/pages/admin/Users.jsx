import { useCallback, useEffect, useState } from 'react'
import { createUser, deleteUser, listUsers, updateUser } from '../../api/adminApi.js'
import { parseApiError } from '../../api/client.js'
import { Modal } from '../../components/ui/Modal.jsx'
import { StateBlock } from '../../components/ui/StateBlock.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { AdminNotice, ConfirmAction, TableSkeleton } from './AdminDataUI.jsx'

const EMPTY = { name: '', email: '', password: '', role: 'staff', status: 'active' }

const formatDate = (value) => (value ? new Date(value).toLocaleString() : 'Never')

/** Administrator and staff account management. */
export default function Users() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [formError, setFormError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setUsers(await listUsers())
    } catch (err) {
      setError(parseApiError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing({ id: null })
    setForm(EMPTY)
    setNotice(null)
    setFormError(null)
  }

  const openEdit = (user) => {
    setEditing(user)
    setForm({ name: user.name, email: user.email, password: '', role: user.role, status: user.status })
    setNotice(null)
    setFormError(null)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setFormError(null)
    setNotice(null)
    try {
      if (editing.id) {
        const payload = { name: form.name, email: form.email, role: form.role, status: form.status }
        if (form.password) payload.password = form.password
        await updateUser(editing.id, payload)
        setNotice({ type: 'success', message: 'User updated.' })
      } else {
        await createUser(form)
        setNotice({ type: 'success', message: 'User created.' })
      }
      setEditing(null)
      load()
    } catch (err) {
      setFormError(parseApiError(err).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    const previous = users
    setDeleting(true)
    setUsers((current) => current.filter((user) => user.id !== confirmation.user.id))
    try {
      await deleteUser(confirmation.user.id)
      setNotice({ type: 'success', message: 'User deleted.' })
      load()
    } catch (err) {
      setUsers(previous)
      setNotice({ type: 'error', message: parseApiError(err).message })
    } finally { setDeleting(false); setConfirmation(null) }
  }

  return (
    <div className="admin-card">
      <div className="admin-card-head">
        <div>
          <h2>
            <i className="fas fa-users" aria-hidden="true" /> Users &amp; roles
          </h2>
          <p className="row-sub">Administrators manage the platform; counsellors manage leads; editors manage website content.</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
          <i className="fas fa-user-plus" aria-hidden="true" /> Add user
        </button>
      </div>

      {notice ? (
        <p className={`form-notice plain ${notice.type}`} role={notice.type === 'error' ? 'alert' : 'status'}>
          <span>{notice.message}</span>
        </p>
      ) : null}

      {loading ? (
        <TableSkeleton columns={6} />
      ) : error ? (
        <StateBlock variant="error" title="Could not load users" message={error.message} onRetry={load} />
      ) : (
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Last login</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <span className="badge badge-new">{user.role}</span>
                  </td>
                  <td>
                    <span className={`badge badge-${user.status}`}>{user.status}</span>
                  </td>
                  <td>{formatDate(user.lastLoginAt)}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(user)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      disabled={deleting || user.id === currentUser?.id}
                      title={user.id === currentUser?.id ? 'You cannot delete your own account' : 'Delete user'}
                      onClick={() => setConfirmation({ user, message: `Delete the account for ${user.name}?` })}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing ? (
        <Modal
          title={editing.id ? 'Edit user' : 'Add user'}
          onClose={saving ? undefined : () => setEditing(null)}
          footer={
            <>
              <button type="button" className="btn btn-ghost" disabled={saving} onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <i className="fas fa-spinner fa-spin" aria-hidden="true" /> Saving…
                  </>
                ) : (
                  <>
                    <i className="fas fa-floppy-disk" aria-hidden="true" /> Save
                  </>
                )}
              </button>
            </>
          }
        >
          <AdminNotice notice={formError ? { type: 'error', message: formError } : null} />
          <form id="user-form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <label htmlFor="user-name">Name *</label>
              <input
                id="user-name"
                minLength={2}
                maxLength={150}
                disabled={saving}
                className="admin-input"
                type="text"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="user-email">Email *</label>
              <input
                id="user-email"
                maxLength={190}
                disabled={saving}
                className="admin-input"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>

            <div className="admin-field">
              <label htmlFor="user-password">
                Password {editing.id ? '(leave blank to keep current)' : '*'}
              </label>
              <input
                id="user-password"
                minLength={8}
                maxLength={128}
                disabled={saving}
                className="admin-input"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                required={!editing.id}
              />
              <p className="hint">Minimum 8 characters.</p>
            </div>

            <div className="admin-grid-2">
              <div className="admin-field">
                <label htmlFor="user-role">Role</label>
                <select
                  id="user-role"
                  className="admin-select"
                  value={form.role}
                  onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
                >
                  <option value="admin">Administrator</option>
                  <option value="staff">Staff</option>
                  <option value="counsellor">Counsellor</option>
                  <option value="editor">Editor</option>
                </select>
              </div>

              <div className="admin-field">
                <label htmlFor="user-status">Status</label>
                <select
                  id="user-status"
                  className="admin-select"
                  value={form.status}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </div>
            </div>
          </form>
        </Modal>
      ) : null}
      <ConfirmAction action={confirmation} busy={deleting} onClose={() => setConfirmation(null)} onConfirm={handleDelete} />
    </div>
  )
}
