import React, { useState, useEffect } from 'react';
import { getGuilds } from '../services/api';
import './GuildList.css';

function GuildList({ onAdd, onViewDetail }) {
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGuilds();
  }, []);

  const loadGuilds = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGuilds();
      setGuilds(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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
    return <div className="guild-list loading">Laden...</div>;
  }

  if (error) {
    return (
      <div className="guild-list error">
        <p>Fehler: {error}</p>
        <button onClick={loadGuilds}>Erneut versuchen</button>
      </div>
    );
  }

  return (
    <div className="guild-list">
      <div className="list-header">
        <h2>Innungen</h2>
        <button className="btn-primary" onClick={onAdd}>
          + Neue Innung
        </button>
      </div>

      {guilds.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Innungen angelegt.</p>
          <button className="btn-primary" onClick={onAdd}>
            Jetzt anlegen
          </button>
        </div>
      ) : (
        <div className="guild-grid">
          {guilds.map((guild) => (
            <div
              key={guild.id}
              className="guild-card clickable"
              onClick={() => onViewDetail(guild)}
            >
              <div className="guild-card-header">
                <h3>{guild.name}</h3>
              </div>
              <div className="guild-card-body">
                <div className="guild-info">
                  <label>Adresse:</label>
                  <p>{formatAddress(guild.address)}</p>
                </div>
              </div>
              <div className="guild-card-footer">
                <span className="view-details">Details ansehen →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default GuildList;
