/**
 * Database Module
 * Handles all IndexedDB operations using Dexie
 */

const DB_NAME = 'BikeDB_v7';
const OLD_STORAGE_KEY = 'bikes_db_v2';
const SETTINGS_KEY = 'bike_manager_settings_v7';
const PAT_KEY = 'bike_manager_pat_v7';
const THEME_KEY = 'bike_manager_theme';
const UNDO_KEY = 'bike_manager_undo';

class BikeDatabase {
  constructor() {
    this.db = null;
    this.ready = false;
  }

  /**
   * Initialize the database
   */
  async init() {
    try {
      console.log('Initializing Dexie database...');
      this.db = new Dexie(DB_NAME);
      
      this.db.version(1).stores({
        bikes: '++_id, &no, owner, _updatedAt, dateSelling, _deleted',
      });
      
      await this.db.open();
      this.ready = true;
      console.log("Database v7.0 initialized successfully");
      
      // Migrate old data if present
      await this.migrateFromLocalStorage();
      await this.cleanCorruptedData();
      
      return this.db;
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw new Error("Failed to initialize database: " + error.message);
    }
  }

  /**
   * Clean corrupted numeric data
   */
  async cleanCorruptedData() {
    try {
      console.log("Checking for data corruption...");
      const allBikes = await this.db.bikes.toArray();
      
      const bikesToFix = allBikes.filter(b => {
        return typeof b.purchasePrice === 'string' || 
               typeof b.netProfit === 'string' || 
               typeof b.repairCost === 'string' ||
               typeof b.sellingPrice === 'string' ||
               (b.no && typeof b.no === 'string' && b.no.startsWith('N'));
      });
        
      if (bikesToFix.length > 0) {
        console.log(`Found ${bikesToFix.length} corrupted records. Fixing...`);
        
        const fixedBikes = bikesToFix.map(b => {
          const purchasePrice = parseFloat(b.purchasePrice) || 0;
          const repairCost = parseFloat(b.repairCost) || 0;
          const sellingPrice = parseFloat(b.sellingPrice) || 0;
          
          return {
            ...b,
            no: (b.no || '').toString().trim().toUpperCase().replace(/^N+/, ''),
            purchasePrice: purchasePrice,
            repairCost: repairCost,
            sellingPrice: sellingPrice,
            netProfit: sellingPrice - (purchasePrice + repairCost),
          };
        });
        
        await this.db.bikes.bulkPut(fixedBikes);
        console.log("Corruption fix complete.");
        return fixedBikes.length;
      } else {
        console.log("Data is clean.");
        return 0;
      }
    } catch (error) {
      console.error("Failed during data cleaning:", error);
      return 0;
    }
  }

  /**
   * Migrate data from old localStorage version
   */
  async migrateFromLocalStorage() {
    const oldDataRaw = localStorage.getItem(OLD_STORAGE_KEY);
    if (!oldDataRaw) return 0;
    
    try {
      const oldDb = JSON.parse(oldDataRaw);
      if (!Array.isArray(oldDb) || oldDb.length === 0) {
        localStorage.removeItem(OLD_STORAGE_KEY);
        return 0;
      }
      
      console.log(`Migrating ${oldDb.length} records from localStorage...`);
      
      const now = new Date().toISOString();
      const recordsToMigrate = oldDb.map(record => ({
        ...record,
        purchasePrice: parseFloat(record.purchasePrice) || 0,
        repairCost: parseFloat(record.repairCost) || 0,
        sellingPrice: parseFloat(record.sellingPrice) || 0,
        netProfit: parseFloat(record.netProfit) || 0,
        _updatedAt: record._updatedAt || now,
        _deleted: Boolean(record._deleted),
      }));
      
      await this.db.bikes.bulkPut(recordsToMigrate);
      localStorage.removeItem(OLD_STORAGE_KEY);
      console.log(`Migration complete: ${oldDb.length} records`);
      
      return oldDb.length;
    } catch (error) {
      console.error("Migration failed:", error);
      return 0;
    }
  }

  /**
   * Get all bikes (non-deleted)
   */
  async getAllBikes() {
    if (!this.ready) await this.init();
    try {
      return await this.db.bikes.where('_deleted').equals(false).toArray();
    } catch (e) {
      console.error("Failed to query database:", e);
      return await this.db.bikes.filter(b => !b._deleted).toArray();
    }
  }

  /**
   * Get bike by ID
   */
  async getBike(id) {
    if (!this.ready) await this.init();
    return await this.db.bikes.get(Number(id));
  }

  /**
   * Add a new bike
   */
  async addBike(bikeData) {
    if (!this.ready) await this.init();
    const data = {
      ...bikeData,
      no: (bikeData.no || '').toString().trim().toUpperCase(),
      purchasePrice: parseFloat(bikeData.purchasePrice) || 0,
      repairCost: parseFloat(bikeData.repairCost) || 0,
      sellingPrice: parseFloat(bikeData.sellingPrice) || 0,
      netProfit: (parseFloat(bikeData.sellingPrice) || 0) - ((parseFloat(bikeData.purchasePrice) || 0) + (parseFloat(bikeData.repairCost) || 0)),
      _updatedAt: new Date().toISOString(),
      _deleted: false,
    };
    return await this.db.bikes.add(data);
  }

  /**
   * Update a bike
   */
  async updateBike(id, updates) {
    if (!this.ready) await this.init();
    const data = {
      ...updates,
      no: (updates.no || '').toString().trim().toUpperCase(),
      purchasePrice: parseFloat(updates.purchasePrice) || 0,
      repairCost: parseFloat(updates.repairCost) || 0,
      sellingPrice: parseFloat(updates.sellingPrice) || 0,
      netProfit: (parseFloat(updates.sellingPrice) || 0) - ((parseFloat(updates.purchasePrice) || 0) + (parseFloat(updates.repairCost) || 0)),
      _updatedAt: new Date().toISOString(),
    };
    return await this.db.bikes.update(Number(id), data);
  }

  /**
   * Delete a bike (soft delete)
   */
  async deleteBike(id) {
    if (!this.ready) await this.init();
    return await this.db.bikes.update(Number(id), {
      _deleted: true,
      _updatedAt: new Date().toISOString()
    });
  }

  /**
   * Restore a deleted bike
   */
  async restoreBike(id) {
    if (!this.ready) await this.init();
    return await this.db.bikes.update(Number(id), {
      _deleted: false,
      _updatedAt: new Date().toISOString()
    });
  }

  /**
   * Bulk update bikes
   */
  async bulkUpdate(updates) {
    if (!this.ready) await this.init();
    return await this.db.bikes.bulkPut(updates);
  }

  /**
   * Clear all bikes
   */
  async clearAll() {
    if (!this.ready) await this.init();
    return await this.db.bikes.clear();
  }

  /**
   * Settings management
   */
  loadSettings() {
    try {
      const saved = localStorage.getItem(SETTINGS_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Failed to load settings:", e);
      return null;
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error("Failed to save settings:", e);
    }
  }

  loadPAT() {
    return sessionStorage.getItem(PAT_KEY) || '';
  }

  savePAT(pat) {
    if (pat) {
      sessionStorage.setItem(PAT_KEY, pat);
    } else {
      sessionStorage.removeItem(PAT_KEY);
    }
  }

  loadTheme() {
    return localStorage.getItem(THEME_KEY) || 'auto';
  }

  saveTheme(theme) {
    localStorage.setItem(THEME_KEY, theme);
  }

  loadUndoStack() {
    try {
      const saved = localStorage.getItem(UNDO_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load undo stack:", e);
      return [];
    }
  }

  saveUndoStack(stack) {
    try {
      localStorage.setItem(UNDO_KEY, JSON.stringify(stack));
    } catch (e) {
      console.error("Failed to save undo stack:", e);
    }
  }
}

// Export singleton instance
export const bikeDB = new BikeDatabase();
export { SETTINGS_KEY, PAT_KEY, THEME_KEY, UNDO_KEY };

