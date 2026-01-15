/**
 * Words to remove from company names
 */
const WORDS_TO_REMOVE = [
  // Business terms
  'cycle to work', 'cycletowork', 'c2w', 'ctw', 'cycle', 'work',
  'halfords', 'halford',
  'daily', 'weekly', 'monthly', 'lunar', 'fortnightly', 'quarterly', 'annually',
  'email', 'emails', 'letter', 'letters',
  'report', 'reports', 'batch', 'file', 'export', 'data', 'collection',
  'new joiners', 'new joiner', 'joiners', 'joiner', 'starters', 'starter',
  'leavers', 'leaver', 'is leaver',
  'effective', 'approved', 'pending', 'active',
  'bikes', 'bike',
  'changes', 'change',
  // Geographic
  'uk', 'roi', 'ireland', 'england', 'scotland', 'wales',
  // Business suffixes
  'ltd', 'limited', 'plc', 'inc', 'corp', 'corporation', 'llc', 'llp',
  // Other common words
  'true', 'false', 'yes', 'no',
  'reference', 'ref', 'number', 'num', 'id',
];

/**
 * Clean a company name by removing common words and formatting
 * @param {string} rawName - The raw company name string
 * @returns {string} - Cleaned company name
 */
export function cleanCompanyName(rawName) {
  if (!rawName) return '';

  let name = String(rawName);

  // Remove file extension if present
  name = name.replace(/\.(xlsx?|csv|pdf)$/i, '');

  // Remove content in brackets (but save for entity extraction)
  name = name.replace(/\([^)]+\)/g, '');
  name = name.replace(/\[[^\]]+\]/g, '');

  // Replace underscores and hyphens with spaces
  name = name.replace(/[-_]+/g, ' ');

  // Remove version numbers like 6.1.1.3
  name = name.replace(/\d+\.\d+(\.\d+)*/g, ' ');

  // Remove dates in various formats
  name = name.replace(/\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/g, ' ');
  name = name.replace(/\d{4}[-\/]\d{1,2}[-\/]\d{1,2}/g, ' ');
  name = name.replace(/\d{8,}/g, ' ');

  // Remove month names
  name = name.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi, ' ');

  // Remove ordinals
  name = name.replace(/\d{1,2}(st|nd|rd|th)\b/gi, ' ');

  // Remove standalone numbers and reference numbers
  name = name.replace(/\b\d+\b/g, ' ');

  // Convert to lowercase for word matching
  let nameLower = name.toLowerCase();

  // Remove all the common words
  for (const word of WORDS_TO_REMOVE) {
    // Create regex that matches the word with word boundaries
    const regex = new RegExp(`\\b${word.replace(/\s+/g, '\\s*')}\\b`, 'gi');
    nameLower = nameLower.replace(regex, ' ');
  }

  // Clean up whitespace
  nameLower = nameLower.replace(/\s+/g, ' ').trim();

  // Title case the result
  if (nameLower) {
    name = nameLower
      .split(' ')
      .filter(p => p.length > 0)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  } else {
    name = '';
  }

  return name || 'Unknown Company';
}

/**
 * Extract company name AND entity from filename
 * e.g., "Technip Energies 6.1.1.3 Bikes Halfords (TECL)" -> { company: "Technip Energies", entity: "TECL" }
 * e.g., "Email_278202512036_Colgate_UK_Cycle_to_Work_Halfords_Daily" -> { company: "Colgate", entity: "" }
 */
export function extractCompanyAndEntity(filename) {
  // Remove file extension
  let name = filename.replace(/\.(xlsx?|csv|pdf)$/i, '');

  // Extract entity from brackets first (e.g., "(TECL)")
  let entity = '';
  const bracketMatch = name.match(/\(([^)]+)\)/);
  if (bracketMatch) {
    const bracketContent = bracketMatch[1].trim();
    // Entity codes are usually short uppercase strings
    if (bracketContent.length <= 10 && /^[A-Za-z0-9]+$/.test(bracketContent)) {
      entity = bracketContent.toUpperCase();
    }
  }

  // Clean the company name
  const company = cleanCompanyName(name);

  return { company, entity };
}

/**
 * Extract company name from filename (legacy function)
 */
export function extractCompanyName(filename) {
  const { company } = extractCompanyAndEntity(filename);
  return company;
}

/**
 * Match a company name against saved profiles
 * Returns the best match or null
 */
export function findMatchingCompany(extractedName, savedCompanies) {
  if (!extractedName || !savedCompanies || savedCompanies.length === 0) {
    return null;
  }

  const normalizedExtracted = extractedName.toLowerCase();

  // Exact match
  const exactMatch = savedCompanies.find(
    c => c.name.toLowerCase() === normalizedExtracted
  );
  if (exactMatch) return exactMatch;

  // Partial match (extracted name contains or is contained by saved name)
  const partialMatch = savedCompanies.find(c => {
    const savedLower = c.name.toLowerCase();
    return normalizedExtracted.includes(savedLower) ||
      savedLower.includes(normalizedExtracted);
  });
  if (partialMatch) return partialMatch;

  // Word-based matching
  const extractedWords = normalizedExtracted.split(/\s+/);
  const wordMatch = savedCompanies.find(c => {
    const savedWords = c.name.toLowerCase().split(/\s+/);
    return savedWords.some(sw => extractedWords.includes(sw));
  });

  return wordMatch || null;
}

/**
 * Generate output filename in format: "Company Name DD.MM.YY.csv"
 */
export function generateOutputFilename(companyName) {
  const date = new Date();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2); // Last 2 digits
  const dateStr = `${day}.${month}.${year}`;

  // Clean company name for filename (keep spaces)
  const cleanName = companyName
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  return `${cleanName} ${dateStr}.csv`;
}

/**
 * Extract text in brackets/parentheses from filename
 * Useful for entity codes like "Astrazeneca (TECL)"
 */
export function extractBracketContent(filename) {
  const matches = [];

  // Round brackets
  const roundBrackets = filename.match(/\(([^)]+)\)/g);
  if (roundBrackets) {
    roundBrackets.forEach(m => {
      matches.push(m.replace(/[()]/g, '').trim());
    });
  }

  // Square brackets
  const squareBrackets = filename.match(/\[([^\]]+)\]/g);
  if (squareBrackets) {
    squareBrackets.forEach(m => {
      matches.push(m.replace(/[\[\]]/g, '').trim());
    });
  }

  return matches;
}
