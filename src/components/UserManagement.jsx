import { useState, useEffect } from 'react'
import { getUsers, inviteUser, deleteUser } from '../services/api'
import './UserManagement.css'

const UserManagement = () => {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', temporaryPassword: '' })
  const [inviting, setInviting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUsers()
      setUsers(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e) => {
    e.preventDefault()
    try {
      setInviting(true)
      await inviteUser(inviteForm)
      setInviteForm({ email: '', temporaryPassword: '' })
      setShowInviteForm(false)
      await loadUsers()
      alert('Benutzer erfolgreich eingeladen')
    } catch (err) {
      alert(`Fehler: ${err.message}`)
    } finally {
      setInviting(false)
    }
  }

  const handleDelete = async (userId, email) => {
    if (!confirm(`Möchten Sie den Benutzer "${email}" wirklich löschen?`)) {
      return
    }
    try {
      setDeletingId(userId)
      await deleteUser(userId)
      await loadUsers()
    } catch (err) {
      alert(`Fehler: ${err.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%'
    let password = ''
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setInviteForm({ ...inviteForm, temporaryPassword: password })
  }

  return (
    <div className="user-management-container">
      <div className="user-management-header">
        <h2>Benutzerverwaltung</h2>
        <button className="invite-button" onClick={() => setShowInviteForm(true)}>
          + Benutzer einladen
        </button>
      </div>

      {loading && <div className="loading-message">Lade Benutzer...</div>}

      {error && (
        <div className="error-message">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="users-table-wrapper">
          <table className="users-table">
            <thead>
              <tr>
                <th>E-Mail</th>
                <th style={{ textAlign: 'right' }}>Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td style={{ textAlign: 'right' }}>
                    {users.length > 1 && (
                      <button
                        className="delete-user-button"
                        onClick={() => handleDelete(user.id, user.email)}
                        disabled={deletingId === user.id}
                        title="Benutzer löschen"
                      >
                        {deletingId === user.id ? '⏳' : '🗑️'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInviteForm && (
        <div className="invite-modal-overlay" onClick={() => setShowInviteForm(false)}>
          <div className="invite-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="invite-modal-header">
              <h3>Benutzer einladen</h3>
              <button className="close-button" onClick={() => setShowInviteForm(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleInvite} className="invite-form">
              <div className="form-group">
                <label>E-Mail-Adresse</label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  required
                  placeholder="benutzer@example.com"
                />
              </div>
              <div className="form-group">
                <label>Temporäres Passwort</label>
                <div className="password-input-group">
                  <input
                    type="text"
                    value={inviteForm.temporaryPassword}
                    onChange={(e) => setInviteForm({ ...inviteForm, temporaryPassword: e.target.value })}
                    required
                    placeholder="Mindestens 8 Zeichen"
                  />
                  <button type="button" onClick={generatePassword} className="generate-button">
                    Generieren
                  </button>
                </div>
                <small>Der Benutzer muss das Passwort beim ersten Login ändern</small>
              </div>
              <div className="invite-modal-footer">
                <button type="button" onClick={() => setShowInviteForm(false)} className="cancel-button">
                  Abbrechen
                </button>
                <button type="submit" disabled={inviting} className="submit-button">
                  {inviting ? 'Lädt ein...' : 'Einladen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
