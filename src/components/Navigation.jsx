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

  return (
    <nav className="navigation">
      <div className="nav-items">
        {menuItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
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
