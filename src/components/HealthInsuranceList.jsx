import React, { useState, useEffect } from 'react';
import { getHealthInsurances } from '../services/api';
import './HealthInsuranceList.css';

function HealthInsuranceList({ onAdd, onViewDetail }) {
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadInsurances();
  }, []);

  const loadInsurances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getHealthInsurances();
      setInsurances(data);
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
    return <div className="health-insurance-list loading">Laden...</div>;
  }

  if (error) {
    return (
      <div className="health-insurance-list error">
        <p>Fehler: {error}</p>
        <button onClick={loadInsurances}>Erneut versuchen</button>
      </div>
    );
  }

  return (
    <div className="health-insurance-list">
      <div className="list-header">
        <h2>Krankenkassen</h2>
        <button className="btn-primary" onClick={onAdd}>
          + Neue Krankenkasse
        </button>
      </div>

      {insurances.length === 0 ? (
        <div className="empty-state">
          <p>Noch keine Krankenkassen angelegt.</p>
          <button className="btn-primary" onClick={onAdd}>
            Jetzt anlegen
          </button>
        </div>
      ) : (
        <div className="insurance-grid">
          {insurances.map((insurance) => (
            <div
              key={insurance.id}
              className="insurance-card clickable"
              onClick={() => onViewDetail(insurance)}
            >
              <div className="insurance-card-header">
                <h3>{insurance.name}</h3>
              </div>
              <div className="insurance-card-body">
                <div className="insurance-info">
                  <label>IK-Nummer:</label>
                  <p>{insurance.ikNumber || 'Nicht angegeben'}</p>
                </div>
                <div className="insurance-info">
                  <label>Adresse:</label>
                  <p>{formatAddress(insurance.address)}</p>
                </div>
              </div>
              <div className="insurance-card-footer">
                <span className="view-details">Details ansehen →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HealthInsuranceList;
