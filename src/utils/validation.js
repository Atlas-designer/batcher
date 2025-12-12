/**
 * Required fields for output
 */
export const REQUIRED_FIELDS = ['Firstname', 'Surname', 'LOC Amount', 'Email'];

/**
 * Validate all rows and return errors
 * @param {Array} data - Output data rows
 * @returns {Array} - Array of validation errors
 */
export function validateAllRows(data) {
  const errors = [];

  data.forEach((row, index) => {
    const rowErrors = validateSingleRow(row, index + 1);
    if (rowErrors.length > 0) {
      errors.push({
        row: index + 1,
        errors: rowErrors
      });
    }
  });

  return errors;
}

/**
 * Validate a single row
 */
function validateSingleRow(row, rowNumber) {
  const errors = [];

  // Check required fields
  REQUIRED_FIELDS.forEach(field => {
    const value = row[field];
    if (!value || String(value).trim() === '') {
      errors.push({
        row: rowNumber,
        column: field,
        type: 'missing',
        message: `Missing ${field}`
      });
    }
  });

  // Validate email format if present
  if (row['Email'] && !isValidEmail(row['Email'])) {
    errors.push({
      row: rowNumber,
      column: 'Email',
      type: 'invalid',
      message: 'Invalid email format'
    });
  }

  // Validate LOC Amount is numeric
  if (row['LOC Amount']) {
    const amount = String(row['LOC Amount']).replace(/[£$,\s]/g, '');
    if (isNaN(parseFloat(amount))) {
      errors.push({
        row: rowNumber,
        column: 'LOC Amount',
        type: 'invalid',
        message: 'LOC Amount must be a number'
      });
    }
  }

  return errors;
}

/**
 * Check if email is valid
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).trim());
}

/**
 * Get summary of validation errors
 */
export function getValidationSummary(errors) {
  const total = errors.length;
  const byType = {};
  const byColumn = {};

  errors.forEach(rowError => {
    rowError.errors.forEach(err => {
      // Count by type
      byType[err.type] = (byType[err.type] || 0) + 1;

      // Count by column
      byColumn[err.column] = (byColumn[err.column] || 0) + 1;
    });
  });

  return {
    totalRowsWithErrors: total,
    byType,
    byColumn
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors) {
  return errors.flatMap(rowError =>
    rowError.errors.map(err => ({
      ...err,
      display: `Row ${err.row}: ${err.message} (${err.column})`
    }))
  );
}

/**
 * Check if data has any validation errors
 */
export function hasValidationErrors(errors) {
  return errors.length > 0;
}

/**
 * Get rows with errors (row numbers)
 */
export function getErrorRowNumbers(errors) {
  return [...new Set(errors.map(e => e.row))];
}
