import React, { useState, useEffect } from 'react';
import { createGuild, updateGuild } from '../services/api';
import './GuildForm.css';

function GuildForm({ guild, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    address: {
      street: '',
      houseNumber: '',
      postalCode: '',
      city: '',
      country: 'Deutschland',
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (guild) {
      setFormData({
        name: guild.name || '',
        address: {
          street: guild.address?.street || '',
          houseNumber: guild.address?.houseNumber || '',
          postalCode: guild.address?.postalCode || '',
          city: guild.address?.city || '',
          country: guild.address?.country || 'Deutschland',
        },
      });
    }
  }, [guild]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setFormData({
        ...formData,
        address: {
          ...formData.address,
          [addressField]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let result;
      if (guild) {
        // Update existing
        result = await updateGuild(guild.id, formData);
      } else {
        // Create new
        result = await createGuild(formData);
      }
      onSave(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="guild-form-overlay">
      <div className="guild-form-modal">
        <div className="form-header">
          <h2>{guild ? 'Innung bearbeiten' : 'Neue Innung anlegen'}</h2>
          <button className="close-button" onClick={onCancel} type="button">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="guild-form">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-section">
            <h3>Allgemeine Informationen</h3>
            <div className="form-group">
              <label htmlFor="name">
                Name der Innung <span className="required">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="z.B. Landesinnung der Sanitätshäuser"
                autoFocus
              />
            </div>
          </div>

          <div className="form-section">
            <h3>Adresse</h3>
            <div className="form-row">
              <div className="form-group flex-3">
                <label htmlFor="address.street">Straße</label>
                <input
                  type="text"
                  id="address.street"
                  name="address.street"
                  value={formData.address.street}
                  onChange={handleChange}
                  placeholder="z.B. Musterstraße"
                />
              </div>
              <div className="form-group flex-1">
                <label htmlFor="address.houseNumber">Hausnummer</label>
                <input
                  type="text"
                  id="address.houseNumber"
                  name="address.houseNumber"
                  value={formData.address.houseNumber}
                  onChange={handleChange}
                  placeholder="z.B. 123"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label htmlFor="address.postalCode">PLZ</label>
                <input
                  type="text"
                  id="address.postalCode"
                  name="address.postalCode"
                  value={formData.address.postalCode}
                  onChange={handleChange}
                  placeholder="z.B. 80331"
                  maxLength="5"
                />
              </div>
              <div className="form-group flex-3">
                <label htmlFor="address.city">Ort</label>
                <input
                  type="text"
                  id="address.city"
                  name="address.city"
                  value={formData.address.city}
                  onChange={handleChange}
                  placeholder="z.B. München"
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="address.country">Land</label>
              <input
                type="text"
                id="address.country"
                name="address.country"
                value={formData.address.country}
                onChange={handleChange}
                placeholder="z.B. Deutschland"
              />
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
              {loading ? 'Speichern...' : guild ? 'Aktualisieren' : 'Anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default GuildForm;
