import React from 'react';
import './Navigation.css';

function Navigation({ currentView, onNavigate }) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '🏠' },
    { id: 'contracts', label: 'Verträge', icon: '📄' },
    { id: 'insurances', label: 'Krankenkassen', icon: '🏥' },
    { id: 'providers', label: 'Leistungserbringer', icon: '🏢' },
    { id: 'guilds', label: 'Innungen', icon: '🤝' },
  ];

  // Determine which tab should be active based on current view
  const getActiveTab = () => {
    if (currentView === 'insurance-detail') return 'insurances';
    if (currentView === 'provider-detail') return 'providers';
    if (currentView === 'guild-detail') return 'guilds';
    if (currentView === 'contract-prices') return 'contracts';
    return currentView;
  };

  const activeTab = getActiveTab();

  return (
    <nav className="navigation">
      <div className="nav-items">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default Navigation;
