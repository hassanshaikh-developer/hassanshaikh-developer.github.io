        // --- DOM Elements ---
        const $ = (selector) => document.querySelector(selector);
        
        // App containers
        const appWrapper = $('#app-wrapper');
        const loader = $('#loader');
        const formModal = $('#form-modal');
        const modalOverlay = $('#modal-overlay');
        const modalSheet = $('#modal-sheet');
        const confirmModal = $('#confirm-modal');
        
        // Navigation
        const navBar = $('nav');
        const pageTitle = $('#page-title');
        const addButton = $('#add-button');
        const pwaInstallButton = $('#pwa-install-button');
        const sensitiveToggle = $('#sensitive-toggle');
        
        // Pages
        const pages = document.querySelectorAll('.page');
        
        // Dashboard Page
        const metricInvestment = $('#metric-investment');
        const metricInventory = $('#metric-inventory');
        const dashboardRecentBikes = $('#dashboard-recent-bikes');
        const dashboardReminders = $('#dashboard-reminders');
        const dashboardSort = $('#dashboard-sort');
        const dashboardCash = $('#dashboard-cash');
        const dashboardRevenue = $('#dashboard-revenue');
        const dashboardProfit = $('#dashboard-profit');
        const dashboardBrand = $('#dashboard-brand');
        
        // Bikes Page
        const bikeList = $('#bike-list');
        const bikeFilter = $('#bike-filter');
        const bikeSearch = $('#bike-search');
        const bikeTypeToggle = $('#bike-type-toggle');
        const bikeSortTrigger = $('#bike-sort-trigger');
        const bikeSortMenu = $('#bike-sort-menu');
        const bikeSortLabel = $('#bike-sort-label');
        const bikeAdvancedToggle = $('#bike-advanced-toggle');
        const bikeAdvancedReset = $('#bike-advanced-reset');
        const bikeAdvancedPanel = $('#bike-advanced-panel');
        const bikeFilterProfitMin = $('#bike-filter-profit-min');
        const bikeFilterProfitMax = $('#bike-filter-profit-max');
        const bikeFilterDateFrom = $('#bike-filter-date-from');
        const bikeFilterDateTo = $('#bike-filter-date-to');
        const bikeFilterRepairMin = $('#bike-filter-repair-min');
        const bikeFilterRepairMax = $('#bike-filter-repair-max');
        const bikeBulkToggle = $('#bike-bulk-toggle');
        const bikeClearanceFooter = $('#bike-clearance-footer');
        const bikeClearanceCount = $('#bike-clearance-count');
        const bikeClearanceCancel = $('#bike-clearance-cancel');
        const bikeClearanceMark = $('#bike-clearance-mark');
        const bikeClearanceRemove = $('#bike-clearance-remove');

        // Credit Page
        const creditList = $('#credit-list');
        const creditTotal = $('#credit-total');
        const creditCollected = $('#credit-collected');
        const creditPending = $('#credit-pending');
        const creditActive = $('#credit-active');
        const creditExport = $('#credit-export');
        const creditBulkToggle = $('#credit-bulk-toggle');
        const creditBulkFooter = $('#credit-bulk-footer');
        const creditBulkCount = $('#credit-bulk-count');
        const creditBulkTotal = $('#credit-bulk-total');
        const creditBulkConfirm = $('#credit-bulk-confirm');
        const creditBulkCancel = $('#credit-bulk-cancel');

        let deferredInstallPrompt = null;

        const getInstallSupportMessage = () => {
            const ua = (navigator.userAgent || '').toLowerCase();
            if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) {
                return 'On Safari tap the Share icon, then choose "Add to Home Screen".';
            }
            if (ua.includes('android')) {
                return 'Open your browser menu and choose "Install app" or "Add to Home screen".';
            }
            return 'Use your browser menu to install/add this app to your device.';
        };

        const isStandaloneDisplay = () => {
            return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        };

        const updateInstallButtonState = () => {
            if (!pwaInstallButton) return;

            const installHelp = getInstallSupportMessage();
            const installed = isStandaloneDisplay();
            if (installed) {
                pwaInstallButton.classList.remove('hidden');
                pwaInstallButton.disabled = true;
                pwaInstallButton.setAttribute('aria-disabled', 'true');
                pwaInstallButton.textContent = 'App Installed';
                pwaInstallButton.title = 'App already installed';
                pwaInstallButton.classList.add('opacity-60', 'cursor-not-allowed');
                return;
            }

            pwaInstallButton.classList.remove('opacity-60', 'cursor-not-allowed');

            if (deferredInstallPrompt) {
                pwaInstallButton.classList.remove('hidden');
                pwaInstallButton.disabled = false;
                pwaInstallButton.setAttribute('aria-disabled', 'false');
                pwaInstallButton.textContent = 'Install App';
                pwaInstallButton.title = 'Install this app on your device';
            } else {
                pwaInstallButton.disabled = true;
            }
        };

        const setupPWAInstall = () => {
            if (!pwaInstallButton) return;

            updateInstallButtonState();

            const canUseServiceWorker = (window.isSecureContext || ['localhost', '127.0.0.1'].includes(window.location.hostname));
            if ('serviceWorker' in navigator && canUseServiceWorker) {
                navigator.serviceWorker.register('./sw.js', { scope: './' }).catch((error) => {
                    console.error('Service worker registration failed:', error);
                });
            } else if (!canUseServiceWorker) {
                console.warn('Service workers require HTTPS. PWA features may be limited.');
                pwaInstallButton.classList.remove('hidden');
                pwaInstallButton.disabled = true;
                pwaInstallButton.setAttribute('aria-disabled', 'true');
                pwaInstallButton.textContent = 'Install App';
                pwaInstallButton.title = 'Install requires HTTPS or serving from localhost.';
                pwaInstallButton.classList.add('opacity-60', 'cursor-not-allowed');
            }

            window.addEventListener('beforeinstallprompt', (event) => {
                event.preventDefault();
                deferredInstallPrompt = event;
                updateInstallButtonState();
            });

            pwaInstallButton.addEventListener('click', async () => {
                if (pwaInstallButton.disabled) {
                    if (typeof showToast === 'function') {
                        showToast(getInstallSupportMessage(), true);
                    }
                    return;
                }
                if (!deferredInstallPrompt) {
                    if (typeof showToast === 'function') {
                        showToast(getInstallSupportMessage(), true);
                    }
                    updateInstallButtonState();
                    return;
                }
                try {
                    deferredInstallPrompt.prompt();
                    const choice = await deferredInstallPrompt.userChoice;
                    deferredInstallPrompt = null;
                    if (choice.outcome === 'accepted') {
                        if (typeof showToast === 'function') {
                            showToast('Installation started. Check your device for the app icon.');
                        }
                    }
                } catch (error) {
                    console.error('Install prompt failed:', error);
                } finally {
                    updateInstallButtonState();
                }
            });

            window.addEventListener('appinstalled', () => {
                deferredInstallPrompt = null;
                if (typeof showToast === 'function') {
                    showToast('App installed! You can launch it from your device.');
                }
                updateInstallButtonState();
            });

            const standaloneMedia = window.matchMedia('(display-mode: standalone)');
            const handleStandaloneChange = () => updateInstallButtonState();
            if (standaloneMedia.addEventListener) {
                standaloneMedia.addEventListener('change', handleStandaloneChange);
            } else if (standaloneMedia.addListener) {
                standaloneMedia.addListener(handleStandaloneChange);
            }

            updateInstallButtonState();
        };

        // Expenses Page
        const expenseList = $('#expense-list');

        // PR Page
        const prList = $('#pr-list');
        const prFilter = $('#pr-filter');
        const prSearch = $('#pr-search');
        
        // Analytics Page
        const analyticsContent = $('#analytics-content');
        const analyticsLockedState = $('#analytics-locked-state');
        const analyticsUnlockBtn = $('#analytics-unlock');
        const analyticsCash = $('#analytics-cash');
        const analyticsProfit = $('#analytics-profit');
        const analyticsRealized = $('#analytics-realized');
        const analyticsMonth = $('#analytics-month');
        const analyticsExpenseTotal = $('#analytics-expense-total');
        const analyticsExpenseList = $('#analytics-expense-list');
        const analyticsInflow = $('#analytics-inflow');
        const analyticsOutflow = $('#analytics-outflow');
        const analyticsTransactionList = $('#analytics-transaction-list');

        // Settings Page
        const cashAdjAmount = $('#cash-adj-amount');
        const cashAdjDesc = $('#cash-adj-desc');
        const cashAdjAdd = $('#cash-adj-add');
        const cashAdjRemove = $('#cash-adj-remove');
        const settingReset = $('#setting-reset');
        const pinStatus = $('#pin-status');
        const pinCurrentInput = $('#pin-current');
        const pinNewInput = $('#pin-new');
        const pinUpdateBtn = $('#pin-update');
        
        // NEW: Backup/Restore Selectors
        const settingBackup = $('#setting-backup');
        const settingRestore = $('#setting-restore');
        const restoreFileInput = $('#restore-file-input');
        const backupModeDisplay = $('#backup-mode-display');
        
        // PAT Modal
        
        // Form Modal
        const modalTitle = $('#modal-title');
        const modalBody = $('#modal-body');
        const modalSave = $('#modal-save');
        const modalClose = $('#modal-close');
        
        // Confirm Modal
        const confirmTitle = $('#confirm-title');
        const confirmMessage = $('#confirm-message');
        const confirmOk = $('#confirm-ok');
        const confirmCancel = $('#confirm-cancel');

        // PIN Modal
        const pinModal = $('#pin-modal');
        const pinInput = $('#pin-input');
        const pinSubmit = $('#pin-submit');
        const pinCancel = $('#pin-cancel');
        const pinError = $('#pin-error');
        const pinModalMessage = $('#pin-modal-message');

        // --- Persistence Constants ---
        const LOCAL_STORAGE_KEY = 'bikeManagerData';
        const DB_NAME = 'bikeManager';
        const DB_VERSION = 1;
        const DB_STORE = 'appState';
        
        const renderBrandNewBikes = () => {
            const search = (state.ui.currentBikeSearch || '').toLowerCase();
            const deliveries = (state.data.brandNewDeliveries || [])
                .slice()
                .sort((a, b) => new Date(b.deliveryDate || b.createdAt) - new Date(a.deliveryDate || a.createdAt))
                .filter(delivery => {
                    if (!search) return true;
                    const haystack = [
                        delivery.bikeModel,
                        delivery.customerName,
                        delivery.customerContact,
                        delivery.showroomName,
                        delivery.invoiceNumber
                    ].map(value => (value || '').toString().toLowerCase());
                    return haystack.some(field => field.includes(search));
                });
            
            if (deliveries.length === 0) {
                bikeList.innerHTML = `<p class="text-gray-500 text-center mt-4">No brand new deliveries recorded yet.</p>`;
                return;
            }

            bikeList.innerHTML = deliveries.map(delivery => {
                const deliveryId = esc(delivery.id || '');
                const bikeModel = esc(delivery.bikeModel || 'Delivery');
                const customerName = esc(delivery.customerName || 'Customer');
                const showroomName = esc(delivery.showroomName || 'Showroom');
                const invoiceNumberValue = delivery.invoiceNumber ? esc(delivery.invoiceNumber) : '';
                const notesValue = delivery.notes ? esc(delivery.notes) : '';
                const commissionReceived = delivery.commissionReceived || 0;
                const paidOut = (delivery.commissionToGive || []).reduce((sum, ref) => {
                    return sum + (ref.paymentStatus === 'paid' ? (ref.commissionAmount || 0) : 0);
                }, 0);
                const pendingOut = (delivery.commissionToGive || []).reduce((sum, ref) => {
                    return sum + (ref.paymentStatus !== 'paid' ? (ref.commissionAmount || 0) : 0);
                }, 0);
                const netEarnings = commissionReceived - paidOut;
                
                const referrersHTML = (delivery.commissionToGive || []).length === 0
                    ? '<p class="text-sm text-gray-500">No referrer commissions configured.</p>'
                    : delivery.commissionToGive.map(ref => {
                        const statusPaid = ref.paymentStatus === 'paid';
                        const statusClass = statusPaid ? 'text-green-600' : 'text-amber-600';
                        const statusText = esc(statusPaid ? 'Paid' : 'Pending');
                        const toggleLabel = esc(statusPaid ? 'Mark Pending' : 'Mark Paid');
                        const contactInfo = ref.referrerContact
                            ? `<p class="text-xs text-gray-500">${esc(ref.referrerContact)}</p>`
                            : '';
                        return `
                            <div class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0" data-ref-id="${esc(ref.id || '')}">
                                <div>
                                    <p class="font-medium text-gray-800">${esc(ref.referrerName || 'Unnamed Referrer')}</p>
                                    ${contactInfo}
                                </div>
                                <div class="text-right space-y-1">
                                    <p class="font-semibold text-gray-900">${esc(formatCurrency(ref.commissionAmount || 0))}</p>
                                    <span class="text-xs font-medium ${statusClass}">${statusText}</span>
                                    <button data-action="toggle-commission" class="block text-xs text-blue-600 font-semibold"> ${toggleLabel}</button>
                                </div>
                            </div>
                        `;
                    }).join('');

                const invoiceRow = delivery.invoiceNumber
                    ? `<p class="text-xs text-gray-500">Invoice: ${invoiceNumberValue}</p>`
                    : '';
                const notesRow = delivery.notes
                    ? `<p class="text-xs text-gray-500">Notes: ${notesValue}</p>`
                    : '';

                return `
                <div class="bg-white rounded-xl p-4 shadow-sm space-y-3" data-brand-id="${deliveryId}">
                    <div class="flex justify-between items-start">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">${bikeModel}</h3>
                            <p class="text-sm text-gray-600">${customerName} • ${showroomName}</p>
                            ${invoiceRow}
                            ${notesRow}
                        </div>
                        <div class="text-right">
                            <p class="text-xs text-gray-500">Commission Received</p>
                            <p class="text-lg font-bold text-blue-600">${esc(formatCurrency(commissionReceived))}</p>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 text-sm bg-gray-50 rounded-lg p-3">
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wide">Delivery Date</p>
                            <p class="font-semibold text-gray-800">${esc(formatDate(delivery.deliveryDate || delivery.createdAt))}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wide">Net Earnings</p>
                            <p class="font-semibold ${netEarnings >= 0 ? 'text-green-600' : 'text-red-600'}">${esc(formatCurrency(netEarnings))}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wide">Paid Out</p>
                            <p class="font-semibold text-gray-800">${esc(formatCurrency(paidOut))}</p>
                        </div>
                        <div>
                            <p class="text-xs text-gray-500 uppercase tracking-wide">Pending Payout</p>
                            <p class="font-semibold text-amber-600">${esc(formatCurrency(pendingOut))}</p>
                        </div>
                    </div>

                    <div class="bg-gray-50 rounded-lg p-3">
                        <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Referrer Commissions</p>
                        <div class="space-y-2">
                            ${referrersHTML}
                        </div>
                    </div>

                    <div class="flex justify-end gap-3 pt-2 border-t border-gray-200">
                        <button data-action="edit-brand-new" class="text-blue-500 font-medium text-sm">Edit</button>
                        <button data-action="delete-brand-new" class="text-red-500 font-medium text-sm">Delete</button>
                    </div>
                </div>
                `;
            }).join('');
            applyPendingHighlight();
        };
        
        // --- App State ---
        let state = {
            data: {
                bikes: [],
                expenses: [],
                pr: [],
                cashEntries: [],
                payments: [],
                brandNewDeliveries: [],
                settings: {
                    baseInvestment: 0, // Deprecated
                    pin: '1111'
                }
            },
            ui: {
                currentPage: 'dashboard',
                currentBikeFilter: 'all',
                currentBikeSearch: '',
                currentBikeSort: 'dateDesc', // NEW
                currentBikeType: 'second_hand',
                bikeAdvancedFilters: {
                    profitMin: '',
                    profitMax: '',
                    dateFrom: '',
                    dateTo: '',
                    repairMin: '',
                    repairMax: ''
                },
                showBikeAdvanced: false,
                bikeBulkMode: false,
                bikeBulkSelection: [],
                currentDashboardSort: 'recent', // NEW
                currentPRFilter: 'all',
                currentPRSearch: '',
                creditBulkMode: false,
                creditBulkSelection: [],
                creditBulkDrafts: {},
                modal: {
                    isOpen: false,
                    type: null,
                    data: null
                },
                isSaving: false,
                pendingHighlight: null,
            },
            security: {
                isUnlocked: false,
                pendingResolve: null,
                pinMode: 'unlock'
            },
            metrics: {
                cashInHand: 0,
                totalProfit: 0,
                totalRevenue: 0,
                brandNewEarnings: 0,
                realizedProfit: 0,
                thisMonthProfit: 0,
                unsoldInvestment: 0,
                inventorySold: 0,
                inventoryUnsold: 0,
                totalCashInflow: 0, // NEW
                totalCashOutflow: 0, // NEW
                pendingReceivables: 0,
                creditCustomers: 0,
            }
        };

        // --- Persistence Helpers ---

        let dbPromise = null;

        const openDatabase = () => {
            if (dbPromise) return dbPromise;
            dbPromise = new Promise((resolve, reject) => {
                const request = indexedDB.open(DB_NAME, DB_VERSION);
                request.onerror = () => reject(request.error);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(DB_STORE)) {
                        db.createObjectStore(DB_STORE);
                    }
                };
                request.onsuccess = () => resolve(request.result);
            });
            return dbPromise;
        };

        const loadStateFromDB = async () => {
            try {
                const db = await openDatabase();
                return await new Promise((resolve, reject) => {
                    const tx = db.transaction(DB_STORE, 'readonly');
                    const store = tx.objectStore(DB_STORE);
                    const request = store.get('app');
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve(request.result || null);
                });
            } catch (error) {
                console.warn('IndexedDB read failed; falling back to localStorage.', error);
                return null;
            }
        };

        const saveStateToDB = async (data) => {
            try {
                const db = await openDatabase();
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(DB_STORE, 'readwrite');
                    const store = tx.objectStore(DB_STORE);
                    const request = store.put(data, 'app');
                    request.onerror = () => reject(request.error);
                    request.onsuccess = () => resolve();
                });
                return true;
            } catch (error) {
                console.warn('IndexedDB write failed; falling back to localStorage.', error);
                return false;
            }
        };

        const persistence = {
            async load() {
                const fromDB = await loadStateFromDB();
                if (fromDB) {
                    return fromDB;
                }
                try {
                    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
                    return raw ? JSON.parse(raw) : null;
                } catch (error) {
                    console.error('localStorage read failed', error);
                    return null;
                }
            },
            async save(data) {
                const cloned = JSON.parse(JSON.stringify(data));
                const savedToDB = await saveStateToDB(cloned);
                if (!savedToDB) {
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloned));
                } else {
                    try {
                        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloned));
                    } catch (error) {
                        console.warn('localStorage backup failed', error);
                    }
                }
            },
            export(data) {
                return JSON.stringify({
                    version: DB_VERSION,
                    exportedAt: new Date().toISOString(),
                    payload: data,
                }, null, 2);
            },
            async import(json) {
                await saveStateToDB(json);
                try {
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(json));
                } catch (error) {
                    console.warn('localStorage backup save failed', error);
                }
            }
        };

        // --- Cross Navigation Helpers ---

        const setBikePageState = ({ type = 'second_hand', filter = 'all', search = '' } = {}) => {
            state.ui.currentBikeType = type;
            state.ui.currentBikeFilter = filter;
            state.ui.currentBikeSearch = search;
        };

        const scheduleBikeHighlight = (payload) => {
            state.ui.pendingHighlight = payload;
        };

        const applyPendingHighlight = () => {
            const highlight = state.ui.pendingHighlight;
            if (!highlight || state.ui.currentPage !== 'bikes') return;

            const selector = highlight.type === 'brand_new'
                ? `[data-brand-id="${highlight.id}"]`
                : `[data-bike-id="${highlight.id}"]`;

            const target = document.querySelector(selector);
            if (!target) return;

            target.classList.add('highlight-pulse');
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => target.classList.remove('highlight-pulse'), 3500);
            state.ui.pendingHighlight = null;
        };

        const navigateToBikeRecord = (bikeName) => {
            if (!bikeName) {
                showToast('No bike linked yet.', true);
                return;
            }

            const normalized = bikeName.toLowerCase();
            const matchBike = state.data.bikes.find(bike => {
                const names = [
                    (bike.bikeName || '').toLowerCase(),
                    (bike.bikeNumberPlate || '').toLowerCase()
                ];
                return names.includes(normalized);
            });

            if (matchBike) {
                setBikePageState({
                    type: 'second_hand',
                    filter: 'all',
                    search: matchBike.bikeName || matchBike.bikeNumberPlate || ''
                });
                scheduleBikeHighlight({ type: 'second_hand', id: matchBike.id });
                renderPage('bikes');
                return;
            }

            const matchBrand = state.data.brandNewDeliveries.find(delivery => (delivery.bikeModel || '').toLowerCase() === normalized);
            if (matchBrand) {
                setBikePageState({
                    type: 'brand_new',
                    filter: 'all',
                    search: matchBrand.bikeModel || ''
                });
                scheduleBikeHighlight({ type: 'brand_new', id: matchBrand.id });
                renderPage('bikes');
                return;
            }

            showToast('Could not find the linked bike yet.', true);
        };

        const filterBikesBySupplier = (supplierName) => {
            if (!supplierName) return;
            setBikePageState({
                type: 'second_hand',
                filter: 'all',
                search: supplierName
            });
            renderPage('bikes');
            showToast(`Filtered bikes by supplier: ${supplierName}`);
        };

        const filterBikesByOwner = (ownerName) => {
            if (!ownerName) return;
            setBikePageState({
                type: 'second_hand',
                filter: 'unsold',
                search: ownerName
            });
            renderPage('bikes');
            showToast(`Showing unsold bikes for ${ownerName}`);
        };

        const logPaymentForBuyer = (buyerName) => {
            if (!buyerName) {
                showToast('Buyer details missing.', true);
                return;
            }
            const normalized = buyerName.toLowerCase();
            const matches = state.data.bikes.filter(bike => (bike.customerName || '').toLowerCase() === normalized);

            if (!matches.length) {
                showToast('No bike sales linked to this buyer yet.', true);
                return;
            }

            const pendingBike = matches.find(bike => {
                if (bike.paymentMode === 'credit' && bike.creditInfo) {
                    return (bike.creditInfo.remaining || 0) > EPSILON;
                }
                if (bike.paymentMode === 'emi' && bike.emiInfo) {
                    return (bike.emiInfo.installmentsPaid || 0) < (bike.emiInfo.totalInstallments || 0);
                }
                return false;
            });

            const targetBike = pendingBike || matches[0];
            openModal('logPayment', targetBike);
        };

        const copyTextToClipboard = async (text) => {
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(text);
                } else {
                    const textarea = document.createElement('textarea');
                    textarea.value = text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
                showToast('Contact copied.');
            } catch (error) {
                console.error('Clipboard error:', error);
                showToast('Unable to copy contact.', true);
            }
        };

        // --- Utility Functions ---
        
        const esc = (value = '') => String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        const SENSITIVE_MASK = '••••';

        const setSensitiveValue = (element, value, formatter = (val) => val) => {
            if (!element) return;
            if (state.security.isUnlocked) {
                element.textContent = formatter(value);
                element.classList.remove('sensitive-mask');
            } else {
                element.textContent = SENSITIVE_MASK;
                element.classList.add('sensitive-mask');
            }
        };

        const setSensitiveCurrency = (element, value) => {
            setSensitiveValue(element, value ?? 0, (val) => formatCurrency(val || 0));
        };

        const refreshIcons = () => {
            if (window.lucide && typeof window.lucide.createIcons === 'function') {
                window.lucide.createIcons();
            }
        };

        const updateSensitiveToggle = () => {
            if (!sensitiveToggle) return;
            sensitiveToggle.classList.toggle('locked', !state.security.isUnlocked);
            sensitiveToggle.setAttribute('title', state.security.isUnlocked ? 'Lock sensitive data' : 'Unlock sensitive data');
            sensitiveToggle.setAttribute('aria-pressed', state.security.isUnlocked ? 'true' : 'false');
            sensitiveToggle.innerHTML = `<i data-lucide="${esc(state.security.isUnlocked ? 'unlock' : 'lock')}"></i>`;
            refreshIcons();
        };

        const lockSensitiveData = () => {
            state.security.isUnlocked = false;
            updateSensitiveToggle();
            render();
        };

        const ensureSensitiveState = () => {
            updateSensitiveToggle();
        };

        const sanitizePhone = (value = '') => value.toString().replace(/\D/g, '');

        const formatCurrency = (num) => {
            return new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0
            }).format(num);
        };
        
        const formatDate = (dateString) => {
            if (!dateString) return '';
            try {
                return new Date(dateString).toISOString().split('T')[0];
            } catch (e) {
                return '';
            }
        };

        const formatDateTime = (dateString) => {
            if (!dateString) return 'No date';
            try {
                const d = new Date(dateString);
                if (dateString.includes('T')) {
                    return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short', hour12: true });
                }
                const parts = dateString.split('-');
                if (parts.length === 3) {
                    const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                    return utcDate.toLocaleDateString('en-IN', { dateStyle: 'short' });
                }
                return d.toLocaleDateString('en-IN', { dateStyle: 'short' });
            } catch (e) {
                console.warn(`Invalid date string: ${dateString}`);
                return dateString;
            }
        };

        const getNextMonthDate = (dateString) => {
            const date = new Date(dateString);
            date.setMonth(date.getMonth() + 1);
            return date.toISOString().split('T')[0];
        };
        
        const EPSILON = 0.01; // For floating point comparisons
        const MS_IN_DAY = 24 * 60 * 60 * 1000;
        const DEFAULT_GRACE_PERIOD_DAYS = 7;

        const parseToMidnight = (value) => {
            if (!value) return null;
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) return null;
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        };

        const getGracePeriodDays = (bike) => {
            if (bike.paymentMode === 'credit') {
                return parseInt(bike.creditInfo?.gracePeriodDays, 10) || DEFAULT_GRACE_PERIOD_DAYS;
            }
            if (bike.paymentMode === 'emi') {
                return parseInt(bike.emiInfo?.gracePeriodDays, 10) || DEFAULT_GRACE_PERIOD_DAYS;
            }
            return DEFAULT_GRACE_PERIOD_DAYS;
        };

        const getInterestRate = (bike) => {
            if (bike.paymentMode === 'credit') {
                return parseFloat(bike.creditInfo?.interestRate) || 0;
            }
            if (bike.paymentMode === 'emi') {
                return parseFloat(bike.emiInfo?.interestRate) || 0;
            }
            return 0;
        };

        const calculateSuggestedInterest = ({ principal, interestRate, daysOverdue }) => {
            if (!principal || principal <= 0) return 0;
            if (!interestRate || interestRate <= 0) return 0;
            if (!daysOverdue || daysOverdue <= 0) return 0;
            const dailyRate = (interestRate / 100) / 30;
            const interest = principal * dailyRate * daysOverdue;
            return Math.max(0, Math.round(interest));
        };

        const getDueMetadata = (bike) => {
            const today = parseToMidnight(new Date());
            const graceDays = getGracePeriodDays(bike);
            const interestRate = getInterestRate(bike);
            let dueDate = null;
            let pendingPrincipal = 0;
            let installmentsLeft = 0;

            if (bike.paymentMode === 'credit' && bike.creditInfo) {
                dueDate = parseToMidnight(bike.creditInfo.dueDate);
                pendingPrincipal = Math.max(0, parseFloat(bike.creditInfo.remaining) || 0);
            } else if (bike.paymentMode === 'emi' && bike.emiInfo) {
                dueDate = parseToMidnight(bike.emiInfo.nextDueDate);
                installmentsLeft = Math.max(0, (parseInt(bike.emiInfo.totalInstallments, 10) || 0) - (parseInt(bike.emiInfo.installmentsPaid, 10) || 0));
                pendingPrincipal = Math.max(0, installmentsLeft * (parseFloat(bike.emiInfo.monthlyAmount) || 0));
            }

            let status = 'clear';
            let statusLabel = 'All dues cleared';
            let daysUntilDue = null;
            let daysOverdue = null;

            if (dueDate && pendingPrincipal > EPSILON) {
                const diffMs = dueDate.getTime() - today.getTime();
                const diffDays = Math.floor(diffMs / MS_IN_DAY);

                if (diffDays > 0) {
                    status = 'upcoming';
                    daysUntilDue = diffDays;
                    statusLabel = diffDays === 1 ? 'Due tomorrow' : `Due in ${diffDays} days`;
                } else if (diffDays === 0) {
                    status = 'dueToday';
                    statusLabel = 'Due today';
                } else {
                    const overdueBy = Math.abs(diffDays);
                    if (overdueBy <= graceDays) {
                        status = 'grace';
                        daysOverdue = overdueBy;
                        const remainingGrace = graceDays - overdueBy;
                        statusLabel = remainingGrace === 0
                            ? 'Grace period ends today'
                            : `Within grace period (${remainingGrace} day${remainingGrace === 1 ? '' : 's'} left)`;
                    } else {
                        status = 'overdue';
                        daysOverdue = overdueBy - graceDays;
                        statusLabel = `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`;
                    }
                }
            }

            const suggestedInterest = calculateSuggestedInterest({
                principal: pendingPrincipal,
                interestRate,
                daysOverdue: status === 'overdue' ? daysOverdue : 0
            });

            return {
                dueDate: dueDate ? dueDate.toISOString().split('T')[0] : null,
                graceDays,
                interestRate,
                pendingPrincipal,
                installmentsLeft,
                status,
                statusLabel,
                daysUntilDue,
                daysOverdue,
                suggestedInterest
            };
        };

        const showLoader = () => {
            loader.classList.remove('hidden');
        };
        
        const hideLoader = () => {
            loader.classList.add('hidden');
        };

        const showToast = (message, isError = false) => {
            const toast = document.createElement('div');
            toast.className = `fixed top-5 left-1/2 -translate-x-1/2 p-3 rounded-lg shadow-md text-white z-[110] ${isError ? 'bg-red-500' : 'bg-green-500'}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => {
                toast.remove();
            }, 3000);
        };
        
        const showConfirm = (title, message) => {
            return new Promise((resolve) => {
                confirmTitle.textContent = title;
                confirmMessage.textContent = message;
                confirmModal.classList.remove('hidden');

                confirmOk.onclick = () => {
                    confirmModal.classList.add('hidden');
                    resolve(true);
                };
                confirmCancel.onclick = () => {
                    confirmModal.classList.add('hidden');
                    resolve(false);
                };
            });
        };

        const showExportChoice = (title = 'Export Data', message = 'Select export format.') => {
            return new Promise((resolve) => {
                const previousState = {
                    title: confirmTitle.textContent,
                    message: confirmMessage.textContent,
                    okLabel: confirmOk.textContent,
                    cancelLabel: confirmCancel.textContent,
                    okHandler: confirmOk.onclick,
                    cancelHandler: confirmCancel.onclick,
                    overlayHandler: confirmModal.querySelector('.modal-overlay').onclick
                };

                const overlay = confirmModal.querySelector('.modal-overlay');

                const cleanup = () => {
                    confirmModal.classList.add('hidden');
                    confirmTitle.textContent = previousState.title;
                    confirmMessage.textContent = previousState.message;
                    confirmOk.textContent = previousState.okLabel;
                    confirmCancel.textContent = previousState.cancelLabel;
                    confirmOk.onclick = previousState.okHandler;
                    confirmCancel.onclick = previousState.cancelHandler;
                    overlay.onclick = previousState.overlayHandler;
                    document.removeEventListener('keydown', handleKeyDown);
                };

                const handleKeyDown = (event) => {
                    if (event.key === 'Escape') {
                        cleanup();
                        resolve(null);
                    }
                };

                confirmTitle.textContent = title;
                confirmMessage.textContent = message;
                confirmOk.textContent = 'CSV';
                confirmCancel.textContent = 'PDF';
                confirmModal.classList.remove('hidden');
                document.addEventListener('keydown', handleKeyDown);

                confirmOk.onclick = () => {
                    cleanup();
                    resolve('csv');
                };
                confirmCancel.onclick = () => {
                    cleanup();
                    resolve('pdf');
                };

                overlay.onclick = () => {
                    cleanup();
                    resolve(null);
                };
            });
        };
        
        const runDataMigration = () => {
            let migrated = false;
            
            if (!state.data || typeof state.data !== 'object') {
                state.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
                migrated = true;
            }
            
            state.data.bikes = Array.isArray(state.data.bikes) ? state.data.bikes : [];
            state.data.expenses = Array.isArray(state.data.expenses) ? state.data.expenses : [];
            state.data.pr = Array.isArray(state.data.pr) ? state.data.pr : [];
            state.data.cashEntries = Array.isArray(state.data.cashEntries) ? state.data.cashEntries : [];
            state.data.payments = Array.isArray(state.data.payments) ? state.data.payments : [];
            state.data.brandNewDeliveries = Array.isArray(state.data.brandNewDeliveries) ? state.data.brandNewDeliveries : [];
            state.data.settings = state.data.settings || {};
            if (!state.data.settings.pin) {
                state.data.settings.pin = '1111';
                migrated = true;
            }
            
            if (!state.data.cashEntries) {
                state.data.cashEntries = [];
                migrated = true;
            }
            if (!state.data.payments) {
                state.data.payments = [];
                migrated = true;
            }
            
            if (state.data.settings && state.data.settings.baseInvestment > 0) {
                state.data.cashEntries.push({
                    id: crypto.randomUUID(),
                    type: 'add',
                    amount: state.data.settings.baseInvestment,
                    description: 'Initial Base Investment (Migrated)',
                    createdAt: new Date().toISOString()
                });
                state.data.settings.baseInvestment = 0;
                migrated = true;
            }

            state.data.bikes.forEach(bike => {
            if (bike.creditInfo) {
                const parsedGrace = parseInt(bike.creditInfo.gracePeriodDays, 10);
                bike.creditInfo.gracePeriodDays = Number.isFinite(parsedGrace) && parsedGrace >= 0
                    ? parsedGrace
                    : DEFAULT_GRACE_PERIOD_DAYS;
                const parsedRate = parseFloat(bike.creditInfo.interestRate);
                bike.creditInfo.interestRate = Number.isFinite(parsedRate) && parsedRate >= 0
                    ? parsedRate
                    : 0;
            }

            if (bike.emiInfo) {
                const parsedGrace = parseInt(bike.emiInfo.gracePeriodDays, 10);
                bike.emiInfo.gracePeriodDays = Number.isFinite(parsedGrace) && parsedGrace >= 0
                    ? parsedGrace
                    : DEFAULT_GRACE_PERIOD_DAYS;
                const parsedRate = parseFloat(bike.emiInfo.interestRate);
                bike.emiInfo.interestRate = Number.isFinite(parsedRate) && parsedRate >= 0
                    ? parsedRate
                    : 0;
            }

                if (!bike.referral) {
                    bike.referral = null;
                } else {
                    bike.referral.name = (bike.referral.name || '').trim();
                    bike.referral.contact = (bike.referral.contact || '').trim();
                    bike.referral.commission = parseFloat(bike.referral.commission || 0) || 0;
                }

                const parsedTarget = parseFloat(bike.targetSalePrice);
                const cleanTarget = Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : null;
                if (bike.targetSalePrice !== cleanTarget) {
                    bike.targetSalePrice = cleanTarget;
                    migrated = true;
                }
                if (typeof bike.clearanceSale !== 'boolean') {
                    bike.clearanceSale = !!bike.clearanceSale;
                    migrated = true;
                }

                if (bike.sold && bike.sellingPrice > 0 && !bike.paymentMode) {
                    bike.paymentMode = 'cash';
                    
                    const existingPayment = state.data.payments.find(p => p.bikeId === bike.id && p.type === 'Initial Payment');
                    if (!existingPayment) {
                        state.data.payments.push({
                            id: crypto.randomUUID(),
                            bikeId: bike.id,
                            bikeName: bike.bikeName || bike.bikeNumberPlate,
                            amount: bike.sellingPrice,
                            date: bike.soldAt || bike.soldDate,
                            type: 'Initial Payment'
                        });
                        migrated = true;
                    }
                }

                if (bike.paymentMode === 'emi' && bike.emiInfo && typeof bike.emiInfo.totalInstallments === 'undefined') {
                    bike.emiInfo.totalInstallments = 0; 
                    bike.emiInfo.installmentsPaid = 0;
                    migrated = true;
                }
            });

            state.data.pr = state.data.pr.filter(pr => pr.relationType !== 'Showroom' && pr.relationType !== 'Referrer');

            state.data.brandNewDeliveries = state.data.brandNewDeliveries.map(delivery => {
                const safeDelivery = {
                    ...delivery,
                    commissionToGive: Array.isArray(delivery.commissionToGive) ? delivery.commissionToGive : delivery.commission_to_give || [],
                };

                safeDelivery.commissionToGive = safeDelivery.commissionToGive.map(ref => ({
                    id: ref.id || crypto.randomUUID(),
                    referrerName: ref.referrerName || ref.referrer_name || '',
                    referrerContact: ref.referrerContact || ref.referrer_contact || '',
                    commissionAmount: parseFloat(ref.commissionAmount ?? ref.commission_amount ?? 0) || 0,
                    paymentStatus: (ref.paymentStatus || ref.payment_status || 'pending') === 'paid' ? 'paid' : 'pending'
                }));

                safeDelivery.commissionReceived = parseFloat(safeDelivery.commissionReceived ?? safeDelivery.commission_received ?? 0) || 0;
                delete safeDelivery.commission_received;
                delete safeDelivery.commission_to_give;
                safeDelivery.createdAt = safeDelivery.createdAt || safeDelivery.created_at || new Date().toISOString();
                delete safeDelivery.created_at;

                return safeDelivery;
            });
            
            if (migrated) {
                console.log("Data migration complete.");
            }

            const isCompletelyEmpty = state.data.bikes.length === 0
                && state.data.expenses.length === 0
                && state.data.pr.length === 0
                && state.data.cashEntries.length === 0
                && state.data.payments.length === 0;

            if (isCompletelyEmpty) {
                state.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
                console.info('Loaded default demo dataset.');
                saveData();
            } else if (migrated) {
                saveData();
            }
        };

        let saveTimeout;
        const saveData = () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(async () => {
                try {
                    state.ui.isSaving = true;
                    await persistence.save(state.data);
                } catch (error) {
                    console.error('Failed to persist data:', error);
                    showToast('Failed to save data locally.', true);
                } finally {
                    state.ui.isSaving = false;
                }
            }, 400);
        };

        // --- Core App Logic ---

        const autoCreatePRContact = ({ name, contact, relationType = 'Other', relatedBikeName }) => {
            if (relationType === 'Showroom' || relationType === 'Referrer') {
                return;
            }
            const trimmedName = (name || '').trim();
            const displayContact = (contact || '').trim();
            const normalizedContact = sanitizePhone(displayContact);
            if (!trimmedName) {
                return;
            }

            const relation = relationType || 'Other';
            const bikeName = (relatedBikeName || '').trim();
            const identityKey = normalizedContact || trimmedName.toLowerCase();

            const existingEntry = state.data.pr.find(pr => {
                const existingKey = sanitizePhone(pr.contact) || pr.name.toLowerCase();
                return existingKey === identityKey && pr.relationType === relation;
            });

            if (existingEntry) {
                existingEntry.name = trimmedName;
                existingEntry.contact = displayContact || existingEntry.contact || '';
                if (bikeName) {
                    const bikes = new Set(
                        (existingEntry.relatedBikeName || '')
                            .split(',')
                            .map(entry => entry.trim())
                            .filter(Boolean)
                    );
                    bikes.add(bikeName);
                    existingEntry.relatedBikeName = Array.from(bikes).join(', ');
                }
                return;
            }

            state.data.pr.push({
                id: crypto.randomUUID(),
                name: trimmedName,
                contact: displayContact,
                relationType: relation,
                relatedBikeName: bikeName
            });
        };
        
        const calculateMetrics = () => {
            const { bikes, expenses, cashEntries, payments } = state.data;
            
            const soldBikes = bikes.filter(b => b.sold);
            const unsoldBikes = bikes.filter(b => !b.sold);
            
            const totalProfit = soldBikes.reduce((sum, b) => {
                const cost = (b.purchasePrice || 0) + (b.repairPrice || 0);
                const sale = b.sellingPrice || 0;
                return sum + (sale - cost);
            }, 0);
            const totalRevenue = soldBikes.reduce((sum, b) => sum + (b.sellingPrice || 0), 0);
            const brandNewDeliveries = state.data.brandNewDeliveries || [];
            const brandNewEarnings = brandNewDeliveries.reduce((sum, delivery) => sum + (delivery.commissionReceived || 0), 0);
            const brandNewCommissionsPaid = brandNewDeliveries.reduce((sum, delivery) => {
                return sum + (delivery.commissionToGive || []).reduce((s, ref) => {
                    return s + (ref.paymentStatus === 'paid' ? (ref.commissionAmount || 0) : 0);
                }, 0);
            }, 0);
            
            const unsoldInvestment = unsoldBikes.reduce((sum, b) => {
                return sum + (b.purchasePrice || 0) + (b.repairPrice || 0);
            }, 0);
            
            const totalCashAdded = (cashEntries || []).reduce((sum, e) => e.type === 'add' ? sum + e.amount : sum, 0);
            const totalCashRemoved = (cashEntries || []).reduce((sum, e) => e.type === 'remove' ? sum + e.amount : sum, 0);
            const totalSalesReceived = (payments || []).reduce((sum, p) => sum + p.amount, 0);
            const totalPurchases = bikes.reduce((sum, b) => sum + (b.purchasePrice || 0) + (b.repairPrice || 0), 0);
            const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
            
            const cashInHand = (totalCashAdded + totalSalesReceived + brandNewEarnings) - (totalCashRemoved + totalPurchases + totalExpenses + brandNewCommissionsPaid);
            
            const totalCashInflow = totalCashAdded + totalSalesReceived + brandNewEarnings;
            const totalCashOutflow = totalCashRemoved + totalPurchases + totalExpenses + brandNewCommissionsPaid;

            const pendingReceivables = soldBikes.reduce((sum, bike) => {
                if (bike.paymentMode === 'credit' && bike.creditInfo) {
                    return sum + Math.max(0, bike.creditInfo.remaining || 0);
                }
                if (bike.paymentMode === 'emi' && bike.emiInfo) {
                    const installmentsPaid = bike.emiInfo.installmentsPaid || 0;
                    const totalInstallments = bike.emiInfo.totalInstallments || 0;
                    const monthlyAmount = bike.emiInfo.monthlyAmount || 0;
                    const installmentsLeft = Math.max(totalInstallments - installmentsPaid, 0);
                    return sum + (installmentsLeft * monthlyAmount);
                }
                return sum;
            }, 0);

            const creditCustomers = soldBikes.filter(bike => {
                if (bike.paymentMode === 'credit' && bike.creditInfo) {
                    return (bike.creditInfo.remaining || 0) > EPSILON;
                }
                if (bike.paymentMode === 'emi' && bike.emiInfo) {
                    const installmentsPaid = bike.emiInfo.installmentsPaid || 0;
                    const totalInstallments = bike.emiInfo.totalInstallments || 0;
                    return installmentsPaid < totalInstallments;
                }
                return false;
            }).length;

            const paymentsThisMonth = payments.filter(p => {
                if (!p.date) return false;
                const d = new Date(p.date);
                const now = new Date();
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).reduce((sum, p) => sum + (p.amount || 0), 0);

            const purchasesThisMonth = bikes.filter(b => {
                if (!b.purchaseDate) return false;
                const d = new Date(b.purchaseDate);
                const now = new Date();
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).reduce((sum, b) => sum + (b.purchasePrice || 0) + (b.repairPrice || 0), 0);

            const expensesThisMonth = expenses.filter(e => {
                if (!e.date) return false;
                const d = new Date(e.date);
                const now = new Date();
                return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
            }).reduce((sum, e) => sum + (e.amount || 0), 0);

            const realizedProfit = totalSalesReceived - totalPurchases - totalExpenses;
            const thisMonthProfit = paymentsThisMonth - purchasesThisMonth - expensesThisMonth;
            
            state.metrics = {
                cashInHand,
                totalProfit,
                totalRevenue,
                brandNewEarnings,
                realizedProfit,
                thisMonthProfit,
                unsoldInvestment,
                inventorySold: soldBikes.length,
                inventoryUnsold: unsoldBikes.length,
                totalCashInflow,
                totalCashOutflow,
                pendingReceivables,
                creditCustomers,
            };
        };

        // --- Rendering Functions ---

        const render = () => {
            calculateMetrics();
            
            const pageId = `page-${state.ui.currentPage}`;
            const pageRenderFunction = {
                'page-dashboard': renderDashboard,
                'page-bikes': renderBikesPage,
                'page-credit': renderCreditPage,
                'page-analytics': renderAnalyticsPage,
                'page-expenses': renderExpensesPage,
                'page-pr': renderPRPage,
                'page-settings': renderSettingsPage,
            }[pageId];
            
            if (pageRenderFunction) pageRenderFunction();
            
            renderDashboardReminders();
            if (state.ui.currentPage !== 'dashboard') {
                renderDashboard();
            }
            ensureSensitiveState();
            refreshIcons();
        };

        const renderPage = (pageId) => {
            state.ui.currentPage = pageId;
            
            pages.forEach(p => p.classList.add('hidden'));
            const activePage = $(`#page-${pageId}`);
            if (activePage) {
                activePage.classList.remove('hidden');
            }
            
            navBar.querySelectorAll('.nav-item').forEach(item => {
                item.classList.toggle('active', item.dataset.page === pageId);
            });
            
            const pageTitles = {
                'dashboard': 'Dashboard',
                'bikes': 'Bikes',
                'credit': 'Credit Desk',
                'analytics': 'Analytics',
                'expenses': 'Expenses',
                'pr': 'PR Contacts',
                'settings': 'Settings'
            };
            pageTitle.textContent = pageTitles[pageId] || 'Manager';

            const showAddButton = ['bikes', 'expenses', 'pr'];
            addButton.classList.toggle('hidden', !showAddButton.includes(pageId));
            
            render();
        };

        const renderDashboard = () => {
            const { unsoldInvestment, inventorySold, inventoryUnsold } = state.metrics;
            const sortMode = state.ui.currentDashboardSort;

            setSensitiveCurrency(dashboardCash, state.metrics.cashInHand);
            setSensitiveCurrency(dashboardRevenue, state.metrics.totalRevenue);
            setSensitiveCurrency(dashboardProfit, state.metrics.totalProfit);
            setSensitiveCurrency(dashboardBrand, state.metrics.brandNewEarnings);

            metricInvestment.textContent = formatCurrency(unsoldInvestment);
            metricInventory.textContent = `${inventoryUnsold} unsold / ${inventorySold} sold`;
            dashboardSort.value = sortMode;
            
            // Render unsold bikes
            let unsoldBikes = state.data.bikes
                .filter(b => !b.sold);
            
            const getBikeCost = b => (b.purchasePrice || 0) + (b.repairPrice || 0);

            if (sortMode === 'recent') {
                unsoldBikes.sort((a, b) => new Date(b.createdAt || b.purchaseDate) - new Date(a.createdAt || a.purchaseDate));
            } else if (sortMode === 'high_price') {
                unsoldBikes.sort((a, b) => getBikeCost(b) - getBikeCost(a));
            } else if (sortMode === 'low_price') {
                unsoldBikes.sort((a, b) => getBikeCost(a) - getBikeCost(b));
            }
            
            // Show all unsold, not just 3, since it's sortable now
            if (unsoldBikes.length === 0) {
                dashboardRecentBikes.innerHTML = `<p class="text-gray-500 text-sm text-center">No unsold bikes yet.</p>`;
            } else {
                dashboardRecentBikes.innerHTML = unsoldBikes.map(bike => `
                    <div class="flex justify-between items-center py-1">
                        <div>
                            <span class="font-medium">${esc(bike.bikeName || bike.bikeNumberPlate)}</span>
                            <span class="text-xs text-gray-500 block">${esc(bike.bikeNumberPlate || '')}</span>
                        </div>
                        <span class="text-sm text-gray-600">${esc(formatCurrency(getBikeCost(bike)))}</span>
                    </div>
                `).join('');
            }
            renderDashboardReminders();
        };
        
        const renderDashboardReminders = () => {
            const { records } = summarizeCreditRecords();
            const statusRank = {
                overdue: 0,
                dueToday: 1,
                grace: 2,
                upcoming: 3
            };

            let bestReminder = null;

            records.forEach(record => {
                const dueMeta = record.dueMeta || {};
                const pendingPrincipal = typeof dueMeta.pendingPrincipal === 'number'
                    ? dueMeta.pendingPrincipal
                    : (typeof record.pendingAmount === 'number' ? record.pendingAmount : 0);
                if (pendingPrincipal <= EPSILON) {
                    return;
                }

                let dueDate = null;
                if (dueMeta.dueDate) {
                    const parsed = new Date(dueMeta.dueDate);
                    if (!Number.isNaN(parsed.getTime())) {
                        dueDate = parsed;
                    }
                }

                if (!dueDate) {
                    return;
                }

                const status = dueMeta.status || 'upcoming';
                const priority = Object.prototype.hasOwnProperty.call(statusRank, status)
                    ? statusRank[status]
                    : 99;

                let amount = pendingPrincipal;
                if (record.paymentMode === 'emi') {
                    const monthly = record.monthlyAmount || 0;
                    const installmentsLeft = typeof dueMeta.installmentsLeft === 'number'
                        ? dueMeta.installmentsLeft
                        : Math.max((record.totalInstallments || 0) - (record.installmentsPaid || 0), 0);
                    const isFinalInstallment = installmentsLeft <= 1;
                    if (monthly > EPSILON) {
                        amount = isFinalInstallment ? pendingPrincipal : Math.min(monthly, pendingPrincipal);
                    }
                }

                const candidate = {
                    record,
                    priority,
                    dueDate,
                    amount
                };

                if (
                    !bestReminder ||
                    candidate.priority < bestReminder.priority ||
                    (candidate.priority === bestReminder.priority && candidate.dueDate < bestReminder.dueDate)
                ) {
                    bestReminder = candidate;
                }
            });

            if (!bestReminder) {
                dashboardReminders.innerHTML = `<p class="text-gray-500 text-sm text-center">No upcoming EMI or credit payments.</p>`;
                return;
            }

            const { record, amount, dueDate } = bestReminder;
            const dueMeta = record.dueMeta || {};
            const label = record.paymentMode === 'emi' ? 'EMI' : 'Credit';
            const dueDateDisplay = formatDate(dueDate.toISOString());
            const statusLabel = dueMeta.statusLabel || '';
            const contactLabel = (record.contact && record.contact !== 'N/A') ? record.contact : 'No contact saved';
            const contactDigits = record.phoneHref || '';
            const callHref = contactDigits ? `tel:${contactDigits}` : '';
            const whatsappHref = contactDigits
                ? `https://wa.me/${contactDigits}?text=${encodeURIComponent(buildWhatsappReminderMessage(record))}`
                : '';
            const overdueInterestLine = record.overdueInterest > EPSILON
                ? `<p class="text-xs text-red-600 mt-2">Interest due: ${esc(formatCurrency(record.overdueInterest))}</p>`
                : '';

            const chips = [];
            if (dueMeta.graceDays) {
                chips.push(`<span class="px-2 py-0.5 text-[10px] font-medium bg-blue-100 text-blue-700 rounded-full">Grace ${esc(dueMeta.graceDays)}d</span>`);
            }
            if (dueMeta.interestRate) {
                chips.push(`<span class="px-2 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-700 rounded-full">Interest ${esc(dueMeta.interestRate)}%/mo</span>`);
            }

            dashboardReminders.innerHTML = `
                <div class="py-3 px-4 border border-blue-100 rounded-xl bg-blue-50/60 space-y-3 cursor-pointer" data-reminder-card data-bike-id="${esc(record.bikeId || '')}">
                    <div class="flex justify-between items-start gap-3">
                        <div class="space-y-1">
                            <p class="text-sm font-semibold text-blue-700">${esc(label)} due on ${esc(dueDateDisplay)}</p>
                            <p class="text-sm font-medium text-gray-900">${esc(record.customerName || 'Unknown')}</p>
                            <p class="text-xs text-gray-600">${esc(record.bikeName || '')}</p>
                            ${chips.length ? `<div class="flex flex-wrap gap-2">${chips.join('')}</div>` : ''}
                        </div>
                        <div class="text-right space-y-1">
                            <span class="text-base font-bold text-blue-600">${esc(formatCurrency(amount))}</span>
                            ${statusLabel ? `<span class="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-700">${esc(statusLabel)}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex justify-between items-center text-xs text-gray-500">
                        <span>${esc(contactLabel)}</span>
                        <div class="flex gap-2">
                            ${callHref ? `<a class="px-2 py-1 rounded-lg bg-white text-blue-600 font-semibold shadow-sm" data-reminder-action href="${esc(callHref)}">Call</a>` : ''}
                            ${whatsappHref ? `<a class="px-2 py-1 rounded-lg bg-green-500 text-white font-semibold shadow-sm" data-reminder-action href="${esc(whatsappHref)}" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
                        </div>
                    </div>
                    ${overdueInterestLine}
                    <p class="text-xs text-gray-500">Tap the card to log a payment.</p>
                </div>
            `;
        };
        
        function updateBikeBulkFooter() {
            if (!bikeClearanceFooter) return;
            const selection = state.ui.bikeBulkSelection || [];
            const show = state.ui.bikeBulkMode && selection.length > 0;
            bikeClearanceFooter.classList.toggle('hidden', !show);
            if (bikeClearanceCount) {
                bikeClearanceCount.textContent = `${selection.length} bike${selection.length === 1 ? '' : 's'} selected`;
            }
            [bikeClearanceMark, bikeClearanceRemove].forEach((button) => {
                if (!button) return;
                const disabled = selection.length === 0;
                button.disabled = disabled;
                button.classList.toggle('opacity-60', disabled);
                button.classList.toggle('cursor-not-allowed', disabled);
            });
        }

        const renderBikesPage = () => {
            const {
                currentBikeFilter,
                currentBikeSearch,
                currentBikeSort,
                currentBikeType,
                bikeAdvancedFilters = {},
                showBikeAdvanced,
                bikeBulkMode,
                bikeBulkSelection = []
            } = state.ui;

            const search = currentBikeSearch.toLowerCase();

            const parseNumber = (value) => {
                const num = parseFloat(value);
                return Number.isFinite(num) ? num : null;
            };

            const parseDate = (value) => {
                if (!value) return null;
                const date = new Date(value);
                return Number.isNaN(date.getTime()) ? null : date;
            };

            const dayMs = 24 * 60 * 60 * 1000;
            const getBikeCost = (bike) => (bike.purchasePrice || 0) + (bike.repairPrice || 0);
            const normalizeName = (value) => (value || '').trim().toLowerCase();

            const insightsCache = new Map();
            const computeProfitInsights = (bike) => {
                if (!bike) {
                    return {
                        totalCost: 0,
                        saleValue: 0,
                        profitValue: 0,
                        margin: 0,
                        level: 'medium',
                        badgeClass: 'bg-yellow-100 text-yellow-700',
                        label: 'Medium',
                        isActual: false,
                        similarSold: [],
                        similarUnsold: []
                    };
                }

                const totalCost = getBikeCost(bike);
                const sold = !!bike.sold;
                const soldPrice = sold ? (bike.sellingPrice || 0) : 0;
                const normalized = normalizeName(bike.bikeName);

                const similarSold = !sold && normalized
                    ? state.data.bikes.filter(entry =>
                        entry.id !== bike.id &&
                        !!entry.sold &&
                        normalizeName(entry.bikeName) === normalized)
                    : [];

                const similarUnsold = !sold && normalized
                    ? state.data.bikes.filter(entry =>
                        entry.id !== bike.id &&
                        !entry.sold &&
                        normalizeName(entry.bikeName) === normalized)
                    : [];

                let estimatedSale = sold ? soldPrice : (bike.targetSalePrice || 0);
                if (!sold && !estimatedSale && similarSold.length) {
                    const total = similarSold.reduce((sum, entry) => sum + (entry.sellingPrice || 0), 0);
                    estimatedSale = total / similarSold.length;
                }

                const saleValue = estimatedSale || 0;
                const profitValue = saleValue - totalCost;
                const margin = totalCost > 0 ? profitValue / totalCost : 0;

                let level = 'medium';
                let badgeClass = 'bg-yellow-100 text-yellow-700';
                if (profitValue <= 0 || margin < 0.08) {
                    level = 'low';
                    badgeClass = 'bg-red-100 text-red-700';
                } else if (profitValue >= 15000 || margin >= 0.25) {
                    level = 'high';
                    badgeClass = 'bg-green-100 text-green-700';
                }

                return {
                    totalCost,
                    saleValue,
                    profitValue,
                    margin,
                    level,
                    badgeClass,
                    label: level === 'high' ? 'High' : level === 'low' ? 'Low' : 'Medium',
                    isActual: sold,
                    similarSold,
                    similarUnsold
                };
            };

            const getInsights = (bike) => {
                if (!bike || !bike.id) {
                    return computeProfitInsights(bike);
                }
                if (!insightsCache.has(bike.id)) {
                    insightsCache.set(bike.id, computeProfitInsights(bike));
                }
                return insightsCache.get(bike.id);
            };

            const buildSimilarSection = (bike, insights) => {
                if (!bike || bike.sold) return '';

                const matches = [...(insights.similarSold || []), ...(insights.similarUnsold || [])]
                    .filter(entry => entry && entry.id !== bike.id)
                    .slice(0, 3);

                if (!matches.length) {
                    return '';
                }

                const rows = matches.map(entry => {
                    const entryInsights = getInsights(entry);
                    const status = esc(entry.sold ? 'Sold' : 'Unsold');
                    const statusClass = entry.sold ? 'text-green-600' : 'text-amber-600';
                    const saleLabel = entry.sold
                        ? `Sold @ ${esc(formatCurrency(entry.sellingPrice || 0))}`
                        : (entry.targetSalePrice
                            ? `Target ${esc(formatCurrency(entry.targetSalePrice))}`
                            : `Cost ${esc(formatCurrency(entryInsights.totalCost))}`);
                    const profitLabel = esc(entry.sold ? 'Profit' : 'Potential');

                    return `
                        <div class="flex justify-between items-start gap-3 text-xs">
                            <div>
                                <p class="font-semibold text-gray-700">${esc(entry.bikeName || entry.bikeNumberPlate)}</p>
                                <p class="text-gray-500">${saleLabel}</p>
                            </div>
                            <div class="text-right">
                                <span class="font-semibold ${statusClass}">${status}</span>
                                <p class="text-[11px] text-gray-500">${profitLabel}: ${esc(formatCurrency(entryInsights.profitValue))}</p>
                            </div>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="bg-gray-50 rounded-xl p-3 space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-semibold text-gray-600 uppercase tracking-wide">Similar Bikes</span>
                            <span class="text-[11px] text-gray-500">${esc(matches.length)} match${matches.length === 1 ? '' : 'es'}</span>
                        </div>
                        ${rows}
                    </div>
                `;
            };

            if (bikeTypeToggle) {
                bikeTypeToggle.querySelectorAll('button').forEach(button => {
                    button.classList.toggle('active', button.dataset.type === currentBikeType);
                });
            }

            if (bikeSearch && bikeSearch !== document.activeElement) {
                bikeSearch.value = currentBikeSearch;
            }

            if (bikeFilter) {
                bikeFilter.querySelectorAll('button').forEach(button => {
                    button.classList.toggle('active', button.dataset.filter === currentBikeFilter);
                });
            }

            const isBrandNew = currentBikeType === 'brand_new';

            if (bikeAdvancedToggle) {
                bikeAdvancedToggle.classList.toggle('hidden', isBrandNew);
                bikeAdvancedToggle.textContent = showBikeAdvanced ? 'Hide Advanced Filters' : 'Show Advanced Filters';
            }

            if (bikeAdvancedPanel) {
                bikeAdvancedPanel.classList.toggle('hidden', !(showBikeAdvanced && !isBrandNew));
            }

            const advancedFilters = bikeAdvancedFilters || {};
            const hasAdvancedFilters = Object.values(advancedFilters).some(Boolean);

            if (bikeAdvancedReset) {
                bikeAdvancedReset.classList.toggle('hidden', isBrandNew);
                bikeAdvancedReset.disabled = !hasAdvancedFilters;
                bikeAdvancedReset.classList.toggle('opacity-60', !hasAdvancedFilters);
                bikeAdvancedReset.classList.toggle('cursor-not-allowed', !hasAdvancedFilters);
            }

            if (bikeBulkToggle) {
                bikeBulkToggle.classList.toggle('hidden', isBrandNew);
                bikeBulkToggle.textContent = bikeBulkMode ? 'Exit Clearance Selection' : 'Select for Clearance';
                bikeBulkToggle.classList.toggle('bg-amber-500', bikeBulkMode);
                bikeBulkToggle.classList.toggle('text-white', bikeBulkMode);
                bikeBulkToggle.classList.toggle('border-amber-500', bikeBulkMode);
                bikeBulkToggle.classList.toggle('hover:bg-amber-500/90', bikeBulkMode);
                bikeBulkToggle.classList.toggle('bg-amber-100/70', !bikeBulkMode);
                bikeBulkToggle.classList.toggle('text-amber-600', !bikeBulkMode);
                bikeBulkToggle.classList.toggle('border-amber-200', !bikeBulkMode);
            }

            if (bikeFilterProfitMin && bikeFilterProfitMin !== document.activeElement) bikeFilterProfitMin.value = advancedFilters.profitMin ?? '';
            if (bikeFilterProfitMax && bikeFilterProfitMax !== document.activeElement) bikeFilterProfitMax.value = advancedFilters.profitMax ?? '';
            if (bikeFilterDateFrom && bikeFilterDateFrom !== document.activeElement) bikeFilterDateFrom.value = advancedFilters.dateFrom ?? '';
            if (bikeFilterDateTo && bikeFilterDateTo !== document.activeElement) bikeFilterDateTo.value = advancedFilters.dateTo ?? '';
            if (bikeFilterRepairMin && bikeFilterRepairMin !== document.activeElement) bikeFilterRepairMin.value = advancedFilters.repairMin ?? '';
            if (bikeFilterRepairMax && bikeFilterRepairMax !== document.activeElement) bikeFilterRepairMax.value = advancedFilters.repairMax ?? '';

            if (isBrandNew) {
                if (state.ui.showBikeAdvanced) {
                    state.ui.showBikeAdvanced = false;
                }
                if (state.ui.bikeBulkMode || (state.ui.bikeBulkSelection || []).length) {
                    state.ui.bikeBulkMode = false;
                    state.ui.bikeBulkSelection = [];
                    updateBikeBulkFooter();
                }
                bikeFilter.classList.add('hidden');
                bikeSortTrigger.classList.add('hidden');
                bikeSortMenu.classList.add('hidden');
                bikeSearch.placeholder = 'Search by model, customer, showroom...';
                renderBrandNewBikes();
                return;
            }

            bikeFilter.classList.remove('hidden');
            bikeSortTrigger.classList.remove('hidden');
            bikeSearch.placeholder = 'Search by name, plate, or owner...';

            let filteredBikes = state.data.bikes.filter(bike => {
                if (currentBikeFilter === 'sold' && !bike.sold) return false;
                if (currentBikeFilter === 'unsold' && bike.sold) return false;

                if (search) {
                    const plate = (bike.bikeNumberPlate || '').toLowerCase();
                    const owner = (bike.ownerName || '').toLowerCase();
                    const name = (bike.bikeName || '').toLowerCase();
                    if (!plate.includes(search) && !owner.includes(search) && !name.includes(search)) {
                        return false;
                    }
                }
                return true;
            });

            const profitMin = parseNumber(advancedFilters.profitMin);
            const profitMax = parseNumber(advancedFilters.profitMax);
            const repairMin = parseNumber(advancedFilters.repairMin);
            const repairMax = parseNumber(advancedFilters.repairMax);
            const dateFrom = parseDate(advancedFilters.dateFrom);
            const dateTo = parseDate(advancedFilters.dateTo);

            filteredBikes = filteredBikes.filter(bike => {
                const insights = getInsights(bike);

                if (profitMin !== null && insights.profitValue < profitMin) return false;
                if (profitMax !== null && insights.profitValue > profitMax) return false;

                if (dateFrom) {
                    const purchaseDate = bike.purchaseDate ? new Date(bike.purchaseDate) : null;
                    if (!purchaseDate || purchaseDate < dateFrom) return false;
                }

                if (dateTo) {
                    const purchaseDate = bike.purchaseDate ? new Date(bike.purchaseDate) : null;
                    if (!purchaseDate || purchaseDate > dateTo) return false;
                }

                const repairValue = parseFloat(bike.repairPrice || 0);
                if (repairMin !== null && repairValue < repairMin) return false;
                if (repairMax !== null && repairValue > repairMax) return false;

                return true;
            });

            const getSaleValue = (bike) => getInsights(bike).saleValue;
            const getProfitValue = (bike) => getInsights(bike).profitValue;

            filteredBikes.sort((a, b) => {
                switch (currentBikeSort) {
                    case 'az':
                        return (a.bikeName || '').localeCompare(b.bikeName || '');
                    case 'za':
                        return (b.bikeName || '').localeCompare(a.bikeName || '');
                    case 'purchaseHigh':
                        return getBikeCost(b) - getBikeCost(a);
                    case 'purchaseLow':
                        return getBikeCost(a) - getBikeCost(b);
                    case 'saleHigh':
                        return getSaleValue(b) - getSaleValue(a);
                    case 'saleLow':
                        return getSaleValue(a) - getSaleValue(b);
                    case 'profitHigh':
                        return getProfitValue(b) - getProfitValue(a);
                    case 'profitLow':
                        return getProfitValue(a) - getProfitValue(b);
                    case 'dateDesc':
                    default:
                        return new Date(b.createdAt || b.purchaseDate) - new Date(a.createdAt || a.purchaseDate);
                }
            });

            if (filteredBikes.length === 0) {
                bikeList.innerHTML = `<p class="text-gray-500 text-center mt-4">No bikes found.</p>`;
                updateBikeBulkFooter();
                return;
            }

            bikeList.innerHTML = filteredBikes.map(bike => {
                const bikeId = esc(bike.id || '');
                const bikeNameLabel = esc(bike.bikeName || bike.bikeNumberPlate || 'Unknown');
                const bikePlateLabel = esc(bike.bikeNumberPlate || '');
                const ownerNameLabel = esc(bike.ownerName || 'N/A');
                const insights = getInsights(bike);
                const totalCost = insights.totalCost;
                const badges = [];
                let showLogPayment = false;

                if (bike.sold) {
                    if (bike.paymentMode === 'cash') {
                        badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Paid</span>`);
                    } else if (bike.paymentMode === 'credit' && bike.creditInfo) {
                        if ((bike.creditInfo.remaining || 0) > EPSILON) {
                            badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">Credit: ${esc(formatCurrency(bike.creditInfo.remaining))} due</span>`);
                            showLogPayment = true;
                        } else {
                            badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Paid</span>`);
                        }
                    } else if (bike.paymentMode === 'emi' && bike.emiInfo) {
                        if ((bike.emiInfo.installmentsPaid || 0) < (bike.emiInfo.totalInstallments || 0)) {
                            const emiPaid = esc(bike.emiInfo.installmentsPaid || 0);
                            const emiTotal = esc(bike.emiInfo.totalInstallments || 0);
                            badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">EMI: ${emiPaid}/${emiTotal} paid</span>`);
                            showLogPayment = true;
                        } else {
                            badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Paid</span>`);
                        }
                    } else {
                        badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sold</span>`);
                    }
                } else {
                    badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Unsold</span>`);
                }

                if (bike.clearanceSale) {
                    badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Clearance</span>`);
                }

                if (bike.purchaseDate) {
                    const purchaseDate = new Date(bike.purchaseDate);
                    if (!Number.isNaN(purchaseDate.getTime())) {
                        if (!bike.sold) {
                            const diff = Math.max(0, Math.floor((Date.now() - purchaseDate.getTime()) / dayMs));
                            badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">In stock ${esc(diff)}d</span>`);
                        } else if (bike.soldDate) {
                            const soldDate = new Date(bike.soldDate);
                            if (!Number.isNaN(soldDate.getTime())) {
                                const diff = Math.max(0, Math.floor((soldDate.getTime() - purchaseDate.getTime()) / dayMs));
                                badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Sold in ${esc(diff)}d</span>`);
                            }
                        }
                    }
                }

                badges.push(`<span class="text-xs font-semibold px-2 py-0.5 rounded-full ${esc(insights.badgeClass)}">${esc(insights.isActual ? 'Actual Profit' : 'Profit Potential')}: ${esc(formatCurrency(insights.profitValue))}</span>`);

                const selection = state.ui.bikeBulkMode && !bike.sold
                    ? `
                        <label class="flex items-center gap-2 text-[11px] text-gray-600 mt-2">
                            <input type="checkbox" class="bike-clearance-checkbox h-4 w-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500" data-bike-id="${bikeId}" ${bikeBulkSelection.includes(bike.id) ? 'checked' : ''}>
                            Mark for clearance
                        </label>
                    `
                    : '';

                const badgesBlock = badges.length
                    ? `<div class="flex flex-wrap justify-end gap-2">${badges.join('')}</div>`
                    : '';

                const costBreakdown = bike.sold ? `
                        <div class="text-sm space-y-1 pt-2 border-t border-gray-100 mt-2">
                            <p class="flex justify-between">
                                <span>Sale:</span>
                                <span>${esc(formatCurrency(bike.sellingPrice))}</span>
                            </p>
                            <p class="flex justify-between">
                                <span>Cost:</span>
                                <span>${esc(formatCurrency(totalCost))}</span>
                            </p>
                            <p class="flex justify-between font-semibold">
                                <span>Profit:</span>
                                <span class="${insights.profitValue >= 0 ? 'text-green-600' : 'text-red-600'}">${esc(formatCurrency(insights.profitValue))}</span>
                            </p>
                        </div>
                    ` : `
                        <div class="text-sm space-y-1 pt-2 border-t border-gray-100 mt-2">
                            <p class="flex justify-between">
                                <span>Purchase:</span>
                                <span>${esc(formatCurrency(bike.purchasePrice))}</span>
                            </p>
                            <p class="flex justify-between">
                                <span>Repair:</span>
                                <span>${esc(formatCurrency(bike.repairPrice))}</span>
                            </p>
                            <p class="flex justify-between">
                                <span>Total Cost:</span>
                                <span>${esc(formatCurrency(totalCost))}</span>
                            </p>
                            ${insights.saleValue > 0 ? `
                                <p class="flex justify-between">
                                    <span>Target Sale:</span>
                                    <span>${esc(formatCurrency(insights.saleValue))}</span>
                                </p>
                            ` : ''}
                            <p class="flex justify-between font-semibold">
                                <span>Potential Profit:</span>
                                <span class="${insights.profitValue >= 0 ? 'text-green-600' : 'text-red-600'}">${esc(formatCurrency(insights.profitValue))}</span>
                            </p>
                        </div>
                    `;

                const referralBlock = bike.referral ? `
                        <div class="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-600">
                            <p class="font-medium text-gray-700">Reference: ${esc(bike.referral.name || 'N/A')}</p>
                            ${bike.referral.contact ? `<p>Contact: ${esc(bike.referral.contact)}</p>` : ''}
                            ${bike.referral.commission ? `<p>Commission Share: ${esc(formatCurrency(bike.referral.commission))}</p>` : ''}
                        </div>
                    ` : '';

                const ownerPhone = sanitizePhone(bike.ownerContact || '');
                const customerPhone = sanitizePhone(bike.customerContact || '');
                const shareLines = [
                    `Bike: ${bike.bikeName || bike.bikeNumberPlate}`,
                    `Cost: ${formatCurrency(totalCost)}`,
                    bike.sold
                        ? `Sold @ ${formatCurrency(bike.sellingPrice || 0)}`
                        : (insights.saleValue > 0 ? `Target @ ${formatCurrency(insights.saleValue)}` : ''),
                    `${insights.isActual ? 'Actual' : 'Potential'} profit: ${formatCurrency(insights.profitValue)}`
                ].filter(Boolean);
                const shareRecipient = bike.sold ? customerPhone : '';
                const shareHref = esc(`https://wa.me/${shareRecipient}?text=${encodeURIComponent(shareLines.join('\n'))}`);

                const quickActions = [
                    ownerPhone ? `<a href="tel:${ownerPhone}" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition">Call Owner</a>` : '',
                    bike.sold && customerPhone ? `<a href="tel:${customerPhone}" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition">Call Customer</a>` : '',
                    `<a href="${shareHref}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">Share on WhatsApp</a>`
                ].filter(Boolean);

                const quickActionsBlock = quickActions.length
                    ? `<div class="flex flex-wrap gap-2 pt-2 border-t border-dashed border-gray-200 mt-3">${quickActions.join('')}</div>`
                    : '';

                const similarBlock = buildSimilarSection(bike, insights);

                const actionsBlock = `
                    <div class="flex flex-wrap justify-end gap-3 pt-3">
                        ${!bike.sold ? `<button data-action="mark-sold" class="text-green-600 font-medium text-sm">Mark Sold</button>` : ''}
                        ${showLogPayment ? `<button data-action="log-payment" class="text-blue-600 font-medium text-sm">Log Payment</button>` : ''}
                        <button data-action="edit-bike" class="text-blue-500 font-medium text-sm">Edit</button>
                    </div>
                `;

                const cardClasses = `bg-white rounded-xl p-4 shadow-sm space-y-3 ${bike.clearanceSale ? 'border border-amber-300' : ''}`;

                return `
                    <div class="${cardClasses}" data-bike-id="${bikeId}">
                        <div class="flex flex-col gap-2">
                            <div class="flex justify-between items-start gap-3">
                                <div>
                                    <span class="font-semibold text-lg text-gray-800">${bikeNameLabel}</span>
                                    <span class="font-medium text-sm text-gray-500 block">${bikePlateLabel}</span>
                                    <p class="text-gray-600 text-sm">Owner: ${ownerNameLabel}</p>
                                </div>
                                <div class="flex flex-col items-end gap-2">
                                    ${badgesBlock}
                                    ${selection}
                                </div>
                            </div>
                            ${costBreakdown}
                            ${referralBlock}
                            ${similarBlock}
                            ${quickActionsBlock}
                            ${actionsBlock}
                        </div>
                    </div>
                `;
            }).join('');

            updateBikeBulkFooter();
            applyPendingHighlight();
        };
        
        const renderExpensesPage = () => {
            const expenses = state.data.expenses.sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date));
            
            if (expenses.length === 0) {
                expenseList.innerHTML = `<p class="text-gray-500 text-center mt-4">No expenses recorded.</p>`;
                return;
            }
            
            expenseList.innerHTML = expenses.map(expense => `
                <div class="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center" data-expense-id="${esc(expense.id || '')}">
                    <div>
                        <p class="font-semibold">${esc(expense.description || '')}</p>
                        <p class="text-sm text-gray-500">${esc(formatDate(expense.date))}</p>
                    </div>
                    <span class="font-bold text-lg text-red-600">- ${esc(formatCurrency(expense.amount))}</span>
                </div>
            `).join('');
        };
        
        const renderPRPage = () => {
            const { currentPRFilter, currentPRSearch } = state.ui;
            const search = currentPRSearch.toLowerCase();

            const filteredPR = state.data.pr.filter(pr => {
                if (currentPRFilter !== 'all' && pr.relationType !== currentPRFilter) return false;
                
                if (search) {
                    const name = pr.name.toLowerCase();
                    const contact = pr.contact.toString().toLowerCase();
                    const bikeName = (pr.relatedBikeName || '').toLowerCase();
                    if (!name.includes(search) && !contact.includes(search) && !bikeName.includes(search)) {
                        return false;
                    }
                }
                return true;
            }).sort((a, b) => a.name.localeCompare(b.name));
            
            if (filteredPR.length === 0) {
                prList.innerHTML = `<p class="text-gray-500 text-center mt-4">No contacts found.</p>`;
                return;
            }
            
            const relationClassMap = {
                Buyer: 'bg-blue-100 text-blue-800',
                Supplier: 'bg-purple-100 text-purple-800',
                Owner: 'bg-amber-100 text-amber-800',
                Other: 'bg-gray-100 text-gray-700'
            };
            
            prList.innerHTML = filteredPR.map(pr => {
                const relationType = pr.relationType || 'Other';
                const relationClass = relationClassMap[relationType] || relationClassMap.Other;
                const relatedBikes = (pr.relatedBikeName || '')
                    .split(',')
                    .map(name => name.trim())
                    .filter((value, index, arr) => value && arr.indexOf(value) === index);
                const contactDigits = sanitizePhone(pr.contact);
                const safeName = esc(pr.name || 'Contact');
                const safeContact = esc(pr.contact || 'N/A');

                const bikeButtons = relatedBikes.length
                    ? relatedBikes.map(name => `
                        <button type="button" class="pr-bike-chip" data-action="pr-go-bike" data-bike-name="${esc(name)}">
                            <i data-lucide="navigation"></i>
                            ${esc(name)}
                        </button>
                    `).join('')
                    : '<span class="text-xs text-gray-400">No linked bikes yet.</span>';

                const baseActions = `
                    ${contactDigits ? `<button type="button" class="pr-action-button" data-action="pr-call" data-contact="${contactDigits}" title="Call">
                        <i data-lucide="phone"></i>
                    </button>` : ''}
                    ${contactDigits ? `<button type="button" class="pr-action-button" data-action="pr-whatsapp" data-contact="${contactDigits}" title="WhatsApp">
                        <i data-lucide="message-circle"></i>
                    </button>` : ''}
                    ${pr.contact ? `<button type="button" class="pr-action-button" data-action="pr-copy" data-contact="${contactDigits}" title="Copy contact">
                        <i data-lucide="copy"></i>
                    </button>` : ''}
                `;

                let relationActions = '';
                if (relationType === 'Buyer') {
                    relationActions += `
                        <button type="button" class="pr-action-button" data-action="pr-log-payment" data-pr-name="${safeName}" title="Log credit payment">
                            <i data-lucide="wallet"></i>
                        </button>
                    `;
                } else if (relationType === 'Supplier') {
                    relationActions += `
                        <button type="button" class="pr-action-button" data-action="pr-filter-supplier" data-pr-name="${safeName}" title="Show supplier bikes">
                            <i data-lucide="filter"></i>
                        </button>
                    `;
                } else if (relationType === 'Owner') {
                    relationActions += `
                        <button type="button" class="pr-action-button" data-action="pr-filter-owner" data-pr-name="${safeName}" title="Show owner bikes">
                            <i data-lucide="target"></i>
                        </button>
                    `;
                }
                
                return `
                <div class="bg-white rounded-xl p-4 shadow-sm" data-pr-id="${esc(pr.id || '')}">
                    <div class="flex justify-between items-center">
                        <span class="font-semibold text-lg">${safeName}</span>
                        <span class="text-xs font-medium px-2 py-0.5 rounded-full ${relationClass}">${esc(relationType)}</span>
                    </div>
                    <p class="text-gray-600 text-sm mt-1">Contact: ${safeContact}</p>
                    <div class="flex flex-wrap gap-2 mt-3">
                        ${bikeButtons}
                    </div>
                    <div class="flex flex-wrap gap-2 mt-3">
                        ${baseActions}
                        ${relationActions}
                    </div>
                </div>
                `;
            }).join('');
        };
        
        const renderSettingsPage = () => {
            if (pinStatus) {
                const lockState = state.security.isUnlocked ? 'unlocked' : 'locked';
                const color = state.security.isUnlocked ? 'text-green-600' : 'text-amber-600';
                pinStatus.innerHTML = `Sensitive data is currently <span class="font-medium ${color}">${lockState}</span>.`;
            }

            // NEW: Update backup mode display
            if (backupModeDisplay) {
                backupModeDisplay.textContent = 'Local Backup (Offline)';
            }
        };

        // --- Modal & Form Handling ---
        
        const openModal = (type, data = null) => {
            state.ui.modal = { isOpen: true, type, data };
            
            let title = '';
            let body = '';
            
            const today = formatDate(new Date());
            
            switch (type) {
                case 'addBike':
                    title = 'Add New Bike';
                    body = getBikeFormHTML({ purchaseDate: today });
                    break;
                case 'editBike':
                    title = 'Edit Bike';
                    body = getBikeFormHTML(data);
                    setTimeout(() => addSalesFormListeners(data), 10);
                    break;
                case 'markSold':
                    title = 'Mark Bike as Sold';
                    body = getBikeSaleFormHTML(data);
                    setTimeout(() => addSalesFormListeners(data), 10);
                    break;
                case 'logPayment':
                    title = 'Log Payment';
                    body = getLogPaymentFormHTML(data);
                    setTimeout(() => addLogPaymentListeners(data), 10);
                    break;
                case 'bulkPayments':
                    title = 'Record Bulk Payments';
                    body = getBulkPaymentFormHTML(data);
                    setTimeout(() => addBulkPaymentListeners(data), 10);
                    break;
                case 'addExpense':
                    title = 'Add Expense';
                    body = getExpenseFormHTML({ date: today });
                    break;
                case 'editExpense':
                    title = 'Edit Expense';
                    body = getExpenseFormHTML(data);
                    break;
                case 'addPR':
                    title = 'Add Contact';
                    body = getPRFormHTML({});
                    break;
                case 'editPR':
                    title = 'Edit Contact';
                    body = getPRFormHTML(data);
                    break;
                case 'addBrandNew':
                    title = 'Add Brand New Delivery';
                    body = getBrandNewFormHTML({});
                    setTimeout(() => addBrandNewFormListeners(), 10);
                    break;
                case 'editBrandNew':
                    title = 'Edit Brand New Delivery';
                    body = getBrandNewFormHTML(data);
                    setTimeout(() => addBrandNewFormListeners(), 10);
                    break;
            }
            
            modalTitle.textContent = title;
            modalBody.innerHTML = body;
            
            formModal.classList.remove('hidden');
            refreshIcons();
            setTimeout(() => {
                modalOverlay.classList.add('open');
                modalSheet.classList.add('open');
            }, 10);
        };
        
        const closeModal = () => {
            state.ui.modal = { isOpen: false, type: null, data: null };
            modalOverlay.classList.remove('open');
            modalSheet.classList.remove('open');
            setTimeout(() => {
                formModal.classList.add('hidden');
                modalBody.innerHTML = '';
            }, 300);
        };
        
        const getBikeFormHTML = (bike = {}) => {
            const isEditing = !!bike.id;
            
            return `
            <input type="hidden" id="bike-id" value="${esc(bike.id || '')}">
            <div class="bg-white rounded-xl p-4 space-y-3">
                <h3 class="font-semibold">Bike Details</h3>
                <div>
                    <label class="form-label" for="bike-name">Bike Name *</label>
                    <input type="text" id="bike-name" class="form-input" placeholder="e.g., Pulsar 150" value="${esc(bike.bikeName || '')}">
                </div>
                 <div>
                    <label class="form-label" for="bike-plate">Bike Number Plate *</label>
                    <input type="text" id="bike-plate" class="form-input uppercase" placeholder="GJ01AB1234" value="${esc(bike.bikeNumberPlate || '')}" ${isEditing && bike.sold ? 'readonly' : ''}>
                </div>
            </div>

            <div class="bg-white rounded-xl p-4 space-y-3">
                <h3 class="font-semibold">Purchase Details</h3>
                <div>
                    <label class="form-label" for="bike-owner">Owner Name *</label>
                    <input type="text" id="bike-owner" class="form-input" placeholder="John Doe" value="${esc(bike.ownerName || '')}">
                </div>
                <div>
                    <label class="form-label" for="bike-owner-contact">Owner Contact</label>
                    <input type="tel" id="bike-owner-contact" class="form-input" placeholder="9876543210" value="${esc(bike.ownerContact || '')}">
                </div>
                <div>
                    <label class="form-label" for="bike-supplier">Supplier Name</label>
                    <input type="text" id="bike-supplier" class="form-input" placeholder="Bike Supplier Co." value="${esc(bike.supplierName || '')}">
                </div>
                <div>
                    <label class="form-label" for="bike-supplier-contact">Supplier Contact</label>
                    <input type="tel" id="bike-supplier-contact" class="form-input" placeholder="9876543210" value="${esc(bike.supplierContact || '')}">
                </div>
                <div>
                    <label class="form-label" for="bike-purchase-date">Purchase Date *</label>
                    <input type="date" id="bike-purchase-date" class="form-input" value="${esc(formatDate(bike.purchaseDate))}">
                </div>
                <div>
                    <label class="form-label" for="bike-purchase-price">Purchase Price *</label>
                    <input type="number" id="bike-purchase-price" class="form-input" placeholder="50000" value="${esc(bike.purchasePrice ?? '')}">
                </div>
                <div>
                    <label class="form-label" for="bike-repair-price">Repair Price</label>
                    <input type="number" id="bike-repair-price" class="form-input" placeholder="5000" value="${esc(bike.repairPrice ?? '')}">
                </div>
                <div>
                    <label class="form-label" for="bike-target-price">Target Selling Price</label>
                    <input type="number" id="bike-target-price" class="form-input" placeholder="65000" value="${esc(bike.targetSalePrice ?? '')}">
                    <p class="text-xs text-gray-400 mt-1">Used to estimate profit potential and advanced filters.</p>
                </div>
            </div>

            <div class="bg-white rounded-xl p-4 space-y-3">
                <h3 class="font-semibold">Reference / Agent Commission</h3>
                <p class="text-xs text-gray-500">Track referral partners who shared commission on this purchase.</p>
                <div>
                    <label class="form-label" for="bike-ref-name">Reference Name</label>
                    <input type="text" id="bike-ref-name" class="form-input" placeholder="Agent name" value="${esc(bike.referral?.name || '')}">
                </div>
                <div>
                    <label class="form-label" for="bike-ref-contact">Reference Contact</label>
                    <input type="tel" id="bike-ref-contact" class="form-input" placeholder="Contact number" value="${esc(bike.referral?.contact || '')}">
                </div>
                <div>
                    <label class="form-label" for="bike-ref-commission">Commission Amount</label>
                    <input type="number" id="bike-ref-commission" class="form-input" placeholder="2000" value="${esc(bike.referral?.commission ?? '')}">
                </div>
            </div>
            
            ${isEditing ? getBikeSaleFormHTML(bike) : ''}
            
            ${isEditing ? `
            <div class="mt-4">
                <button id="delete-bike-btn" class="w-full py-3 bg-red-100 text-red-600 rounded-lg font-semibold transition hover:bg-red-200">
                    Delete Bike
                </button>
            </div>
            ` : ''}
            `;
        };
        
        const getBikeSaleFormHTML = (bike = {}) => {
            const today = formatDate(new Date());
            const soldDate = bike.sold ? bike.soldDate : today;
            const creditDueDate = bike.creditInfo ? bike.creditInfo.dueDate : today;
            const emiStartDate = bike.emiInfo ? bike.emiInfo.startDate : today;
            const creditGrace = typeof bike.creditInfo?.gracePeriodDays !== 'undefined'
                ? bike.creditInfo.gracePeriodDays
                : DEFAULT_GRACE_PERIOD_DAYS;
            const creditInterest = typeof bike.creditInfo?.interestRate !== 'undefined'
                ? bike.creditInfo.interestRate
                : '';
            const emiGrace = typeof bike.emiInfo?.gracePeriodDays !== 'undefined'
                ? bike.emiInfo.gracePeriodDays
                : DEFAULT_GRACE_PERIOD_DAYS;
            const emiInterest = typeof bike.emiInfo?.interestRate !== 'undefined'
                ? bike.emiInfo.interestRate
                : '';

            return `
            <div class="bg-white rounded-xl p-4 space-y-3">
                <h3 class="font-semibold">Sales Details ${bike.sold ? `(Sold on ${esc(formatDate(bike.soldDate))})` : ''}</h3>
                
                <div>
                    <label class="form-label" for="sale-customer-name">Customer Name</label>
                    <input type="text" id="sale-customer-name" class="form-input" placeholder="Jane Smith" value="${esc(bike.customerName || '')}">
                </div>
                <div>
                    <label class="form-label" for="sale-customer-contact">Customer Contact</label>
                    <input type="tel" id="sale-customer-contact" class="form-input" placeholder="9876543210" value="${esc(bike.customerContact || '')}">
                </div>
                <div>
                    <label class="form-label" for="sale-total-price">Total Selling Price *</label>
                    <input type="number" id="sale-total-price" class="form-input" placeholder="70000" value="${esc(bike.sellingPrice ?? '')}">
                </div>
                <div>
                    <label class="form-label" for="sale-payment-mode">Payment Mode *</label>
                    <select id="sale-payment-mode" class="form-input">
                        <option value="cash" ${bike.paymentMode === 'cash' ? 'selected' : ''}>Cash</option>
                        <option value="credit" ${bike.paymentMode === 'credit' ? 'selected' : ''}>Credit</option>
                        <option value="emi" ${bike.paymentMode === 'emi' ? 'selected' : ''}>EMI</option>
                    </select>
                </div>

                <!-- Fields for Cash -->
                <div id="sale-cash-fields" class="hidden space-y-3">
                    <div>
                        <label class="form-label" for="sale-cash-received">Amount Received</label>
                        <input type="number" id="sale-cash-received" class="form-input bg-gray-200" readonly value="${esc(bike.sellingPrice ?? '')}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-cash-date">Payment Date *</label>
                        <input type="date" id="sale-cash-date" class="form-input" value="${esc(formatDate(soldDate))}">
                    </div>
                </div>

                <!-- Fields for Credit -->
                <div id="sale-credit-fields" class="hidden space-y-3">
                    <div>
                        <label class="form-label" for="sale-credit-initial">Initial Payment *</label>
                        <input type="number" id="sale-credit-initial" class="form-input" placeholder="50000" value="${esc((bike.creditInfo && bike.creditInfo.initialPayment) ?? '')}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-credit-remaining">Remaining Amount</label>
                        <input type="number" id="sale-credit-remaining" class="form-input bg-gray-200" readonly placeholder="20000" value="${esc((bike.creditInfo && bike.creditInfo.remaining) ?? '')}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-credit-due-date">Remaining Due Date *</label>
                        <input type="date" id="sale-credit-due-date" class="form-input" value="${esc(formatDate(creditDueDate))}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-credit-grace">Grace Period (days)</label>
                        <input type="number" id="sale-credit-grace" class="form-input" min="0" value="${esc(creditGrace)}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-credit-interest">Interest Rate (% per month)</label>
                        <input type="number" id="sale-credit-interest" class="form-input" min="0" step="0.1" value="${esc(creditInterest)}">
                        <p class="text-xs text-gray-400 mt-1">Used to suggest interest once the grace period ends.</p>
                    </div>
                </div>

                <!-- Fields for EMI -->
                <div id="sale-emi-fields" class="hidden space-y-3">
                    <div>
                        <label class="form-label" for="sale-emi-downpayment">Down Payment *</label>
                        <input type="number" id="sale-emi-downpayment" class="form-input" placeholder="30000" value="${esc((bike.emiInfo && bike.emiInfo.downPayment) ?? '')}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-emi-monthly">Monthly EMI Amount *</label>
                        <input type="number" id="sale-emi-monthly" class="form-input" placeholder="5000" value="${esc((bike.emiInfo && bike.emiInfo.monthlyAmount) ?? '')}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-emi-installments">Number of Installments *</label>
                        <input type="number" id="sale-emi-installments" class="form-input" placeholder="12" value="${esc((bike.emiInfo && bike.emiInfo.totalInstallments) ?? '')}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-emi-start-date">EMI Start Date *</label>
                        <input type="date" id="sale-emi-start-date" class="form-input" value="${esc(formatDate(emiStartDate))}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-emi-grace">Grace Period (days)</label>
                        <input type="number" id="sale-emi-grace" class="form-input" min="0" value="${esc(emiGrace)}">
                    </div>
                    <div>
                        <label class="form-label" for="sale-emi-interest">Interest Rate (% per month)</label>
                        <input type="number" id="sale-emi-interest" class="form-input" min="0" step="0.1" value="${esc(emiInterest)}">
                        <p class="text-xs text-gray-400 mt-1">Applied on overdue EMIs after the grace period.</p>
                    </div>
                </div>
            </div>
            `;
        };
        
        const getBrandNewFormHTML = (delivery = {}) => {
            const referrers = (delivery.commissionToGive || []).map(ref => `
                <div class="brand-referrer-item flex items-center justify-between bg-blue-50 rounded-lg p-3" 
                    data-ref-id="${esc(ref.id || crypto.randomUUID())}"
                    data-ref-name="${esc(ref.referrerName || ref.referrer_name || '')}"
                    data-ref-contact="${esc(ref.referrerContact || ref.referrer_contact || '')}"
                    data-ref-amount="${esc(ref.commissionAmount ?? ref.commission_amount ?? 0)}"
                    data-status="${esc(ref.paymentStatus || ref.payment_status || 'pending')}">
                    <div>
                        <p class="font-semibold text-gray-800">${esc(ref.referrerName || ref.referrer_name || 'Referrer')}</p>
                        ${(ref.referrerContact || ref.referrer_contact) ? `<p class="text-xs text-gray-500">${esc(ref.referrerContact || ref.referrer_contact)}</p>` : ''}
                        <p class="text-sm font-medium text-gray-700 mt-1">${esc(formatCurrency(ref.commissionAmount || ref.commission_amount || 0))}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <select class="brand-referrer-status form-input !py-1 !px-2 !w-auto">
                            <option value="pending" ${(ref.paymentStatus || ref.payment_status) !== 'paid' ? 'selected' : ''}>Pending</option>
                            <option value="paid" ${(ref.paymentStatus || ref.payment_status) === 'paid' ? 'selected' : ''}>Paid</option>
                        </select>
                        <button type="button" class="brand-referrer-remove text-xs text-red-500 font-semibold">Remove</button>
                    </div>
                </div>
            `).join('');

            return `
            <input type="hidden" id="brand-delivery-id" value="${esc(delivery.id || '')}">
            <div class="bg-white rounded-xl p-4 space-y-3">
                <h3 class="font-semibold text-gray-800">Delivery Details</h3>
                <div>
                    <label class="form-label" for="brand-bike-model">Bike Model *</label>
                    <input type="text" id="brand-bike-model" class="form-input" placeholder="e.g., Pulsar 150" value="${esc(delivery.bikeModel || '')}">
                </div>
                <div>
                    <label class="form-label" for="brand-delivery-date">Delivery Date *</label>
                    <input type="date" id="brand-delivery-date" class="form-input" value="${esc(formatDate(delivery.deliveryDate) || formatDate(new Date()))}">
                </div>
                <div>
                    <label class="form-label" for="brand-commission-received">Commission Received *</label>
                    <input type="number" id="brand-commission-received" class="form-input" placeholder="5000" value="${esc(delivery.commissionReceived ?? '')}">
                </div>
                <div>
                    <label class="form-label" for="brand-invoice-number">Invoice Number</label>
                    <input type="text" id="brand-invoice-number" class="form-input" placeholder="Optional invoice reference" value="${esc(delivery.invoiceNumber || '')}">
                </div>
                <div>
                    <label class="form-label" for="brand-notes">Notes</label>
                    <textarea id="brand-notes" class="form-input" rows="3" placeholder="Additional notes...">${esc(delivery.notes || '')}</textarea>
                </div>
            </div>

            <div class="bg-white rounded-xl p-4 space-y-3">
                <h3 class="font-semibold text-gray-800">Customer & Showroom</h3>
                <div>
                    <label class="form-label" for="brand-customer-name">Customer Name *</label>
                    <input type="text" id="brand-customer-name" class="form-input" placeholder="Customer name" value="${esc(delivery.customerName || '')}">
                </div>
                <div>
                    <label class="form-label" for="brand-customer-contact">Customer Contact</label>
                    <input type="tel" id="brand-customer-contact" class="form-input" placeholder="9876543210" value="${esc(delivery.customerContact || '')}">
                </div>
                <div>
                    <label class="form-label" for="brand-showroom-name">Showroom Name *</label>
                    <input type="text" id="brand-showroom-name" class="form-input" placeholder="Showroom or partner" value="${esc(delivery.showroomName || '')}">
                </div>
            </div>

            <div class="bg-white rounded-xl p-4 space-y-3">
                <div class="flex items-center justify-between">
                    <h3 class="font-semibold text-gray-800">Referrer Commissions</h3>
                    <button type="button" id="brand-add-referrer" class="text-blue-500 text-sm font-semibold">Add Referrer</button>
                </div>
                <div id="brand-referrer-list" class="space-y-3">
                    ${referrers || '<p class="text-sm text-gray-500">No referrers added yet.</p>'}
                </div>
                <div class="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div>
                        <label class="form-label" for="brand-ref-name">Referrer Name</label>
                        <input type="text" id="brand-ref-name" class="form-input" placeholder="Agent or partner name">
                    </div>
                    <div>
                        <label class="form-label" for="brand-ref-contact">Referrer Contact</label>
                        <input type="tel" id="brand-ref-contact" class="form-input" placeholder="Contact (optional)">
                    </div>
                    <div>
                        <label class="form-label" for="brand-ref-amount">Commission Amount</label>
                        <input type="number" id="brand-ref-amount" class="form-input" placeholder="Commission amount">
                    </div>
                </div>
            </div>
            `;
        };
        
        const getLogPaymentFormHTML = (bike = {}) => {
            const bikeName = bike.bikeName || bike.bikeNumberPlate;
            const dueMeta = getDueMetadata(bike);
            const statusClassMap = {
                clear: 'bg-green-100 text-green-700',
                upcoming: 'bg-blue-100 text-blue-700',
                dueToday: 'bg-amber-100 text-amber-700',
                grace: 'bg-amber-100 text-amber-700',
                overdue: 'bg-red-100 text-red-700'
            };
            const statusClass = statusClassMap[dueMeta.status] || 'bg-gray-100 text-gray-600';

            let expectedPrincipal = 0;
            let paymentType = '';
            let planDetails = '';
            let emiFinalCheckbox = '';

            if (bike.paymentMode === 'credit' && bike.creditInfo) {
                expectedPrincipal = Math.max(0, Math.round(bike.creditInfo.remaining || 0));
                paymentType = 'Credit Payment';
                planDetails = `
                    <p class="text-sm text-gray-600">
                        Remaining Due: <span class="font-medium">${esc(formatCurrency(bike.creditInfo.remaining || 0))}</span>
                    </p>
                `;
            } else if (bike.paymentMode === 'emi' && bike.emiInfo) {
                expectedPrincipal = Math.max(0, Math.round(bike.emiInfo.monthlyAmount || 0));
                paymentType = 'EMI Payment';
                const emiLeft = dueMeta.installmentsLeft;
                const totalRemaining = emiLeft * (bike.emiInfo.monthlyAmount || 0);
                planDetails = `
                    <p class="text-sm text-gray-600">
                        EMIs Left: <span class="font-medium">${esc(bike.emiInfo.installmentsPaid || 0)}/${esc(bike.emiInfo.totalInstallments || 0)}</span> • 
                        Monthly: <span class="font-medium">${esc(formatCurrency(bike.emiInfo.monthlyAmount || 0))}</span>
                    </p>
                    <p class="text-xs text-gray-500">Estimated remaining: ${esc(formatCurrency(totalRemaining))}</p>
                `;
                emiFinalCheckbox = `
                    <div class="flex items-center mt-3">
                        <input type="checkbox" id="payment-emi-final" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                        <label for="payment-emi-final" class="ml-2 block text-sm text-gray-700">Log as Final Settlement?</label>
                    </div>
                `;
            }

            const dueInfo = dueMeta.pendingPrincipal > EPSILON
                ? `
                    <div class="flex items-center justify-between text-xs mt-2">
                        <span class="text-gray-500">Due ${dueMeta.dueDate ? esc(formatDate(dueMeta.dueDate)) : 'Not scheduled'}</span>
                        <span class="px-2 py-0.5 rounded-full font-medium ${statusClass}">${esc(dueMeta.statusLabel)}</span>
                    </div>
                    <p class="text-xs text-gray-500 mt-1">Grace: ${esc(dueMeta.graceDays)} day${dueMeta.graceDays === 1 ? '' : 's'} • Interest: ${esc(dueMeta.interestRate || 0)}% / month</p>
                `
                : '<p class="text-xs text-green-600 mt-2">All dues cleared.</p>';

            const suggestedInterest = dueMeta.suggestedInterest || 0;
            const interestFieldValue = suggestedInterest > 0 ? suggestedInterest : '';
            const interestDisplay = suggestedInterest > 0
                ? `Suggested: ${esc(formatCurrency(suggestedInterest))}`
                : 'No additional interest suggested';

            return `
                <input type="hidden" id="payment-bike-id" value="${esc(bike.id || '')}">
                <div class="bg-white rounded-xl p-4 space-y-2">
                    <p class="text-lg font-semibold">${esc(bikeName)}</p>
                    <p class="text-gray-600">Customer: ${esc(bike.customerName || 'N/A')}</p>
                    ${planDetails}
                    ${dueInfo}
                </div>
                <div class="bg-white rounded-xl p-4 space-y-3">
                    <h3 class="font-semibold">Log New Payment</h3>
                    <div>
                        <label class="form-label" for="payment-amount">Principal Amount *</label>
                        <input type="number" id="payment-amount" class="form-input" value="${esc(expectedPrincipal || '')}" ${paymentType === 'EMI Payment' ? 'readonly' : ''}>
                    </div>
                    <div>
                        <label class="form-label" for="payment-interest">Interest Amount</label>
                        <input type="number" id="payment-interest" class="form-input" min="0" value="${esc(interestFieldValue)}">
                        <p class="text-xs text-gray-400 mt-1">${interestDisplay}</p>
                    </div>
                    ${emiFinalCheckbox}
                    <div>
                        <label class="form-label" for="payment-date">Payment Date *</label>
                        <input type="date" id="payment-date" class="form-input" value="${esc(formatDate(new Date()))}">
                    </div>
                    <div>
                        <label class="form-label" for="payment-type">Payment Type</label>
                        <input type="text" id="payment-type" class="form-input bg-gray-200" readonly value="${esc(paymentType)}">
                    </div>
                    <div class="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                        <span class="text-sm text-gray-600">Total (principal + interest)</span>
                        <span id="payment-total-display" class="text-base font-semibold text-gray-900">${esc(formatCurrency((expectedPrincipal || 0) + (suggestedInterest || 0)))}</span>
                    </div>
                </div>
            `;
        };
        
        const getBulkPaymentFormHTML = (records = []) => {
            if (!Array.isArray(records) || records.length === 0) {
                return `
                    <div class="bg-white rounded-xl p-4 text-sm text-gray-500">
                        No customers selected for bulk payment.
                    </div>
                `;
            }

            const today = formatDate(new Date());
            let totalDefault = 0;

            const rows = records.map((record, index) => {
                const suggestedPrincipal = Math.max(0, getBulkSuggestedAmount(record));
                const suggestedInterest = record.overdueInterest > 0 ? record.overdueInterest : 0;
                totalDefault += suggestedPrincipal + suggestedInterest;
                const rowId = `${record.bikeId || index}`;
                const statusBadge = record.dueMeta?.statusLabel || 'Status';
                const statusClass = record.dueMeta?.status
                    ? (record.dueMeta.status === 'overdue'
                        ? 'bg-red-100 text-red-700'
                        : record.dueMeta.status === 'grace'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700')
                    : 'bg-gray-100 text-gray-600';

                return `
                    <div class="border border-gray-200 rounded-lg p-3 space-y-3" data-bulk-id="${record.bikeId}">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="font-semibold text-gray-900">${record.customerName}</p>
                                <p class="text-xs text-gray-500">${record.bikeName}</p>
                            </div>
                            <span class="text-xs font-medium px-2 py-0.5 rounded-full ${statusClass}">
                                ${statusBadge}
                            </span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-500">
                            <div>Pending: <span class="font-semibold text-gray-700">${formatCurrency(record.pendingAmount)}</span></div>
                            <div>Mode: <span class="font-semibold text-gray-700">${record.paymentMode === 'emi' ? 'EMI' : 'Credit'}</span></div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label class="form-label" for="bulk-principal-${rowId}">Principal</label>
                                <input type="number" min="0" id="bulk-principal-${rowId}" class="form-input bulk-principal" data-bulk-id="${record.bikeId}" value="${suggestedPrincipal}">
                            </div>
                            <div>
                                <label class="form-label" for="bulk-interest-${rowId}">Interest</label>
                                <input type="number" min="0" id="bulk-interest-${rowId}" class="form-input bulk-interest" data-bulk-id="${record.bikeId}" value="${suggestedInterest || ''}">
                            </div>
                        </div>
                        ${record.paymentMode === 'emi' ? `
                            <label class="flex items-center gap-2 text-xs text-gray-600 select-none">
                                <input type="checkbox" class="bulk-final h-4 w-4 text-blue-600 border-gray-300 rounded" data-bulk-id="${record.bikeId}">
                                Mark as final settlement
                            </label>
                        ` : ''}
                    </div>
                `;
            }).join('');

            return `
                <div class="bg-white rounded-xl p-4 space-y-4">
                    <div>
                        <label class="form-label" for="bulk-payment-date">Payment Date *</label>
                        <input type="date" id="bulk-payment-date" class="form-input" value="${today}">
                    </div>
                    <div id="bulk-payment-list" class="space-y-3">
                        ${rows}
                    </div>
                    <div class="bg-gray-100 rounded-lg p-3 flex justify-between items-center text-sm">
                        <span id="bulk-summary-count">${records.length} customer${records.length === 1 ? '' : 's'}</span>
                        <span id="bulk-summary-total" class="font-semibold text-gray-900">${formatCurrency(totalDefault)}</span>
                    </div>
                    <p class="text-xs text-gray-500">
                        Adjust principal or interest amounts if needed. Interest entries are logged separately and do not reduce principal.
                    </p>
                </div>
            `;
        };

        const addBulkPaymentListeners = (records = []) => {
            const listContainer = $('#bulk-payment-list');
            const summaryCount = $('#bulk-summary-count');
            const summaryTotal = $('#bulk-summary-total');

            if (!listContainer) return;

            const updateSummary = () => {
                let totalPrincipal = 0;
                let totalInterest = 0;
                records.forEach(record => {
                    const principalInput = listContainer.querySelector(`.bulk-principal[data-bulk-id="${record.bikeId}"]`);
                    const interestInput = listContainer.querySelector(`.bulk-interest[data-bulk-id="${record.bikeId}"]`);
                    const principal = parseFloat(principalInput?.value || '0') || 0;
                    const interest = parseFloat(interestInput?.value || '0') || 0;
                    totalPrincipal += Math.max(0, principal);
                    totalInterest += Math.max(0, interest);
                });
                if (summaryCount) {
                    summaryCount.textContent = `${records.length} customer${records.length === 1 ? '' : 's'}`;
                }
                if (summaryTotal) {
                    summaryTotal.textContent = formatCurrency(totalPrincipal + totalInterest);
                }
            };

            listContainer.addEventListener('input', (event) => {
                const target = event.target;
                if (!target) return;
                if (target.classList.contains('bulk-principal') || target.classList.contains('bulk-interest')) {
                    if (parseFloat(target.value) < 0) {
                        target.value = '0';
                    }
                    updateSummary();
                }
            });

            listContainer.addEventListener('change', (event) => {
                const checkbox = event.target;
                if (!checkbox || !checkbox.classList.contains('bulk-final')) return;
                const bikeId = checkbox.dataset.bulkId;
                const record = records.find(item => item.bikeId === bikeId);
                if (!record) return;
                const principalInput = listContainer.querySelector(`.bulk-principal[data-bulk-id="${bikeId}"]`);
                if (!principalInput) return;
                if (checkbox.checked) {
                    principalInput.value = record.pendingAmount;
                } else {
                    principalInput.value = getBulkSuggestedAmount(record);
                }
                updateSummary();
            });

            updateSummary();
        };
        
        const getExpenseFormHTML = (expense = {}) => {
            return `
            <input type="hidden" id="expense-id" value="${expense.id || ''}">
            <div class="bg-white rounded-xl p-4 space-y-3">
                <div>
                    <label class="form-label" for="expense-desc">Description *</label>
                    <input type="text" id="expense-desc" class="form-input" placeholder="Office rent" value="${expense.description || ''}">
                </div>
                <div>
                    <label class="form-label" for="expense-amount">Amount *</label>
                    <input type="number" id="expense-amount" class="form-input" placeholder="5000" value="${expense.amount || ''}">
                </div>
                <div>
                    <label class="form-label" for="expense-date">Date *</label>
                    <input type="date" id="expense-date" class="form-input" value="${formatDate(expense.date)}">
                </div>
            </div>
            `;
        };
        
        const getPRFormHTML = (pr = {}) => {
            return `
            <input type="hidden" id="pr-id" value="${pr.id || ''}">
            <div class="bg-white rounded-xl p-4 space-y-3">
                <div>
                    <label class="form-label" for="pr-name">Name *</label>
                    <input type="text" id="pr-name" class="form-input" placeholder="Contact Name" value="${pr.name || ''}">
                </div>
                <div>
                    <label class="form-label" for="pr-contact">Contact *</label>
                    <input type="tel" id="pr-contact" class="form-input" placeholder="9876543210" value="${pr.contact || ''}">
                </div>
                <div>
                    <label class="form-label" for="pr-type">Relation Type *</label>
                    <select id="pr-type" class="form-input">
                        <option value="Buyer" ${pr.relationType === 'Buyer' ? 'selected' : ''}>Buyer</option>
                        <option value="Supplier" ${pr.relationType === 'Supplier' ? 'selected' : ''}>Supplier</option>
                    </select>
                </div>
                <div>
                    <label class="form-label" for="pr-bike-name">Related Bike</label>
                    <input type="text" id="pr-bike-name" class="form-input" placeholder="e.g., Pulsar 150" value="${pr.relatedBikeName || ''}">
                </div>
            </div>
            `;
        };
        
        const addSalesFormListeners = (bike = {}) => {
            const paymentMode = $('#sale-payment-mode');
            const totalPrice = $('#sale-total-price');
            
            const cashFields = $('#sale-cash-fields');
            const cashReceived = $('#sale-cash-received');
            
            const creditFields = $('#sale-credit-fields');
            const creditInitial = $('#sale-credit-initial');
            const creditRemaining = $('#sale-credit-remaining');
            
            const emiFields = $('#sale-emi-fields');

            const toggleFields = () => {
                const mode = paymentMode.value;
                cashFields.classList.toggle('hidden', mode !== 'cash');
                creditFields.classList.toggle('hidden', mode !== 'credit');
                emiFields.classList.toggle('hidden', mode !== 'emi');
                updateCalculations();
            };
            
            const updateCalculations = () => {
                const total = parseFloat(totalPrice.value) || 0;
                cashReceived.value = total;
                const initial = parseFloat(creditInitial.value) || 0;
                creditRemaining.value = total - initial;
            };

            paymentMode.addEventListener('change', toggleFields);
            totalPrice.addEventListener('input', updateCalculations);
            creditInitial.addEventListener('input', updateCalculations);

            const deleteBtn = $('#delete-bike-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => handleDeleteBike(bike.id));
            }
            
            toggleFields();
        };

        const addLogPaymentListeners = (bike = {}) => {
            const amountInput = $('#payment-amount');
            const interestInput = $('#payment-interest');
            const totalDisplay = $('#payment-total-display');

            const updateTotal = () => {
                if (!totalDisplay) return;
                const principal = parseFloat(amountInput?.value || '0') || 0;
                const interest = parseFloat(interestInput?.value || '0') || 0;
                totalDisplay.textContent = formatCurrency(principal + interest);
            };

            amountInput?.addEventListener('input', updateTotal);
            interestInput?.addEventListener('input', updateTotal);
            updateTotal();

            if (bike.paymentMode === 'emi' && bike.emiInfo) {
                const finalCheckbox = $('#payment-emi-final');
                if (!finalCheckbox || !amountInput) return;

                finalCheckbox.addEventListener('change', () => {
                    if (finalCheckbox.checked) {
                        const emiLeft = (bike.emiInfo.totalInstallments || 0) - (bike.emiInfo.installmentsPaid || 0);
                        const totalRemaining = emiLeft * (bike.emiInfo.monthlyAmount || 0);
                        amountInput.value = totalRemaining;
                        amountInput.readOnly = false;
                    } else {
                        amountInput.value = bike.emiInfo.monthlyAmount || 0;
                        amountInput.readOnly = true;
                    }
                    updateTotal();
                });
            }
        };
        
        const addBrandNewFormListeners = () => {
            const addButton = $('#brand-add-referrer');
            const listContainer = $('#brand-referrer-list');
            const nameInput = $('#brand-ref-name');
            const contactInput = $('#brand-ref-contact');
            const amountInput = $('#brand-ref-amount');

            if (!addButton || !listContainer) return;

            const ensurePlaceholder = () => {
                if (!listContainer.querySelector('.brand-referrer-item')) {
                    listContainer.innerHTML = '<p class="text-sm text-gray-500">No referrers added yet.</p>';
                }
            };

            const createReferrerItem = ({ id, name, contact, amount, status }) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'brand-referrer-item flex items-center justify-between bg-blue-50 rounded-lg p-3';
                wrapper.dataset.refId = id || crypto.randomUUID();
                wrapper.dataset.refName = name;
                wrapper.dataset.refContact = contact;
                wrapper.dataset.refAmount = amount;
                wrapper.dataset.status = status || 'pending';
                wrapper.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${name}</p>
                        ${contact ? `<p class="text-xs text-gray-500">${contact}</p>` : ''}
                        <p class="text-sm font-medium text-gray-700 mt-1">${formatCurrency(parseFloat(amount) || 0)}</p>
                    </div>
                    <div class="flex flex-col items-end gap-2">
                        <select class="brand-referrer-status form-input !py-1 !px-2 !w-auto">
                            <option value="pending" ${status !== 'paid' ? 'selected' : ''}>Pending</option>
                            <option value="paid" ${status === 'paid' ? 'selected' : ''}>Paid</option>
                        </select>
                        <button type="button" class="brand-referrer-remove text-xs text-red-500 font-semibold">Remove</button>
                    </div>
                `;
                return wrapper;
            };

            addButton.addEventListener('click', () => {
                const name = (nameInput?.value || '').trim();
                const contact = (contactInput?.value || '').trim();
                const amountValue = parseFloat(amountInput?.value || '0');

                if (!name) {
                    showToast('Referrer name is required.', true);
                    return;
                }
                if (isNaN(amountValue) || amountValue <= 0) {
                    showToast('Commission amount must be greater than 0.', true);
                    return;
                }

                if (!listContainer.querySelector('.brand-referrer-item')) {
                    listContainer.innerHTML = '';
                }

                const item = createReferrerItem({
                    id: crypto.randomUUID(),
                    name,
                    contact,
                    amount: amountValue,
                    status: 'pending'
                });
                listContainer.appendChild(item);

                nameInput.value = '';
                contactInput.value = '';
                amountInput.value = '';
            });

            listContainer.addEventListener('click', (event) => {
                const target = event.target;
                if (target && target.classList.contains('brand-referrer-remove')) {
                    const item = target.closest('.brand-referrer-item');
                    item?.remove();
                    ensurePlaceholder();
                }
            });

            listContainer.addEventListener('change', (event) => {
                const select = event.target;
                if (select && select.classList.contains('brand-referrer-status')) {
                    const item = select.closest('.brand-referrer-item');
                    if (item) {
                        item.dataset.status = select.value;
                    }
                }
            });

            ensurePlaceholder();
        };
        
        const handleDeleteBike = async (bikeId) => {
            const confirmed = await showConfirm(
                'Delete this bike?',
                'This will permanently delete this bike and all its associated sales and payment logs. This action cannot be undone.'
            );
            
            if (confirmed) {
                try {
                    state.data.bikes = state.data.bikes.filter(b => b.id !== bikeId);
                    state.data.payments = state.data.payments.filter(p => p.bikeId !== bikeId);
                    
                    showToast('Bike deleted successfully.');
                    closeModal();
                    render();
                    saveData();
                } catch (error) {
                    showToast(`Error: ${error.message}`, true);
                }
            }
        };

        const handleDeleteBrandNew = async (deliveryId) => {
            const confirmed = await showConfirm(
                'Delete this delivery?',
                'This will permanently delete this brand new delivery record. This action cannot be undone.'
            );
            if (!confirmed) return;

            try {
                state.data.brandNewDeliveries = (state.data.brandNewDeliveries || []).filter(delivery => delivery.id !== deliveryId);
                showToast('Brand new delivery deleted.');
                closeModal();
                render();
                saveData();
            } catch (error) {
                showToast(`Error: ${error.message}`, true);
            }
        };

        const toggleBrandNewCommissionStatus = (deliveryId, refId) => {
            const delivery = (state.data.brandNewDeliveries || []).find(entry => entry.id === deliveryId);
            if (!delivery) {
                showToast('Delivery not found.', true);
                return;
            }
            const ref = (delivery.commissionToGive || []).find(entry => entry.id === refId);
            if (!ref) {
                showToast('Referrer not found.', true);
                return;
            }
            ref.paymentStatus = ref.paymentStatus === 'paid' ? 'pending' : 'paid';
            showToast(`Referrer marked as ${ref.paymentStatus}.`);
            render();
            saveData();
        };

        const summarizeCreditRecords = () => {
            const creditBikes = (state.data.bikes || []).filter(bike => bike.sold && (bike.paymentMode === 'credit' || bike.paymentMode === 'emi'));
            if (!creditBikes.length) {
                return {
                    records: [],
                    totals: {
                        totalCredit: 0,
                        collected: 0,
                        pending: 0,
                        activeCustomers: 0
                    }
                };
            }

            const creditIds = new Set(creditBikes.map(b => b.id));
            const paymentsByBike = new Map();
            let collected = 0;

            (state.data.payments || []).forEach(payment => {
                if (!creditIds.has(payment.bikeId)) return;
                const list = paymentsByBike.get(payment.bikeId) || [];
                list.push(payment);
                paymentsByBike.set(payment.bikeId, list);
                collected += payment.amount || 0;
            });

            const totalCredit = creditBikes.reduce((sum, bike) => sum + (bike.sellingPrice || 0), 0);

            const records = creditBikes.map(bike => {
                const payments = (paymentsByBike.get(bike.id) || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));
                const totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
                const dueMeta = getDueMetadata(bike);
                const totalPrincipal = bike.sellingPrice || 0;
                const progressPercent = totalPrincipal > EPSILON
                    ? Math.min(100, Math.round((totalPaid / totalPrincipal) * 100))
                    : 0;

                let nextDueText = 'Paid in full';
                let initialPayment = 0;
                let monthlyAmount = 0;
                let installmentsPaid = 0;
                let totalInstallments = 0;
                let overdueInterest = dueMeta.status === 'overdue' ? dueMeta.suggestedInterest : 0;

                if (bike.paymentMode === 'credit' && bike.creditInfo) {
                    initialPayment = bike.creditInfo.initialPayment || 0;
                    nextDueText = dueMeta.pendingPrincipal > EPSILON
                        ? (dueMeta.dueDate ? `Due ${formatDate(dueMeta.dueDate)} • ${dueMeta.statusLabel}` : dueMeta.statusLabel)
                        : 'All dues cleared';
                } else if (bike.paymentMode === 'emi' && bike.emiInfo) {
                    monthlyAmount = bike.emiInfo.monthlyAmount || 0;
                    installmentsPaid = bike.emiInfo.installmentsPaid || 0;
                    totalInstallments = bike.emiInfo.totalInstallments || 0;
                    initialPayment = bike.emiInfo.downPayment || 0;
                    nextDueText = dueMeta.pendingPrincipal > EPSILON
                        ? (dueMeta.dueDate ? `Next EMI ${formatDate(dueMeta.dueDate)} • ${dueMeta.statusLabel}` : `EMI pending • ${dueMeta.statusLabel}`)
                        : 'All EMIs completed';
                }

                return {
                    bikeId: bike.id,
                    customerName: bike.customerName || 'Customer',
                    contact: bike.customerContact || 'N/A',
                    phoneHref: sanitizePhone(bike.customerContact || ''),
                    bikeName: bike.bikeName || bike.bikeNumberPlate,
                    bikeNumberPlate: bike.bikeNumberPlate,
                    salePrice: totalPrincipal,
                    paymentMode: bike.paymentMode,
                    pendingAmount: dueMeta.pendingPrincipal,
                    nextDueText,
                    dueDate: dueMeta.dueDate,
                    initialPayment,
                    monthlyAmount,
                    installmentsPaid,
                    totalInstallments,
                    payments,
                    totalPaid,
                    progressPercent,
                    dueMeta,
                    overdueInterest
                };
            });

            const totals = {
                totalCredit,
                collected,
                pending: records.reduce((sum, record) => sum + record.pendingAmount, 0),
                activeCustomers: records.filter(record => record.pendingAmount > EPSILON).length
            };

            return { records, totals };
        };

        const applyPaymentForBike = ({ bike, principalAmount, interestAmount, isoDate, isEMIFinal = false, paymentTypeHint = 'Payment' }) => {
            if (!bike) throw new Error('Bike not found.');
            if (!isoDate) throw new Error('Payment date is required.');
            if (principalAmount < 0 || interestAmount < 0) throw new Error('Amounts cannot be negative.');
            if (principalAmount <= 0 && interestAmount <= 0) throw new Error('Enter the principal or interest amount to continue.');

            let paymentType = paymentTypeHint || 'Payment';
            const payments = [];

            if (bike.paymentMode === 'credit' && bike.creditInfo) {
                if (principalAmount > 0) {
                    if (principalAmount > bike.creditInfo.remaining + EPSILON) {
                        throw new Error('Payment cannot be greater than remaining balance.');
                    }
                    if (principalAmount >= bike.creditInfo.remaining - EPSILON) {
                        paymentType = 'Final Credit Payment';
                        bike.creditInfo.remaining = 0;
                    } else {
                        bike.creditInfo.remaining -= principalAmount;
                    }
                }
            } else if (bike.paymentMode === 'emi' && bike.emiInfo) {
                if (isEMIFinal) {
                    if (principalAmount <= 0) {
                        throw new Error('Principal amount is required for final settlement.');
                    }
                    const emiLeft = (bike.emiInfo.totalInstallments || 0) - (bike.emiInfo.installmentsPaid || 0);
                    const totalRemaining = emiLeft * (bike.emiInfo.monthlyAmount || 0);
                    if (principalAmount > totalRemaining + EPSILON) {
                        throw new Error('Settlement cannot be greater than total remaining balance.');
                    }
                    paymentType = 'Final EMI Installment';
                    bike.emiInfo.installmentsPaid = bike.emiInfo.totalInstallments;
                    bike.emiInfo.nextDueDate = null;
                } else if (principalAmount > 0) {
                    if (principalAmount > (bike.emiInfo.monthlyAmount || 0) + EPSILON) {
                        throw new Error('Payment cannot be greater than monthly EMI amount.');
                    }
                    bike.emiInfo.installmentsPaid = (bike.emiInfo.installmentsPaid || 0) + 1;
                    if (bike.emiInfo.installmentsPaid >= bike.emiInfo.totalInstallments) {
                        paymentType = 'Final EMI Installment';
                        bike.emiInfo.nextDueDate = null;
                    } else {
                        const nextDueSource = bike.emiInfo.nextDueDate || bike.emiInfo.startDate || isoDate;
                        bike.emiInfo.nextDueDate = getNextMonthDate(nextDueSource);
                    }
                }
            }

            if (principalAmount > 0) {
                payments.push({
                    id: crypto.randomUUID(),
                    bikeId: bike.id,
                    bikeName: bike.bikeName || bike.bikeNumberPlate,
                    amount: principalAmount,
                    date: isoDate,
                    type: paymentType
                });
            }

            if (interestAmount > 0) {
                payments.push({
                    id: crypto.randomUUID(),
                    bikeId: bike.id,
                    bikeName: bike.bikeName || bike.bikeNumberPlate,
                    amount: interestAmount,
                    date: isoDate,
                    type: 'Interest Charge'
                });
            }

            return payments;
        };

        const buildWhatsappReminderMessage = (record) => {
            if (!record) return '';
            const dueMeta = record.dueMeta || {};
            const pendingAmount = typeof record.pendingAmount === 'number' ? record.pendingAmount : 0;
            const dueDateText = dueMeta.dueDate ? formatDate(dueMeta.dueDate) : null;
            const status = dueMeta.status || 'clear';
            const graceDays = dueMeta.graceDays ?? DEFAULT_GRACE_PERIOD_DAYS;
            const daysOverdue = dueMeta.daysOverdue ?? 0;
            const lines = [];

            const namePart = (record.customerName || 'there').split(' ')[0];
            lines.push(`Hi ${namePart},`);
            lines.push(`Gentle reminder about your ${record.bikeName || 'bike'} payment.`);

            if (pendingAmount > EPSILON) {
                lines.push(`Pending amount: ${formatCurrency(pendingAmount)}.`);
            }

            if (dueDateText) {
                lines.push(`Due date: ${dueDateText}.`);
            }

            if (status === 'grace') {
                const graceLeft = Math.max(0, graceDays - daysOverdue);
                lines.push(`You are within the grace period (${graceLeft} day${graceLeft === 1 ? '' : 's'} left).`);
            } else if (status === 'overdue') {
                lines.push(`Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}. Kindly clear it to avoid additional interest.`);
            }

            if (record.overdueInterest > 0) {
                lines.push(`Current interest due: ${formatCurrency(record.overdueInterest)}.`);
            }

            lines.push('Please let me know once the payment is completed. Thank you!');
            return lines.join('\n');
        };

        const getBulkSuggestedAmount = (record) => {
            if (!record) return 0;
            if (record.paymentMode === 'emi') {
                const installmentsLeft = record.dueMeta?.installmentsLeft ?? 0;
                if (installmentsLeft <= 0) {
                    return record.pendingAmount;
                }
                const monthly = record.monthlyAmount || 0;
                if (monthly <= 0) {
                    return record.pendingAmount;
                }
                return Math.min(monthly, record.pendingAmount);
            }
            return record.pendingAmount;
        };

        const updateCreditBulkFooter = (records = []) => {
            if (!creditBulkFooter) return;
            const bulkMode = !!state.ui.creditBulkMode;
            const selectedIds = new Set(state.ui.creditBulkSelection || []);
            if (!bulkMode || selectedIds.size === 0) {
                creditBulkFooter.classList.add('hidden');
                creditBulkCount.textContent = '0 customers selected';
                creditBulkTotal.textContent = formatCurrency(0);
                return;
            }

            const drafts = state.ui.creditBulkDrafts || {};
            const selectedRecords = records.filter(record => selectedIds.has(record.bikeId));
            let total = 0;

            selectedRecords.forEach(record => {
                const draft = drafts[record.bikeId];
                const amount = typeof draft?.principal === 'number'
                    ? draft.principal
                    : getBulkSuggestedAmount(record);
                total += amount;
            });

            creditBulkFooter.classList.remove('hidden');
            creditBulkCount.textContent = `${selectedRecords.length} customer${selectedRecords.length === 1 ? '' : 's'} selected`;
            creditBulkTotal.textContent = formatCurrency(total);
        };

        const renderCreditPage = () => {
            const { records, totals } = summarizeCreditRecords();
            const bulkMode = !!state.ui.creditBulkMode;
            const selectedIds = new Set(state.ui.creditBulkSelection || []);
            const statusClassMap = {
                clear: 'bg-green-100 text-green-700',
                upcoming: 'bg-blue-100 text-blue-700',
                dueToday: 'bg-amber-100 text-amber-700',
                grace: 'bg-amber-100 text-amber-700',
                overdue: 'bg-red-100 text-red-700'
            };

            creditTotal.textContent = formatCurrency(totals.totalCredit);
            creditCollected.textContent = formatCurrency(totals.collected);
            creditPending.textContent = formatCurrency(totals.pending);
            creditActive.textContent = totals.activeCustomers.toString();

            if (creditBulkToggle) {
                creditBulkToggle.textContent = bulkMode ? 'Exit Bulk Collection' : 'Start Bulk Collection';
                creditBulkToggle.classList.toggle('bg-blue-500', bulkMode);
                creditBulkToggle.classList.toggle('text-white', bulkMode);
                creditBulkToggle.classList.toggle('border', !bulkMode);
                creditBulkToggle.classList.toggle('border-blue-200', !bulkMode);
            }

            if (!records.length) {
                creditList.innerHTML = `<p class="text-gray-500 text-center mt-4">No credit or EMI sales yet.</p>`;
                updateCreditBulkFooter([]);
                return;
            }

            const creditCards = records.map(record => {
                const dueMeta = record.dueMeta || {};
                const pendingPrincipal = typeof dueMeta.pendingPrincipal === 'number' ? dueMeta.pendingPrincipal : record.pendingAmount;
                const graceDays = dueMeta.graceDays ?? DEFAULT_GRACE_PERIOD_DAYS;
                const statusKey = dueMeta.status || 'clear';
                const statusLabel = dueMeta.statusLabel || 'Status';
                const isSelected = bulkMode && selectedIds.has(record.bikeId);
                const cardClasses = [
                    'bg-white',
                    'rounded-xl',
                    'p-4',
                    'shadow-sm',
                    'space-y-3',
                    'transition',
                    'duration-150'
                ];
                if (bulkMode && isSelected) {
                    cardClasses.push('ring-2', 'ring-blue-400', 'ring-offset-1');
                }

                let scheduleInfo = '';
                if (record.paymentMode === 'credit') {
                    scheduleInfo = `
                        <p class="text-sm text-gray-500">
                            Initial Payment: <span class="font-medium text-gray-700">${esc(formatCurrency(record.initialPayment))}</span>
                        </p>
                    `;
                } else if (record.paymentMode === 'emi') {
                    scheduleInfo = `
                        <p class="text-sm text-gray-500">
                            EMI Progress: <span class="font-medium text-gray-700">${esc(record.installmentsPaid || 0)}/${esc(record.totalInstallments || 0)}</span> • 
                            Monthly: <span class="font-medium text-gray-700">${esc(formatCurrency(record.monthlyAmount))}</span>
                        </p>
                    `;
                }

                const recentPayments = record.payments.slice(0, 3).map(payment => `
                    <div class="flex justify-between text-xs text-gray-500">
                        <span>${esc(formatDate(payment.date))}</span>
                        <span class="font-medium text-gray-600">${esc(formatCurrency(payment.amount))}</span>
                        <span class="uppercase">${esc(payment.type || '')}</span>
                    </div>
                `).join('');

                const paymentHistory = recentPayments
                    ? `<div class="mt-3 border-t border-gray-100 pt-3 space-y-1">${recentPayments}</div>`
                    : '<p class="text-xs text-gray-400 mt-3">No payments logged yet.</p>';

                const callHref = record.phoneHref ? esc(`tel:${record.phoneHref}`) : '#';
                const whatsappHref = record.phoneHref ? esc(`https://wa.me/${record.phoneHref}?text=${encodeURIComponent(buildWhatsappReminderMessage(record))}`) : '#';
                const contactDisabledClass = record.phoneHref ? '' : 'opacity-60 pointer-events-none cursor-not-allowed';
                const pendingClass = pendingPrincipal > EPSILON ? 'text-amber-600' : 'text-green-600';
                const dueText = record.paymentMode === 'emi'
                    ? (pendingPrincipal > EPSILON
                        ? (dueMeta.dueDate ? `Next EMI ${esc(formatDate(dueMeta.dueDate))}` : 'EMI pending')
                        : 'All EMIs completed')
                    : (pendingPrincipal > EPSILON
                        ? (dueMeta.dueDate ? `Due ${esc(formatDate(dueMeta.dueDate))}` : 'Pending balance')
                        : 'All dues cleared');

                const chips = [
                    `<span class="px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-700 rounded-full">Grace ${esc(graceDays)}d</span>`
                ];
                if (dueMeta.interestRate) {
                    chips.push(`<span class="px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700 rounded-full">Interest ${esc(dueMeta.interestRate)}%/mo</span>`);
                }
                if (record.overdueInterest > 0) {
                    chips.push(`<span class="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">Interest due ${esc(formatCurrency(record.overdueInterest))}</span>`);
                }

                return `
                    <div class="${cardClasses.join(' ')}" data-bike-id="${safeBikeId}" data-payment-mode="${safePaymentMode}" data-pending="${esc(record.pendingAmount || 0)}" data-monthly="${esc(record.monthlyAmount || 0)}">
                        <div class="flex justify-between items-start">
                            <div>
                                <p class="text-lg font-semibold text-gray-900">${safeCustomerName}</p>
                                <p class="text-sm text-gray-500">${safeBikeName}</p>
                            </div>
                            <div class="flex items-center gap-2">
                                ${bulkMode ? `
                                    <label class="flex items-center gap-1 text-xs text-gray-500 select-none">
                                        <input type="checkbox" class="credit-bulk-checkbox h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" data-bulk-id="${safeBikeId}" ${isSelected ? 'checked' : ''}>
                                        Select
                                    </label>
                                ` : ''}
                                <span class="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                    ${esc(record.paymentMode === 'emi' ? 'EMI' : 'Credit')}
                                </span>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <p class="text-gray-500">Sale Price</p>
                                <p class="font-semibold text-gray-900">${safeSalePrice}</p>
                            </div>
                            <div>
                                <p class="text-gray-500">Pending</p>
                                <p class="font-semibold ${pendingClass}">${safePendingAmount}</p>
                            </div>
                        </div>

                        <div class="flex items-center justify-between text-sm mt-1">
                            <span class="text-blue-600 font-medium">${dueText}</span>
                            <span class="text-xs font-semibold px-2 py-0.5 rounded-full ${statusClassMap[statusKey] || 'bg-gray-100 text-gray-600'}">
                                ${safeStatusLabel}
                            </span>
                        </div>

                        <div class="flex flex-wrap gap-2 mt-2">
                            ${chips.join('')}
                        </div>

                        <div class="flex items-center justify-between text-xs text-gray-500 mt-2">
                            <span>Collected: ${safeTotalPaid}</span>
                            <span>Target: ${safeTarget}</span>
                        </div>
                        <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div class="h-full bg-blue-500" style="width: ${safeProgress}%;"></div>
                        </div>

                        ${scheduleInfo}

                        <div class="flex flex-wrap gap-2 pt-2">
                            <a href="${callHref}" class="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg font-medium ${contactDisabledClass}">Call</a>
                            <a href="${whatsappHref}" target="_blank" class="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg font-medium ${contactDisabledClass}">WhatsApp</a>
                            <button data-action="log-payment" class="px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition">
                                Record Payment
                            </button>
                        </div>

                        ${paymentHistory}
                    </div>
                `;
            }).join('');

            creditList.innerHTML = creditCards;
            updateCreditBulkFooter(records);
        };

        const renderAnalyticsPage = () => {
            const { cashInHand, totalProfit, totalCashInflow, totalCashOutflow } = state.metrics;
            const { bikes, expenses, cashEntries, payments } = state.data;

            setSensitiveCurrency(analyticsCash, cashInHand);
            setSensitiveCurrency(analyticsProfit, totalProfit);
            setSensitiveCurrency(analyticsRealized, state.metrics.realizedProfit);
            setSensitiveCurrency(analyticsMonth, state.metrics.thisMonthProfit);
            setSensitiveCurrency(analyticsInflow, totalCashInflow);
            setSensitiveCurrency(analyticsOutflow, totalCashOutflow);

            if (!state.security.isUnlocked) {
                analyticsLockedState.classList.remove('hidden');
                analyticsContent.classList.add('hidden');
            } else {
                analyticsLockedState.classList.add('hidden');
                analyticsContent.classList.remove('hidden');
            }

            let transactions = [];

            (cashEntries || []).forEach(entry => {
                transactions.push({
                    timestamp: entry.createdAt,
                    amount: entry.type === 'add' ? entry.amount : -entry.amount,
                    description: entry.description
                });
            });

            (bikes || []).forEach(bike => {
                const totalCost = (bike.purchasePrice || 0) + (bike.repairPrice || 0);
                if (totalCost > 0) {
                    transactions.push({
                        timestamp: bike.createdAt || bike.purchaseDate,
                        amount: -totalCost,
                        description: `Purchase: ${bike.bikeName || bike.bikeNumberPlate}`
                    });
                }
            });

            (payments || []).forEach(payment => {
                transactions.push({
                    timestamp: payment.date,
                    amount: payment.amount,
                    description: `${payment.type}: ${payment.bikeName || 'N/A'}`
                });
            });

            (state.data.brandNewDeliveries || []).forEach(delivery => {
                transactions.push({
                    timestamp: delivery.createdAt || delivery.deliveryDate,
                    amount: delivery.commissionReceived || 0,
                    description: `Brand New Commission: ${delivery.bikeModel || delivery.customerName || 'Delivery'}`
                });

                (delivery.commissionToGive || []).forEach(ref => {
                    if (ref.paymentStatus === 'paid' && ref.commissionAmount) {
                        transactions.push({
                            timestamp: delivery.createdAt || delivery.deliveryDate,
                            amount: -(ref.commissionAmount || 0),
                            description: `Referrer Payout: ${ref.referrerName || 'Agent'}`
                        });
                    }
                });
            });

            (expenses || []).filter(e => e.amount > 0).forEach(expense => {
                transactions.push({
                    timestamp: expense.createdAt || expense.date,
                    amount: -expense.amount,
                    description: `Expense: ${expense.description}`
                });
            });

            transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

            if (analyticsTransactionList) {
                if (!transactions.length) {
                    analyticsTransactionList.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">No transactions yet.</p>';
                } else {
                    analyticsTransactionList.innerHTML = transactions.map(t => `
                        <div class="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0">
                            <div>
                                <p class="font-medium text-sm">${esc(t.description || '')}</p>
                                <p class="text-xs text-gray-500">${esc(formatDateTime(t.timestamp))}</p>
                            </div>
                            <span class="font-semibold ${t.amount > 0 ? 'text-green-600' : 'text-red-600'}">
                                ${t.amount > 0 ? '+' : ''}${esc(formatCurrency(t.amount))}
                            </span>
                        </div>
                    `).join('');
                }
            }

            const expenseRecords = (expenses || [])
                .slice()
                .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

            if (!expenseRecords.length) {
                analyticsExpenseTotal.textContent = formatCurrency(0);
                analyticsExpenseList.innerHTML = '<p class="text-sm text-gray-500 text-center py-2">No expenses recorded.</p>';
            } else {
                const totalExpenses = expenseRecords.reduce((sum, expense) => sum + (expense.amount || 0), 0);
                analyticsExpenseTotal.textContent = formatCurrency(totalExpenses);

                analyticsExpenseList.innerHTML = expenseRecords.slice(0, 5).map(expense => `
                    <div class="flex justify-between text-sm">
                        <div>
                            <p class="font-medium text-gray-800">${esc(expense.description || '')}</p>
                            <p class="text-xs text-gray-500">${esc(formatDate(expense.date || expense.createdAt))}</p>
                        </div>
                        <span class="font-semibold text-red-600">- ${esc(formatCurrency(expense.amount || 0))}</span>
                    </div>
                `).join('');
            }
        };

        // --- PIN Handling ---

        const openPinModal = (message = 'Enter your PIN to continue.', options = {}) => {
            const { mode = 'unlock', showCancel = true } = options;
            state.security.pinMode = mode;
            pinModalMessage.textContent = message;
            pinError.textContent = '';
            pinInput.value = '';
            if (showCancel) {
                pinCancel.classList.remove('hidden');
            } else {
                pinCancel.classList.add('hidden');
            }
            pinModal.classList.remove('hidden');
            setTimeout(() => pinInput.focus(), 50);
        };

        const closePinModal = () => {
            pinModal.classList.add('hidden');
            pinInput.value = '';
            pinCancel.classList.remove('hidden');
            state.security.pinMode = 'unlock';
        };

        const resolvePinRequest = (value) => {
            if (state.security.pendingResolve) {
                state.security.pendingResolve.resolve(value);
                state.security.pendingResolve = null;
            }
        };

        const rejectPinRequest = (reason) => {
            if (state.security.pendingResolve) {
                state.security.pendingResolve.reject(reason);
                state.security.pendingResolve = null;
            }
        };

        const requestPinUnlock = (message = 'Enter your PIN to unlock sensitive data.') => {
            if (state.security.isUnlocked) {
                return Promise.resolve(true);
            }
            if (state.security.pendingResolve) {
                rejectPinRequest('replaced');
            }
            return new Promise((resolve, reject) => {
                state.security.pendingResolve = { resolve, reject };
                openPinModal(message, { mode: 'unlock', showCancel: true });
            });
        };

        const requirePinSetup = (message = 'Set a new 4–6 digit PIN to secure your account.') => {
            if (state.security.pendingResolve) {
                rejectPinRequest('replaced');
            }
            return new Promise((resolve, reject) => {
                state.security.pendingResolve = { resolve, reject };
                openPinModal(message, { mode: 'setup', showCancel: false });
            });
        };

        const handlePinSubmission = () => {
            const enteredPin = pinInput.value.trim();
            if (!enteredPin) {
                pinError.textContent = 'Please enter your PIN.';
                return;
            }
            if (state.security.pinMode === 'setup') {
                if (!/^\d{4,6}$/.test(enteredPin)) {
                    pinError.textContent = 'PIN must be 4-6 digits.';
                    pinInput.select();
                    return;
                }
                state.data.settings.pin = enteredPin;
                saveData();
                closePinModal();
                state.security.isUnlocked = true;
                updateSensitiveToggle();
                render();
                resolvePinRequest(true);
                showToast('PIN set successfully.');
                return;
            }
            const currentPin = state.data?.settings?.pin || '1111';
            if (enteredPin !== currentPin) {
                pinError.textContent = 'Incorrect PIN. Try again.';
                pinInput.select();
                return;
            }
            closePinModal();
            state.security.isUnlocked = true;
            updateSensitiveToggle();
            render();
            resolvePinRequest(true);
            showToast('Sensitive data unlocked.');
        };

        const handleModalSave = async () => {
            const { type, data } = state.ui.modal;
            
            try {
                switch (type) {
                    case 'addBike': {
                        const plate = $('#bike-plate').value.toUpperCase();
                        const bikeName = $('#bike-name').value;
                        const ownerName = $('#bike-owner').value;
                        const purchaseDate = $('#bike-purchase-date').value;
                        const purchasePrice = parseFloat($('#bike-purchase-price').value);
                        
                        if (!bikeName) throw new Error('Bike Name is required.');
                        if (!/^[A-Z]{2}[0-9]{1,2}[A-Z]{1,2}[0-9]{1,4}$/.test(plate)) throw new Error('Invalid bike number plate format.');
                        if (!ownerName || !purchaseDate || !purchasePrice) throw new Error('Owner, Purchase Date, and Purchase Price are required.');
                        if (state.data.bikes.some(b => b.bikeNumberPlate === plate)) throw new Error('A bike with this number plate already exists.');

                        const referralName = ($('#bike-ref-name')?.value || '').trim();
                        const referralContact = ($('#bike-ref-contact')?.value || '').trim();
                        const referralComm = parseFloat($('#bike-ref-commission')?.value || '0') || 0;

                        const newBike = {
                            id: crypto.randomUUID(),
                            bikeName: bikeName,
                            bikeNumberPlate: plate,
                            ownerName: ownerName,
                            ownerContact: $('#bike-owner-contact').value,
                            supplierName: $('#bike-supplier').value,
                            supplierContact: $('#bike-supplier-contact').value,
                            purchaseDate: purchaseDate,
                            purchasePrice: purchasePrice,
                            repairPrice: parseFloat($('#bike-repair-price').value) || 0,
                            createdAt: new Date().toISOString(),
                            sold: false,
                            targetSalePrice: parseFloat($('#bike-target-price').value) || null,
                            clearanceSale: false,
                            referral: referralName ? {
                                name: referralName,
                                contact: referralContact,
                                commission: referralComm
                            } : null
                        };
                        state.data.bikes.push(newBike);
                        
                        autoCreatePRContact({
                            name: newBike.ownerName,
                            contact: newBike.ownerContact,
                            relationType: 'Owner',
                            relatedBikeName: newBike.bikeName || newBike.bikeNumberPlate
                        });
                        autoCreatePRContact({
                            name: newBike.supplierName,
                            contact: newBike.supplierContact,
                            relationType: 'Supplier',
                            relatedBikeName: newBike.bikeName || newBike.bikeNumberPlate
                        });
                        if (newBike.referral) {
                            autoCreatePRContact({
                                name: newBike.referral.name,
                                contact: newBike.referral.contact,
                                relationType: 'Referrer',
                                relatedBikeName: newBike.bikeName || newBike.bikeNumberPlate
                            });
                        }
                        
                        showToast('Bike added successfully!');
                        break;
                    }

                    case 'editBike': {
                        const index = state.data.bikes.findIndex(b => b.id === data.id);
                        if (index === -1) throw new Error('Bike not found.');
                        
                        const bikeName = $('#bike-name').value;
                        const ownerName = $('#bike-owner').value;
                        if (!bikeName) throw new Error('Bike Name is required.');
                        if (!ownerName) throw new Error('Owner Name is required.');

                        const referralName = ($('#bike-ref-name')?.value || '').trim();
                        const referralContact = ($('#bike-ref-contact')?.value || '').trim();
                        const referralComm = parseFloat($('#bike-ref-commission')?.value || '0') || 0;

                        const purchaseData = {
                            bikeName: bikeName,
                            ownerName: ownerName,
                            ownerContact: $('#bike-owner-contact').value,
                            supplierName: $('#bike-supplier').value,
                            supplierContact: $('#bike-supplier-contact').value,
                            purchaseDate: $('#bike-purchase-date').value,
                            purchasePrice: parseFloat($('#bike-purchase-price').value) || 0,
                            repairPrice: parseFloat($('#bike-repair-price').value) || 0,
                            targetSalePrice: parseFloat($('#bike-target-price').value) || null,
                            referral: referralName ? {
                                name: referralName,
                                contact: referralContact,
                                commission: referralComm
                            } : null
                        };
                        
                        const totalSellingPrice = parseFloat($('#sale-total-price').value) || 0;
                        let salesData = {};
                        
                        if (totalSellingPrice > 0) {
                            const wasSold = state.data.bikes[index].sold;
                            const paymentDate = wasSold ? state.data.bikes[index].soldDate : formatDate(new Date());
                            
                            salesData = {
                                ...purchaseData,
                                sold: true,
                                soldAt: wasSold ? state.data.bikes[index].soldAt : new Date().toISOString(),
                                soldDate: paymentDate,
                                customerName: $('#sale-customer-name').value,
                                customerContact: $('#sale-customer-contact').value,
                                sellingPrice: totalSellingPrice,
                                paymentMode: $('#sale-payment-mode').value,
                                creditInfo: null,
                                emiInfo: null,
                            };
                            
                            const paymentMode = salesData.paymentMode;
                            let initialPaymentAmount = 0;
                            
                            if (paymentMode === 'cash') {
                                initialPaymentAmount = totalSellingPrice;
                                salesData.soldDate = $('#sale-cash-date').value;
                            } else if (paymentMode === 'credit') {
                                const initial = parseFloat($('#sale-credit-initial').value) || 0;
                        const creditGraceInput = parseInt($('#sale-credit-grace').value, 10);
                        const creditInterestInput = parseFloat($('#sale-credit-interest').value);
                        const creditGrace = Number.isFinite(creditGraceInput) && creditGraceInput >= 0
                            ? creditGraceInput
                            : DEFAULT_GRACE_PERIOD_DAYS;
                        const creditInterest = Number.isFinite(creditInterestInput) && creditInterestInput >= 0
                            ? creditInterestInput
                            : 0;
                                initialPaymentAmount = initial;
                                salesData.creditInfo = {
                                    initialPayment: initial,
                                    remaining: totalSellingPrice - initial,
                            dueDate: $('#sale-credit-due-date').value,
                            gracePeriodDays: creditGrace,
                            interestRate: creditInterest
                                };
                            } else if (paymentMode === 'emi') {
                                const downPayment = parseFloat($('#sale-emi-downpayment').value) || 0;
                        const emiGraceInput = parseInt($('#sale-emi-grace').value, 10);
                        const emiInterestInput = parseFloat($('#sale-emi-interest').value);
                        const emiGrace = Number.isFinite(emiGraceInput) && emiGraceInput >= 0
                            ? emiGraceInput
                            : DEFAULT_GRACE_PERIOD_DAYS;
                        const emiInterest = Number.isFinite(emiInterestInput) && emiInterestInput >= 0
                            ? emiInterestInput
                            : 0;
                                initialPaymentAmount = downPayment;
                                salesData.emiInfo = {
                                    downPayment: downPayment,
                                    monthlyAmount: parseFloat($('#sale-emi-monthly').value) || 0,
                                    totalInstallments: parseInt($('#sale-emi-installments').value) || 0,
                                    installmentsPaid: wasSold ? state.data.bikes[index].emiInfo.installmentsPaid : 0,
                                    startDate: $('#sale-emi-start-date').value,
                            nextDueDate: wasSold ? state.data.bikes[index].emiInfo.nextDueDate : $('#sale-emi-start-date').value,
                            gracePeriodDays: emiGrace,
                            interestRate: emiInterest
                                };
                            }

                            const paymentIndex = state.data.payments.findIndex(p => p.bikeId === data.id && p.type === 'Initial Payment');
                            
                            if (paymentIndex > -1) {
                                state.data.payments[paymentIndex].amount = initialPaymentAmount;
                                state.data.payments[paymentIndex].date = (paymentMode === 'cash' ? salesData.soldDate : salesData.soldAt);
                            } else if (!wasSold) {
                                state.data.payments.push({
                                    id: crypto.randomUUID(),
                                    bikeId: data.id,
                                    bikeName: bikeName || data.bikeNumberPlate,
                                    amount: initialPaymentAmount,
                                    date: (paymentMode === 'cash' ? salesData.soldDate : salesData.soldAt),
                                    type: 'Initial Payment'
                                });
                                
                                autoCreatePRContact({
                                    name: salesData.customerName,
                                    contact: salesData.customerContact,
                                    relationType: 'Buyer',
                                    relatedBikeName: bikeName
                                });
                            }
                            
                        } else {
                            salesData = { ...purchaseData, sold: false, sellingPrice: 0 };
                        }
                        
                        state.data.bikes[index] = { ...state.data.bikes[index], ...salesData };
                        if (state.data.bikes[index].sold) {
                            state.data.bikes[index].clearanceSale = false;
                        }
                        
                        autoCreatePRContact({
                            name: purchaseData.ownerName,
                            contact: purchaseData.ownerContact,
                            relationType: 'Owner',
                            relatedBikeName: bikeName || data.bikeNumberPlate
                        });
                        autoCreatePRContact({
                            name: purchaseData.supplierName,
                            contact: purchaseData.supplierContact,
                            relationType: 'Supplier',
                            relatedBikeName: bikeName
                        });
                        if (purchaseData.referral) {
                            autoCreatePRContact({
                                name: purchaseData.referral.name,
                                contact: purchaseData.referral.contact,
                                relationType: 'Referrer',
                                relatedBikeName: bikeName
                            });
                        }
                        if (salesData.sold && salesData.customerName && salesData.customerContact) {
                            autoCreatePRContact({
                                name: salesData.customerName,
                                contact: salesData.customerContact,
                                relationType: 'Buyer',
                                relatedBikeName: bikeName
                            });
                        }
                        
                        showToast('Bike updated successfully!');
                        break;
                    }
                    
                    case 'markSold': {
                        const index = state.data.bikes.findIndex(b => b.id === data.id);
                        if (index === -1) throw new Error('Bike not found.');
                        if (state.data.bikes[index].sold) throw new Error('Bike is already sold.');

                        const totalSellingPrice = parseFloat($('#sale-total-price').value) || 0;
                        if (totalSellingPrice <= 0) throw new Error('Total Selling Price is required.');
                        
                        const paymentMode = $('#sale-payment-mode').value;
                        let initialPaymentAmount = 0;
                        let paymentDate = new Date().toISOString();
                        let bikeUpdate = {
                            sold: true,
                            soldAt: paymentDate,
                            customerName: $('#sale-customer-name').value,
                            customerContact: $('#sale-customer-contact').value,
                            sellingPrice: totalSellingPrice,
                            paymentMode: paymentMode,
                            creditInfo: null,
                            emiInfo: null,
                        };
                        
                        if (paymentMode === 'cash') {
                            initialPaymentAmount = totalSellingPrice;
                            paymentDate = new Date($('#sale-cash-date').value).toISOString();
                            bikeUpdate.soldDate = paymentDate;
                        } else if (paymentMode === 'credit') {
                            const initial = parseFloat($('#sale-credit-initial').value) || 0;
                        const creditGraceInput = parseInt($('#sale-credit-grace').value, 10);
                        const creditInterestInput = parseFloat($('#sale-credit-interest').value);
                        const creditGrace = Number.isFinite(creditGraceInput) && creditGraceInput >= 0
                            ? creditGraceInput
                            : DEFAULT_GRACE_PERIOD_DAYS;
                        const creditInterest = Number.isFinite(creditInterestInput) && creditInterestInput >= 0
                            ? creditInterestInput
                            : 0;
                            initialPaymentAmount = initial;
                            bikeUpdate.soldDate = formatDate(new Date());
                            bikeUpdate.creditInfo = {
                                initialPayment: initial,
                                remaining: totalSellingPrice - initial,
                            dueDate: $('#sale-credit-due-date').value,
                            gracePeriodDays: creditGrace,
                            interestRate: creditInterest
                            };
                            if (!bikeUpdate.creditInfo.dueDate) throw new Error('Remaining Due Date is required for Credit.');
                        } else if (paymentMode === 'emi') {
                            const downPayment = parseFloat($('#sale-emi-downpayment').value) || 0;
                        const emiGraceInput = parseInt($('#sale-emi-grace').value, 10);
                        const emiInterestInput = parseFloat($('#sale-emi-interest').value);
                        const emiGrace = Number.isFinite(emiGraceInput) && emiGraceInput >= 0
                            ? emiGraceInput
                            : DEFAULT_GRACE_PERIOD_DAYS;
                        const emiInterest = Number.isFinite(emiInterestInput) && emiInterestInput >= 0
                            ? emiInterestInput
                            : 0;
                            initialPaymentAmount = downPayment;
                            bikeUpdate.soldDate = formatDate(new Date());
                            bikeUpdate.emiInfo = {
                                downPayment: downPayment,
                                monthlyAmount: parseFloat($('#sale-emi-monthly').value) || 0,
                                totalInstallments: parseInt($('#sale-emi-installments').value) || 0,
                                installmentsPaid: 0,
                                startDate: $('#sale-emi-start-date').value,
                            nextDueDate: $('#sale-emi-start-date').value,
                            gracePeriodDays: emiGrace,
                            interestRate: emiInterest
                            };
                            if (!bikeUpdate.emiInfo.monthlyAmount || !bikeUpdate.emiInfo.startDate) throw new Error('Monthly Amount and Start Date are required for EMI.');
                            if (!bikeUpdate.emiInfo.totalInstallments) throw new Error('Number of Installments is required for EMI.');
                        }
                        
                        state.data.bikes[index] = { ...state.data.bikes[index], ...bikeUpdate };
                        
                        state.data.payments.push({
                            id: crypto.randomUUID(),
                            bikeId: data.id,
                            bikeName: data.bikeName || data.bikeNumberPlate,
                            amount: initialPaymentAmount,
                            date: paymentDate,
                            type: 'Initial Payment'
                        });
                        
                        autoCreatePRContact({
                            name: bikeUpdate.customerName,
                            contact: bikeUpdate.customerContact,
                            relationType: 'Buyer',
                            relatedBikeName: data.bikeName || data.bikeNumberPlate
                        });
                        
                        showToast('Bike marked as sold!');
                        break;
                    }
                    
                    case 'logPayment': {
                        const index = state.data.bikes.findIndex(b => b.id === $('#payment-bike-id').value);
                        if (index === -1) throw new Error('Bike not found.');
                        
                        const bike = state.data.bikes[index];
                        const principalInput = parseFloat($('#payment-amount').value);
                        const interestInput = parseFloat($('#payment-interest')?.value);
                        const principalAmount = Number.isFinite(principalInput) ? principalInput : 0;
                        const interestAmount = Number.isFinite(interestInput) ? interestInput : 0;
                        const date = $('#payment-date').value;
                        const paymentTypeHint = $('#payment-type').value || 'Payment';
                        const isEMIFinal = $('#payment-emi-final') && $('#payment-emi-final').checked;

                        if (!date) throw new Error('Payment date is required.');
                        const isoDate = new Date(date).toISOString();

                        const paymentEntries = applyPaymentForBike({
                            bike,
                            principalAmount,
                            interestAmount,
                            isoDate,
                            isEMIFinal,
                            paymentTypeHint
                        });

                        paymentEntries.forEach(entry => state.data.payments.push(entry));
                        
                        state.data.bikes[index] = bike;
                        showToast('Payment logged successfully!');
                        break;
                    }
                    
                    case 'bulkPayments': {
                        const records = Array.isArray(data) ? data : [];
                        if (!records.length) throw new Error('No customers selected.');

                        const dateValue = $('#bulk-payment-date')?.value;
                        if (!dateValue) throw new Error('Payment date is required.');
                        const isoDate = new Date(dateValue).toISOString();

                        const errors = [];
                        let processed = 0;

                        records.forEach(record => {
                            const row = modalBody.querySelector(`[data-bulk-id="${record.bikeId}"]`);
                            if (!row) return;

                            const principalInput = parseFloat(row.querySelector('.bulk-principal')?.value);
                            const interestInput = parseFloat(row.querySelector('.bulk-interest')?.value);
                            const principalAmount = Number.isFinite(principalInput) ? principalInput : 0;
                            const interestAmount = Number.isFinite(interestInput) ? interestInput : 0;
                            const isEMIFinal = row.querySelector('.bulk-final')?.checked || false;

                            if (principalAmount <= 0 && interestAmount <= 0) {
                                return; // skip entries with no amounts
                            }

                            if (isEMIFinal && principalAmount <= 0) {
                                errors.push(`${record.customerName}: Principal amount is required for final settlement.`);
                                return;
                            }

                            const bikeIndex = state.data.bikes.findIndex(bike => bike.id === record.bikeId);
                            if (bikeIndex === -1) {
                                errors.push(`${record.customerName}: Bike not found.`);
                                return;
                            }

                            try {
                                const bikeRef = state.data.bikes[bikeIndex];
                                const paymentEntries = applyPaymentForBike({
                                    bike: bikeRef,
                                    principalAmount,
                                    interestAmount,
                                    isoDate,
                                    isEMIFinal,
                                    paymentTypeHint: record.paymentMode === 'emi' ? 'EMI Payment' : 'Credit Payment'
                                });
                                paymentEntries.forEach(entry => state.data.payments.push(entry));
                                state.data.bikes[bikeIndex] = bikeRef;
                                processed += 1;
                            } catch (error) {
                                errors.push(`${record.customerName}: ${error.message}`);
                            }
                        });

                        if (errors.length) {
                            throw new Error(errors.join('\n'));
                        }

                        state.ui.creditBulkSelection = [];
                        state.ui.creditBulkDrafts = {};
                        state.ui.creditBulkMode = false;
                        showToast(`Payments recorded for ${processed} customer${processed === 1 ? '' : 's'}.`);
                        break;
                    }
                    
                    case 'addExpense':
                    case 'editExpense':
                        const description = $('#expense-desc').value;
                        const amount = parseFloat($('#expense-amount').value);
                        const date = $('#expense-date').value;
                        
                        if (!description || !amount || !date) throw new Error('All fields are required.');
                        
                        if (type === 'addExpense') {
                            state.data.expenses.push({ 
                                id: crypto.randomUUID(), 
                                description, 
                                amount, 
                                date,
                                createdAt: new Date().toISOString()
                            });
                            showToast('Expense added!');
                        } else {
                            const index = state.data.expenses.findIndex(e => e.id === data.id);
                            if (index === -1) throw new Error('Expense not found.');
                            state.data.expenses[index] = { ...data, description, amount, date };
                            showToast('Expense updated!');
                        }
                        break;
                    
                    case 'addPR':
                    case 'editPR':
                        const name = $('#pr-name').value;
                        const contact = $('#pr-contact').value;
                        
                        if (!name || !contact) throw new Error('Name and Contact are required.');
                        
                        const prData = {
                            name,
                            contact,
                            relationType: $('#pr-type').value,
                            relatedBikeName: $('#pr-bike-name').value,
                        };
                        
                        if (type === 'addPR') {
                            state.data.pr.push({ id: crypto.randomUUID(), ...prData });
                            showToast('Contact added!');
                        } else {
                            const index = state.data.pr.findIndex(p => p.id === data.id);
                            if (index === -1) throw new Error('Contact not found.');
                            state.data.pr[index] = { ...data, ...prData };
                            showToast('Contact updated!');
                        }
                        break;
                    
                    case 'addBrandNew':
                    case 'editBrandNew': {
                        const deliveryId = type === 'editBrandNew' && data ? data.id : crypto.randomUUID();
                        const bikeModel = ($('#brand-bike-model')?.value || '').trim();
                        const deliveryDate = $('#brand-delivery-date')?.value;
                        const commissionReceived = parseFloat($('#brand-commission-received')?.value || '0');
                        const customerName = ($('#brand-customer-name')?.value || '').trim();
                        const customerContact = ($('#brand-customer-contact')?.value || '').trim();
                        const showroomName = ($('#brand-showroom-name')?.value || '').trim();
                        const invoiceNumber = ($('#brand-invoice-number')?.value || '').trim();
                        const notes = ($('#brand-notes')?.value || '').trim();

                        if (!bikeModel || !deliveryDate || !customerName || !showroomName) {
                            throw new Error('Bike Model, Delivery Date, Customer Name, and Showroom Name are required.');
                        }
                        if (isNaN(commissionReceived) || commissionReceived < 0) {
                            throw new Error('Commission received must be a non-negative number.');
                        }

                        const referrerElements = modalBody.querySelectorAll('.brand-referrer-item');
                        const commissionToGive = Array.from(referrerElements).map(element => {
                            const amount = parseFloat(element.dataset.refAmount || '0');
                            if (isNaN(amount) || amount < 0) {
                                throw new Error('Referrer commission amounts must be valid numbers.');
                            }
                            return {
                                id: element.dataset.refId || crypto.randomUUID(),
                                referrerName: element.dataset.refName || 'Referrer',
                                referrerContact: element.dataset.refContact || '',
                                commissionAmount: amount,
                                paymentStatus: element.dataset.status === 'paid' ? 'paid' : 'pending'
                            };
                        });

                        const payload = {
                            id: deliveryId,
                            bikeModel,
                            deliveryDate,
                            commissionReceived,
                            customerName,
                            customerContact,
                            showroomName,
                            invoiceNumber: invoiceNumber || undefined,
                            notes: notes || undefined,
                            commissionToGive,
                            createdAt: type === 'editBrandNew' && data?.createdAt ? data.createdAt : new Date().toISOString()
                        };

                        if (type === 'addBrandNew') {
                            state.data.brandNewDeliveries.push(payload);
                            showToast('Brand new delivery added!');
                        } else {
                            const index = state.data.brandNewDeliveries.findIndex(delivery => delivery.id === deliveryId);
                            if (index === -1) throw new Error('Delivery not found.');
                            state.data.brandNewDeliveries[index] = payload;
                            showToast('Brand new delivery updated!');
                        }

                        autoCreatePRContact({
                            name: customerName,
                            contact: customerContact,
                            relationType: 'Buyer',
                            relatedBikeName: bikeModel
                        });

                        autoCreatePRContact({
                            name: showroomName,
                            contact: '',
                            relationType: 'Showroom',
                            relatedBikeName: bikeModel
                        });

                        commissionToGive.forEach(ref => {
                            autoCreatePRContact({
                                name: ref.referrerName,
                                contact: ref.referrerContact,
                                relationType: 'Referrer',
                                relatedBikeName: bikeModel
                            });
                        });
                        break;
                    }
                }
                
                closeModal();
                render();
                saveData();
                
            } catch (error) {
                showToast(error.message, true);
            }
        };
        
        const handleCashAdjustment = (type) => {
            try {
                const amount = parseFloat(cashAdjAmount.value);
                const description = cashAdjDesc.value.trim();
                
                if (!amount || amount <= 0) throw new Error('Please enter a valid amount.');
                if (!description) throw new Error('Please enter a description.');
                
                state.data.cashEntries.push({
                    id: crypto.randomUUID(),
                    type: type,
                    amount: amount,
                    description: description,
                    createdAt: new Date().toISOString()
                });
                
                cashAdjAmount.value = '';
                cashAdjDesc.value = '';
                
                showToast(`Cash ${type === 'add' ? 'added' : 'removed'} successfully.`);
                render();
                saveData();

            } catch (error) {
                showToast(error.message, true);
            }
        };
        
        // --- NEW: Backup & Restore Functions ---

        const backupToLocalFile = () => {
            try {
                const dataStr = persistence.export(state.data);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = `bike-manager-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                showToast('Data backup downloaded.');
            } catch (error) {
                console.error('Local backup failed:', error);
                showToast('Local backup failed.', true);
            }
        };
        
        
        
        const handleLocalFileRestore = (file) => {
            showLoader();
            const reader = new FileReader();
            
            reader.onload = async (event) => {
                try {
                    const parsedData = JSON.parse(event.target.result);
                    const payload = parsedData?.payload ?? parsedData;
                    
                    if (!payload || typeof payload !== 'object' || !Array.isArray(payload.bikes) || !Array.isArray(payload.expenses)) {
                        throw new Error('Invalid backup file.');
                    }
                    
                    state.data = payload;
                    runDataMigration(); // Ensure data structure
                    await persistence.import(state.data);
                    render();   
                    
                    showToast('Data restored successfully.');
                } catch (error) {
                    console.error('Restore failed:', error);
                    showToast(`Restore failed: ${error.message}`, true);
                } finally {
                    hideLoader();
                    restoreFileInput.value = null; // Reset file input
                }
            };
            
            reader.onerror = () => {
                showToast('Failed to read file.', true);
                hideLoader();
                restoreFileInput.value = null;
            };
            
            reader.readAsText(file);
        };

        const csvEscape = (value) => {
            if (value === null || value === undefined) return '';
            const str = String(value).replace(/"/g, '""');
            return /[",\n]/.test(str) ? `"${str}"` : str;
        };

        const exportCreditAsCSV = (records, totals) => {
            const lines = [];
            lines.push(`Generated At,${csvEscape(new Date().toISOString())}`);
            lines.push(`Total Credit Given,${csvEscape((totals.totalCredit || 0).toFixed(2))}`);
            lines.push(`Collected,${csvEscape((totals.collected || 0).toFixed(2))}`);
            lines.push(`Pending,${csvEscape((totals.pending || 0).toFixed(2))}`);
            lines.push(`Active Customers,${csvEscape(totals.activeCustomers || 0)}`);
            lines.push('');

            const headers = [
                'Customer Name',
                'Contact',
                'Bike Name',
                'Number Plate',
                'Sale Price',
                'Pending Amount',
                'Payment Mode',
                'Next Due',
                'Initial Payment',
                'Monthly EMI',
                'Installments Paid',
                'Installments Total'
            ];
            lines.push(headers.map(csvEscape).join(','));

            records.forEach(record => {
                const row = [
                    csvEscape(record.customerName),
                    csvEscape(record.contact),
                    csvEscape(record.bikeName),
                    csvEscape(record.bikeNumberPlate),
                    csvEscape((record.salePrice || 0).toFixed(2)),
                    csvEscape((record.pendingAmount || 0).toFixed(2)),
                    csvEscape(record.paymentMode?.toUpperCase() || ''),
                    csvEscape(record.nextDueText),
                    csvEscape((record.initialPayment || 0).toFixed(2)),
                    csvEscape((record.monthlyAmount || 0).toFixed(2)),
                    csvEscape(record.installmentsPaid || 0),
                    csvEscape(record.totalInstallments || 0)
                ];
                lines.push(row.join(','));
            });

            const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `bike-credit-export-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('Credit data exported as CSV.');
        };

        const exportCreditAsPDF = (records, totals) => {
            const { jsPDF } = window.jspdf || {};
            if (!jsPDF) {
                showToast('PDF export unavailable. Please try CSV instead.', true);
                return;
            }

            const doc = new jsPDF({ unit: 'pt', format: 'a4' });
            const margin = 48;
            const pageHeight = doc.internal.pageSize.getHeight();

            const addHeader = () => {
                doc.setFontSize(16);
                doc.text('Credit Portfolio Export', margin, margin);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleString()}`, margin, margin + 18);
                doc.text(`Total Credit: ${formatCurrency(totals.totalCredit || 0)}`, margin, margin + 32);
                doc.text(`Collected: ${formatCurrency(totals.collected || 0)} • Pending: ${formatCurrency(totals.pending || 0)}`, margin, margin + 46);
                doc.text(`Active Customers: ${totals.activeCustomers || 0}`, margin, margin + 60);
            };

            const ensureSpace = (y, extra = 0) => {
                if (y + extra > pageHeight - margin) {
                    doc.addPage();
                    addHeader();
                    return margin + 80;
                }
                return y;
            };

            addHeader();
            let y = margin + 90;

            records.forEach((record, index) => {
                y = ensureSpace(y, 80);
                doc.setFontSize(12);
                doc.text(`${index + 1}. ${record.customerName}`, margin, y);
                doc.setFontSize(10);
                y += 16;

                const details = [
                    `Bike: ${record.bikeName} (${record.bikeNumberPlate})`,
                    `Contact: ${record.contact}`,
                    `Sale Price: ${formatCurrency(record.salePrice)} • Pending: ${formatCurrency(record.pendingAmount)}`,
                    `Mode: ${record.paymentMode?.toUpperCase() || ''} • Next Due: ${record.nextDueText}`
                ];

                if (record.paymentMode === 'credit') {
                    details.push(`Initial Payment: ${formatCurrency(record.initialPayment)}`);
                } else if (record.paymentMode === 'emi') {
                    details.push(`EMI: ${formatCurrency(record.monthlyAmount)} • Installments: ${record.installmentsPaid}/${record.totalInstallments}`);
                }

                details.forEach(textLine => {
                    const lines = doc.splitTextToSize(textLine, doc.internal.pageSize.getWidth() - margin * 2);
                    lines.forEach(line => {
                        y = ensureSpace(y, 14);
                        doc.text(line, margin + 12, y);
                        y += 14;
                    });
                });

                const paymentHeader = 'Recent Payments:';
                y = ensureSpace(y, 14);
                doc.text(paymentHeader, margin + 12, y);
                y += 14;

                const payments = record.payments.slice(0, 3);
                if (!payments.length) {
                    y = ensureSpace(y, 14);
                    doc.text('None recorded.', margin + 24, y);
                    y += 14;
                } else {
                    payments.forEach(payment => {
                        const paymentLine = `${formatDate(payment.date)} • ${formatCurrency(payment.amount)} • ${payment.type}`;
                        y = ensureSpace(y, 14);
                        doc.text(paymentLine, margin + 24, y);
                        y += 14;
                    });
                }

                y += 10;
            });

            doc.save(`bike-credit-export-${new Date().toISOString().split('T')[0]}.pdf`);
            showToast('Credit data exported as PDF.');
        };

        const exportCreditData = async () => {
            const { records, totals } = summarizeCreditRecords();
            if (!records.length) {
                showToast('No credit or EMI records to export.', true);
                return;
            }

            const choice = await showExportChoice('Export Credit Data', 'Select your preferred export format.');
            if (!choice) {
                return;
            }

            if (choice === 'csv') {
                exportCreditAsCSV(records, totals);
            } else if (choice === 'pdf') {
                exportCreditAsPDF(records, totals);
            }
        };

        // --- Event Listeners ---
        
        const addEventListeners = () => {
            sensitiveToggle.addEventListener('click', () => {
                if (state.security.isUnlocked) {
                    lockSensitiveData();
                    showToast('Sensitive data locked.');
                } else {
                    requestPinUnlock('Enter your PIN to unlock sensitive data.').catch(() => {});
                }
            });

            pinSubmit.addEventListener('click', handlePinSubmission);
            pinCancel.addEventListener('click', () => {
                if (state.security.pinMode === 'setup') {
                    return;
                }
                closePinModal();
                rejectPinRequest('cancelled');
            });
            pinInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    handlePinSubmission();
                } else if (event.key === 'Escape') {
                    if (state.security.pinMode === 'setup') {
                        return;
                    }
                    closePinModal();
                    rejectPinRequest('cancelled');
                }
            });
            pinModal.addEventListener('click', (event) => {
                if ((event.target).classList?.contains('modal-overlay')) {
                    if (state.security.pinMode === 'setup') {
                        return;
                    }
                    closePinModal();
                    rejectPinRequest('cancelled');
                }
            });

            if (analyticsUnlockBtn) {
                analyticsUnlockBtn.addEventListener('click', () => {
                    requestPinUnlock('Unlock analytics with your PIN.').catch(() => {});
                });
            }

            // Bottom Navigation
            navBar.addEventListener('click', (e) => {
                const navItem = e.target.closest('.nav-item');
                if (navItem) {
                    renderPage(navItem.dataset.page);
                }
            });
            
            // Global "Add" Button
            addButton.addEventListener('click', () => {
                const page = state.ui.currentPage;
                if (page === 'bikes') {
                    if (state.ui.currentBikeType === 'brand_new') {
                        openModal('addBrandNew');
                    } else {
                        openModal('addBike');
                    }
                }
                if (page === 'expenses') openModal('addExpense');
                if (page === 'pr') openModal('addPR');
            });
            
            // Modal Close/Save
            modalClose.addEventListener('click', closeModal);
            modalOverlay.addEventListener('click', closeModal);
            modalSave.addEventListener('click', handleModalSave);

            // Settings: Cash Adjustments
            cashAdjAdd.addEventListener('click', () => handleCashAdjustment('add'));
            cashAdjRemove.addEventListener('click', () => handleCashAdjustment('remove'));

            if (pinUpdateBtn) {
                pinUpdateBtn.addEventListener('click', () => {
                    const current = (pinCurrentInput?.value || '').trim();
                    const next = (pinNewInput?.value || '').trim();
                    const existing = state.data?.settings?.pin || '1111';

                    if (!current || !next) {
                        showToast('Please fill in both PIN fields.', true);
                        return;
                    }
                    if (current !== existing) {
                        showToast('Current PIN is incorrect.', true);
                        pinCurrentInput?.focus();
                        return;
                    }
                    if (next.length < 4 || next.length > 6 || /\D/.test(next)) {
                        showToast('PIN must be 4-6 digits.', true);
                        pinNewInput?.focus();
                        pinNewInput?.select();
                        return;
                    }
                    state.data.settings.pin = next;
                    pinCurrentInput.value = '';
                    pinNewInput.value = '';
                    lockSensitiveData();
                    showToast('PIN updated. Sensitive data locked.');
                    saveData();
                });
            }
            
            // Settings: Reset Data
            settingReset.addEventListener('click', async () => {
                const confirmed = await showConfirm(
                    'Reset All Data?',
                    'This will erase ALL bikes, expenses, contacts, payments, and cash transactions.'
                );
                if (confirmed) {
                    state.data = {
                        bikes: [], expenses: [], pr: [], cashEntries: [], payments: [],
                        settings: { baseInvestment: 0, pin: '1111' }
                    };
                    lockSensitiveData();
                    saveData();
                    showToast('All data has been reset.');
                }
            });

            // --- NEW: Backup & Restore Listeners ---
            
            settingBackup.addEventListener('click', () => {
                backupToLocalFile();
            });
            
            settingRestore.addEventListener('click', () => {
                restoreFileInput.click();
            });

            if (creditExport) {
                creditExport.addEventListener('click', exportCreditData);
            }
            
            restoreFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const confirmed = await showConfirm(
                    'Restore from File?',
                    'This will overwrite ALL current data in the app with the data from this file. This action cannot be undone.'
                );
                
                if (confirmed) {
                    handleLocalFileRestore(file);
                } else {
                    e.target.value = null; // Reset file input if cancelled
                }
            });
            
            // --- Page-specific Listeners ---
            
            // Dashboard: Sort
            dashboardSort.addEventListener('change', (e) => {
                state.ui.currentDashboardSort = e.target.value;
                renderDashboard();
            });

            // Dashboard: Reminder Clicks
            dashboardReminders.addEventListener('click', (e) => {
                if (e.target.closest('[data-reminder-action]')) {
                    return;
                }

                const card = e.target.closest('[data-reminder-card]');
                if (!card) return;

                const bikeId = card.dataset.bikeId;
                const bike = state.data.bikes.find(b => b.id === bikeId);
                if (bike) {
                    openModal('logPayment', bike);
                }
            });

            // Bike Page: Filters
            bikeFilter.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    bikeFilter.querySelector('button.active').classList.remove('active');
                    e.target.classList.add('active');
                    state.ui.currentBikeFilter = e.target.dataset.filter;
                    renderBikesPage();
                }
            });
            bikeSearch.addEventListener('input', (e) => {
                state.ui.currentBikeSearch = e.target.value;
                renderBikesPage();
            });
            if (bikeTypeToggle) {
                bikeTypeToggle.addEventListener('click', (e) => {
                    if (e.target.tagName === 'BUTTON') {
                        bikeTypeToggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                        e.target.classList.add('active');
                        state.ui.currentBikeType = e.target.dataset.type;
                        renderBikesPage();
                    }
                });
            }
            
            // Bike Page: Sort Dropdown
            bikeSortTrigger.addEventListener('click', () => {
                bikeSortMenu.classList.toggle('hidden');
            });

            bikeSortMenu.addEventListener('click', (e) => {
                const item = e.target.closest('.bike-sort-item');
                if (item) {
                    state.ui.currentBikeSort = item.dataset.sort;
                    bikeSortLabel.textContent = `Sort: ${item.textContent}`;
                    bikeSortMenu.classList.add('hidden');
                    renderBikesPage();
                }
            });
            bikeAdvancedToggle?.addEventListener('click', () => {
                state.ui.showBikeAdvanced = !state.ui.showBikeAdvanced;
                renderBikesPage();
            });
            bikeAdvancedReset?.addEventListener('click', () => {
                state.ui.bikeAdvancedFilters = {
                    profitMin: '',
                    profitMax: '',
                    dateFrom: '',
                    dateTo: '',
                    repairMin: '',
                    repairMax: ''
                };
                renderBikesPage();
            });

            const advancedInputConfigs = [
                { element: bikeFilterProfitMin, key: 'profitMin', event: 'input' },
                { element: bikeFilterProfitMax, key: 'profitMax', event: 'input' },
                { element: bikeFilterRepairMin, key: 'repairMin', event: 'input' },
                { element: bikeFilterRepairMax, key: 'repairMax', event: 'input' },
                { element: bikeFilterDateFrom, key: 'dateFrom', event: 'change' },
                { element: bikeFilterDateTo, key: 'dateTo', event: 'change' }
            ];

            advancedInputConfigs.forEach(({ element, key, event }) => {
                element?.addEventListener(event, (inputEvent) => {
                    const nextValue = inputEvent.target.value;
                    state.ui.bikeAdvancedFilters = {
                        ...state.ui.bikeAdvancedFilters,
                        [key]: nextValue
                    };
                    renderBikesPage();
                });
            });

            bikeBulkToggle?.addEventListener('click', () => {
                state.ui.bikeBulkMode = !state.ui.bikeBulkMode;
                if (!state.ui.bikeBulkMode) {
                    state.ui.bikeBulkSelection = [];
                }
                renderBikesPage();
            });
            
            // Bike Page: List Clicks
            bikeList.addEventListener('click', (e) => {
                const button = e.target.closest('[data-action]');
                if (!button) return;

                const bikeWrapper = button.closest('[data-bike-id]');
                const brandWrapper = button.closest('[data-brand-id]');
                const action = button.dataset.action;

                if (brandWrapper) {
                    const deliveryId = brandWrapper.dataset.brandId;
                    if (action === 'edit-brand-new') {
                        const delivery = state.data.brandNewDeliveries.find(entry => entry.id === deliveryId);
                        if (delivery) {
                            openModal('editBrandNew', delivery);
                        }
                    } else if (action === 'delete-brand-new') {
                        handleDeleteBrandNew(deliveryId);
                    } else if (action === 'toggle-commission') {
                        const refWrapper = button.closest('[data-ref-id]');
                        if (refWrapper) {
                            toggleBrandNewCommissionStatus(deliveryId, refWrapper.dataset.refId);
                        }
                    }
                    return;
                }

                if (!bikeWrapper) return;

                const bikeId = bikeWrapper.dataset.bikeId;
                const bike = state.data.bikes.find(b => b.id === bikeId);
                if (!bike) return;

                if (action === 'edit-bike') {
                    openModal('editBike', bike);
                } else if (action === 'mark-sold') {
                    openModal('markSold', bike);
                } else if (action === 'log-payment') {
                    openModal('logPayment', bike);
                }
            });

            bikeList.addEventListener('change', (e) => {
                const checkbox = e.target.closest('.bike-clearance-checkbox');
                if (!checkbox) return;
                const bikeId = checkbox.dataset.bikeId;
                if (!bikeId) return;
                const selection = new Set(state.ui.bikeBulkSelection || []);
                if (checkbox.checked) {
                    selection.add(bikeId);
                } else {
                    selection.delete(bikeId);
                }
                state.ui.bikeBulkSelection = Array.from(selection);
                updateBikeBulkFooter();
            });

            bikeClearanceCancel?.addEventListener('click', () => {
                state.ui.bikeBulkMode = false;
                state.ui.bikeBulkSelection = [];
                renderBikesPage();
            });

            const applyClearanceSelection = (enable) => {
                const selection = new Set(state.ui.bikeBulkSelection || []);
                if (!selection.size) {
                    showToast('Select at least one bike first.', true);
                    return;
                }

                let updated = 0;
                state.data.bikes.forEach((bike) => {
                    if (!selection.has(bike.id) || bike.sold) {
                        return;
                    }
                    if (!!bike.clearanceSale !== enable) {
                        bike.clearanceSale = enable;
                        updated += 1;
                    }
                });

                if (updated > 0) {
                    showToast(enable ? 'Marked selected bikes for clearance.' : 'Removed clearance flag.');
                    saveData();
                } else {
                    showToast('No changes applied.', true);
                }

                state.ui.bikeBulkSelection = [];
                if (!enable) {
                    updateBikeBulkFooter();
                }
                renderBikesPage();
            };

            bikeClearanceMark?.addEventListener('click', () => applyClearanceSelection(true));
            bikeClearanceRemove?.addEventListener('click', () => applyClearanceSelection(false));

            if (creditList) {
                creditList.addEventListener('click', (e) => {
                    const button = e.target.closest('[data-action="log-payment"]');
                    if (!button) return;
                    const wrapper = button.closest('[data-bike-id]');
                    if (!wrapper) return;
                    const bike = state.data.bikes.find(b => b.id === wrapper.dataset.bikeId);
                    if (bike) {
                        openModal('logPayment', bike);
                    }
                });

                creditList.addEventListener('change', (e) => {
                    const checkbox = e.target.closest('.credit-bulk-checkbox');
                    if (!checkbox) return;
                    const bikeId = checkbox.dataset.bulkId;
                    if (!bikeId) return;
                    const selection = new Set(state.ui.creditBulkSelection || []);
                    if (checkbox.checked) {
                        selection.add(bikeId);
                    } else {
                        selection.delete(bikeId);
                    }
                    state.ui.creditBulkSelection = Array.from(selection);
                    render();
                });
            }

            creditBulkToggle?.addEventListener('click', () => {
                state.ui.creditBulkMode = !state.ui.creditBulkMode;
                if (!state.ui.creditBulkMode) {
                    state.ui.creditBulkSelection = [];
                    state.ui.creditBulkDrafts = {};
                }
                render();
            });

            creditBulkCancel?.addEventListener('click', () => {
                state.ui.creditBulkMode = false;
                state.ui.creditBulkSelection = [];
                state.ui.creditBulkDrafts = {};
                render();
            });

            creditBulkConfirm?.addEventListener('click', () => {
                const selectedIds = state.ui.creditBulkSelection || [];
                if (!selectedIds.length) {
                    showToast('Select at least one customer to proceed.', true);
                    return;
                }
                const { records } = summarizeCreditRecords();
                const selectedRecords = records.filter(record => selectedIds.includes(record.bikeId));
                if (!selectedRecords.length) {
                    showToast('Selected customers are no longer pending.', true);
                    state.ui.creditBulkSelection = [];
                    render();
                    return;
                }
                openModal('bulkPayments', selectedRecords);
            });
            
            // Expense Page: List Clicks
            expenseList.addEventListener('click', (e) => {
                const item = e.target.closest('[data-expense-id]');
                if (!item) return;
                
                const expense = state.data.expenses.find(ex => ex.id === item.dataset.expenseId);
                if (expense) {
                    openModal('editExpense', expense);
                }
            });
            
            // PR Page: Filters
            prFilter.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') {
                    prFilter.querySelector('button.active').classList.remove('active');
                    e.target.classList.add('active');
                    state.ui.currentPRFilter = e.target.dataset.filter;
                    renderPRPage();
                }
            });
            prSearch.addEventListener('input', (e) => {
                state.ui.currentPRSearch = e.target.value;
                renderPRPage();
            });
            
            // PR Page: List Clicks
            prList.addEventListener('click', (e) => {
                const actionButton = e.target.closest('[data-action]');
                if (actionButton) {
                    e.preventDefault();
                    const action = actionButton.dataset.action;
                    switch (action) {
                        case 'pr-call': {
                            const contact = actionButton.dataset.contact;
                            if (contact) {
                                window.open(`tel:${contact}`, '_self');
                            } else {
                                showToast('No contact number available.', true);
                            }
                            break;
                        }
                        case 'pr-whatsapp': {
                            const contact = actionButton.dataset.contact;
                            if (contact) {
                                window.open(`https://wa.me/${contact}`, '_blank');
                            } else {
                                showToast('No contact number available.', true);
                            }
                            break;
                        }
                        case 'pr-copy': {
                            const contact = actionButton.dataset.contact;
                            if (contact) {
                                copyTextToClipboard(contact);
                            }
                            break;
                        }
                        case 'pr-go-bike': {
                            const bikeName = actionButton.dataset.bikeName;
                            navigateToBikeRecord(bikeName);
                            break;
                        }
                        case 'pr-filter-supplier': {
                            const supplierName = actionButton.dataset.prName;
                            filterBikesBySupplier(supplierName);
                            break;
                        }
                        case 'pr-filter-owner': {
                            const ownerName = actionButton.dataset.prName;
                            filterBikesByOwner(ownerName);
                            break;
                        }
                        case 'pr-log-payment': {
                            const buyerName = actionButton.dataset.prName;
                            logPaymentForBuyer(buyerName);
                            break;
                        }
                        default:
                            break;
                    }
                    return;
                }

                const item = e.target.closest('[data-pr-id]');
                if (!item) return;
                
                const pr = state.data.pr.find(p => p.id === item.dataset.prId);
                if (pr) {
                    openModal('editPR', pr);
                }
            });

            // Global: Close sort dropdown on click outside
            document.addEventListener('click', (e) => {
                if (!bikeSortTrigger.contains(e.target) && !bikeSortMenu.contains(e.target)) {
                    bikeSortMenu.classList.add('hidden');
                }
            });
        };
        
        // --- App Initialization ---
        
        const loadAppData = async () => {
            showLoader();
            let persisted = null;
            try {
                persisted = await persistence.load();
            } catch (error) {
                console.error('Failed to load persisted data:', error);
            }

            if (!persisted) {
                persisted = JSON.parse(JSON.stringify(DEFAULT_DATA));
                await persistence.save(persisted);
            }

            state.data = persisted;
            runDataMigration();
            state.security.isUnlocked = false;
            updateSensitiveToggle();
            hideLoader();
            appWrapper.classList.remove('hidden');
            renderPage('dashboard');
            return (state.data?.settings?.pin || '1111') === '1111';
        };

        const init = async () => {
            setupPWAInstall();
            addEventListeners();
            const needsPinSetup = await loadAppData();
            if (needsPinSetup) {
                await requirePinSetup('Set a new 4–6 digit PIN to get started.');
            }
        };

        document.addEventListener('DOMContentLoaded', init);

