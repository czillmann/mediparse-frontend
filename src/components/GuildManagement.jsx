import React, { useState } from 'react';
import GuildList from './GuildList';
import GuildForm from './GuildForm';

function GuildManagement() {
  const [showForm, setShowForm] = useState(false);
  const [editingGuild, setEditingGuild] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleAdd = () => {
    setEditingGuild(null);
    setShowForm(true);
  };

  const handleEdit = (guild) => {
    setEditingGuild(guild);
    setShowForm(true);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingGuild(null);
    // Trigger refresh of the list
    setRefreshKey(prev => prev + 1);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingGuild(null);
  };

  return (
    <div>
      <GuildList
        key={refreshKey}
        onAdd={handleAdd}
        onEdit={handleEdit}
      />
      {showForm && (
        <GuildForm
          guild={editingGuild}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

export default GuildManagement;
