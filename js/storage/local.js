/**
 * BIKE MANAGER - LOCAL.JS
 * LocalStorage CRUD operations
 */

const STORAGE_KEY = 'bikeManager_bikes';

/**
 * Load bikes from localStorage
 */
export function loadBikes() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Initialize empty array
      bikes = [];
      saveBikes();
      return bikes;
    }
    
    const parsed = JSON.parse(stored);
    
    // Migrate from old format if needed
    if (Array.isArray(parsed)) {
      bikes = parsed;
    } else if (parsed.bikes && Array.isArray(parsed.bikes)) {
      bikes = parsed.bikes;
    } else {
      bikes = [];
    }
    
    // Ensure all bikes have required fields and numeric values are numbers
    bikes = bikes.map(bike => normalizeBike(bike));
    
    saveBikes();
    return bikes;
  } catch (error) {
    console.error('Error loading bikes:', error);
    bikes = [];
    saveBikes();
    return bikes;
  }
}

/**
 * Normalize bike data (ensure numeric fields are numbers)
 */
function normalizeBike(bike) {
  return {
    id: bike.id || generateId(),
    model: bike.model || '',
    source: bike.source || 'Owner',
    purchaseDate: bike.purchaseDate || '',
    sellingDate: bike.sellingDate || '',
    purchasePrice: parseFloat(bike.purchasePrice) || 0,
    repairCost: parseFloat(bike.repairCost) || 0,
    otherExpenses: parseFloat(bike.otherExpenses) || 0,
    sellingPrice: parseFloat(bike.sellingPrice) || 0,
    notes: bike.notes || '',
    status: bike.status === 'sold' ? 'sold' : 'unsold',
    createdAt: bike.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Internal bikes array
let bikes = [];

/**
 * Save bikes to localStorage
 */
function saveBikes() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bikes));
    return true;
  } catch (error) {
    console.error('Error saving bikes:', error);
    return false;
  }
}

/**
 * Get all bikes
 */
export function getBikes() {
  return [...bikes];
}

/**
 * Get bike by ID
 */
export function getBikeById(id) {
  return bikes.find(b => b.id === id);
}

/**
 * Add a new bike
 */
export function addBike(bikeData) {
  const newBike = normalizeBike({
    ...bikeData,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  
  bikes.push(newBike);
  saveBikes();
  return newBike;
}

/**
 * Update an existing bike
 */
export function updateBike(id, bikeData) {
  const index = bikes.findIndex(b => b.id === id);
  if (index === -1) {
    throw new Error(`Bike with id ${id} not found`);
  }
  
  const updatedBike = normalizeBike({
    ...bikes[index],
    ...bikeData,
    id, // Ensure ID doesn't change
    updatedAt: new Date().toISOString()
  });
  
  bikes[index] = updatedBike;
  saveBikes();
  return updatedBike;
}

/**
 * Delete a bike
 */
export function deleteBike(id) {
  const index = bikes.findIndex(b => b.id === id);
  if (index === -1) {
    throw new Error(`Bike with id ${id} not found`);
  }
  
  bikes.splice(index, 1);
  saveBikes();
  return true;
}

/**
 * Export all bikes as JSON
 */
export function exportBikes() {
  return JSON.stringify(bikes, null, 2);
}

/**
 * Import bikes from JSON
 */
export function importBikes(jsonData, merge = false) {
  try {
    const imported = JSON.parse(jsonData);
    let importedBikes = Array.isArray(imported) ? imported : (imported.bikes || []);
    
    // Normalize all imported bikes
    importedBikes = importedBikes.map(bike => normalizeBike(bike));
    
    if (merge) {
      // Merge with existing (skip duplicates by ID)
      const existingIds = new Set(bikes.map(b => b.id));
      importedBikes.forEach(bike => {
        if (!existingIds.has(bike.id)) {
          bikes.push(bike);
        }
      });
    } else {
      // Replace all
      bikes = importedBikes;
    }
    
    saveBikes();
    return bikes.length;
  } catch (error) {
    console.error('Error importing bikes:', error);
    throw new Error('Invalid JSON data');
  }
}

/**
 * Clear all bikes
 */
export function clearAllBikes() {
  bikes = [];
  saveBikes();
  return true;
}

/**
 * Get bike count
 */
export function getBikeCount() {
  return bikes.length;
}

/**
 * Initialize storage (call on app load)
 */
export function initStorage() {
  loadBikes();
}

// Auto-initialize
initStorage();

