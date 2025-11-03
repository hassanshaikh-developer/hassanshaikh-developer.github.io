/**
 * List View Module
 * Handles bike list display, filtering, sorting, and pagination
 */

(function(window) {
  'use strict';

  if (!window.app) {
    console.error('List view: app not initialized');
    return;
  }

  const app = window.app;
  const ITEMS_PER_PAGE = 50;

  // Extend app with list view methods
  Object.assign(app, {
    /**
     * Render bike list with filters, sort, and pagination
     */
    async renderBikeList() {
      let bikes;

      try {
        if (this.currentFilters.status === 'sold') {
          bikes = await this.db.bikes.where('[dateSelling+_deleted]').above(['', false]).toArray();
        } else if (this.currentFilters.status === 'unsold') {
          bikes = await this.db.bikes.where({ dateSelling: '', _deleted: false }).toArray();
        } else {
          bikes = await this.db.bikes.where('_deleted').equals(false).toArray();
        }
      } catch (e) {
        console.error('Failed to query database:', e);
        bikes = await this.db.bikes.filter(b => !b._deleted).toArray();
        if (this.currentFilters.status === 'sold') {
          bikes = bikes.filter(b => b.dateSelling && b.dateSelling !== '');
        } else if (this.currentFilters.status === 'unsold') {
          bikes = bikes.filter(b => !b.dateSelling || b.dateSelling === '');
        }
      }

      // Apply search
      if (this.currentFilters.search) {
        const search = this.currentFilters.search.toLowerCase();
        bikes = bikes.filter(b =>
          (b.no && b.no.toLowerCase().includes(search)) ||
          (b.owner && b.owner.toLowerCase().includes(search))
        );
      }

      // Sort
      bikes = this.sortBikes(bikes, this.currentFilters.sort);

      // Paginate
      this.totalPages = Math.max(1, Math.ceil(bikes.length / ITEMS_PER_PAGE));
      this.currentPage = Math.min(this.currentPage, this.totalPages);
      const startIdx = (this.currentPage - 1) * ITEMS_PER_PAGE;
      const paginatedBikes = bikes.slice(startIdx, startIdx + ITEMS_PER_PAGE);

      // Show empty state
      if (bikes.length === 0) {
        if (this.dom.bikeList) this.dom.bikeList.innerHTML = '';
        if (this.dom.bikeListEmpty) this.dom.bikeListEmpty.classList.remove('hidden');
        if (this.dom.pagination) this.dom.pagination.classList.add('hidden');
        return;
      }

      if (this.dom.bikeListEmpty) this.dom.bikeListEmpty.classList.add('hidden');

      // Render
      requestAnimationFrame(() => {
        if (this.dom.bikeList) {
          this.dom.bikeList.innerHTML = paginatedBikes.map(bike => this.createBikeCardHTML(bike)).join('');
        }

        // Update pagination
        if (this.totalPages > 1 && this.dom.pagination) {
          this.dom.pagination.classList.remove('hidden');
          const pageInfo = document.getElementById('page-info');
          const prevBtn = document.getElementById('prev-page');
          const nextBtn = document.getElementById('next-page');
          if (pageInfo) pageInfo.textContent = `Page ${this.currentPage} of ${this.totalPages}`;
          if (prevBtn) prevBtn.disabled = this.currentPage === 1;
          if (nextBtn) nextBtn.disabled = this.currentPage === this.totalPages;
        } else if (this.dom.pagination) {
          this.dom.pagination.classList.add('hidden');
        }
      });
    },

    /**
     * Sort bikes array
     */
    sortBikes(bikes, sortType) {
      const sorted = [...bikes];
      switch (sortType) {
        case 'latest':
          return sorted.sort((a, b) => new Date(b._updatedAt || 0) - new Date(a._updatedAt || 0));
        case 'oldest':
          return sorted.sort((a, b) => new Date(a._updatedAt || 0) - new Date(b._updatedAt || 0));
        case 'profit-high':
          return sorted.sort((a, b) => (parseFloat(b.netProfit) || 0) - (parseFloat(a.netProfit) || 0));
        case 'profit-low':
          return sorted.sort((a, b) => (parseFloat(a.netProfit) || 0) - (parseFloat(b.netProfit) || 0));
        case 'plate':
          return sorted.sort((a, b) => (a.no || '').localeCompare(b.no || ''));
        case 'owner':
          return sorted.sort((a, b) => (a.owner || '').localeCompare(b.owner || ''));
        default:
          return sorted;
      }
    },

    /**
     * Create bike card HTML
     */
    createBikeCardHTML(bike) {
      const isSold = !!(bike.dateSelling && bike.dateSelling !== '');
      const profit = parseFloat(bike.netProfit) || 0;
      let profitClass = 'profit-value';
      let profitDisplay = `${this.settings.currency} ${this.formatCurrency(profit)}`;

      if (!isSold) {
        profitClass += ' unrealized';
        profitDisplay = 'Unsold';
      } else if (profit < 0) {
        profitClass += ' loss';
      }

      const isSelected = this.selectedBikes.has(String(bike._id));

      return `
        <div class="bike-card ${isSelected ? 'selected' : ''}" data-id="${bike._id}" role="listitem">
          <div class="bike-checkbox" role="checkbox" aria-checked="${isSelected}">
            <svg><use href="#icon-check"></use></svg>
          </div>
          <div class="bike-card-main">
            <div class="bike-card-plate">${this.escapeHtml(bike.no || '')}</div>
            <div class="bike-card-owner">${this.escapeHtml(bike.owner || '')}</div>
          </div>
          <div class="bike-card-profit">
            <div class="${profitClass}">${profitDisplay}</div>
          </div>
        </div>
      `;
    },

    /**
     * Set filter status
     */
    setFilterStatus(status) {
      this.currentFilters.status = status;
      document.querySelectorAll('.filter-chips .chip').forEach(c => {
        const isActive = c.dataset.filter === status;
        c.classList.toggle('active', isActive);
        c.setAttribute('aria-checked', isActive);
      });
      this.currentPage = 1;
      this.renderBikeList();
    },

    /**
     * Toggle bike selection
     */
    toggleBikeSelection(id) {
      const idStr = String(id);
      if (this.selectedBikes.has(idStr)) {
        this.selectedBikes.delete(idStr);
      } else {
        this.selectedBikes.add(idStr);
      }
      this.updateBulkActionBar();
      this.renderBikeList();
    },

    /**
     * Update bulk action bar
     */
    updateBulkActionBar() {
      const bar = document.getElementById('bulk-action-bar');
      const countEl = document.getElementById('selected-count');
      const count = this.selectedBikes.size;
      if (countEl) countEl.textContent = count;
      if (bar) {
        bar.classList.toggle('active', count > 0);
      }
    },

    /**
     * Clear selection
     */
    clearSelection() {
      this.selectedBikes.clear();
      this.updateBulkActionBar();
      this.renderBikeList();
    },

    /**
     * Change page
     */
    changePage(delta) {
      const newPage = this.currentPage + delta;
      if (newPage >= 1 && newPage <= this.totalPages) {
        this.currentPage = newPage;
        this.renderBikeList();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },

    /**
     * Initialize list view event listeners
     */
    initListViewListeners() {
      // Search
      if (this.dom.searchInput) {
        this.dom.searchInput.addEventListener('input', (e) => {
          this.currentFilters.search = e.target.value;
          this.currentPage = 1;
          this.debouncedRenderList();
        });
      }

      if (this.dom.searchClear) {
        this.dom.searchClear.addEventListener('click', () => {
          this.currentFilters.search = '';
          if (this.dom.searchInput) this.dom.searchInput.value = '';
          this.currentPage = 1;
          this.renderBikeList();
        });
      }

      // Sort dropdown
      const sortBtn = document.getElementById('sort-btn');
      if (sortBtn) {
        sortBtn.addEventListener('click', () => {
          const menu = document.getElementById('sort-menu');
          if (menu) {
            menu.classList.toggle('active');
            sortBtn.setAttribute('aria-expanded', menu.classList.contains('active'));
          }
        });
      }

      document.querySelectorAll('.sort-option').forEach(opt => {
        opt.addEventListener('click', () => {
          this.currentFilters.sort = opt.dataset.sort;
          document.querySelectorAll('.sort-option').forEach(o => {
            o.classList.remove('active');
            o.setAttribute('aria-checked', 'false');
          });
          opt.classList.add('active');
          opt.setAttribute('aria-checked', 'true');

          const label = document.getElementById('sort-label');
          if (label) label.textContent = opt.textContent.replace('✓', '').trim();

          const menu = document.getElementById('sort-menu');
          if (menu) {
            menu.classList.remove('active');
            if (sortBtn) sortBtn.setAttribute('aria-expanded', 'false');
          }
          this.currentPage = 1;
          this.renderBikeList();
        });
      });

      // Close sort menu on outside click
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.sort-dropdown')) {
          const menu = document.getElementById('sort-menu');
          if (menu && menu.classList.contains('active')) {
            menu.classList.remove('active');
            if (sortBtn) sortBtn.setAttribute('aria-expanded', 'false');
          }
        }
      });

      // Filters
      const filterAll = document.getElementById('filter-all');
      const filterSold = document.getElementById('filter-sold');
      const filterUnsold = document.getElementById('filter-unsold');

      if (filterAll) filterAll.addEventListener('click', () => this.setFilterStatus('all'));
      if (filterSold) filterSold.addEventListener('click', () => this.setFilterStatus('sold'));
      if (filterUnsold) filterUnsold.addEventListener('click', () => this.setFilterStatus('unsold'));

      // Bike list clicks
      if (this.dom.bikeList) {
        this.dom.bikeList.addEventListener('click', (e) => {
          const card = e.target.closest('.bike-card');
          if (card) {
            if (e.shiftKey || e.ctrlKey || e.metaKey || e.target.closest('.bike-checkbox')) {
              this.toggleBikeSelection(card.dataset.id);
            } else {
              this.handleEditBike(card.dataset.id);
            }
          }
        });
      }

      // Add bike buttons
      const fabBuy = document.getElementById('fab-buy');
      const buyDesktop = document.getElementById('buy-bike-desktop');
      if (fabBuy) fabBuy.addEventListener('click', () => this.handleNewBike());
      if (buyDesktop) buyDesktop.addEventListener('click', () => this.handleNewBike());

      // Bulk actions
      const bulkMarkSold = document.getElementById('bulk-mark-sold');
      const bulkExport = document.getElementById('bulk-export');
      const bulkDeselect = document.getElementById('bulk-deselect');

      if (bulkMarkSold) bulkMarkSold.addEventListener('click', () => this.handleBulkMarkSold());
      if (bulkExport) bulkExport.addEventListener('click', () => this.handleBulkExport());
      if (bulkDeselect) bulkDeselect.addEventListener('click', () => this.clearSelection());

      // Pagination
      const prevPage = document.getElementById('prev-page');
      const nextPage = document.getElementById('next-page');
      if (prevPage) prevPage.addEventListener('click', () => this.changePage(-1));
      if (nextPage) nextPage.addEventListener('click', () => this.changePage(1));

      // Update stats on list view
      this.updateListStats();
    },

    /**
     * Update quick stats in list view
     */
    async updateListStats() {
      try {
        const bikes = await this.db.bikes.filter(b => !b._deleted).toArray();
        const sold = bikes.filter(b => b.dateSelling && b.dateSelling !== '');
        const unsold = bikes.filter(b => !b.dateSelling || b.dateSelling === '');

        const totalProfit = sold.reduce((sum, b) => sum + parseFloat(b.netProfit || 0), 0);
        const unsoldValue = unsold.reduce((sum, b) => sum + parseFloat(b.purchasePrice || 0) + parseFloat(b.repairCost || 0), 0);

        const statTotalProfit = document.getElementById('stat-total-profit');
        const statUnsoldValue = document.getElementById('stat-unsold-value');
        const statSoldCount = document.getElementById('stat-sold-count');
        const statUnsoldCount = document.getElementById('stat-unsold-count');

        if (statTotalProfit) statTotalProfit.textContent = this.formatCurrency(totalProfit);
        if (statUnsoldValue) statUnsoldValue.textContent = this.formatCurrency(unsoldValue);
        if (statSoldCount) statSoldCount.textContent = sold.length;
        if (statUnsoldCount) statUnsoldCount.textContent = unsold.length;
      } catch (error) {
        console.error('Failed to update list stats:', error);
      }
    }
  });

  // Initialize listeners when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.app) window.app.initListViewListeners();
    });
  } else {
    if (window.app) window.app.initListViewListeners();
  }

})(window);

