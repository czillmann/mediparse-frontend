import { useState } from 'react'
import { registerUser } from '../services/api'
import './Register.css'

function Register({ onRegister, onSwitchToLogin }) {
  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const validateForm = () => {
    if (!companyName || !email || !password || !confirmPassword) {
      setError('Bitte füllen Sie alle Felder aus.')
      return false
    }

    if (companyName.length < 2) {
      setError('Unternehmensname muss mindestens 2 Zeichen lang sein.')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Bitte geben Sie eine gültige E-Mail-Adresse ein.')
      return false
    }

    if (password.length < 6) {
      setError('Passwort muss mindestens 6 Zeichen lang sein.')
      return false
    }

    if (password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.')
      return false
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      // Call backend API to register user
      const response = await registerUser({
        companyName,
        email,
        password
      })

      // Registration successful
      // Store user info in localStorage for demo purposes
      const userData = {
        companyName: response.companyName,
        email: response.email,
        userId: response.userId,
        companyId: response.companyId
      }
      localStorage.setItem('mediparse_current_user', JSON.stringify(userData))

      // Call onRegister callback with company name
      onRegister(response.companyName)

    } catch (error) {
      setError(error.message || 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
      setIsLoading(false)
    }
  }

  return (
    <div className="register-container">
      <div className="register-background">
        <div className="register-card">
          <div className="register-header">
            <div className="logo">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="logo-icon">
                <path d="M19.5 2.5h-15A2.5 2.5 0 0 0 2 5v14a2.5 2.5 0 0 0 2.5 2.5h15A2.5 2.5 0 0 0 22 19V5a2.5 2.5 0 0 0-2.5-2.5zm-7.5 15h-2v-2h2v2zm0-4h-2V6h2v7.5z"/>
              </svg>
            </div>
            <h1>MediParse</h1>
            <p className="subtitle">Neues Konto erstellen</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="form-group">
              <label htmlFor="companyName">Unternehmensname</label>
              <input
                type="text"
                id="companyName"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="z.B. Sanitätshaus Müller GmbH"
                disabled={isLoading}
                autoComplete="organization"
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">E-Mail-Adresse</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ihre.email@beispiel.de"
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
                placeholder="Mindestens 6 Zeichen"
                disabled={isLoading}
                autoComplete="new-password"
              />
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Passwort bestätigen</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                disabled={isLoading}
                autoComplete="new-password"
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
              className={`register-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Registrierung läuft...
                </>
              ) : (
                'Konto erstellen'
              )}
            </button>
          </form>

          <div className="register-footer">
            <p>
              Bereits ein Konto?{' '}
              <button
                type="button"
                className="switch-link"
                onClick={onSwitchToLogin}
                disabled={isLoading}
              >
                Jetzt anmelden
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Register
