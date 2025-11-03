/**
 * BIKE MANAGER - FILTERS.JS
 * Sort/filter controls component
 */

/**
 * Render filters and sort controls
 */
export function renderFilters(filters, onChange) {
  const container = document.getElementById('filters-container');
  if (!container) return;
  
  const sortOptions = [
    { value: 'highest-profit', label: 'Highest Profit' },
    { value: 'lowest-profit', label: 'Lowest Profit' },
    { value: 'longest-held', label: 'Longest Held' },
    { value: 'newest', label: 'Newest' },
    { value: 'oldest', label: 'Oldest' }
  ];
  
  const filterChips = [
    { id: 'high-value', label: 'High Value (>₹50k)' },
    { id: 'profitable', label: 'Profitable' },
    { id: 'unsold', label: 'Unsold' },
    { id: 'source-dealer', label: 'Source: Dealer' },
    { id: 'source-owner', label: 'Source: Owner' },
    { id: 'source-auction', label: 'Source: Auction' }
  ];
  
  container.innerHTML = `
    <div class="filters-section">
      <div class="filter-group">
        <label for="sort-select" class="sr-only">Sort by</label>
        <select id="sort-select" class="sort-select" aria-label="Sort bikes">
          ${sortOptions.map(opt => `
            <option value="${opt.value}" ${filters.sortBy === opt.value ? 'selected' : ''}>
              ${opt.label}
            </option>
          `).join('')}
        </select>
      </div>
      
      <div class="filter-group">
        <span class="filter-label">Filters:</span>
        ${filterChips.map(chip => `
          <button 
            class="filter-chip ${filters.activeFilters?.includes(chip.id) ? 'active' : ''}"
            data-filter="${chip.id}"
            aria-pressed="${filters.activeFilters?.includes(chip.id) ? 'true' : 'false'}"
          >
            ${chip.label}
          </button>
        `).join('')}
      </div>
    </div>
  `;
  
  // Setup event listeners
  setupFilterListeners(filters, onChange);
}

/**
 * Setup filter event listeners
 */
function setupFilterListeners(filters, onChange) {
  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      const newFilters = {
        ...filters,
        sortBy: e.target.value
      };
      onChange(newFilters);
    });
  }
  
  // Filter chips
  const filterChips = document.querySelectorAll('.filter-chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      const filterId = chip.dataset.filter;
      const activeFilters = filters.activeFilters || [];
      
      let newActiveFilters;
      if (activeFilters.includes(filterId)) {
        // Remove filter
        newActiveFilters = activeFilters.filter(f => f !== filterId);
      } else {
        // Add filter (remove conflicting source filters if adding a source filter)
        if (filterId.startsWith('source-')) {
          newActiveFilters = activeFilters.filter(f => !f.startsWith('source-'));
        } else {
          newActiveFilters = [...activeFilters];
        }
        newActiveFilters.push(filterId);
      }
      
      const newFilters = {
        ...filters,
        activeFilters: newActiveFilters
      };
      
      // Update UI
      chip.classList.toggle('active');
      chip.setAttribute('aria-pressed', newActiveFilters.includes(filterId) ? 'true' : 'false');
      
      onChange(newFilters);
    });
  });
}

