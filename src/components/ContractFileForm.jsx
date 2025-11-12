import React, { useState, useEffect } from 'react';
import { getHealthInsurances, getServiceProviders, getGuilds, updateContractFile } from '../services/api';
import './ContractFileForm.css';

function ContractFileForm({ contractFile, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    healthInsuranceId: '',
    serviceProviderIds: [],
    guildIds: [],
  });
  const [healthInsurances, setHealthInsurances] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [guilds, setGuilds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Load all master data
    const loadData = async () => {
      try {
        const [insurancesData, providersData, guildsData] = await Promise.all([
          getHealthInsurances(),
          getServiceProviders(),
          getGuilds()
        ]);
        setHealthInsurances(insurancesData);
        setServiceProviders(providersData);
        setGuilds(guildsData);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Fehler beim Laden der Stammdaten');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (contractFile) {
      setFormData({
        healthInsuranceId: contractFile.healthInsuranceId || '',
        serviceProviderIds: contractFile.serviceProviderIds || [],
        guildIds: contractFile.guildIds || [],
      });
    }
  }, [contractFile]);

  const handleHealthInsuranceChange = (e) => {
    setFormData({
      ...formData,
      healthInsuranceId: e.target.value,
    });
  };

  const handleServiceProviderToggle = (providerId) => {
    const currentIds = formData.serviceProviderIds || [];
    const newIds = currentIds.includes(providerId)
      ? currentIds.filter(id => id !== providerId)
      : [...currentIds, providerId];

    setFormData({
      ...formData,
      serviceProviderIds: newIds,
    });
  };

  const handleGuildToggle = (guildId) => {
    const currentIds = formData.guildIds || [];
    const newIds = currentIds.includes(guildId)
      ? currentIds.filter(id => id !== guildId)
      : [...currentIds, guildId];

    setFormData({
      ...formData,
      guildIds: newIds,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await updateContractFile(contractFile.id, formData);
      onSave(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="contract-file-form-overlay">
      <div className="contract-file-form-modal">
        <div className="form-header">
          <h2>Vertrag bearbeiten</h2>
          <button className="close-button" onClick={onCancel} type="button">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="contract-file-form">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-info">
            <label>Dateiname:</label>
            <p className="file-name">{contractFile?.fileName}</p>
          </div>

          <div className="form-section">
            <h3>Krankenkasse</h3>
            <div className="form-group">
              <label htmlFor="healthInsurance">
                Krankenkasse auswählen <span className="required">*</span>
              </label>
              <select
                id="healthInsurance"
                value={formData.healthInsuranceId}
                onChange={handleHealthInsuranceChange}
                required
              >
                <option value="">-- Bitte wählen --</option>
                {healthInsurances.map((insurance) => (
                  <option key={insurance.id} value={insurance.id}>
                    {insurance.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>Leistungserbringer</h3>
            <div className="selection-wrapper">
              <div className="selection-grid">
                {serviceProviders.length === 0 ? (
                  <p className="no-items">Keine Leistungserbringer verfügbar</p>
                ) : (
                  serviceProviders.map((provider) => (
                    <label key={provider.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.serviceProviderIds?.includes(provider.id) || false}
                        onChange={() => handleServiceProviderToggle(provider.id)}
                      />
                      <span className="item-name">{provider.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Innungen</h3>
            <div className="selection-wrapper">
              <div className="selection-grid">
                {guilds.length === 0 ? (
                  <p className="no-items">Keine Innungen verfügbar</p>
                ) : (
                  guilds.map((guild) => (
                    <label key={guild.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={formData.guildIds?.includes(guild.id) || false}
                        onChange={() => handleGuildToggle(guild.id)}
                      />
                      <span className="item-name">{guild.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="form-footer">
            <button
              type="button"
              className="btn-cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={loading}
            >
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ContractFileForm;
