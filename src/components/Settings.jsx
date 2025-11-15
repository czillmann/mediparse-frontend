import { useState } from 'react'
import UserManagement from './UserManagement'
import ProductGroupSettingsManagement from './ProductGroupSettingsManagement'
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
          <button
            className={`settings-tab ${activeTab === 'productgroups' ? 'active' : ''}`}
            onClick={() => setActiveTab('productgroups')}
          >
            <span className="settings-tab-icon">📦</span>
            <span>Produktgruppen</span>
          </button>
        </div>

        <div className="settings-main">
          {activeTab === 'users' && <UserManagement />}
          {activeTab === 'productgroups' && <ProductGroupSettingsManagement />}
        </div>
      </div>
    </div>
  )
}

export default Settings
