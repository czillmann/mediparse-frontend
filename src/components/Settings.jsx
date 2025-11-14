import { useState } from 'react'
import UserManagement from './UserManagement'
import './Settings.css'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Einstellungen</h2>
      </div>

      <div className="settings-content">
        <div className="settings-sidebar">
          <button
            className={`settings-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span className="settings-tab-icon">👥</span>
            <span>Benutzerverwaltung</span>
          </button>
        </div>

        <div className="settings-main">
          {activeTab === 'users' && <UserManagement />}
        </div>
      </div>
    </div>
  )
}

export default Settings
