import React, { useState, useEffect } from 'react';
import ServiceProviderList from './ServiceProviderList';
import ServiceProviderForm from './ServiceProviderForm';

function ServiceProviderManagement({ onViewDetail, providerToEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // If providerToEdit is provided from parent, open form
  useEffect(() => {
    if (providerToEdit) {
      setEditingProvider(providerToEdit);
      setShowForm(true);
    }
  }, [providerToEdit]);

  const handleAdd = () => {
    setEditingProvider(null);
    setShowForm(true);
  };

  const handleEdit = (provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingProvider(null);
    // Trigger refresh of the list
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProvider(null);
  };

  return (
    <div>
      <ServiceProviderList
        key={refreshKey}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onViewDetail={onViewDetail}
      />
      {showForm && (
        <ServiceProviderForm
          provider={editingProvider}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default ServiceProviderManagement;
