/**
 * Output template columns for Cycle to Work batch files
 */
export const OUTPUT_COLUMNS = [
  { key: 'Firstname', label: 'Firstname', required: true },
  { key: 'Surname', label: 'Surname', required: true },
  { key: 'Street1', label: 'Street1', required: false },
  { key: 'Street2', label: 'Street2', required: false },
  { key: 'City', label: 'City', required: false },
  { key: 'County', label: 'County', required: false },
  { key: 'Postcode', label: 'Postcode', required: false },
  { key: 'Country', label: 'Country', required: false, defaultValue: 'UK' },
  { key: 'LOC Amount', label: 'LOC Amount', required: true },
  { key: 'Email', label: 'Email', required: true },
  { key: 'Pay Frequency', label: 'Pay Frequency', required: false, defaultValue: 'Monthly' },
  { key: 'Additional Details', label: 'Additional Details', required: false },
  { key: 'Date of Approval', label: 'Date of Approval', required: false, defaultValue: '' }
];

/**
 * Sanitize a string - remove commas, apostrophes, and other problematic characters
 */
function sanitizeString(value) {
  if (!value) return '';
  return String(value)
    .replace(/[,'"'`]/g, '')  // Remove commas, apostrophes, quotes
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .trim();
}

/**
 * Clean LOC Amount - extract only the numeric value
 */
function cleanLOCAmount(value) {
  if (!value) return '';
  // Remove currency symbols, letters, and keep only numbers and decimal point
  const cleaned = String(value)
    .replace(/[£$€]/g, '')     // Remove currency symbols
    .replace(/[a-zA-Z]/g, '')  // Remove letters
    .replace(/,/g, '')         // Remove commas
    .replace(/[^\d.]/g, '')    // Keep only digits and decimal
    .trim();

  // Parse and format as number
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return num.toFixed(2);
}

/**
 * Apply mapping to source data and generate output rows
 * @param {Array} sourceData - Array of source data objects
 * @param {Object} mapping - Mapping configuration
 * @param {Object} options - Additional options (company name, entity, etc.)
 * @returns {Object} - { data: formatted rows, validation: errors }
 */
export function applyMapping(sourceData, mapping, options = {}) {
  const outputRows = [];
  const validationErrors = [];

  sourceData.forEach((sourceRow, rowIndex) => {
    const outputRow = {};
    const rowErrors = [];

    // Apply each mapping
    OUTPUT_COLUMNS.forEach(col => {
      const sourceColumn = mapping.fields?.[col.key];
      let value = '';

      if (sourceColumn && sourceRow[sourceColumn] !== undefined) {
        value = String(sourceRow[sourceColumn]).trim();
      } else if (col.defaultValue !== undefined) {
        value = col.defaultValue;
      }

      // Special handling for LOC Amount
      if (col.key === 'LOC Amount') {
        value = cleanLOCAmount(value);
      } else {
        // Sanitize all other string values
        value = sanitizeString(value);
      }

      outputRow[col.key] = value;

      // Check required fields
      if (col.required && !outputRow[col.key]) {
        rowErrors.push({
          row: rowIndex + 1,
          column: col.key,
          message: `Missing ${col.label}`
        });
      }
    });

    // Handle Additional Details special formatting
    if (mapping.additionalDetails) {
      outputRow['Additional Details'] = sanitizeString(formatAdditionalDetails(
        sourceRow,
        mapping.additionalDetails,
        options
      ));
    }

    // Store validation errors
    if (rowErrors.length > 0) {
      validationErrors.push({
        row: rowIndex + 1,
        errors: rowErrors
      });
    }

    outputRows.push(outputRow);
  });

  return {
    data: outputRows,
    validation: validationErrors
  };
}

/**
 * Format Additional Details field based on configuration
 * @param {Object} sourceRow - Source data row
 * @param {Object} config - Additional details configuration
 * @param {Object} options - Options including company name, entity
 */
function formatAdditionalDetails(sourceRow, config, options) {
  const parts = [];

  // Add fixed prefix first
  if (config.fixedPrefix) {
    parts.push(config.fixedPrefix);
  }

  // Add entity from filename (e.g., "TECL") if configured
  if (config.includeEntity && options.entity) {
    parts.push(options.entity);
  }

  // Add company name if configured
  if (config.includeCompany && options.companyName) {
    parts.push(options.companyName.toLowerCase());
  }

  // Add entity from a column in the data
  if (config.entityColumn && sourceRow[config.entityColumn]) {
    parts.push(String(sourceRow[config.entityColumn]).trim());
  }

  // Add reference column if configured
  if (config.referenceColumn && sourceRow[config.referenceColumn]) {
    parts.push(String(sourceRow[config.referenceColumn]).trim());
  }

  // Add fixed suffix
  if (config.fixedSuffix) {
    parts.push(config.fixedSuffix);
  }

  // Join with separator (default: /)
  const separator = config.separator || '/';
  return parts.join(separator);
}

/**
 * Convert formatted data to CSV string
 */
export function toCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const headers = OUTPUT_COLUMNS.map(c => c.key);

  // Header row
  const headerLine = headers.map(h => escapeCSV(h)).join(',');

  // Data rows
  const dataLines = data.map(row => {
    return headers.map(h => escapeCSV(row[h] || '')).join(',');
  });

  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

/**
 * Escape a value for CSV
 */
function escapeCSV(value) {
  const str = String(value);

  // If contains comma, quote, or newline, wrap in quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Download data as CSV file
 */
export function downloadCSV(data, filename) {
  const csvContent = toCSV(data);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

/**
 * Validate a single row
 */
export function validateRow(row) {
  const errors = [];

  OUTPUT_COLUMNS.forEach(col => {
    if (col.required && !row[col.key]) {
      errors.push({
        column: col.key,
        message: `Missing ${col.label}`
      });
    }
  });

  // Email format validation
  if (row['Email'] && !isValidEmail(row['Email'])) {
    errors.push({
      column: 'Email',
      message: 'Invalid email format'
    });
  }

  // LOC Amount should be numeric
  if (row['LOC Amount'] && isNaN(parseFloat(row['LOC Amount'].replace(/[£$,]/g, '')))) {
    errors.push({
      column: 'LOC Amount',
      message: 'LOC Amount should be a number'
    });
  }

  return errors;
}

/**
 * Simple email validation
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
