import { useState } from 'react'
import './Login.css'
import { loginUser } from '../services/api'

function Login({ onLogin, onSwitchToRegister }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Check default admin credentials
      if (email === 'admin' && password === 'admin') {
        onLogin('Admin')
        return
      }

      // Authenticate with backend/Cognito
      const response = await loginUser(email, password)

      // Store user data in localStorage
      localStorage.setItem('mediparse_auth', JSON.stringify({
        accessToken: response.accessToken,
        idToken: response.idToken,
        refreshToken: response.refreshToken,
        companyName: response.companyName,
        email: response.email
      }))

      onLogin(response.companyName)
    } catch (err) {
      setError(err.message || 'Anmeldung fehlgeschlagen. Bitte versuchen Sie es erneut.')
      setIsLoading(false)
    }
  }

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="login-card">
          <div className="login-header">
            <div className="logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="logo-icon">
                <path d="M19.5 2.5h-15A2.5 2.5 0 0 0 2 5v14a2.5 2.5 0 0 0 2.5 2.5h15A2.5 2.5 0 0 0 22 19V5a2.5 2.5 0 0 0-2.5-2.5zm-7.5 15h-2v-2h2v2zm0-4h-2V6h2v7.5z"/>
              </svg>
            </div>
            <h1>MediParse</h1>
            <p className="subtitle">KI-gestützte Vertragsanalyse</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">E-Mail-Adresse</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre.email@beispiel.de"
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Passwort</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort eingeben"
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="error-message">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}

            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Anmeldung läuft...
                </>
              ) : (
                'Anmelden'
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              Noch kein Konto?{' '}
              <button
                type="button"
                className="switch-link"
                onClick={onSwitchToRegister}
                disabled={isLoading}
              >
                Jetzt registrieren
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Login
