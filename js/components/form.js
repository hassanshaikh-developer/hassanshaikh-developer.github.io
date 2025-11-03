/**
 * Form Component Module
 * Handles bike form modal and CRUD operations
 */

(function(window) {
  'use strict';

  if (!window.app) {
    console.error('Form component: app not initialized');
    return;
  }

  const app = window.app;

  Object.assign(app, {
    /**
     * Handle new bike
     */
    handleNewBike() {
      this.currentBikeId = null;
      this.openFormModal('Buy New Bike', false);
      document.getElementById('form-section-sell')?.classList.add('hidden');
      document.getElementById('delete-bike-btn')?.classList.add('hidden');
      document.getElementById('duplicate-bike-btn')?.classList.add('hidden');
    },

    /**
     * Handle edit bike
     */
    async handleEditBike(id) {
      try {
        const bike = await this.db.bikes.get(id);
        if (!bike) {
          this.showToast('Bike not found', 'error');
          return;
        }
        
        this.currentBikeId = id;
        const isSold = !!(bike.dateSelling && bike.dateSelling !== '');
        this.openFormModal(isSold ? 'Edit Bike (Sold)' : 'Edit Bike', true);
        
        // Populate form
        document.getElementById('form-no').value = bike.no || '';
        document.getElementById('form-owner').value = bike.owner || '';
        document.getElementById('form-datePurchase').value = bike.datePurchase || '';
        document.getElementById('form-purchasePrice').value = bike.purchasePrice || '';
        document.getElementById('form-repairCost').value = bike.repairCost || '';
        document.getElementById('form-dateSelling').value = bike.dateSelling || '';
        document.getElementById('form-sellingPrice').value = bike.sellingPrice || '';
        
        // Show/hide sell section
        const sellSection = document.getElementById('form-section-sell');
        if (isSold) {
          sellSection?.classList.remove('hidden');
        } else {
          sellSection?.classList.add('hidden');
        }
        
        document.getElementById('delete-bike-btn')?.classList.remove('hidden');
        document.getElementById('duplicate-bike-btn')?.classList.remove('hidden');
        
        this.calculateFormProfit();
      } catch (error) {
        console.error('Failed to load bike:', error);
        this.showToast('Failed to load bike', 'error');
      }
    },

    /**
     * Open form modal
     */
    openFormModal(title, isEdit) {
      const modal = document.getElementById('form-modal');
      const formTitle = document.getElementById('form-title');
      const saveBtnText = document.getElementById('save-form-btn-text');
      
      if (formTitle) formTitle.textContent = title;
      if (saveBtnText) saveBtnText.textContent = isEdit ? 'Save Changes' : 'Save Purchase';
      
      // Reset form
      document.getElementById('bike-form')?.reset();
      document.getElementById('form-bike-id').value = this.currentBikeId || '';
      
      if (modal) {
        modal.classList.add('active');
        // Focus first input
        setTimeout(() => {
          document.getElementById('form-no')?.focus();
        }, 100);
      }
    },

    /**
     * Close form modal
     */
    closeFormModal() {
      const modal = document.getElementById('form-modal');
      if (modal) {
        modal.classList.remove('active');
      }
      this.currentBikeId = null;
    },

    /**
     * Calculate form profit
     */
    calculateFormProfit() {
      const purchase = parseFloat(document.getElementById('form-purchasePrice')?.value || 0);
      const repair = parseFloat(document.getElementById('form-repairCost')?.value || 0);
      const selling = parseFloat(document.getElementById('form-sellingPrice')?.value || 0);
      
      const profit = selling - purchase - repair;
      const profitInput = document.getElementById('form-netProfit');
      if (profitInput) {
        profitInput.value = isNaN(profit) ? '' : profit.toFixed(2);
      }
    },

    /**
     * Handle save bike
     */
    async handleSaveBike() {
      try {
        const no = document.getElementById('form-no')?.value.trim();
        const owner = document.getElementById('form-owner')?.value.trim();
        
        if (!no || !owner) {
          this.showToast('Please fill in plate number and owner name', 'warning');
          return;
        }
        
        const bike = {
          no: no,
          owner: owner,
          purchasePrice: parseFloat(document.getElementById('form-purchasePrice')?.value || 0),
          repairCost: parseFloat(document.getElementById('form-repairCost')?.value || 0),
          sellingPrice: parseFloat(document.getElementById('form-sellingPrice')?.value || 0),
          datePurchase: document.getElementById('form-datePurchase')?.value || '',
          dateSelling: document.getElementById('form-dateSelling')?.value || '',
          _updatedAt: Date.now(),
          _deleted: false
        };
        
        // Calculate profit
        bike.netProfit = bike.sellingPrice - bike.purchasePrice - bike.repairCost;
        
        if (this.currentBikeId) {
          bike._id = this.currentBikeId;
          await this.db.bikes.put(bike);
          this.showToast(`Updated bike: ${bike.no}`, 'success');
          this.addToUndoStack('update', await this.db.bikes.get(this.currentBikeId));
        } else {
          bike._id = `bike_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          await this.db.bikes.add(bike);
          this.showToast(`Added bike: ${bike.no}`, 'success');
        }
        
        this.closeFormModal();
        await this.renderAll();
        this.triggerAutoSync();
      } catch (error) {
        console.error('Failed to save bike:', error);
        this.showToast('Failed to save bike', 'error');
      }
    },

    /**
     * Handle delete bike
     */
    async handleDeleteBike() {
      if (!this.currentBikeId) return;
      
      if (!confirm('Are you sure you want to delete this bike?')) return;
      
      try {
        const bike = await this.db.bikes.get(this.currentBikeId);
        if (bike) {
          this.addToUndoStack('delete', bike);
          await this.db.bikes.update(this.currentBikeId, { _deleted: true });
          this.showToast(`Deleted bike: ${bike.no}`, 'success');
          this.closeFormModal();
          await this.renderAll();
          this.triggerAutoSync();
        }
      } catch (error) {
        console.error('Failed to delete bike:', error);
        this.showToast('Failed to delete bike', 'error');
      }
    },

    /**
     * Handle duplicate bike
     */
    async handleDuplicateBike() {
      if (!this.currentBikeId) return;
      
      try {
        const bike = await this.db.bikes.get(this.currentBikeId);
        if (bike) {
          const newBike = { ...bike };
          delete newBike._id;
          newBike._id = `bike_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          newBike.no = `${bike.no} (Copy)`;
          newBike.dateSelling = '';
          newBike.sellingPrice = 0;
          newBike.netProfit = 0;
          newBike._updatedAt = Date.now();
          
          await this.db.bikes.add(newBike);
          this.showToast(`Duplicated bike: ${newBike.no}`, 'success');
          this.closeFormModal();
          await this.renderAll();
        }
      } catch (error) {
        console.error('Failed to duplicate bike:', error);
        this.showToast('Failed to duplicate bike', 'error');
      }
    },

    /**
     * Add to undo stack
     */
    addToUndoStack(action, data) {
      this.undoStack.push({ action, data, timestamp: Date.now() });
      if (this.undoStack.length > 10) {
        this.undoStack.shift();
      }
      this.saveUndoStack();
    },

    /**
     * Initialize form listeners
     */
    initFormListeners() {
      // Modal close
      document.getElementById('close-form-modal')?.addEventListener('click', () => this.closeFormModal());
      document.getElementById('cancel-form-btn')?.addEventListener('click', () => this.closeFormModal());
      
      // Close on overlay click
      const modal = document.getElementById('form-modal');
      if (modal) {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) {
            this.closeFormModal();
          }
        });
      }
      
      // Save
      document.getElementById('save-form-btn')?.addEventListener('click', () => this.handleSaveBike());
      
      // Delete
      document.getElementById('delete-bike-btn')?.addEventListener('click', () => this.handleDeleteBike());
      
      // Duplicate
      document.getElementById('duplicate-bike-btn')?.addEventListener('click', () => this.handleDuplicateBike());
      
      // Profit calculation
      ['form-purchasePrice', 'form-repairCost', 'form-sellingPrice'].forEach(id => {
        document.getElementById(id)?.addEventListener('input', () => this.calculateFormProfit());
      });
      
      // Keyboard shortcuts
      document.addEventListener('keydown', (e) => {
        const modalActive = document.getElementById('form-modal')?.classList.contains('active');
        const inputFocused = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'n' && !inputFocused) {
          e.preventDefault();
          this.handleNewBike();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 's' && modalActive) {
          e.preventDefault();
          this.handleSaveBike();
        }
        
        if (e.key === 'Escape' && modalActive) {
          this.closeFormModal();
        }
        
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !inputFocused) {
          e.preventDefault();
          this.performUndo();
        }
      });
    }
  });

  // Initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (window.app) window.app.initFormListeners();
    });
  } else {
    if (window.app) window.app.initFormListeners();
  }

})(window);

