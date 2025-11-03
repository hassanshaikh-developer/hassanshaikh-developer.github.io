/**
 * BIKE MANAGER - GIST.JS
 * GitHub Gist sync (import/export)
 */

import { exportBikes, importBikes } from './local.js';
import { showToast } from '../utils/helpers.js';

const GIST_TOKEN_KEY = 'bikeManager_gistToken';
const GIST_ID_KEY = 'bikeManager_gistId';
const GIST_FILENAME = 'bike-manager-data.json';

/**
 * Get stored Gist token (never logged)
 */
function getGistToken() {
  try {
    return localStorage.getItem(GIST_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Store Gist token securely
 */
export function setGistToken(token) {
  try {
    if (token) {
      localStorage.setItem(GIST_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(GIST_TOKEN_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Get stored Gist ID
 */
function getGistId() {
  try {
    return localStorage.getItem(GIST_ID_KEY);
  } catch {
    return null;
  }
}

/**
 * Store Gist ID
 */
function setGistId(gistId) {
  try {
    if (gistId) {
      localStorage.setItem(GIST_ID_KEY, gistId);
    } else {
      localStorage.removeItem(GIST_ID_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if user has Gist token configured
 */
export function hasGistToken() {
  return !!getGistToken();
}

/**
 * Export bikes to GitHub Gist
 */
export async function exportToGist() {
  const token = getGistToken();
  if (!token) {
    throw new Error('GitHub token not configured. Please set it in Settings.');
  }
  
  try {
    const bikesData = exportBikes();
    const gistId = getGistId();
    
    const gistData = {
      description: 'Bike Manager Data Export',
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: bikesData
        }
      }
    };
    
    let response;
    
    if (gistId) {
      // Update existing gist
      response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });
    } else {
      // Create new gist
      response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(gistData)
      });
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `GitHub API error: ${response.status}`);
    }
    
    const result = await response.json();
    setGistId(result.id);
    
    showToast('Data exported to Gist successfully', 'success');
    return result.id;
  } catch (error) {
    console.error('Gist export error:', error);
    showToast(`Export failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Import bikes from GitHub Gist
 */
export async function importFromGist(gistId = null) {
  const token = getGistToken();
  if (!token) {
    throw new Error('GitHub token not configured. Please set it in Settings.');
  }
  
  const targetGistId = gistId || getGistId();
  if (!targetGistId) {
    throw new Error('No Gist ID found. Please export first or provide a Gist ID.');
  }
  
  try {
    const response = await fetch(`https://api.github.com/gists/${targetGistId}`, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `GitHub API error: ${response.status}`);
    }
    
    const gist = await response.json();
    const file = gist.files[GIST_FILENAME];
    
    if (!file) {
      throw new Error('Bike data file not found in Gist');
    }
    
    // Fetch raw content if needed
    let content = file.content;
    if (!content && file.raw_url) {
      const rawResponse = await fetch(file.raw_url, {
        headers: {
          'Authorization': `token ${token}`
        }
      });
      if (rawResponse.ok) {
        content = await rawResponse.text();
      }
    }
    
    if (!content) {
      throw new Error('Could not retrieve Gist content');
    }
    
    // Import the data (merge mode)
    const count = importBikes(content, true);
    
    showToast(`Imported ${count} bikes from Gist`, 'success');
    return count;
  } catch (error) {
    console.error('Gist import error:', error);
    showToast(`Import failed: ${error.message}`, 'error');
    throw error;
  }
}

/**
 * Test Gist connection
 */
export async function testGistConnection() {
  const token = getGistToken();
  if (!token) {
    return { success: false, message: 'No token configured' };
  }
  
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      return { success: false, message: 'Invalid token or connection failed' };
    }
    
    const user = await response.json();
    return { success: true, username: user.login };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

