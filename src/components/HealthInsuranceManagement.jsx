import React, { useState } from 'react';
import HealthInsuranceList from './HealthInsuranceList';
import HealthInsuranceForm from './HealthInsuranceForm';

function HealthInsuranceManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdd = () => {
    setEditingInsurance(null);
    setShowForm(true);
  };

  const handleEdit = (insurance) => {
    setEditingInsurance(insurance);
    setShowForm(true);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingInsurance(null);
    // Trigger refresh of the list
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingInsurance(null);
  };

  return (
    <div>
      <HealthInsuranceList
        key={refreshKey}
        onAdd={handleAdd}
        onEdit={handleEdit}
      />
      {showForm && (
        <HealthInsuranceForm
          insurance={editingInsurance}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default HealthInsuranceManagement;
