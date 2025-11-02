/**
 * Sync Module
 * Handles GitHub Gist synchronization
 */

export class GistSync {
  constructor(settings) {
    this.settings = settings;
  }

  /**
   * Update settings
   */
  updateSettings(settings) {
    this.settings = settings;
  }

  /**
   * Fetch data from GitHub Gist
   */
  async fetchFromGist() {
    const { gistId, githubPat, gistFilename } = this.settings;
    if (!gistId || !githubPat) {
      throw new Error('Gist ID and GitHub PAT must be set');
    }

    const url = `https://api.github.com/gists/${gistId}`;

    const response = await fetch(url, {
      headers: { 
        'Authorization': `token ${githubPat}`, 
        'Accept': 'application/vnd.github.v3+json' 
      }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      if (response.status === 401) {
        throw new Error('Invalid GitHub PAT. Please check your token.');
      }
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const gist = await response.json();
    const file = gist.files[gistFilename];
    const latestSha = gist.history[0].version;

    if (!file) return null;

    let content;
    if (file.truncated) {
      const rawResponse = await fetch(file.raw_url);
      content = await rawResponse.text();
    } else {
      content = file.content;
    }

    return { content, sha: latestSha };
  }

  /**
   * Push data to GitHub Gist
   */
  async pushToGist(content, sha = null) {
    const { gistId, githubPat, gistFilename } = this.settings;
    if (!gistId || !githubPat) {
      throw new Error('Gist ID and GitHub PAT must be set');
    }

    const url = `https://api.github.com/gists/${gistId}`;

    const body = {
      description: `Bike Manager DB updated ${new Date().toISOString()}`,
      files: {
        [gistFilename]: {
          content: content
        }
      }
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${githubPat}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 409) {
        throw new Error('Conflict: Gist was modified. Please sync again to merge changes.');
      }
      if (response.status === 401) {
        throw new Error('Invalid GitHub PAT. Please check your token.');
      }
      throw new Error(`Failed to push to Gist: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    return result.history[0].version;
  }

  /**
   * Convert bikes array to CSV
   */
  bikesToCSV(bikes, skipDeleted = false) {
    const headers = ['no', 'owner', 'purchasePrice', 'repairCost', 'sellingPrice', 'netProfit', 'datePurchase', 'dateSelling', '_updatedAt', '_deleted'];
    const headerRow = headers.map(h => `"${h}"`).join(',');
    
    let itemsToExport = bikes;
    if (skipDeleted) {
      itemsToExport = bikes.filter(item => !item._deleted);
    }
    
    const rows = itemsToExport.map(row => 
      headers.map(header => {
        const value = row[header] === undefined || row[header] === null ? '' : row[header];
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );
    
    return [headerRow, ...rows].join('\r\n');
  }

  /**
   * Convert CSV to bikes array
   */
  csvToBikes(csvText) {
    if (!csvText || typeof csvText !== 'string') {
      return [];
    }
    const lines = csvText.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return [];
    
    const headers = this.parseCSVLine(lines[0]);
    
    return lines.slice(1).map(line => {
      const values = this.parseCSVLine(line);
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      
      // Ensure numeric fields are numbers
      const purchasePrice = parseFloat(obj.purchasePrice) || 0;
      const repairCost = parseFloat(obj.repairCost) || 0;
      const sellingPrice = parseFloat(obj.sellingPrice) || 0;
      
      return {
        ...obj,
        no: (obj.no || '').toString().trim().toUpperCase().replace(/^N+/, ''),
        purchasePrice: purchasePrice,
        repairCost: repairCost,
        sellingPrice: sellingPrice,
        netProfit: sellingPrice - (purchasePrice + repairCost),
        _deleted: obj._deleted === 'true' || obj._deleted === true || false,
      };
    });
  }

  /**
   * Parse a CSV line handling quoted values
   */
  parseCSVLine(line) {
    const values = [];
    let inQuotes = false;
    let currentField = '';
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentField += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    values.push(currentField.trim());
    return values.map(v => v.replace(/^"|"$/g, ''));
  }

  /**
   * Sync bikes with GitHub Gist
   * Returns merged bikes array
   */
  async sync(localBikes, onProgress = null) {
    if (!navigator.onLine) {
      throw new Error('Cannot sync. You are offline.');
    }

    const { gistId, githubPat } = this.settings;
    if (!gistId || !githubPat) {
      throw new Error('Gist ID and GitHub PAT must be set in Settings.');
    }

    // Fetch remote data
    if (onProgress) onProgress('Fetching remote data...');
    const remoteFile = await this.fetchFromGist();
    
    let remoteBikes = [];
    if (remoteFile && remoteFile.content) {
      remoteBikes = this.csvToBikes(remoteFile.content);
      this.settings.lastSyncSha = remoteFile.sha;
    }

    // Merge local and remote data (last-write-wins)
    if (onProgress) onProgress('Merging data...');
    const mergedBikesMap = new Map();
    
    for (const bike of localBikes) {
      if (bike && bike.no) {
        mergedBikesMap.set(bike.no, bike); 
      }
    }
    
    for (const remoteBike of remoteBikes) {
      if (remoteBike && remoteBike.no) {
        const localBike = mergedBikesMap.get(remoteBike.no);
        const remoteTime = new Date(remoteBike._updatedAt || 0).getTime();
        const localTime = new Date(localBike?._updatedAt || 0).getTime();
        if (!localBike || (remoteTime > localTime && !isNaN(remoteTime))) {
          mergedBikesMap.set(remoteBike.no, remoteBike);
        }
      }
    }
    
    const mergedBikes = Array.from(mergedBikesMap.values());

    // Push merged data back to Gist
    if (onProgress) onProgress('Pushing to remote...');
    const csvContent = this.bikesToCSV(mergedBikes, false);
    
    if (!remoteFile || csvContent !== remoteFile.content) {
      const newSha = await this.pushToGist(csvContent, this.settings.lastSyncSha);
      this.settings.lastSyncSha = newSha;
    } else {
      console.log("No changes to push.");
    }

    this.settings.lastSync = new Date().toISOString();
    
    return mergedBikes;
  }
}

// Export singleton instance (will be initialized with settings)
export let gistSync = null;

export function initGistSync(settings) {
  gistSync = new GistSync(settings);
  return gistSync;
}

