import React, { useState, useEffect } from 'react';
import { getHealthInsurances, deleteHealthInsurance } from '../services/api';
import './HealthInsuranceList.css';

function HealthInsuranceList({ onAdd, onEdit }) {
  const [insurances, setInsurances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  const handleDelete = async (id, name) => {
    if (!confirm(`Möchten Sie die Krankenkasse "${name}" wirklich löschen?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteHealthInsurance(id);
      setInsurances(insurances.filter(ins => ins.id !== id));
    } catch (err) {
      alert(`Fehler beim Löschen: ${err.message}`);
    } finally {
      setDeletingId(null);
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
            <div key={insurance.id} className="insurance-card">
              <div className="insurance-card-header">
                <h3>{insurance.name}</h3>
              </div>
              <div className="insurance-card-body">
                <div className="insurance-info">
                  <label>Adresse:</label>
                  <p>{formatAddress(insurance.address)}</p>
                </div>
              </div>
              <div className="insurance-card-footer">
                <button
                  className="btn-secondary"
                  onClick={() => onEdit(insurance)}
                  disabled={deletingId === insurance.id}
                >
                  Bearbeiten
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDelete(insurance.id, insurance.name)}
                  disabled={deletingId === insurance.id}
                >
                  {deletingId === insurance.id ? 'Löschen...' : 'Löschen'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default HealthInsuranceList;
