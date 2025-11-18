import React, { useState, useEffect } from 'react';
import HealthInsuranceList from './HealthInsuranceList';
import HealthInsuranceForm from './HealthInsuranceForm';

function HealthInsuranceManagement({ onViewDetail, insuranceToEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // If insuranceToEdit is provided from parent, open form
  useEffect(() => {
    if (insuranceToEdit) {
      setEditingInsurance(insuranceToEdit);
      setShowForm(true);
    }
  }, [insuranceToEdit]);

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
        onViewDetail={onViewDetail}
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
