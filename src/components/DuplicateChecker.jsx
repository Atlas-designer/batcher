import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Duplicate Checker component for comparing processed file against existing scheme report
 * Checks for duplicates where both email AND LOC amount match
 */
export default function DuplicateChecker({ outputData, onDuplicatesFound, onProceed }) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [schemeReport, setSchemeReport] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [showDialog, setShowDialog] = useState(false);

  // Parse the scheme report file
  const parseSchemeReport = async (file) => {
    const extension = file.name.split('.').pop().toLowerCase();

    return new Promise((resolve, reject) => {
      if (extension === 'csv') {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (err) => reject(err)
        });
      } else if (extension === 'xls' || extension === 'xlsx') {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(sheet);
            resolve(jsonData);
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsArrayBuffer(file);
      } else {
        reject(new Error('Unsupported file type. Please use .csv, .xls, or .xlsx'));
      }
    });
  };

  // Find duplicates between output data and scheme report
  const findDuplicates = (schemeData) => {
    const duplicatesList = [];

    // Normalize LOC amount for comparison
    const normalizeLOC = (value) => {
      if (!value) return '';
      return parseFloat(String(value).replace(/[£$€,]/g, '')).toFixed(2);
    };

    // Normalize email for comparison
    const normalizeEmail = (value) => {
      if (!value) return '';
      return String(value).toLowerCase().trim();
    };

    // Build a map of scheme report entries (email + LOC as key)
    const schemeMap = new Map();
    schemeData.forEach(row => {
      // Look for LOC Value and App_Contact_Email columns (case-insensitive)
      const locKey = Object.keys(row).find(k =>
        k.toLowerCase().includes('loc') && k.toLowerCase().includes('value')
      ) || Object.keys(row).find(k => k.toLowerCase() === 'loc value');

      const emailKey = Object.keys(row).find(k =>
        k.toLowerCase().includes('app_contact_email') ||
        k.toLowerCase().includes('contact_email') ||
        k.toLowerCase() === 'email'
      );

      if (locKey && emailKey) {
        const loc = normalizeLOC(row[locKey]);
        const email = normalizeEmail(row[emailKey]);
        if (loc && email) {
          const key = `${email}|${loc}`;
          schemeMap.set(key, row);
        }
      }
    });

    // Check each output row against the scheme map
    outputData.forEach(row => {
      const loc = normalizeLOC(row['LOC Amount']);
      const email = normalizeEmail(row['Email']);
      const key = `${email}|${loc}`;

      if (schemeMap.has(key)) {
        duplicatesList.push({
          firstname: row['Firstname'] || '',
          surname: row['Surname'] || '',
          email: row['Email'],
          locAmount: row['LOC Amount']
        });
      }
    });

    return duplicatesList;
  };

  // Handle file drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer?.files || e.target?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setLoading(true);
    setError(null);

    try {
      const schemeData = await parseSchemeReport(file);
      setSchemeReport({ name: file.name, data: schemeData, rowCount: schemeData.length });

      // Check for duplicates immediately
      const found = findDuplicates(schemeData);
      setDuplicates(found);

      if (found.length > 0) {
        setShowDialog(true);
        if (onDuplicatesFound) onDuplicatesFound(found);
      }
    } catch (err) {
      setError(err.message || 'Failed to parse scheme report');
    } finally {
      setLoading(false);
    }
  }, [outputData, onDuplicatesFound]);

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Handle checkbox toggle
  const handleToggle = () => {
    setIsEnabled(!isEnabled);
    if (isEnabled) {
      // Clearing the check
      setSchemeReport(null);
      setDuplicates(null);
      setError(null);
    }
  };

  // Handle dialog responses
  const handleProceedAnyway = () => {
    setShowDialog(false);
    if (onProceed) onProceed(true);
  };

  const handleCancel = () => {
    setShowDialog(false);
    if (onProceed) onProceed(false);
  };

  // Clear report
  const handleClearReport = () => {
    setSchemeReport(null);
    setDuplicates(null);
    setError(null);
  };

  return (
    <div className="duplicate-checker" style={{ marginTop: '1rem' }}>
      {/* Checkbox to enable duplicate checking */}
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={handleToggle}
          style={{ width: '18px', height: '18px' }}
        />
        <span style={{ fontWeight: 500 }}>Check for Duplicates</span>
      </label>

      {/* Drop zone - only show when enabled */}
      {isEnabled && (
        <div style={{ marginTop: '0.75rem' }}>
          {!schemeReport ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => document.getElementById('scheme-report-input').click()}
              style={{
                border: `2px dashed ${isDragging ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '8px',
                padding: '1.5rem',
                textAlign: 'center',
                cursor: 'pointer',
                background: isDragging ? 'var(--primary-light)' : 'var(--bg-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                id="scheme-report-input"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleDrop}
                style={{ display: 'none' }}
              />
              {loading ? (
                <div style={{ color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 0.5rem' }}></div>
                  Processing report...
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📋</div>
                  <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                    Drag & drop scheme report here
                  </p>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    or click to browse (.csv, .xls, .xlsx)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 500 }}>📋 {schemeReport.name}</p>
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {schemeReport.rowCount} existing applicants loaded
                </p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {duplicates && duplicates.length === 0 && (
                  <span style={{ color: 'var(--success)', fontSize: '0.875rem' }}>
                    ✓ No duplicates found
                  </span>
                )}
                {duplicates && duplicates.length > 0 && (
                  <span style={{ color: 'var(--warning)', fontSize: '0.875rem' }}>
                    ⚠ {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''} found
                  </span>
                )}
                <button
                  className="btn btn-secondary"
                  onClick={handleClearReport}
                  style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {error && (
            <p style={{ color: 'var(--danger)', fontSize: '0.875rem', marginTop: '0.5rem' }}>
              {error}
            </p>
          )}
        </div>
      )}

      {/* Duplicate Warning Dialog */}
      {showDialog && duplicates && duplicates.length > 0 && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal-content" style={{
            background: 'var(--bg-primary)',
            borderRadius: '12px',
            padding: '1.5rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{ margin: '0 0 1rem', color: 'var(--warning)' }}>
              ⚠️ Duplicate Applicants Found
            </h3>
            <p style={{ marginBottom: '1rem' }}>
              The following applicant{duplicates.length !== 1 ? 's are' : ' is'} already on the scheme with the same email and LOC amount:
            </p>
            <div style={{
              background: 'white',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              maxHeight: '200px',
              overflow: 'auto',
              border: '1px solid var(--border)'
            }}>
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--danger)' }}>
                {duplicates.map((d, i) => (
                  <span key={i}>
                    {d.firstname} {d.surname}
                    {i < duplicates.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>
            <p style={{ marginBottom: '1.5rem', fontWeight: 500 }}>
              Do you want to proceed?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                No, Go Back
              </button>
              <button
                className="btn btn-warning"
                onClick={handleProceedAnyway}
                style={{ background: 'var(--warning)', color: 'white' }}
              >
                Yes, Proceed Anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
