import React, { useState, useEffect } from 'react';
import { getServiceProvider, deleteServiceProvider, getGuilds, getContractFiles } from '../services/api';
import ServiceProviderForm from './ServiceProviderForm';
import './ServiceProviderDetail.css';

function ServiceProviderDetail({ providerId, onBack, onEdit }) {
  const [provider, setProvider] = useState(null);
  const [guilds, setGuilds] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  useEffect(() => {
    loadProvider();
    loadGuilds();
    loadContracts();
  }, [providerId]);

  const loadProvider = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getServiceProvider(providerId);
      setProvider(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadGuilds = async () => {
    try {
      const data = await getGuilds();
      setGuilds(data);
    } catch (err) {
      console.error('Fehler beim Laden der Innungen:', err);
    }
  };

  const loadContracts = async () => {
    try {
      const data = await getContractFiles();
      // Filter contracts for this service provider
      const providerContracts = data.filter(contract =>
        contract.serviceProviderId === providerId
      );
      setContracts(providerContracts);
    } catch (err) {
      console.error('Fehler beim Laden der Verträge:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Möchten Sie den Leistungserbringer "${provider.name}" wirklich löschen?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteServiceProvider(providerId);
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
    loadProvider(); // Reload data after edit
    loadContracts(); // Reload contracts in case provider changed
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

  const getGuildNames = (guildIds) => {
    if (!guildIds || guildIds.length === 0) {
      return 'Keine Innungen';
    }

    const guildNames = guildIds
      .map(id => guilds.find(g => g.id === id))
      .filter(guild => guild)
      .map(guild => guild.name);

    return guildNames.length > 0 ? guildNames.join(', ') : 'Keine Innungen';
  };

  if (loading) {
    return <div className="service-provider-detail loading-message">Laden...</div>;
  }

  if (error) {
    return (
      <div className="service-provider-detail error-message">
        <p>Fehler: {error}</p>
        <button className="btn-secondary" onClick={onBack}>
          Zurück
        </button>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="service-provider-detail error-message">
        <p>Leistungserbringer nicht gefunden</p>
        <button className="btn-secondary" onClick={onBack}>
          Zurück
        </button>
      </div>
    );
  }

  return (
    <div className="service-provider-detail">
      <div className="detail-header">
        <button className="back-button" onClick={onBack}>
          ← Zurück
        </button>
        <h1>{provider.name}</h1>
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
              <p>{provider.name || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>IK-Nummer</label>
              <p>{provider.ikNumber || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>Innungen</label>
              <p>{getGuildNames(provider.guildIds)}</p>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h2>Adresse</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Straße und Hausnummer</label>
              <p>
                {provider.address?.street && provider.address?.houseNumber
                  ? `${provider.address.street} ${provider.address.houseNumber}`
                  : 'Nicht angegeben'}
              </p>
            </div>
            <div className="info-item">
              <label>PLZ</label>
              <p>{provider.address?.postalCode || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>Stadt</label>
              <p>{provider.address?.city || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>Land</label>
              <p>{provider.address?.country || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item full-width">
              <label>Vollständige Adresse</label>
              <p>{formatAddress(provider.address)}</p>
            </div>
          </div>
        </div>

        <div className="info-section">
          <h2>Kontaktinformationen</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Telefon</label>
              <p>{provider.phone || 'Nicht angegeben'}</p>
            </div>
            <div className="info-item">
              <label>E-Mail</label>
              <p>
                {provider.email ? (
                  <a href={`mailto:${provider.email}`}>{provider.email}</a>
                ) : (
                  'Nicht angegeben'
                )}
              </p>
            </div>
            <div className="info-item">
              <label>Webseite</label>
              <p>
                {provider.website ? (
                  <a href={provider.website} target="_blank" rel="noopener noreferrer">
                    {provider.website}
                  </a>
                ) : (
                  'Nicht angegeben'
                )}
              </p>
            </div>
          </div>
        </div>

        {provider.notes && (
          <div className="info-section">
            <h2>Notizen</h2>
            <div className="info-item full-width">
              <p className="notes">{provider.notes}</p>
            </div>
          </div>
        )}

        <div className="info-section">
          <h2>Verknüpfte Innungen</h2>
          {provider.guildIds && provider.guildIds.length > 0 ? (
            <div className="linked-items-grid">
              {provider.guildIds.map(guildId => {
                const guild = guilds.find(g => g.id === guildId);
                return guild ? (
                  <div key={guild.id} className="linked-item">
                    <div className="linked-item-icon">🤝</div>
                    <div className="linked-item-content">
                      <div className="linked-item-name">{guild.name}</div>
                      {guild.address && guild.address.city && (
                        <div className="linked-item-detail">{guild.address.city}</div>
                      )}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          ) : (
            <p className="empty-message">Keine Innungen verknüpft</p>
          )}
        </div>

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
        <ServiceProviderForm
          provider={provider}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
        />
      )}
    </div>
  );
}

export default ServiceProviderDetail;
