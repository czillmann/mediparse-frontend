import React, { useState, useEffect } from 'react';
import { getServiceProviders, getGuilds } from '../services/api';
import './ServiceProviderList.css';

function ServiceProviderList({ onAdd, onViewDetail }) {
  const [providers, setProviders] = useState([]);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const [providersData, guildsData] = await Promise.all([
        getServiceProviders(),
        getGuilds()
      ]);
      setProviders(providersData);
      setGuilds(guildsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderGuildBadges = (guildIds) => {
    if (!guildIds || guildIds.length === 0) {
      return <span style={{ color: '#999', fontStyle: 'italic' }}>Keine Innungen</span>;
    }

    const guildNames = guildIds
      .map(id => guilds.find(g => g.id === id))
      .filter(guild => guild);

    if (guildNames.length === 0) {
      return <span style={{ color: '#999', fontStyle: 'italic' }}>Keine Innungen</span>;
    }

    return (
      <>
        {guildNames.map((guild) => (
          <span key={guild.id} className="guild-badge">
            {guild.name}
          </span>
        ))}
      </>
    );
  };

  const formatAddress = (address) => {
    if (!address) return 'Keine Adresse';
    const parts = [];
    if (address.street && address.houseNumber) {
      parts.push(`${address.street} ${address.houseNumber}`);
    }
    if (address.postalCode && address.city) {
      parts.push(`${address.postalCode} ${address.city}`);
    }
    if (address.country) {
      parts.push(address.country);
    }
    return parts.join(', ') || 'Keine Adresse';
  };

  if (loading) {
    return <div className="service-provider-list loading">Laden...</div>;
  }

  if (error) {
    return (
      <div className="service-provider-list error">
        <p>Fehler: {error}</p>
        <button onClick={loadProviders}>Erneut versuchen</button>
      </div>
    );
  }

  return (
    <div className="service-provider-list">
      <div className="list-header">
        <h2>Leistungserbringer</h2>
        <button className="btn-primary" onClick={onAdd}>
          + Neuer Leistungserbringer
        </button>
      </div>

      {providers.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Leistungserbringer angelegt.</p>
          <button className="btn-primary" onClick={onAdd}>
            Jetzt anlegen
          </button>
        </div>
      ) : (
        <div className="provider-grid">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className="provider-card clickable"
              onClick={() => onViewDetail(provider)}
            >
              <div className="provider-card-header">
                <h3>{provider.name}</h3>
              </div>
              <div className="provider-card-body">
                <div className="provider-info">
                  <label>IK-Nummer:</label>
                  <p>{provider.ikNumber || 'Nicht angegeben'}</p>
                </div>
                <div className="provider-info">
                  <label>Adresse:</label>
                  <p>{formatAddress(provider.address)}</p>
                </div>
                <div className="provider-info">
                  <label>Innungen:</label>
                  <p>{renderGuildBadges(provider.guildIds)}</p>
                </div>
              </div>
              <div className="provider-card-footer">
                <span className="view-details">Details ansehen →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ServiceProviderList;
