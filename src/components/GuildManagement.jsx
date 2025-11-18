import React, { useState, useEffect } from 'react';
import GuildList from './GuildList';
import GuildForm from './GuildForm';

function GuildManagement({ onViewDetail, guildToEdit }) {
  const [showForm, setShowForm] = useState(false);
  const [editingGuild, setEditingGuild] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // If guildToEdit is provided from parent, open form
  useEffect(() => {
    if (guildToEdit) {
      setEditingGuild(guildToEdit);
      setShowForm(true);
    }
  }, [guildToEdit]);

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
        onViewDetail={onViewDetail}
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
