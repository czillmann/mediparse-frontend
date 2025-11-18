import React, { useState, useEffect } from 'react';
import { getGuild, deleteGuild, getContractFiles, getServiceProviders } from '../services/api';
import GuildForm from './GuildForm';
import './GuildDetail.css';

function GuildDetail({ guildId, onBack, onEdit }) {
  const [guild, setGuild] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    loadGuild();
    loadContracts();
  }, [guildId]);

  const loadGuild = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGuild(guildId);
      setGuild(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadContracts = async () => {
    try {
      // Load all contracts and service providers
      const [allContracts, serviceProviders] = await Promise.all([
        getContractFiles(),
        getServiceProviders()
      ]);

      // Find service providers that belong to this guild
      const guildProviderIds = serviceProviders
        .filter(provider => provider.guildIds && provider.guildIds.includes(guildId))
        .map(provider => provider.id);

      // Filter contracts that belong to service providers of this guild
      const guildContracts = allContracts.filter(contract =>
        guildProviderIds.includes(contract.serviceProviderId)
      );

      setContracts(guildContracts);
    } catch (err) {
      console.error('Fehler beim Laden der Verträge:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Möchten Sie die Innung "${guild.name}" wirklich löschen?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteGuild(guildId);
      onBack();
    } catch (err) {
      alert(`Fehler beim Löschen: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    setShowEditForm(true);
  };

  const handleSaveEdit = () => {
    setShowEditForm(false);
    loadGuild(); // Reload data after edit
    loadContracts(); // Reload contracts in case guild changed
  };

  const handleCancelEdit = () => {
    setShowEditForm(false);
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
    return <div className="guild-detail loading-message">Laden...</div>;
  }

  if (error) {
    return (
      <div className="guild-detail error-message">
        <p>Fehler: {error}</p>
        <button className="btn-secondary" onClick={onBack}>
          Zurück
        </button>
      </div>
    );
  }

  if (!guild) {
    return (
      <div className="guild-detail error-message">
        <p>Innung nicht gefunden</p>
        <button className="btn-secondary" onClick={onBack}>
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="guild-detail">
      <div className="detail-header">
        <button className="back-button" onClick={onBack}>
          ← Zurück
        </button>
        <h1>{guild.name}</h1>
        <div className="menu-container">
          <button
            className="menu-button"
            onClick={() => setShowMenu(!showMenu)}
            disabled={deleting}
          >
            ⋮
          </button>
          {showMenu && (
            <div className="dropdown-menu">
              <button
                className="menu-item"
                onClick={handleEdit}
              >
                ✏️ Bearbeiten
              </button>
              <button
                className="menu-item danger"
                onClick={() => {
                  setShowMenu(false);
                  handleDelete();
                }}
                disabled={deleting}
              >
                🗑️ Löschen
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="detail-content">
        <div className="info-section">
          <h2>Allgemeine Informationen</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Name</label>
              <p>{guild.name || 'Nicht angegeben'}</p>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h2>Adresse</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Straße und Hausnummer</label>
              <p>
                {guild.address?.street && guild.address?.houseNumber
                  ? `${guild.address.street} ${guild.address.houseNumber}`
                  : 'Nicht angegeben'}
              </p>
            </div>
            <div className="info-item">
              <label>PLZ</label>
              <p>{guild.address?.postalCode || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>Stadt</label>
              <p>{guild.address?.city || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>Land</label>
              <p>{guild.address?.country || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item full-width">
              <label>Vollständige Adresse</label>
              <p>{formatAddress(guild.address)}</p>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h2>Kontaktinformationen</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Telefon</label>
              <p>{guild.phone || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>E-Mail</label>
              <p>
                {guild.email ? (
                  <a href={`mailto:${guild.email}`}>{guild.email}</a>
                ) : (
                  'Nicht angegeben'
                )}
              </p>
            </div>
            <div className="info-item">
              <label>Webseite</label>
              <p>
                {guild.website ? (
                  <a href={guild.website} target="_blank" rel="noopener noreferrer">
                    {guild.website}
                  </a>
                ) : (
                  'Nicht angegeben'
                )}
              </p>
            </div>
          </div>
        </div>

        {guild.notes && (
          <div className="info-section">
            <h2>Notizen</h2>
            <div className="info-item full-width">
              <p className="notes">{guild.notes}</p>
            </div>
          </div>
        )}

        <div className="info-section">
          <h2>Verknüpfte Verträge</h2>
          {contracts.length > 0 ? (
            <div className="linked-items-grid">
              {contracts.map(contract => (
                <div key={contract.id} className="linked-item">
                  <div className="linked-item-icon">📄</div>
                  <div className="linked-item-content">
                    <div className="linked-item-name">{contract.fileName}</div>
                    <div className="linked-item-detail">
                      {contract.uploadDate && new Date(contract.uploadDate).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">Keine Verträge verknüpft</p>
          )}
        </div>
      </div>

      {showEditForm && (
        <GuildForm
          guild={guild}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}

export default GuildDetail;
