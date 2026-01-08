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
 * @param {any} value - The raw value
 * @param {boolean} roundUp - If true, round up to nearest whole number
 */
function cleanLOCAmount(value, roundUp = false) {
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

  // Round up to whole number if option is enabled
  if (roundUp) {
    return String(Math.ceil(num));
  }

  return num.toFixed(2);
}

/**
 * Check if an email should be replaced based on keywords
 */
function shouldReplaceEmail(email, keywords) {
  if (!email || !keywords || keywords.length === 0) return false;
  const emailLower = email.toLowerCase().trim();
  return keywords.some(keyword => emailLower.includes(keyword.toLowerCase()));
}

/**
 * Simple email validation
 */
function isValidEmailFormat(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Apply mapping to source data and generate output rows
 * @param {Array} sourceData - Array of source data objects
 * @param {Object} mapping - Mapping configuration
 * @param {Object} options - Additional options (company name, entity, etc.)
 * @returns {Object} - { data: formatted rows, validation: errors, filtered: count of filtered rows }
 */
export function applyMapping(sourceData, mapping, options = {}) {
  const outputRows = [];
  const validationErrors = [];
  let filteredCount = 0;

  // Get output options
  const outputOptions = mapping.outputOptions || {};
  const roundLOCAmount = outputOptions.roundLOCAmount || false;
  const fallbackEmail = outputOptions.fallbackEmail || '';
  const secondaryEmailColumn = outputOptions.secondaryEmailColumn || '';
  const emailKeywordsToReplace = outputOptions.emailKeywordsToReplace || [];
  const locMinimum = outputOptions.locMinimum ? parseFloat(outputOptions.locMinimum) : null;
  const locMaximum = outputOptions.locMaximum ? parseFloat(outputOptions.locMaximum) : null;

  sourceData.forEach((sourceRow, rowIndex) => {
    const outputRow = {};
    const rowErrors = [];

    // First, calculate LOC amount to check if row should be filtered
    const locSourceColumn = mapping.fields?.['LOC Amount'];
    let locValue = '';
    if (locSourceColumn && sourceRow[locSourceColumn] !== undefined) {
      locValue = cleanLOCAmount(String(sourceRow[locSourceColumn]).trim(), roundLOCAmount);
    }
    const locAmount = parseFloat(locValue) || 0;

    // Apply LOC range filter
    if (locMinimum !== null && locAmount < locMinimum) {
      filteredCount++;
      return; // Skip this row
    }
    if (locMaximum !== null && locAmount > locMaximum) {
      filteredCount++;
      return; // Skip this row
    }

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
        value = cleanLOCAmount(value, roundLOCAmount);
      } else if (col.key === 'Email') {
        // Enhanced email handling with secondary column and keyword replacement
        value = sanitizeString(value);

        // Check if primary email should be replaced (contains invalid keywords or not valid format)
        const shouldUseSecondary = !value ||
          shouldReplaceEmail(value, emailKeywordsToReplace) ||
          (!isValidEmailFormat(value) && value.length > 0);

        // Try secondary email column if primary is invalid
        if (shouldUseSecondary && secondaryEmailColumn && sourceRow[secondaryEmailColumn]) {
          const secondaryEmail = sanitizeString(String(sourceRow[secondaryEmailColumn]).trim());
          if (secondaryEmail && isValidEmailFormat(secondaryEmail) && !shouldReplaceEmail(secondaryEmail, emailKeywordsToReplace)) {
            value = secondaryEmail;
          }
        }

        // Apply fallback email if still empty or invalid
        if ((!value || shouldReplaceEmail(value, emailKeywordsToReplace) || !isValidEmailFormat(value)) && fallbackEmail) {
          value = fallbackEmail;
        }
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
    validation: validationErrors,
    filtered: filteredCount
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
 * Extra columns for SFTP/Car Maintenance export
 */
const SFTP_EXTRA_COLUMNS = ['AccountName', 'APT'];

/**
 * Convert formatted data to CSV string with SFTP extra columns
 * Also clears 'Additional Details' data for SFTP output
 */
export function toSFTPCSV(data) {
  if (!data || data.length === 0) {
    return '';
  }

  const baseHeaders = OUTPUT_COLUMNS.map(c => c.key);
  const headers = [...baseHeaders, ...SFTP_EXTRA_COLUMNS];

  // Header row
  const headerLine = headers.map(h => escapeCSV(h)).join(',');

  // Data rows - extra columns are empty, Additional Details cleared
  const dataLines = data.map(row => {
    const baseValues = baseHeaders.map(h => {
      // Clear Additional Details for SFTP output
      if (h === 'Additional Details') {
        return '';
      }
      return escapeCSV(row[h] || '');
    });
    const extraValues = SFTP_EXTRA_COLUMNS.map(() => ''); // Empty values for extra columns
    return [...baseValues, ...extraValues].join(',');
  });

  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

/**
 * Convert data to Personal Group CSV format (adds LOC Upload Date column)
 * @param {Array} originalData - Original source data (from file)
 * @param {Array} processedEmails - Array of emails that were processed
 * @param {Array} headers - Original headers from source file
 */
export function toPersonalGroupCSV(originalData, processedEmails, headers) {
  if (!originalData || originalData.length === 0) {
    return '';
  }

  // Get today's date in DD.MM.YY format (e.g., 08.01.26 for 8th Jan 2026)
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const dateStr = `${day}.${month}.${year}`;

  // Create a Set of processed emails for fast lookup (lowercase for comparison)
  const processedSet = new Set(processedEmails.map(e => e.toLowerCase().trim()));

  // Add LOC Upload Date to headers
  const newHeaders = [...headers, 'LOC Upload Date'];

  // Header row
  const headerLine = newHeaders.map(h => escapeCSV(h)).join(',');

  // Helper to format cell values (handle Date objects and malformed date strings from Excel)
  const formatCellValue = (value) => {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) {
      // Format Date objects as DD/MM/YYYY
      const d = String(value.getDate()).padStart(2, '0');
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const y = value.getFullYear();
      return `${d}/${m}/${y}`;
    }
    const str = String(value);
    // Check for malformed Excel date strings like "01/08/2026Saturday" or similar
    // Pattern: digits/digits/digits followed by day name
    const malformedDateMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)?$/i);
    if (malformedDateMatch) {
      // Return just the date part without the day name
      return `${malformedDateMatch[1]}/${malformedDateMatch[2]}/${malformedDateMatch[3]}`;
    }
    return str;
  };

  // Data rows - add date for processed rows, leave blank for others
  const dataLines = originalData.map(row => {
    // Find email in this row (check all columns)
    let wasProcessed = false;
    for (const value of Object.values(row)) {
      if (value && typeof value === 'string') {
        const email = value.toLowerCase().trim();
        if (processedSet.has(email)) {
          wasProcessed = true;
          break;
        }
      }
    }

    const rowValues = headers.map(h => escapeCSV(formatCellValue(row[h])));
    rowValues.push(wasProcessed ? dateStr : '');
    return rowValues.join(',');
  });

  return [headerLine, ...dataLines].join('\r\n') + '\r\n';
}

/**
 * Download Personal Group CSV file
 */
export function downloadPersonalGroupCSV(originalData, processedEmails, headers, companyName) {
  // Format date as DD.MM.YY for filename
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const dateStr = `${day}.${month}.${year}`;

  const filename = `Uploaded ${companyName} ${dateStr}.csv`;

  const csvContent = toPersonalGroupCSV(originalData, processedEmails, headers);
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
 * Download data as SFTP CSV file (with extra columns)
 */
export function downloadSFTPCSV(data, companyName) {
  // Format date as DD.MM.YY
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const dateStr = `${day}.${month}.${year}`;

  const filename = `${companyName} SFTP ${dateStr}.csv`;

  const csvContent = toSFTPCSV(data);
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
