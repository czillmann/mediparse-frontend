import { useState, useEffect } from 'react'
import Login from './components/Login'
import Register from './components/Register'
import FileUpload from './components/FileUpload'
import FileList from './components/FileList'
import Navigation from './components/Navigation'
import HealthInsuranceManagement from './components/HealthInsuranceManagement'
import ServiceProviderManagement from './components/ServiceProviderManagement'
import GuildManagement from './components/GuildManagement'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [showRegister, setShowRegister] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [currentView, setCurrentView] = useState('dashboard')

  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = () => {
      try {
        const authData = localStorage.getItem('mediparse_auth')
        if (authData) {
          const parsed = JSON.parse(authData)
          if (parsed.accessToken && parsed.email) {
            setIsAuthenticated(true)
            setCurrentUser(parsed.companyName || parsed.email)
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const handleLogin = (username) => {
    setIsAuthenticated(true)
    setCurrentUser(username)
  }

  const handleRegister = (username) => {
    setIsAuthenticated(true)
    setCurrentUser(username)
  }

  const handleLogout = () => {
    // Clear authentication data
    localStorage.removeItem('mediparse_auth')
    setIsAuthenticated(false)
    setCurrentUser(null)
    setShowRegister(false)
  }

  const switchToRegister = () => {
    setShowRegister(true)
  }

  const switchToLogin = () => {
    setShowRegister(false)
  }

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleNavigate = (view) => {
    setCurrentView(view)
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <>
            <div className="welcome-section">
              <h2>Willkommen bei MediParse{currentUser && `, ${currentUser}`}!</h2>
              <p>KI-gestützte Extraktion von Preis- und Vertragsdaten aus PDF-Dokumenten</p>
            </div>

            <div className="upload-section">
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </div>

            <div className="files-section">
              <FileList refreshTrigger={refreshTrigger} />
            </div>

            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📄</div>
                <h3>PDF-Import</h3>
                <p>Laden Sie Verträge und Preislisten hoch</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">🧠</div>
                <h3>KI-Extraktion</h3>
                <p>Automatische Erkennung von Preisen und Metadaten</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">✓</div>
                <h3>Validierung</h3>
                <p>Überprüfung und Normalisierung der Daten</p>
              </div>

              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h3>Export</h3>
                <p>Ausgabe in CSV, JSON, Excel oder XML</p>
              </div>
            </div>
          </>
        )
      case 'contracts':
        return (
          <div className="content-view">
            <FileList refreshTrigger={refreshTrigger} />
          </div>
        )
      case 'insurances':
        return (
          <div className="content-view">
            <HealthInsuranceManagement />
          </div>
        )
      case 'providers':
        return (
          <div className="content-view">
            <ServiceProviderManagement />
          </div>
        )
      case 'guilds':
        return (
          <div className="content-view">
            <GuildManagement />
          </div>
        )
      default:
        return null
    }
  }

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Wird geladen...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    if (showRegister) {
      return <Register onRegister={handleRegister} onSwitchToLogin={switchToLogin} />
    }
    return <Login onLogin={handleLogin} onSwitchToRegister={switchToRegister} />
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="header-logo-icon">
              <path d="M19.5 2.5h-15A2.5 2.5 0 0 0 2 5v14a2.5 2.5 0 0 0 2.5 2.5h15A2.5 2.5 0 0 0 22 19V5a2.5 2.5 0 0 0-2.5-2.5zm-7.5 15h-2v-2h2v2zm0-4h-2V6h2v7.5z"/>
            </svg>
            <h1>MediParse</h1>
          </div>
          <div className="header-user">
            <span className="user-name">{currentUser}</span>
            <button onClick={handleLogout} className="logout-button">
              Abmelden
            </button>
          </div>
        </div>
      </header>

      <Navigation currentView={currentView} onNavigate={handleNavigate} />

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  )
}

export default App
