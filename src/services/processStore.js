import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

const COLLECTION_NAME = 'processes';
const LOCAL_STORAGE_KEY = 'batch_formatter_processes';

/**
 * Get all saved processes
 */
export async function getAllProcesses() {
  // Use Firebase if configured, otherwise use localStorage
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, COLLECTION_NAME), orderBy('companyName'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching processes from Firebase:', error);
      // Fall back to localStorage
      return getLocalProcesses();
    }
  }

  return getLocalProcesses();
}

/**
 * Save a new process
 */
export async function saveProcess(processData) {
  const data = {
    ...processData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isFirebaseConfigured() && db) {
    try {
      const docRef = await addDoc(collection(db, COLLECTION_NAME), data);
      return { id: docRef.id, ...data };
    } catch (error) {
      console.error('Error saving to Firebase:', error);
      // Fall back to localStorage
      return saveLocalProcess(data);
    }
  }

  return saveLocalProcess(data);
}

/**
 * Update an existing process
 */
export async function updateProcess(processId, processData) {
  const data = {
    ...processData,
    updatedAt: new Date().toISOString()
  };

  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, COLLECTION_NAME, processId);
      await updateDoc(docRef, data);
      return { id: processId, ...data };
    } catch (error) {
      console.error('Error updating in Firebase:', error);
      // Fall back to localStorage
      return updateLocalProcess(processId, data);
    }
  }

  return updateLocalProcess(processId, data);
}

/**
 * Delete a process
 */
export async function deleteProcess(processId) {
  if (isFirebaseConfigured() && db) {
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, processId));
      return true;
    } catch (error) {
      console.error('Error deleting from Firebase:', error);
      // Fall back to localStorage
      return deleteLocalProcess(processId);
    }
  }

  return deleteLocalProcess(processId);
}

/**
 * Find a process by company name
 * Also checks if the company was previously processed with a benefit provider's mapping
 */
export async function findProcessByCompany(companyName) {
  const processes = await getAllProcesses();
  const normalized = companyName.toLowerCase();

  // 1. Exact company name match
  const exactMatch = processes.find(
    p => p.companyName.toLowerCase() === normalized
  );
  if (exactMatch) return exactMatch;

  // 2. Partial company name match
  const partialMatch = processes.find(p => {
    const pName = p.companyName.toLowerCase();
    return pName.includes(normalized) || normalized.includes(pName);
  });
  if (partialMatch) return partialMatch;

  // 3. Check if any process was previously saved with this company
  // as part of a benefit provider group (stored in linkedCompanies)
  const linkedMatch = processes.find(p => {
    if (p.linkedCompanies && Array.isArray(p.linkedCompanies)) {
      return p.linkedCompanies.some(c =>
        c.toLowerCase() === normalized ||
        c.toLowerCase().includes(normalized) ||
        normalized.includes(c.toLowerCase())
      );
    }
    return false;
  });

  return linkedMatch || null;
}

/**
 * Find processes by benefit provider name
 */
export async function findProcessesByProvider(providerName) {
  const processes = await getAllProcesses();
  const normalized = providerName.toLowerCase();

  return processes.filter(p =>
    p.benefitProvider && p.benefitProvider.toLowerCase() === normalized
  );
}

/**
 * Link a company to an existing process (for benefit provider grouping)
 */
export async function linkCompanyToProcess(processId, companyName) {
  const processes = await getAllProcesses();
  const process = processes.find(p => p.id === processId);

  if (!process) return null;

  // Add to linked companies if not already there
  const linkedCompanies = process.linkedCompanies || [];
  const normalized = companyName.toLowerCase();

  if (!linkedCompanies.some(c => c.toLowerCase() === normalized)) {
    linkedCompanies.push(companyName);
    return await updateProcess(processId, { linkedCompanies });
  }

  return process;
}

// ==================== Local Storage Fallback ====================

function getLocalProcesses() {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalProcesses(processes) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(processes));
}

function saveLocalProcess(data) {
  const processes = getLocalProcesses();
  const id = 'local_' + Date.now();
  const newProcess = { id, ...data };
  processes.push(newProcess);
  saveLocalProcesses(processes);
  return newProcess;
}

function updateLocalProcess(processId, data) {
  const processes = getLocalProcesses();
  const index = processes.findIndex(p => p.id === processId);
  if (index >= 0) {
    processes[index] = { ...processes[index], ...data };
    saveLocalProcesses(processes);
    return processes[index];
  }
  return null;
}

function deleteLocalProcess(processId) {
  const processes = getLocalProcesses();
  const filtered = processes.filter(p => p.id !== processId);
  saveLocalProcesses(filtered);
  return true;
}

// ==================== Export/Import for backup ====================

/**
 * Export all processes as JSON (for backup)
 */
export async function exportProcesses() {
  const processes = await getAllProcesses();
  return JSON.stringify(processes, null, 2);
}

/**
 * Import processes from JSON
 */
export async function importProcesses(jsonString) {
  try {
    const processes = JSON.parse(jsonString);
    if (!Array.isArray(processes)) {
      throw new Error('Invalid format');
    }

    let imported = 0;
    for (const process of processes) {
      // Remove id to create new entries
      const { id, ...data } = process;
      await saveProcess(data);
      imported++;
    }

    return { success: true, count: imported };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// ==================== Password Management ====================

/**
 * Get saved passwords for a company
 * Returns array of passwords (can have multiple)
 */
export async function getPasswordsForCompany(companyName) {
  const process = await findProcessByCompany(companyName);
  if (process && process.passwords) {
    return Array.isArray(process.passwords) ? process.passwords : [process.passwords];
  }
  return [];
}

/**
 * Save password for a company
 * @param {string} companyName - The company name
 * @param {string} password - The password to save
 * @param {string} mode - 'save' (new), 'overwrite' (replace all), 'additional' (add to list)
 */
export async function savePasswordForCompany(companyName, password, mode = 'save') {
  const process = await findProcessByCompany(companyName);

  if (!process) {
    // No process exists yet - we'll save it when the process is created
    // For now, store in a temporary location
    const tempKey = 'batch_formatter_temp_passwords';
    const tempData = JSON.parse(localStorage.getItem(tempKey) || '{}');
    const normalized = companyName.toLowerCase();

    if (mode === 'additional' && tempData[normalized]) {
      const existing = Array.isArray(tempData[normalized]) ? tempData[normalized] : [tempData[normalized]];
      if (!existing.includes(password)) {
        tempData[normalized] = [...existing, password];
      }
    } else {
      tempData[normalized] = [password];
    }

    localStorage.setItem(tempKey, JSON.stringify(tempData));
    return { saved: true, temporary: true };
  }

  // Process exists - update it with the password
  let passwords = [];

  if (mode === 'overwrite' || mode === 'save') {
    // Replace all passwords with the new one
    passwords = [password];
  } else if (mode === 'additional') {
    // Add to existing passwords
    const existing = process.passwords
      ? (Array.isArray(process.passwords) ? process.passwords : [process.passwords])
      : [];
    if (!existing.includes(password)) {
      passwords = [...existing, password];
    } else {
      passwords = existing;
    }
  }

  await updateProcess(process.id, { passwords });
  return { saved: true, processId: process.id };
}

/**
 * Remove a password from a company's saved passwords
 */
export async function removePasswordFromCompany(companyName, passwordToRemove) {
  const process = await findProcessByCompany(companyName);
  if (!process || !process.passwords) return false;

  const existing = Array.isArray(process.passwords) ? process.passwords : [process.passwords];
  const filtered = existing.filter(p => p !== passwordToRemove);

  await updateProcess(process.id, { passwords: filtered.length > 0 ? filtered : null });
  return true;
}

/**
 * Get temporary passwords (for companies without saved processes yet)
 */
export function getTempPasswords(companyName) {
  const tempKey = 'batch_formatter_temp_passwords';
  const tempData = JSON.parse(localStorage.getItem(tempKey) || '{}');
  const normalized = companyName.toLowerCase();
  const passwords = tempData[normalized];
  return passwords ? (Array.isArray(passwords) ? passwords : [passwords]) : [];
}

/**
 * Clear temporary passwords for a company (called after process is saved)
 */
export function clearTempPasswords(companyName) {
  const tempKey = 'batch_formatter_temp_passwords';
  const tempData = JSON.parse(localStorage.getItem(tempKey) || '{}');
  const normalized = companyName.toLowerCase();
  delete tempData[normalized];
  localStorage.setItem(tempKey, JSON.stringify(tempData));
}
