import { useState } from 'react';

/**
 * Process Manager - View, edit, and delete saved company processes
 */
export default function ProcessManager({
  processes,
  onEdit,
  onDelete,
  onSelect,
  loading
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Filter processes by search term (search both display name and company name)
  const filteredProcesses = processes.filter(p => {
    const term = searchTerm.toLowerCase();
    const displayName = (p.displayName || '').toLowerCase();
    const companyName = (p.companyName || '').toLowerCase();
    return displayName.includes(term) || companyName.includes(term);
  });

  const handleDelete = (processId) => {
    if (deleteConfirm === processId) {
      onDelete(processId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(processId);
      // Auto-cancel after 3 seconds
      setTimeout(() => setDeleteConfirm(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Saved Processes</h3>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {processes.length} saved
        </span>
      </div>

      {/* Search */}
      {processes.length > 5 && (
        <div style={{ marginBottom: '1rem' }}>
          <input
            type="text"
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid var(--border)',
              borderRadius: '0.375rem',
              fontSize: '0.875rem'
            }}
          />
        </div>
      )}

      {/* Process List */}
      {filteredProcesses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📂</div>
          <h3>{processes.length === 0 ? 'No Saved Processes' : 'No Matches'}</h3>
          <p>
            {processes.length === 0
              ? 'Upload a file and create a mapping to save a process'
              : 'No processes match your search'}
          </p>
        </div>
      ) : (
        <div className="process-list">
          {filteredProcesses.map(process => (
            <div key={process.id} className="process-item">
              <div className="process-item-info">
                <h4>
                  {process.displayName || process.companyName}
                  {process.displayName && process.displayName !== process.companyName && (
                    <span style={{ fontWeight: 'normal', color: 'var(--text-muted)', fontSize: '0.8em', marginLeft: '0.5rem' }}>
                      ({process.companyName})
                    </span>
                  )}
                </h4>
                <p>
                  {Object.keys(process.fields || {}).length} field mappings
                  {process.entity && <> • Entity: {process.entity}</>}
                  {process.createdAt && (
                    <> • Created {formatDate(process.createdAt)}</>
                  )}
                </p>
              </div>
              <div className="process-item-actions">
                {onSelect && (
                  <button
                    className="btn btn-primary"
                    onClick={() => onSelect(process)}
                  >
                    Use
                  </button>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={() => onEdit(process)}
                >
                  Edit
                </button>
                <button
                  className={`btn ${deleteConfirm === process.id ? 'btn-danger' : 'btn-secondary'}`}
                  onClick={() => handleDelete(process.id)}
                >
                  {deleteConfirm === process.id ? 'Confirm?' : 'Delete'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Format date for display
 */
function formatDate(dateString) {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Compact process selector for quick selection
 */
export function ProcessSelector({ processes, selectedId, onSelect, loading }) {
  if (loading) {
    return (
      <select disabled style={{ padding: '0.5rem', borderRadius: '0.375rem' }}>
        <option>Loading...</option>
      </select>
    );
  }

  if (processes.length === 0) {
    return (
      <select disabled style={{ padding: '0.5rem', borderRadius: '0.375rem' }}>
        <option>No saved processes</option>
      </select>
    );
  }

  return (
    <select
      value={selectedId || ''}
      onChange={(e) => {
        const process = processes.find(p => p.id === e.target.value);
        onSelect(process);
      }}
      style={{
        padding: '0.5rem',
        borderRadius: '0.375rem',
        border: '1px solid var(--border)',
        minWidth: '200px'
      }}
    >
      <option value="">-- Select a process --</option>
      {processes.map(p => (
        <option key={p.id} value={p.id}>
          {p.displayName || p.companyName}
          {p.displayName && p.displayName !== p.companyName && ` (${p.companyName})`}
        </option>
      ))}
    </select>
  );
}
