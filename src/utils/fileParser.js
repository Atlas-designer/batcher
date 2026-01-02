import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Parse uploaded file and return RAW data (all rows, no header assumption)
 * Supports: .csv, .xls, .xlsx, .pdf
 * @param {File} file - The file to parse
 * @param {string|string[]} password - Optional password(s) to try for encrypted files
 */
export async function parseFile(file, password = null) {
  const extension = file.name.split('.').pop().toLowerCase();

  switch (extension) {
    case 'csv':
      return parseCSV(file);
    case 'xls':
    case 'xlsx':
      return parseExcel(file, password);
    case 'pdf':
      return parsePDF(file);
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
}

/**
 * Parse CSV file - returns raw rows with auto-detected or specified headers
 */
function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,  // Don't assume first row is header
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }

        const rawRows = results.data;

        resolve({
          rawRows: rawRows,
          rowCount: rawRows.length,
          // Will be set by user selecting header row
          data: null,
          columns: null
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      }
    });
  });
}

/**
 * Parse Excel file - returns raw rows
 * @param {File} file - The Excel file to parse
 * @param {string|string[]} password - Optional password(s) to try
 *
 * Note: SheetJS community edition has LIMITED password support.
 * It only works with older XLS encryption, not modern XLSX encryption.
 * For modern encrypted files, user may need to manually decrypt or
 * save as unprotected from Excel.
 */
function parseExcel(file, password = null) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);

        // Build read options
        const readOptions = { type: 'array' };

        // Try passwords if provided
        const passwords = password
          ? (Array.isArray(password) ? password : [password])
          : [null];

        let workbook = null;
        let usedPassword = null;
        let lastError = null;

        for (const pwd of passwords) {
          try {
            if (pwd) {
              readOptions.password = pwd;
            } else {
              delete readOptions.password;
            }
            workbook = XLSX.read(data, readOptions);
            usedPassword = pwd;
            break; // Success, stop trying passwords
          } catch (err) {
            lastError = err;
            console.log('Excel parse attempt failed:', err.message);
            // Check if it's a password/encryption error - continue trying
            if (isEncryptionError(err)) {
              continue; // Try next password
            }
            // Other error, stop trying
            throw err;
          }
        }

        if (!workbook) {
          // Check if the file is password protected
          if (lastError && isEncryptionError(lastError)) {
            const error = new Error('PASSWORD_REQUIRED');
            error.code = 'PASSWORD_REQUIRED';
            error.originalMessage = lastError.message;
            // Check if it's likely a modern encryption issue
            error.isModernEncryption = lastError.message.includes('ECMA-376') ||
              lastError.message.includes('agile') ||
              lastError.message.includes('Unsupported');
            reject(error);
            return;
          }
          throw lastError || new Error('Failed to read Excel file');
        }

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to array of arrays (raw rows)
        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,  // Returns array of arrays
          defval: '',
          raw: false
        });

        resolve({
          rawRows: rawRows,
          rowCount: rawRows.length,
          sheetName: firstSheetName,
          data: null,
          columns: null,
          usedPassword: usedPassword // Include which password worked
        });
      } catch (error) {
        console.log('Excel parsing error:', error.message);
        // Check if it's a password error
        if (isEncryptionError(error)) {
          const pwError = new Error('PASSWORD_REQUIRED');
          pwError.code = 'PASSWORD_REQUIRED';
          pwError.originalMessage = error.message;
          pwError.isModernEncryption = error.message.includes('ECMA-376') ||
            error.message.includes('agile') ||
            error.message.includes('Unsupported');
          reject(pwError);
          return;
        }
        reject(new Error(`Excel parsing failed: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Check if an error is related to encryption/password
 */
function isEncryptionError(err) {
  if (!err || !err.message) return false;
  const msg = err.message.toLowerCase();
  return msg.includes('password') ||
    msg.includes('encrypted') ||
    msg.includes('encryption') ||
    msg.includes('ecma-376') ||
    msg.includes('agile') ||
    msg.includes('cfb') ||
    msg.includes('unsupported encryption');
}

/**
 * Parse PDF file - extract tables
 * Uses PDF.js loaded from CDN to avoid build issues
 */
async function parsePDF(file) {
  // Load PDF.js from CDN if not already loaded
  if (!window.pdfjsLib) {
    await loadPdfJs();
  }

  const pdfjsLib = window.pdfjsLib;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const typedArray = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument(typedArray).promise;

        let allText = [];

        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str);
          allText = allText.concat(pageText);
        }

        // Try to parse as tabular data
        const result = parseTextAsTable(allText);
        resolve(result);
      } catch (error) {
        reject(new Error(`PDF parsing failed: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read PDF file'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Load PDF.js library from CDN
 */
function loadPdfJs() {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.pdfjsLib) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      // Set worker
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js library'));
    document.head.appendChild(script);
  });
}

/**
 * Attempt to parse extracted text as tabular data
 */
function parseTextAsTable(textItems) {
  const filtered = textItems.filter(t => t.trim());

  if (filtered.length === 0) {
    return { rawRows: [], rowCount: 0, data: null, columns: null };
  }

  // Check if this looks like an EnjoyBenefits-style single applicant PDF
  const fullText = filtered.join(' ');
  if (isEnjoyBenefitsPDF(fullText)) {
    return parseEnjoyBenefitsPDF(filtered);
  }

  // Try to detect rows by looking for structured data
  const rawRows = [];

  for (const text of filtered) {
    const parts = text.split(/[,\t]/).map(p => p.trim());
    if (parts.length > 1) {
      rawRows.push(parts);
    } else {
      rawRows.push([text]);
    }
  }

  return {
    rawRows: rawRows,
    rowCount: rawRows.length,
    data: null,
    columns: null,
    note: 'PDF data extracted - please verify structure'
  };
}

/**
 * Check if PDF matches EnjoyBenefits Purchase Order format
 */
function isEnjoyBenefitsPDF(text) {
  const indicators = [
    'purchase order',
    'name of client',
    'total gift voucher',
    'enjoybenefits',
    'enjoy benefits'
  ];
  const lowerText = text.toLowerCase();
  const matchCount = indicators.filter(ind => lowerText.includes(ind)).length;
  return matchCount >= 2;
}

/**
 * Parse EnjoyBenefits-style Purchase Order PDF
 * Extracts: Name, Address, Postcode, Email, Amount, PO Number
 */
function parseEnjoyBenefitsPDF(textItems) {
  const fullText = textItems.join(' ');
  const extracted = {};

  // Extract Purchase Order Number - try multiple patterns
  // Pattern 1: "Purchase Order Number" followed by number (with possible text between)
  let poMatch = fullText.match(/Purchase\s*Order\s*Number\s*[:\s]*(\d{5,})/i);
  if (!poMatch) {
    // Pattern 2: Look for 5-6 digit number after "Order Number"
    poMatch = fullText.match(/Order\s*Number\s*[:\s]*(\d{5,})/i);
  }
  if (!poMatch) {
    // Pattern 3: Look in the text items array for the number right after "Purchase Order Number"
    for (let i = 0; i < textItems.length; i++) {
      if (textItems[i].toLowerCase().includes('purchase order number')) {
        // Look at the next few items for a number
        for (let j = i + 1; j < Math.min(i + 5, textItems.length); j++) {
          const numMatch = textItems[j].match(/^(\d{5,})$/);
          if (numMatch) {
            extracted.purchaseOrderNumber = numMatch[1];
            break;
          }
        }
        break;
      }
    }
  }
  if (poMatch && !extracted.purchaseOrderNumber) {
    extracted.purchaseOrderNumber = poMatch[1];
  }

  // Extract Name of Client (Firstname Surname) - handle hyphenated names too
  const nameMatch = fullText.match(/Name\s*of\s*client\s*[:\s]*([A-Za-z\-']+)\s+([A-Za-z\-']+)/i);
  if (nameMatch) {
    extracted.firstname = nameMatch[1].trim();
    extracted.surname = nameMatch[2].trim();
  }

  // Extract Address - text between "Address :" and "Postcode"
  const addressMatch = fullText.match(/Address\s*:\s*(.*?)(?=Postcode|Post\s*code)/is);
  if (addressMatch) {
    extracted.address = addressMatch[1].trim();
  }

  // Extract Postcode - more flexible pattern
  let postcodeMatch = fullText.match(/Post\s*code\s*:\s*([A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2})/i);
  if (!postcodeMatch) {
    // Try alternative: look for UK postcode pattern after "Postcode"
    postcodeMatch = fullText.match(/Postcode\s*[:\s]*([A-Z0-9]{2,4}\s*[A-Z0-9]{3})/i);
  }
  if (postcodeMatch) {
    extracted.postcode = postcodeMatch[1].trim();
  }

  // Extract Email
  const emailMatch = fullText.match(/Email\s*address\s*:\s*([^\s]+@[^\s]+)/i);
  if (emailMatch) {
    extracted.email = emailMatch[1].trim();
  }

  // Extract Total gift voucher (LOC Amount)
  const amountMatch = fullText.match(/Total\s*gift\s*voucher\s*:\s*[£]?\s*([\d,.]+)/i);
  if (amountMatch) {
    extracted.amount = amountMatch[1].replace(/,/g, '').trim();
  }

  // Convert to standard row format for processing
  // Create a header row and data row
  const columns = ['Firstname', 'Surname', 'Street1', 'Street2', 'City', 'Postcode', 'Email', 'LOC Amount', 'Purchase Order Number'];
  const headerRow = columns;

  // Parse address into street1, street2, city if possible
  let street1 = '', street2 = '', city = '';
  if (extracted.address) {
    const addressParts = extracted.address.split(/[,\n]/).map(p => p.trim()).filter(p => p);
    if (addressParts.length >= 1) street1 = addressParts[0];
    if (addressParts.length >= 2) street2 = addressParts[1];
    if (addressParts.length >= 3) city = addressParts[addressParts.length - 1];
  }

  const dataRow = [
    extracted.firstname || '',
    extracted.surname || '',
    street1,
    street2,
    city,
    extracted.postcode || '',
    extracted.email || '',
    extracted.amount || '',
    extracted.purchaseOrderNumber || ''
  ];

  return {
    rawRows: [headerRow, dataRow],
    rowCount: 2,
    data: null,
    columns: null,
    isParsedPDF: true,
    pdfType: 'EnjoyBenefits',
    extractedData: extracted,
    note: 'EnjoyBenefits PDF parsed - single applicant extracted'
  };
}

/**
 * Parse multiple PDF files and combine into single dataset
 * Used for combining multiple single-applicant PDFs
 */
export async function parseAndCombinePDFs(files) {
  const allRows = [];
  let columns = null;
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const result = await parseFile(file);

      // For EnjoyBenefits PDFs, we get 2 rows: header and data
      if (result.isParsedPDF && result.rawRows.length >= 2) {
        if (!columns) {
          columns = result.rawRows[0]; // First file sets headers
        }
        // Add data row (skip header)
        allRows.push(result.rawRows[1]);
      } else if (result.rawRows && result.rawRows.length > 0) {
        // For other PDFs or files, add all data rows
        if (!columns && result.rawRows.length > 0) {
          columns = result.rawRows[0];
        }
        for (let j = 1; j < result.rawRows.length; j++) {
          allRows.push(result.rawRows[j]);
        }
      }
    } catch (error) {
      errors.push({ file: file.name, error: error.message });
    }
  }

  // Combine into final structure
  const combinedRows = columns ? [columns, ...allRows] : allRows;

  return {
    rawRows: combinedRows,
    rowCount: combinedRows.length,
    data: null,
    columns: null,
    combinedFromFiles: files.length,
    successfulFiles: files.length - errors.length,
    errors: errors.length > 0 ? errors : null,
    note: `Combined ${allRows.length} applicants from ${files.length} files`
  };
}

/**
 * Process raw rows with user-specified settings
 * @param {Array} rawRows - Array of arrays (raw row data)
 * @param {Object} settings - { headerRow, startRow, endRow, dateColumn, dateFrom, dateTo }
 */
export function processRawData(rawRows, settings = {}) {
  const {
    headerRow = 1,      // Which row contains column headers (1-indexed)
    startRow = 2,       // Which row to start data from (1-indexed)
    endRow = null,      // Optional end row (null = all rows)
  } = settings;

  if (!rawRows || rawRows.length === 0) {
    return { data: [], columns: [], rowCount: 0 };
  }

  // Get headers from specified row (convert to 0-indexed)
  const headerIndex = Math.max(0, headerRow - 1);
  const headers = rawRows[headerIndex] || [];

  // Find the maximum number of columns across all data rows
  // This handles cases where header row has fewer columns than data rows
  const dataStartIndex = Math.max(0, startRow - 1);
  const dataEndIndex = endRow ? Math.min(endRow, rawRows.length) : rawRows.length;
  let maxColumns = headers.length;

  for (let i = dataStartIndex; i < dataEndIndex; i++) {
    const row = rawRows[i];
    if (row && row.length > maxColumns) {
      maxColumns = row.length;
    }
  }

  // Clean up headers - use column numbers for empty/missing headers
  const columns = [];
  for (let idx = 0; idx < maxColumns; idx++) {
    const h = headers[idx];
    const cleaned = String(h || '').trim();
    columns.push(cleaned || `Column ${idx + 1}`);
  }

  // Get data rows (using already calculated indices)

  const data = [];

  for (let i = dataStartIndex; i < dataEndIndex; i++) {
    const row = rawRows[i];
    if (!row) continue;

    // Skip completely empty rows
    const hasData = row.some(cell => cell && String(cell).trim());
    if (!hasData) continue;

    // Convert to object with column names
    const rowObj = {};
    columns.forEach((col, idx) => {
      rowObj[col] = row[idx] !== undefined ? String(row[idx]).trim() : '';
    });

    data.push(rowObj);
  }

  return {
    data,
    columns,
    rowCount: data.length
  };
}

/**
 * Filter data by date range
 * @param {Array} data - Array of data objects
 * @param {string} dateColumn - Name of the date column
 * @param {string} dateFrom - Start date (YYYY-MM-DD or DD/MM/YYYY)
 * @param {string} dateTo - End date
 */
export function filterByDateRange(data, dateColumn, dateFrom, dateTo) {
  if (!dateColumn || (!dateFrom && !dateTo)) {
    return data;
  }

  const fromDate = dateFrom ? parseDate(dateFrom) : null;
  const toDate = dateTo ? parseDate(dateTo) : null;

  return data.filter(row => {
    const cellValue = row[dateColumn];
    if (!cellValue) return true; // Keep rows without date if date column is empty

    const rowDate = parseDate(cellValue);
    if (!rowDate) return true; // Keep rows with unparseable dates

    if (fromDate && rowDate < fromDate) return false;
    if (toDate && rowDate > toDate) return false;

    return true;
  });
}

/**
 * Parse various date formats
 */
function parseDate(dateStr) {
  if (!dateStr) return null;

  const str = String(dateStr).trim();

  // Try various formats
  // DD/MM/YYYY or DD-MM-YYYY
  let match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }

  // YYYY-MM-DD
  match = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (match) {
    return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
  }

  // Try native parsing
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return null;
}

/**
 * Detect potential date columns in data
 */
export function detectDateColumns(data, columns) {
  if (!data || data.length === 0) return [];

  const dateColumns = [];

  columns.forEach(col => {
    // Check first few non-empty values
    let dateCount = 0;
    let checkedCount = 0;

    for (const row of data) {
      if (checkedCount >= 5) break;

      const value = row[col];
      if (!value) continue;

      checkedCount++;
      const parsed = parseDate(value);
      if (parsed) dateCount++;
    }

    // If most checked values are dates, consider it a date column
    if (checkedCount > 0 && dateCount / checkedCount >= 0.5) {
      dateColumns.push(col);
    }
  });

  return dateColumns;
}

/**
 * Get file extension
 */
export function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase();
}

/**
 * Check if file type is supported
 */
export function isSupportedFileType(filename) {
  const supported = ['csv', 'xls', 'xlsx', 'pdf'];
  return supported.includes(getFileExtension(filename));
}

/**
 * Auto-detect the first row containing applicant data
 * Looks for rows that contain name-like and/or email-like values
 * Returns the row number (1-indexed) or 2 as default
 */
export function detectFirstDataRow(rawRows) {
  if (!rawRows || rawRows.length < 2) return 2;

  // Patterns to identify data rows
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const namePattern = /^[A-Za-z][A-Za-z\-'\s]{1,30}$/; // Simple name pattern
  const postcodePattern = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}$/i; // UK postcode

  // Header-like terms to skip (case insensitive)
  const headerTerms = [
    'firstname', 'first name', 'surname', 'last name', 'email', 'address',
    'postcode', 'post code', 'city', 'county', 'amount', 'value', 'date',
    'reference', 'order', 'employee', 'name', 'street', 'town', 'phone',
    'telephone', 'mobile', 'company', 'department', 'title', 'mr', 'mrs', 'miss'
  ];

  // Check each row starting from row 1
  for (let i = 0; i < Math.min(rawRows.length, 20); i++) {
    const row = rawRows[i];
    if (!row || !Array.isArray(row)) continue;

    // Count indicators that suggest this is a data row (not headers)
    let dataIndicators = 0;
    let headerIndicators = 0;
    let hasEmail = false;
    let hasNameLikeValues = 0;
    let hasPostcode = false;

    for (const cell of row) {
      if (!cell) continue;
      const value = String(cell).trim();
      const lowerValue = value.toLowerCase();

      // Check if this looks like a header term
      if (headerTerms.some(term => lowerValue === term || lowerValue.includes(term))) {
        headerIndicators++;
      }

      // Check for email
      if (emailPattern.test(value)) {
        hasEmail = true;
        dataIndicators++;
      }

      // Check for UK postcode
      if (postcodePattern.test(value)) {
        hasPostcode = true;
        dataIndicators++;
      }

      // Check for name-like values (capitalized words, not too short, not too long)
      if (namePattern.test(value) && value.length > 2 && value.length < 25) {
        // Make sure it's not a common header term
        if (!headerTerms.some(term => lowerValue === term)) {
          hasNameLikeValues++;
        }
      }
    }

    // If this row has more header terms than data indicators, it's probably a header row
    if (headerIndicators > 2) continue;

    // If we found an email or postcode, this is likely a data row
    if (hasEmail || hasPostcode) {
      return i + 1; // Convert to 1-indexed row number
    }

    // If we have multiple name-like values and few header indicators, likely data
    if (hasNameLikeValues >= 2 && headerIndicators <= 1) {
      return i + 1;
    }
  }

  // Default to row 2 if no clear data row found
  return 2;
}
