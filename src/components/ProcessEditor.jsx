import { useState, useEffect } from 'react';
import { OUTPUT_COLUMNS } from '../utils/outputFormatter';

/**
 * Visual Process Editor for mapping source columns to target fields
 */
export default function ProcessEditor({
  sourceColumns = [],
  sourceData,
  headerInfoRows,
  companyName,
  entity,
  existingMapping,
  allProcesses = [],
  onSave,
  onCancel,
  onPreviewUpdate,
  onProceedWithoutSaving
}) {
  // If no source columns but we have an existing mapping, derive columns from saved fields
  const [derivedSourceColumns, setDerivedSourceColumns] = useState([]);

  // Determine which columns to use - file columns or saved mapping columns
  const effectiveSourceColumns = sourceColumns.length > 0 ? sourceColumns : derivedSourceColumns;
  const isEditingWithoutFile = sourceColumns.length === 0 && existingMapping;
  // Field mappings: { targetField: sourceColumn }
  const [mappings, setMappings] = useState({});

  // Currently selected fields for connecting
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState(null);

  // Additional details configuration
  const [additionalDetails, setAdditionalDetails] = useState({
    includeCompany: false,
    includeEntity: false,
    referenceColumn: '',
    entityColumn: '',
    fixedPrefix: '',
    fixedSuffix: '',
    separator: '/'
  });

  // Output options
  const [outputOptions, setOutputOptions] = useState({
    roundLOCAmount: false,
    fallbackEmail: '',
    secondaryEmailColumn: '',
    emailKeywordsToReplace: [],
    locMinimum: '',
    locMaximum: ''
  });

  // Display name (for user interface only, separate from company detection name)
  const [displayName, setDisplayName] = useState('');

  // Company name and entity (for detection/matching)
  const [editableCompanyName, setEditableCompanyName] = useState(companyName || '');
  const [editableEntity, setEditableEntity] = useState(entity || '');

  // Benefit Provider (parent process that this company uses)
  const [benefitProvider, setBenefitProvider] = useState('');

  // Track if we're editing an existing process
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [originalProcessId, setOriginalProcessId] = useState(null);

  // Email keyword input
  const [newEmailKeyword, setNewEmailKeyword] = useState('');

  // Initialize with existing mapping if available
  useEffect(() => {
    if (existingMapping) {
      setMappings(existingMapping.fields || {});
      setAdditionalDetails(existingMapping.additionalDetails || {
        includeCompany: false,
        includeEntity: false,
        referenceColumn: '',
        entityColumn: '',
        fixedPrefix: '',
        fixedSuffix: '',
        separator: '/'
      });
      setOutputOptions(existingMapping.outputOptions || {
        roundLOCAmount: false,
        fallbackEmail: '',
        secondaryEmailColumn: '',
        emailKeywordsToReplace: [],
        locMinimum: '',
        locMaximum: ''
      });
      setDisplayName(existingMapping.displayName || '');
      setEditableCompanyName(existingMapping.companyName || companyName || '');
      setEditableEntity(existingMapping.entity || entity || '');
      setBenefitProvider(existingMapping.benefitProvider || '');
      setIsEditingExisting(true);
      setOriginalProcessId(existingMapping.id || null);

      // If no source columns from file, derive them from saved mapping
      if (sourceColumns.length === 0) {
        const savedColumns = new Set();
        // Add columns from field mappings
        Object.values(existingMapping.fields || {}).forEach(col => {
          if (col) savedColumns.add(col);
        });
        // Add columns from additional details
        if (existingMapping.additionalDetails?.referenceColumn) {
          savedColumns.add(existingMapping.additionalDetails.referenceColumn);
        }
        if (existingMapping.additionalDetails?.entityColumn) {
          savedColumns.add(existingMapping.additionalDetails.entityColumn);
        }
        setDerivedSourceColumns(Array.from(savedColumns).sort());
      }
    } else {
      // Auto-suggest mappings based on similar column names
      const suggested = autoSuggestMappings(sourceColumns);
      setMappings(suggested);
      setDisplayName('');
      setEditableCompanyName(companyName || '');
      setEditableEntity(entity || '');
      setBenefitProvider('');
      setOutputOptions({
        roundLOCAmount: false,
        fallbackEmail: '',
        secondaryEmailColumn: '',
        emailKeywordsToReplace: [],
        locMinimum: '',
        locMaximum: ''
      });
      setIsEditingExisting(false);
      setOriginalProcessId(null);
      setDerivedSourceColumns([]);
    }
  }, [existingMapping, sourceColumns, companyName, entity]);

  // Notify parent of preview updates
  useEffect(() => {
    if (onPreviewUpdate) {
      onPreviewUpdate({
        fields: mappings,
        additionalDetails,
        outputOptions,
        companyName: editableCompanyName,
        entity: editableEntity
      });
    }
  }, [mappings, additionalDetails, outputOptions, editableCompanyName, editableEntity]);

  // Handle connecting source to target
  const handleConnect = () => {
    if (selectedSource && selectedTarget) {
      setMappings(prev => ({
        ...prev,
        [selectedTarget]: selectedSource
      }));
      setSelectedSource(null);
      setSelectedTarget(null);
    }
  };

  // Remove a mapping
  const removeMapping = (targetField) => {
    setMappings(prev => {
      const updated = { ...prev };
      delete updated[targetField];
      return updated;
    });
  };

  // Get source column for a target field
  const getSourceForTarget = (targetField) => {
    return mappings[targetField] || null;
  };

  // Check if source column is already mapped
  const isSourceMapped = (sourceCol) => {
    return Object.values(mappings).includes(sourceCol);
  };

  // Handle save
  const handleSave = (saveAsNew = false) => {
    const processConfig = {
      displayName: displayName || editableCompanyName,
      companyName: editableCompanyName,
      entity: editableEntity,
      benefitProvider: benefitProvider || null,
      fields: mappings,
      additionalDetails,
      outputOptions,
      createdAt: new Date().toISOString(),
      // If editing and saving as new, don't pass the original ID
      // If editing and updating, pass the original ID
      originalProcessId: (isEditingExisting && !saveAsNew) ? originalProcessId : null,
      saveAsNew: saveAsNew
    };
    onSave(processConfig);
  };

  // Email keyword management
  const addEmailKeyword = () => {
    const keyword = newEmailKeyword.trim().toLowerCase();
    if (keyword && !outputOptions.emailKeywordsToReplace.includes(keyword)) {
      setOutputOptions(prev => ({
        ...prev,
        emailKeywordsToReplace: [...prev.emailKeywordsToReplace, keyword]
      }));
      setNewEmailKeyword('');
    }
  };

  const removeEmailKeyword = (keyword) => {
    setOutputOptions(prev => ({
      ...prev,
      emailKeywordsToReplace: prev.emailKeywordsToReplace.filter(k => k !== keyword)
    }));
  };

  // Handle proceed without saving
  const handleProceedWithoutSaving = () => {
    if (onProceedWithoutSaving) {
      const processConfig = {
        displayName: displayName || editableCompanyName,
        companyName: editableCompanyName,
        entity: editableEntity,
        benefitProvider: benefitProvider || null,
        fields: mappings,
        additionalDetails,
        outputOptions
      };
      onProceedWithoutSaving(processConfig);
    }
  };

  // Get unique benefit providers from existing processes
  const benefitProviders = [...new Set(
    allProcesses
      .filter(p => p.benefitProvider)
      .map(p => p.benefitProvider)
  )];

  // Generate preview of additional details
  const getAdditionalDetailsPreview = () => {
    const parts = [];
    if (additionalDetails.fixedPrefix) {
      parts.push(additionalDetails.fixedPrefix);
    }
    if (additionalDetails.includeEntity && editableEntity) {
      parts.push(editableEntity);
    }
    if (additionalDetails.includeCompany && editableCompanyName) {
      parts.push(editableCompanyName.toLowerCase());
    }
    if (additionalDetails.entityColumn) {
      parts.push(`[${additionalDetails.entityColumn}]`);
    }
    if (additionalDetails.referenceColumn) {
      parts.push(`[${additionalDetails.referenceColumn}]`);
    }
    if (additionalDetails.fixedSuffix) {
      parts.push(additionalDetails.fixedSuffix);
    }
    return parts.join(additionalDetails.separator || '/') || '(empty)';
  };

  // Get sample values from first data row for preview
  const getSampleValue = (columnName) => {
    if (sourceData && sourceData.length > 0 && sourceData[0][columnName]) {
      return String(sourceData[0][columnName]).substring(0, 20);
    }
    return '';
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">Process Editor</h3>
      </div>

      {/* Display Name and Company Info */}
      <div className="company-input" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <div className="field" style={{ flex: 2, minWidth: '200px' }}>
          <label>Display Name (for your reference)</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={editableCompanyName || 'e.g., Colgate UK Monthly'}
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            This name appears in the process list. Leave blank to use company name.
          </small>
        </div>
        <div className="field" style={{ flex: 2, minWidth: '200px' }}>
          <label>Company Name (for auto-detection)</label>
          <input
            type="text"
            value={editableCompanyName}
            onChange={(e) => setEditableCompanyName(e.target.value)}
            placeholder="Enter company name..."
          />
          <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Used to auto-match files to this process.
          </small>
        </div>
        <div className="field" style={{ flex: 1, minWidth: '100px' }}>
          <label>Entity Code</label>
          <input
            type="text"
            value={editableEntity}
            onChange={(e) => setEditableEntity(e.target.value.toUpperCase())}
            placeholder="e.g., TECL"
          />
        </div>
      </div>

      {/* Benefit Provider */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
          Benefit Provider (optional)
        </label>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={benefitProvider}
            onChange={(e) => setBenefitProvider(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem', minWidth: '200px' }}
          >
            <option value="">-- No Provider (Standalone) --</option>
            {benefitProviders.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <span style={{ color: 'var(--text-muted)' }}>or</span>
          <input
            type="text"
            value={benefitProvider}
            onChange={(e) => setBenefitProvider(e.target.value)}
            placeholder="Enter new provider name..."
            style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem', flex: 1 }}
          />
        </div>
        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
          Group companies under a benefit provider (e.g., "Benefex", "Cyclescheme"). Companies with the same provider use the same mapping format.
        </small>
      </div>

      {/* Header Info Rows Preview */}
      {headerInfoRows && headerInfoRows.length > 0 && (
        <div style={{ background: 'var(--bg)', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.75rem', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            Header/Info Rows (rows 1-{headerInfoRows.length})
          </h4>
          <div style={{ fontSize: '0.7rem', maxHeight: '100px', overflow: 'auto' }}>
            {headerInfoRows.map((row) => (
              <div key={row.rowNumber} style={{ marginBottom: '0.25rem' }}>
                <strong>Row {row.rowNumber}:</strong>{' '}
                {row.cells.filter(c => c.value).map((cell, idx) => (
                  <span key={idx} style={{ marginRight: '0.5rem' }}>
                    [Col{cell.column}: {cell.value.substring(0, 25)}{cell.value.length > 25 ? '...' : ''}]
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notice when editing without file */}
      {isEditingWithoutFile && (
        <div style={{
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid var(--primary)',
          borderRadius: '0.375rem',
          padding: '0.75rem',
          marginBottom: '1rem',
          fontSize: '0.875rem'
        }}>
          <strong>Editing without file:</strong> You can modify the process settings, display name, entity, passwords, and additional details configuration.
          To change column mappings, load a file from this company first.
        </div>
      )}

      {/* Mapping Interface */}
      <div className="process-editor">
        {/* Source Columns */}
        <div className="mapping-column">
          <h3>Source Columns {isEditingWithoutFile ? '(from saved mapping)' : '(from file)'}</h3>
          {effectiveSourceColumns.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
              No columns available. Load a file to set up mappings.
            </div>
          ) : effectiveSourceColumns.map(col => {
            const sample = getSampleValue(col);
            return (
              <div
                key={col}
                className={`mapping-field ${selectedSource === col ? 'selected' : ''} ${isSourceMapped(col) ? 'connected' : ''}`}
                onClick={() => !isEditingWithoutFile && setSelectedSource(selectedSource === col ? null : col)}
                title={sample ? `Sample: ${sample}` : ''}
                style={isEditingWithoutFile ? { cursor: 'default', opacity: 0.7 } : {}}
              >
                <span>{col}</span>
                {sample && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                    ({sample}...)
                  </span>
                )}
                {isSourceMapped(col) && <span style={{ marginLeft: 'auto', color: 'var(--success)' }}>✓</span>}
              </div>
            );
          })}
        </div>

        {/* Connector */}
        <div className="mapping-connector">
          <button
            className="connect-btn"
            onClick={handleConnect}
            disabled={isEditingWithoutFile || !selectedSource || !selectedTarget}
            title={isEditingWithoutFile ? "Load a file to modify mappings" : "Connect selected fields"}
          >
            →
          </button>
        </div>

        {/* Target Columns */}
        <div className="mapping-column">
          <h3>Target Fields (output)</h3>
          {OUTPUT_COLUMNS.filter(col => col.key !== 'Additional Details').map(col => {
            const sourceCol = getSourceForTarget(col.key);
            return (
              <div
                key={col.key}
                className={`mapping-field ${selectedTarget === col.key ? 'selected' : ''} ${sourceCol ? 'connected' : ''} ${col.required ? 'required' : ''}`}
                onClick={() => {
                  if (isEditingWithoutFile) return; // Don't allow changes when editing without file
                  if (sourceCol) {
                    removeMapping(col.key);
                  } else {
                    setSelectedTarget(selectedTarget === col.key ? null : col.key);
                  }
                }}
                style={isEditingWithoutFile ? { cursor: 'default' } : {}}
              >
                {col.label}
                {sourceCol && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    ← {sourceCol}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Current Connections Summary */}
      {Object.keys(mappings).length > 0 && (
        <div className="connections-list">
          <h4 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Current Mappings</h4>
          {Object.entries(mappings).map(([target, source]) => (
            <div key={target} className="connection-item">
              <span>
                <strong>{source}</strong>
                <span className="connection-arrow"> → </span>
                {target}
              </span>
              {!isEditingWithoutFile && (
                <button
                  className="connection-remove"
                  onClick={() => removeMapping(target)}
                  title="Remove mapping"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Additional Details Configuration */}
      <div className="additional-details-config">
        <h4>Additional Details Field Configuration</h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Configure how the "Additional Details" field is built from your data
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={additionalDetails.includeEntity}
              onChange={(e) => setAdditionalDetails(prev => ({
                ...prev,
                includeEntity: e.target.checked
              }))}
            />
            Include entity code from filename (e.g., "{editableEntity || 'TECL'}")
          </label>

          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={additionalDetails.includeCompany}
              onChange={(e) => setAdditionalDetails(prev => ({
                ...prev,
                includeCompany: e.target.checked
              }))}
            />
            Include company name (e.g., "{editableCompanyName?.toLowerCase() || 'company'}")
          </label>

          <div className="additional-details-row">
            <label style={{ fontSize: '0.875rem', minWidth: '140px' }}>Entity/Account Column:</label>
            <select
              value={additionalDetails.entityColumn}
              onChange={(e) => setAdditionalDetails(prev => ({
                ...prev,
                entityColumn: e.target.value
              }))}
              disabled={isEditingWithoutFile}
            >
              <option value="">-- None --</option>
              {effectiveSourceColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>

          <div className="additional-details-row">
            <label style={{ fontSize: '0.875rem', minWidth: '140px' }}>Reference/PO Column:</label>
            <select
              value={additionalDetails.referenceColumn}
              onChange={(e) => setAdditionalDetails(prev => ({
                ...prev,
                referenceColumn: e.target.value
              }))}
              disabled={isEditingWithoutFile}
            >
              <option value="">-- None --</option>
              {effectiveSourceColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
            <small style={{ marginLeft: '0.5rem', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              e.g., Purchase Order Number
            </small>
          </div>

          <div className="additional-details-row">
            <label style={{ fontSize: '0.875rem', minWidth: '140px' }}>Fixed Prefix:</label>
            <input
              type="text"
              value={additionalDetails.fixedPrefix}
              onChange={(e) => setAdditionalDetails(prev => ({
                ...prev,
                fixedPrefix: e.target.value
              }))}
              placeholder="e.g., 1010101"
              style={{ flex: 1 }}
            />
          </div>

          <div className="additional-details-row">
            <label style={{ fontSize: '0.875rem', minWidth: '140px' }}>Fixed Suffix:</label>
            <input
              type="text"
              value={additionalDetails.fixedSuffix}
              onChange={(e) => setAdditionalDetails(prev => ({
                ...prev,
                fixedSuffix: e.target.value
              }))}
              placeholder="Optional suffix"
              style={{ flex: 1 }}
            />
          </div>

          <div className="additional-details-row">
            <label style={{ fontSize: '0.875rem', minWidth: '140px' }}>Separator:</label>
            <select
              value={additionalDetails.separator}
              onChange={(e) => setAdditionalDetails(prev => ({
                ...prev,
                separator: e.target.value
              }))}
            >
              <option value="/">/</option>
              <option value="-">-</option>
              <option value="_">_</option>
              <option value=" ">(space)</option>
            </select>
          </div>

          <div className="additional-details-preview">
            <strong>Preview:</strong> {getAdditionalDetailsPreview()}
          </div>
        </div>
      </div>

      {/* Output Options */}
      <div className="additional-details-config" style={{ marginTop: '1.5rem' }}>
        <h4>Output Options</h4>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Configure output formatting options
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Round LOC Amount */}
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={outputOptions.roundLOCAmount}
              onChange={(e) => setOutputOptions(prev => ({
                ...prev,
                roundLOCAmount: e.target.checked
              }))}
            />
            <div>
              <span>Round LOC Amount up to whole number</span>
              <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Always rounds up (e.g., £149.01 → £150, £149.99 → £150)
              </small>
            </div>
          </label>

          {/* LOC Amount Range Filter */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
              LOC Amount Range Filter (optional)
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="number"
                value={outputOptions.locMinimum}
                onChange={(e) => setOutputOptions(prev => ({
                  ...prev,
                  locMinimum: e.target.value
                }))}
                placeholder="Min (e.g., 100)"
                style={{ width: '120px', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="number"
                value={outputOptions.locMaximum}
                onChange={(e) => setOutputOptions(prev => ({
                  ...prev,
                  locMaximum: e.target.value
                }))}
                placeholder="Max (e.g., 5000)"
                style={{ width: '120px', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
              />
            </div>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
              Employees with LOC outside this range will be excluded. Leave blank for no filter.
            </small>
          </div>

          {/* Secondary Email Column (Work Email Priority) */}
          <div className="additional-details-row">
            <label style={{ fontSize: '0.875rem', minWidth: '140px' }}>Secondary Email:</label>
            <div style={{ flex: 1 }}>
              <select
                value={outputOptions.secondaryEmailColumn}
                onChange={(e) => setOutputOptions(prev => ({
                  ...prev,
                  secondaryEmailColumn: e.target.value
                }))}
                disabled={isEditingWithoutFile}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
              >
                <option value="">-- None --</option>
                {effectiveSourceColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                If the main email column is empty, use this column as fallback (e.g., Personal Email as backup for Work Email)
              </small>
            </div>
          </div>

          {/* Fallback Email */}
          <div className="additional-details-row">
            <label style={{ fontSize: '0.875rem', minWidth: '140px' }}>Fallback Email:</label>
            <div style={{ flex: 1 }}>
              <input
                type="email"
                value={outputOptions.fallbackEmail}
                onChange={(e) => setOutputOptions(prev => ({
                  ...prev,
                  fallbackEmail: e.target.value
                }))}
                placeholder="e.g., noemail@company.com"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem' }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                If both email columns are empty, this address will be used
              </small>
            </div>
          </div>

          {/* Email Keywords to Replace */}
          <div>
            <label style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
              Replace Invalid Email Keywords
            </label>
            <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', display: 'block', marginBottom: '0.5rem' }}>
              If an email contains any of these keywords (e.g., "none", "n/a"), replace with the fallback email
            </small>
            {outputOptions.emailKeywordsToReplace?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                {outputOptions.emailKeywordsToReplace.map((keyword) => (
                  <span
                    key={keyword}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      padding: '0.25rem 0.5rem',
                      background: 'var(--bg)',
                      borderRadius: '0.25rem',
                      fontSize: '0.8rem'
                    }}
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => removeEmailKeyword(keyword)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0 0.25rem',
                        color: 'var(--error)',
                        fontSize: '0.9rem'
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                type="text"
                value={newEmailKeyword}
                onChange={(e) => setNewEmailKeyword(e.target.value)}
                placeholder="e.g., none, n/a, blank"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmailKeyword();
                  }
                }}
                style={{
                  flex: 1,
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: '0.375rem'
                }}
              />
              <button
                type="button"
                onClick={addEmailKeyword}
                disabled={!newEmailKeyword.trim()}
                className="btn btn-secondary"
                style={{ whiteSpace: 'nowrap' }}
              >
                Add Keyword
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="action-bar">
        <div className="action-bar-left">
          <button className="btn btn-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
        <div className="action-bar-right" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Proceed without saving - for one-off processing (not available when editing without file) */}
          {onProceedWithoutSaving && !isEditingWithoutFile && (
            <button
              className="btn btn-secondary"
              onClick={handleProceedWithoutSaving}
              disabled={Object.keys(mappings).length === 0}
              title="Process this file without saving the mapping"
            >
              Proceed Without Saving
            </button>
          )}

          {/* Save as new - when editing existing and want to create copy */}
          {isEditingExisting && (
            <button
              className="btn btn-secondary"
              onClick={() => handleSave(true)}
              disabled={!editableCompanyName || Object.keys(mappings).length === 0}
              title="Save as a new process (keep original unchanged)"
            >
              Save as New
            </button>
          )}

          {/* Main save button */}
          <button
            className="btn btn-primary"
            onClick={() => handleSave(false)}
            disabled={!editableCompanyName || Object.keys(mappings).length === 0}
          >
            {isEditingExisting ? 'Update Process' : 'Save Process'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Auto-suggest mappings based on column name similarity
 */
function autoSuggestMappings(sourceColumns) {
  const suggestions = {};

  // Common variations for each target field
  const patterns = {
    'Firstname': ['firstname', 'first name', 'first_name', 'forename', 'given name', 'employee first', '1st name'],
    'Surname': ['surname', 'last name', 'lastname', 'last_name', 'family name', 'employee last', '2nd name'],
    'Street1': ['street1', 'street 1', 'address1', 'address 1', 'address line 1', 'street address', 'address'],
    'Street2': ['street2', 'street 2', 'address2', 'address 2', 'address line 2'],
    'City': ['city', 'town', 'locality'],
    'County': ['county', 'state', 'region', 'province'],
    'Postcode': ['postcode', 'post code', 'postal code', 'zip', 'zip code', 'zipcode'],
    'LOC Amount': ['loc amount', 'loc value', 'amount', 'value', 'voucher value', 'voucher amount', 'total', 'salary sacrifice', 'loc'],
    'Email': ['email', 'e-mail', 'email address', 'e-mail address', 'employee email']
  };

  const sourceLower = sourceColumns.map(c => ({ original: c, lower: c.toLowerCase() }));

  Object.entries(patterns).forEach(([target, variations]) => {
    for (const variation of variations) {
      const match = sourceLower.find(s =>
        s.lower === variation ||
        s.lower.includes(variation) ||
        variation.includes(s.lower)
      );
      if (match && !suggestions[target]) {
        suggestions[target] = match.original;
        break;
      }
    }
  });

  return suggestions;
}
