import { useState, useEffect } from 'react';

/**
 * Import Dialog - Handles importing processes with duplicate detection
 * Shows options to overwrite, rename, or skip duplicate processes
 */
export default function ImportDialog({
  isOpen,
  importData,
  existingProcesses,
  onComplete,
  onCancel
}) {
  const [duplicates, setDuplicates] = useState([]);
  const [nonDuplicates, setNonDuplicates] = useState([]);
  const [currentDuplicateIndex, setCurrentDuplicateIndex] = useState(0);
  const [decisions, setDecisions] = useState({});
  const [applyToAll, setApplyToAll] = useState(false);
  const [applyToAllAction, setApplyToAllAction] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const [results, setResults] = useState({ imported: 0, overwritten: 0, skipped: 0 });

  // Parse import data and detect duplicates
  useEffect(() => {
    if (!importData || !isOpen) return;

    try {
      const processes = JSON.parse(importData);
      if (!Array.isArray(processes)) {
        alert('Invalid import file format. Expected an array of processes.');
        onCancel();
        return;
      }

      const dupes = [];
      const nonDupes = [];

      processes.forEach((proc, index) => {
        // Check for duplicate by company name or display name
        const isDuplicate = existingProcesses.some(existing =>
          existing.companyName?.toLowerCase() === proc.companyName?.toLowerCase() ||
          (existing.displayName && proc.displayName &&
           existing.displayName.toLowerCase() === proc.displayName.toLowerCase())
        );

        if (isDuplicate) {
          dupes.push({ ...proc, _importIndex: index });
        } else {
          nonDupes.push({ ...proc, _importIndex: index });
        }
      });

      setDuplicates(dupes);
      setNonDuplicates(nonDupes);
      setCurrentDuplicateIndex(0);
      setDecisions({});
      setApplyToAll(false);
      setApplyToAllAction(null);
      setImportComplete(false);
      setResults({ imported: 0, overwritten: 0, skipped: 0 });

      // If no duplicates, proceed directly
      if (dupes.length === 0) {
        setImporting(true);
      }
    } catch (error) {
      alert('Failed to parse import file: ' + error.message);
      onCancel();
    }
  }, [importData, isOpen, existingProcesses, onCancel]);

  const handleDecision = (action) => {
    const currentProcess = duplicates[currentDuplicateIndex];

    if (applyToAll) {
      // Apply this action to all remaining duplicates
      const newDecisions = { ...decisions };
      for (let i = currentDuplicateIndex; i < duplicates.length; i++) {
        newDecisions[duplicates[i]._importIndex] = action;
      }
      setDecisions(newDecisions);
      setApplyToAllAction(action);
      setImporting(true);
    } else {
      // Just this one
      setDecisions(prev => ({
        ...prev,
        [currentProcess._importIndex]: action
      }));

      if (currentDuplicateIndex < duplicates.length - 1) {
        setCurrentDuplicateIndex(prev => prev + 1);
      } else {
        // All duplicates handled, start import
        setImporting(true);
      }
    }
  };

  // Process the import when ready
  useEffect(() => {
    if (!importing || importComplete) return;

    const processImport = async () => {
      let imported = 0;
      let overwritten = 0;
      let skipped = 0;

      // Import non-duplicates
      for (const proc of nonDuplicates) {
        const { id, _importIndex, ...data } = proc;
        await onComplete({ action: 'import', data });
        imported++;
      }

      // Process duplicates based on decisions
      for (const proc of duplicates) {
        const decision = decisions[proc._importIndex] || applyToAllAction || 'skip';
        const { id, _importIndex, ...data } = proc;

        if (decision === 'overwrite') {
          // Find existing process to overwrite
          const existing = existingProcesses.find(e =>
            e.companyName?.toLowerCase() === proc.companyName?.toLowerCase() ||
            (e.displayName && proc.displayName &&
             e.displayName.toLowerCase() === proc.displayName.toLowerCase())
          );
          if (existing) {
            await onComplete({ action: 'overwrite', data, existingId: existing.id });
            overwritten++;
          }
        } else if (decision === 'rename') {
          // Generate new name
          const baseName = proc.displayName || proc.companyName;
          let newName = baseName;
          let counter = 1;
          while (existingProcesses.some(e =>
            (e.displayName || e.companyName).toLowerCase() === newName.toLowerCase()
          )) {
            newName = `${baseName} (${counter})`;
            counter++;
          }
          await onComplete({
            action: 'import',
            data: { ...data, displayName: newName }
          });
          imported++;
        } else {
          // Skip
          skipped++;
        }
      }

      setResults({ imported, overwritten, skipped });
      setImportComplete(true);
      setImporting(false);
    };

    processImport();
  }, [importing, importComplete, nonDuplicates, duplicates, decisions, applyToAllAction, existingProcesses, onComplete]);

  if (!isOpen) return null;

  const currentDuplicate = duplicates[currentDuplicateIndex];
  const existingMatch = currentDuplicate ? existingProcesses.find(e =>
    e.companyName?.toLowerCase() === currentDuplicate.companyName?.toLowerCase() ||
    (e.displayName && currentDuplicate.displayName &&
     e.displayName.toLowerCase() === currentDuplicate.displayName.toLowerCase())
  ) : null;

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '500px' }}>
        {importComplete ? (
          // Import complete summary
          <>
            <div className="modal-header">
              <h3>Import Complete</h3>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '1rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
                <p style={{ marginBottom: '0.5rem' }}>
                  <strong>{results.imported}</strong> process{results.imported !== 1 ? 'es' : ''} imported
                </p>
                {results.overwritten > 0 && (
                  <p style={{ marginBottom: '0.5rem' }}>
                    <strong>{results.overwritten}</strong> process{results.overwritten !== 1 ? 'es' : ''} overwritten
                  </p>
                )}
                {results.skipped > 0 && (
                  <p style={{ color: 'var(--text-muted)' }}>
                    <strong>{results.skipped}</strong> process{results.skipped !== 1 ? 'es' : ''} skipped
                  </p>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={onCancel}>
                Done
              </button>
            </div>
          </>
        ) : importing ? (
          // Importing in progress
          <>
            <div className="modal-header">
              <h3>Importing Processes</h3>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p>Importing processes...</p>
              </div>
            </div>
          </>
        ) : duplicates.length > 0 && currentDuplicate ? (
          // Duplicate handling
          <>
            <div className="modal-header">
              <h3>Duplicate Process Found</h3>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                {currentDuplicateIndex + 1} of {duplicates.length}
              </span>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem' }}>
                A process with a similar name already exists:
              </p>

              <div style={{
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: '0.5rem',
                marginBottom: '1rem'
              }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <strong>Importing:</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {currentDuplicate.displayName || currentDuplicate.companyName}
                    {currentDuplicate.displayName && currentDuplicate.displayName !== currentDuplicate.companyName && (
                      <> ({currentDuplicate.companyName})</>
                    )}
                  </div>
                </div>
                <div>
                  <strong>Existing:</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    {existingMatch?.displayName || existingMatch?.companyName}
                    {existingMatch?.displayName && existingMatch?.displayName !== existingMatch?.companyName && (
                      <> ({existingMatch?.companyName})</>
                    )}
                  </div>
                </div>
              </div>

              <p style={{ marginBottom: '1rem' }}>What would you like to do?</p>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={applyToAll}
                    onChange={(e) => setApplyToAll(e.target.checked)}
                  />
                  Apply this action to all remaining duplicates ({duplicates.length - currentDuplicateIndex})
                </label>
              </div>
            </div>
            <div className="modal-footer" style={{ flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleDecision('overwrite')}
                  style={{ flex: 1 }}
                >
                  Overwrite
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDecision('rename')}
                  style={{ flex: 1 }}
                >
                  Rename & Import
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleDecision('skip')}
                  style={{ flex: 1 }}
                >
                  Skip
                </button>
              </div>
              <button
                className="btn btn-secondary"
                onClick={onCancel}
                style={{ width: '100%' }}
              >
                Cancel Import
              </button>
            </div>
          </>
        ) : (
          // No duplicates - auto-importing
          <>
            <div className="modal-header">
              <h3>Importing Processes</h3>
            </div>
            <div className="modal-body">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                <p>Importing {nonDuplicates.length} process{nonDuplicates.length !== 1 ? 'es' : ''}...</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
