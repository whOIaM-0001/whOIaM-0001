class OptimizedBankingSystem {
    constructor() {
        this.apiBase = this.getApiBase();
        this.cache = new Map();
        this.searchDebounceTimer = null;
        this.currentPage = 'credit-card';
        this.isLoading = false;
        this.currentEditId = null;

        console.log('🚀 Banking System Initializing...');
        this.init();
    }

    init() {
        console.log('🔧 Setting up system...');
        this.setupEventListeners();
        this.setupSmartSearch();

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.loadDashboard();
            });
        } else {
            this.loadDashboard();
        }

        this.setupPerformanceMonitoring();
    }

    getApiBase() {
        const protocol = window.location.protocol;
        const host = window.location.host;
        const pathname = window.location.pathname;

        let basePath;
        if (pathname.includes('banking_system')) {
            const index = pathname.indexOf('banking_system');
            basePath = pathname.substring(0, index) + 'banking_system/api';
        } else {
            basePath = '/api';
        }

        const fullApiBase = `${protocol}//${host}${basePath}`;
        console.log(`🔧 API Base detected: ${fullApiBase}`);
        return fullApiBase;
    }

    setupEventListeners() {
        console.log('📋 Setting up event listeners...');

        const menuToggle = document.getElementById('menuToggle');
        const navClose = document.getElementById('navClose');
        const overlay = document.getElementById('overlay');
        const addCreditCardBtn = document.getElementById('addCreditCard');
        const addCCCDBtn = document.getElementById('addCCCD');

        if (menuToggle) {
            menuToggle.addEventListener('click', () => this.toggleNavigation());
        }

        if (navClose) {
            navClose.addEventListener('click', () => this.closeNavigation());
        }

        if (overlay) {
            overlay.addEventListener('click', () => this.closeNavigation());
        }

        if (addCreditCardBtn) {
            addCreditCardBtn.addEventListener('click', () => {
                console.log('🎭 Add Credit Card button clicked!');
                this.showAddCreditCardForm();
            });
        }

        if (addCCCDBtn) {
            addCCCDBtn.addEventListener('click', () => {
                console.log('🎭 Add CCCD button clicked!');
                this.showAddCCCDForm();
            });
        }

        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.target.closest('.nav-item').dataset.page;
                if (page) {
                    this.switchPage(page);
                }
            });
        });

        const profileContainer = document.querySelector('.profile-container');
        if (profileContainer) {
            profileContainer.addEventListener('click', () => this.toggleProfileDropdown());
        }

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                this.closeNavigation();
            }
        });

        this.setupFormEventListeners();
    }

    setupFormEventListeners() {
        console.log('📋 Setting up form event listeners...');

        const addCardForm = document.getElementById('addCardForm');
        if (addCardForm) {
            addCardForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCreditCard(e);
            });
        }

        const editCardForm = document.getElementById('editCardForm');
        if (editCardForm) {
            editCardForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleEditCreditCard(e);
            });
        }

        const addCCCDForm = document.getElementById('addCCCDForm');
        if (addCCCDForm) {
            addCCCDForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddCCCD(e);
            });
        }

        this.setupInputFormatting();
    }

    setupInputFormatting() {
        console.log('📝 Setting up input formatting...');

        // Format card number input
        const cardNumberInputs = document.querySelectorAll('input[name="card_number"]');
        cardNumberInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
                let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
                if (formattedValue.length > 19) {
                    formattedValue = formattedValue.substring(0, 19);
                }
                e.target.value = formattedValue;
            });
        });

        // Format expiry date inputs (MM/YYYY)
        const expiryInputs = document.querySelectorAll('input[name="expiry_date"]:not(.date-input), input[name="issue_date"]:not(.date-input)');
        expiryInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 2) {
                    value = value.substring(0, 2) + '/' + value.substring(2, 6);
                }
                e.target.value = value;
            });
        });

        // Format phone number inputs
        const phoneInputs = document.querySelectorAll('input[name="phone_number"], input[name="emergency_phone"]');
        phoneInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length > 11) {
                    value = value.substring(0, 11);
                }
                e.target.value = value;
            });
        });

        // Setup date formatting
        setTimeout(() => {
            this.setupDateInputFormatting();
        }, 100);
    }

    setupDateInputFormatting() {
        console.log('📅 Setting up ENHANCED date input formatting...');

        const dateInputs = document.querySelectorAll('.date-input');
        console.log(`🔍 Found ${dateInputs.length} date inputs`);

        dateInputs.forEach((input, index) => {
            console.log(`📅 Setting up date input ${index + 1}:`, input.name);

            input.addEventListener('input', (e) => this.handleDateInput(e));
            input.addEventListener('blur', (e) => this.handleDateBlur(e));
            input.addEventListener('focus', (e) => this.handleDateFocus(e));

            if (!input.placeholder) {
                input.placeholder = 'DD/MM/YYYY';
            }
            input.maxLength = 10;

            input.style.fontFamily = "'Courier New', monospace";
            input.style.letterSpacing = '1px';
        });
    }

    handleDateInput(event) {
        const input = event.target;
        let value = input.value;

        value = value.replace(/[^0-9\/]/g, '');
        const numbersOnly = value.replace(/\//g, '');

        let formatted = '';
        if (numbersOnly.length > 0) {
            formatted = numbersOnly.substring(0, 2);

            if (numbersOnly.length > 2) {
                formatted += '/' + numbersOnly.substring(2, 4);
            }

            if (numbersOnly.length > 4) {
                formatted += '/' + numbersOnly.substring(4, 8);
            }
        }

        input.value = formatted;
        this.validateDateInputReal(input);
    }

    handleDateBlur(event) {
        this.validateDateInput(event.target);
    }

    handleDateFocus(event) {
        const input = event.target;
        input.classList.remove('valid', 'invalid');
        this.clearDateError(input);
    }

    validateDateInputReal(input) {
        const value = input.value;
        if (value.length === 10) {
            this.validateDateInput(input);
        } else {
            input.classList.remove('valid', 'invalid');
            this.clearDateError(input);
        }
    }

    validateDateInput(input) {
        const value = input.value;
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;

        input.classList.remove('valid', 'invalid');

        if (!value) {
            if (!input.hasAttribute('required')) {
                return true;
            }
            input.classList.add('invalid');
            return false;
        }

        const match = value.match(dateRegex);
        if (!match) {
            input.classList.add('invalid');
            this.showDateError(input, 'Format: DD/MM/YYYY');
            return false;
        }

        const day = parseInt(match[1]);
        const month = parseInt(match[2]);
        const year = parseInt(match[3]);

        if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900 || year > 2100) {
            input.classList.add('invalid');
            this.showDateError(input, 'Ngày không hợp lệ');
            return false;
        }

        const date = new Date(year, month - 1, day);
        if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
            input.classList.add('invalid');
            this.showDateError(input, 'Ngày không tồn tại');
            return false;
        }

        if (input.name === 'date_of_birth') {
            const today = new Date();
            const age = today.getFullYear() - year;
            if (age < 0 || age > 150) {
                input.classList.add('invalid');
                this.showDateError(input, 'Tuổi từ 0-150');
                return false;
            }
        }

        if (input.name === 'expiry_date') {
            const today = new Date();
            if (date < today) {
                input.classList.add('invalid');
                this.showDateError(input, 'Phải là ngày tương lai');
                return false;
            }
        }

        input.classList.add('valid');
        this.clearDateError(input);
        return true;
    }

    showDateError(input, message) {
        this.clearDateError(input);

        const errorElement = document.createElement('div');
        errorElement.className = 'date-error';
        errorElement.style.cssText = `
            color: #ef4444;
            font-size: 0.75rem;
            margin-top: 0.25rem;
            display: flex;
            align-items: center;
            gap: 0.25rem;
            animation: fadeIn 0.3s ease;
        `;
        errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;

        input.parentNode.appendChild(errorElement);
    }

    clearDateError(input) {
        const existingError = input.parentNode.querySelector('.date-error');
        if (existingError) {
            existingError.remove();
        }
    }

    showAddCreditCardForm() {
        console.log('🎨 Opening Add Credit Card Modal...');

        const modal = document.getElementById('addCardModal');
        if (modal) {
            modal.classList.add('show');

            const form = document.getElementById('addCardForm');
            if (form) {
                form.reset();
            }

            setTimeout(() => {
                const container = modal.querySelector('.modal-container');
                if (container) {
                    container.style.transform = 'scale(1) translateY(0)';
                }
            }, 10);
        } else {
            console.error('❌ Add Card Modal not found!');
        }
    }

    showAddCCCDForm() {
        console.log('🎨 Opening Add CCCD Modal...');

        const modal = document.getElementById('addCCCDModal');
        if (modal) {
            modal.classList.add('show');

            const form = document.getElementById('addCCCDForm');
            if (form) {
                form.reset();
            }

            setTimeout(() => {
                const container = modal.querySelector('.modal-container');
                if (container) {
                    container.style.transform = 'scale(1) translateY(0)';
                }
            }, 10);
        } else {
            console.error('❌ Add CCCD Modal not found!');
        }
    }

    showEditCreditCardForm(cardData) {
        console.log('🎨 Opening Edit Credit Card Modal...', cardData);

        const modal = document.getElementById('editCardModal');
        if (modal && cardData) {
            this.currentEditId = cardData.id;

            document.getElementById('editCardId').value = cardData.id;
            document.getElementById('editCardHolderName').value = cardData.card_holder_name || '';
            document.getElementById('editExpiryDate').value = cardData.expiry_date || '';
            document.getElementById('editCardType').value = cardData.card_type || '';
            document.getElementById('editBankName').value = cardData.bank_name || '';
            document.getElementById('editCreditLimit').value = cardData.credit_limit || '';
            document.getElementById('editCurrentBalance').value = cardData.current_balance || '';
            document.getElementById('editPhoneNumber').value = cardData.phone_number || '';
            document.getElementById('editEmail').value = cardData.email || '';
            document.getElementById('editStatus').value = cardData.status || '';
            document.getElementById('editBillingAddress').value = cardData.billing_address || '';

            modal.classList.add('show');

            setTimeout(() => {
                const container = modal.querySelector('.modal-container');
                if (container) {
                    container.style.transform = 'scale(1) translateY(0)';
                }
            }, 10);
        } else {
            console.error('❌ Edit Card Modal not found or no data provided!');
        }
    }

    showViewCreditCardDetails(cardData) {
        console.log('👁️ Opening View Credit Card Modal...', cardData);

        const modal = document.getElementById('viewCardModal');
        if (modal && cardData) {
            document.getElementById('viewCardId').textContent = cardData.id || '-';
            document.getElementById('viewCardNumber').textContent = cardData.card_number_display || '**** **** **** ****';
            document.getElementById('viewCardHolder').textContent = (cardData.card_holder_name || 'N/A').toUpperCase();
            document.getElementById('viewCardExpiry').textContent = cardData.expiry_date || 'MM/YY';
            document.getElementById('viewCardLogo').textContent = cardData.card_type || 'CARD';
            document.getElementById('viewBankName').textContent = cardData.bank_name || '-';
            document.getElementById('viewCreditLimit').textContent = cardData.credit_limit_vnd || '-';
            document.getElementById('viewCurrentBalance').textContent = cardData.current_balance_vnd || '-';
            document.getElementById('viewAvailableCredit').textContent = cardData.available_credit_vnd || '-';
            document.getElementById('viewPhoneNumber').textContent = cardData.phone_number || '-';
            document.getElementById('viewEmail').textContent = cardData.email || '-';
            document.getElementById('viewBillingAddress').textContent = cardData.billing_address || '-';

            const statusBadge = document.getElementById('viewStatus');
            statusBadge.textContent = cardData.status || 'Unknown';
            statusBadge.className = `status-badge status-${cardData.status || 'unknown'}`;

            const usageProgress = document.getElementById('viewUsageProgress');
            const usagePercent = document.getElementById('viewUsagePercent');
            const usage = cardData.usage_percentage || 0;
            usageProgress.style.width = usage + '%';
            usageProgress.className = `usage-progress-large ${cardData.usage_level || 'low'}`;
            usagePercent.textContent = usage + '%';

            this.currentEditId = cardData.id;

            modal.classList.add('show');

            setTimeout(() => {
                const container = modal.querySelector('.modal-container');
                if (container) {
                    container.style.transform = 'scale(1) translateY(0)';
                }
            }, 10);
        } else {
            console.error('❌ View Card Modal not found or no data provided!');
        }
    }

    closeModal(modalId) {
        console.log('🚪 Closing modal:', modalId);

        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
        }

        this.currentEditId = null;
    }

    editFromView() {
        if (this.currentEditId) {
            this.closeModal('viewCardModal');

            const cached = this.cache.get('credit_cards');
            if (cached && cached.data) {
                const item = cached.data.find(item => item.id == this.currentEditId);
                if (item) {
                    setTimeout(() => {
                        this.showEditCreditCardForm(item);
                    }, 300);
                }
            }
        }
    }

    async handleAddCreditCard(event) {
        console.log('💳 Adding new credit card...');

        const formData = new FormData(event.target);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        data.user_id = 1;

        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log('✅ Credit card added:', data);

            this.showSuccess('Thêm thẻ tín dụng thành công!');
            this.closeModal('addCardModal');
            this.clearCache();
            this.loadDashboard();

        } catch (error) {
            console.error('❌ Error adding credit card:', error);
            this.showError('Lỗi khi thêm thẻ tín dụng: ' + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Lưu Thẻ';
            }
        }
    }

    async handleEditCreditCard(event) {
        console.log('✏️ Editing credit card...');

        const formData = new FormData(event.target);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang cập nhật...';
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 1500));

            console.log('✅ Credit card updated:', data);

            this.showSuccess('Cập nhật thẻ tín dụng thành công!');
            this.closeModal('editCardModal');
            this.clearCache();
            this.loadDashboard();

        } catch (error) {
            console.error('❌ Error updating credit card:', error);
            this.showError('Lỗi khi cập nhật thẻ tín dụng: ' + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Cập Nhật';
            }
        }
    }

    async handleAddCCCD(event) {
        console.log('🆔 Adding new CCCD...');

        const formData = new FormData(event.target);
        const data = {};

        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }

        const submitBtn = event.target.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 2000));

            console.log('✅ CCCD added:', data);

            this.showSuccess('Thêm CCCD thành công!');
            this.closeModal('addCCCDModal');
            this.clearCache();
            this.loadDashboard();

        } catch (error) {
            console.error('❌ Error adding CCCD:', error);
            this.showError('Lỗi khi thêm CCCD: ' + error.message);
        } finally {
            if (submitBtn) {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Lưu CCCD';
            }
        }
    }

    showSuccess(message) {
        const successNotification = document.createElement('div');
        successNotification.className = 'notification success';
        successNotification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
        successNotification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(successNotification);

        setTimeout(() => {
            if (successNotification.parentElement) {
                successNotification.remove();
            }
        }, 3000);
    }

    toggleNavigation() {
        const navDrawer = document.getElementById('navDrawer');
        const overlay = document.getElementById('overlay');

        if (navDrawer && overlay) {
            navDrawer.classList.toggle('active');
            overlay.classList.toggle('active');

            if (navDrawer.classList.contains('active')) {
                this.animateNavItems();
            }
        }
    }

    closeNavigation() {
        const navDrawer = document.getElementById('navDrawer');
        const overlay = document.getElementById('overlay');

        if (navDrawer) navDrawer.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    animateNavItems() {
        const items = document.querySelectorAll('.nav-item');
        items.forEach((item, index) => {
            item.style.animation = `slideInLeft 0.3s ease ${index * 0.1}s forwards`;
        });
    }

    switchPage(pageId) {
        console.log(`🔄 Switching to page: ${pageId}`);

        this.currentPage = pageId;

        document.querySelectorAll('.content-page').forEach(page => {
            page.classList.remove('active');
        });

        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        const targetPage = document.getElementById(`${pageId}-page`);
        const targetNavItem = document.querySelector(`[data-page="${pageId}"]`);

        if (targetPage) targetPage.classList.add('active');
        if (targetNavItem) targetNavItem.classList.add('active');

        this.closeNavigation();

        const searchInput = document.getElementById('searchInput');
        if (searchInput) searchInput.value = '';

        this.loadPageData(pageId);
    }

    async loadPageData(pageId) {
        try {
            console.log(`📊 Loading data for page: ${pageId}`);

            if (pageId === 'credit-card') {
                const creditCards = await this.fetchCreditCards();
                this.renderOptimizedTable(creditCards, 'creditCardTable', 'credit-card');
            } else if (pageId === 'cccd') {
                const cccdData = await this.fetchCCCDData();
                this.renderOptimizedTable(cccdData, 'cccdTable', 'cccd');
            }
        } catch (error) {
            console.error(`❌ Error loading ${pageId} data:`, error);
            this.showError(`Không thể tải dữ liệu ${pageId}: ${error.message}`);
        }
    }

    async loadDashboard() {
        if (this.isLoading) return;

        try {
            console.log('🏠 Loading dashboard...');
            this.isLoading = true;
            this.showLoading('dashboard');

            if (this.currentPage === 'credit-card') {
                const creditCards = await this.fetchCreditCards();
                this.renderOptimizedTable(creditCards, 'creditCardTable', 'credit-card');
                console.log(`✅ Loaded ${creditCards.length} credit cards`);
            } else if (this.currentPage === 'cccd') {
                const cccdData = await this.fetchCCCDData();
                this.renderOptimizedTable(cccdData, 'cccdTable', 'cccd');
                console.log(`✅ Loaded ${cccdData.length} CCCD records`);
            }

        } catch (error) {
            console.error('❌ Dashboard loading error:', error);
            this.showError(`Không thể tải dữ liệu dashboard: ${error.message}`);
        } finally {
            this.hideLoading('dashboard');
            this.isLoading = false;
        }
    }

    async fetchCreditCards() {
        const cacheKey = 'credit_cards';

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) {
                console.log('📋 Using cached credit cards data');
                return cached.data;
            }
        }

        const startTime = performance.now();
        console.log(`🌐 Fetching credit cards from: ${this.apiBase}/optimized_credit_cards.php`);

        try {
            const response = await fetch(`${this.apiBase}/optimized_credit_cards.php`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log(`📡 Response status: ${response.status}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();
            console.log('📄 Raw response:', text.substring(0, 200) + '...');

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('❌ JSON Parse Error:', parseError);
                throw new Error('Invalid JSON response from server');
            }

            if (!result.success) {
                throw new Error(result.error || 'API returned failure status');
            }

            this.cache.set(cacheKey, {
                data: result.data || [],
                timestamp: Date.now()
            });

            const loadTime = performance.now() - startTime;
            console.log(`✅ Credit Cards loaded in ${loadTime.toFixed(2)}ms (Server: ${result.meta?.execution_time_ms || 'N/A'}ms)`);

            return result.data || [];

        } catch (error) {
            console.error('❌ Credit Cards fetch error:', error);
            console.log('🔄 Returning mock data for testing...');
            return this.getMockCreditCards();
        }
    }

    async fetchCCCDData() {
        const cacheKey = 'cccd_data';

        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) {
                console.log('📋 Using cached CCCD data');
                return cached.data;
            }
        }

        const startTime = performance.now();
        console.log(`🌐 Fetching CCCD data from: ${this.apiBase}/optimized_cccd.php`);

        try {
            const response = await fetch(`${this.apiBase}/optimized_cccd.php`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            console.log(`📡 Response status: ${response.status}`);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const text = await response.text();
            console.log('📄 Raw response:', text.substring(0, 200) + '...');

            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('❌ JSON Parse Error:', parseError);
                throw new Error('Invalid JSON response from server');
            }

            if (!result.success) {
                throw new Error(result.error || 'API returned failure status');
            }

            this.cache.set(cacheKey, {
                data: result.data || [],
                timestamp: Date.now()
            });

            const loadTime = performance.now() - startTime;
            console.log(`✅ CCCD Data loaded in ${loadTime.toFixed(2)}ms (Server: ${result.meta?.execution_time_ms || 'N/A'}ms)`);

            return result.data || [];

        } catch (error) {
            console.error('❌ CCCD fetch error:', error);
            console.log('🔄 Returning mock data for testing...');
            return this.getMockCCCDData();
        }
    }

    getMockCreditCards() {
        return [
            {
                id: 1,
                card_number_display: '**** **** **** 9012',
                card_holder_name: 'Nguyễn Văn An',
                expiry_date: '12/2027',
                card_type: 'Visa',
                bank_name: 'Vietcombank',
                credit_limit: 50000000,
                current_balance: 15000000,
                available_credit: 35000000,
                credit_limit_vnd: '50.000.000 ₫',
                current_balance_vnd: '15.000.000 ₫',
                available_credit_vnd: '35.000.000 ₫',
                phone_number: '0901234567',
                email: 'nguyenvanan@email.com',
                billing_address: '123 Đường ABC, Q1, TP.HCM',
                status: 'active',
                usage_percentage: 30,
                usage_level: 'low'
            },
            {
                id: 2,
                card_number_display: '**** **** **** 2222',
                card_holder_name: 'Trần Thị Bích',
                expiry_date: '08/2026',
                card_type: 'MasterCard',
                bank_name: 'Techcombank',
                credit_limit: 30000000,
                current_balance: 22000000,
                available_credit: 8000000,
                credit_limit_vnd: '30.000.000 ₫',
                current_balance_vnd: '22.000.000 ₫',
                available_credit_vnd: '8.000.000 ₫',
                phone_number: '0907654321',
                email: 'tranbich@email.com',
                billing_address: '456 Đường XYZ, Q3, TP.HCM',
                status: 'active',
                usage_percentage: 73,
                usage_level: 'medium'
            },
            {
                id: 3,
                card_number_display: '**** **** **** 9876',
                card_holder_name: 'Lê Minh Tuấn',
                expiry_date: '06/2028',
                card_type: 'Visa',
                bank_name: 'VPBank',
                credit_limit: 75000000,
                current_balance: 25000000,
                available_credit: 50000000,
                credit_limit_vnd: '75.000.000 ₫',
                current_balance_vnd: '25.000.000 ₫',
                available_credit_vnd: '50.000.000 ₫',
                phone_number: '0912345678',
                email: 'leminhtuan@outlook.com',
                billing_address: '789 Đường DEF, Q7, TP.HCM',
                status: 'active',
                usage_percentage: 33,
                usage_level: 'low'
            }
        ];
    }

    getMockCCCDData() {
        return [
            {
                id: 1,
                cccd_number_display: '001***7890',
                full_name: 'Nguyễn Văn An',
                date_of_birth_display: '15/05/1990',
                gender: 'Nam',
                nationality: 'Việt Nam',
                hometown: 'Hà Nội',
                current_address: '123 Đường ABC, Q1, TP.HCM',
                phone_number: '0901234567',
                email: 'nguyenvanan@email.com',
                occupation: 'Kỹ sư phần mềm',
                education_level: 'Đại học',
                status: 'active'
            },
            {
                id: 2,
                cccd_number_display: '001***4321',
                full_name: 'Trần Thị Bích',
                date_of_birth_display: '22/11/1985',
                gender: 'Nữ',
                nationality: 'Việt Nam',
                hometown: 'Đà Nẵng',
                current_address: '456 Đường XYZ, Q3, TP.HCM',
                phone_number: '0907654321',
                email: 'tranbich@email.com',
                occupation: 'Giám đốc Marketing',
                education_level: 'Thạc sĩ',
                status: 'active'
            }
        ];
    }

    setupSmartSearch() {
        const searchInput = document.getElementById('searchInput');

        if (searchInput) {
            console.log('🔍 Setting up smart search...');
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();

                clearTimeout(this.searchDebounceTimer);

                this.searchDebounceTimer = setTimeout(() => {
                    if (query.length >= 2) {
                        this.performSearch(query);
                    } else if (query.length === 0) {
                        this.loadDashboard();
                    }
                }, 300);
            });
        }
    }

    async performSearch(query) {
        try {
            console.log(`🔍 Searching for: "${query}" in ${this.currentPage}`);
            this.showLoading('search');

            const startTime = performance.now();
            let searchResults = [];

            if (this.currentPage === 'credit-card') {
                try {
                    const response = await fetch(`${this.apiBase}/optimized_credit_cards.php?action=search&q=${encodeURIComponent(query)}`);
                    const result = await response.json();
                    if (result.success) {
                        searchResults = result.data;
                        this.renderOptimizedTable(searchResults, 'creditCardTable', 'credit-card');
                    }
                } catch (error) {
                    console.error('Search API error:', error);
                    const allData = this.getMockCreditCards();
                    searchResults = allData.filter(item =>
                        item.card_holder_name.toLowerCase().includes(query.toLowerCase()) ||
                        item.bank_name.toLowerCase().includes(query.toLowerCase()) ||
                        item.email.toLowerCase().includes(query.toLowerCase())
                    );
                    this.renderOptimizedTable(searchResults, 'creditCardTable', 'credit-card');
                }
            } else if (this.currentPage === 'cccd') {
                try {
                    const response = await fetch(`${this.apiBase}/optimized_cccd.php?action=search&q=${encodeURIComponent(query)}`);
                    const result = await response.json();
                    if (result.success) {
                        searchResults = result.data;
                        this.renderOptimizedTable(searchResults, 'cccdTable', 'cccd');
                    }
                } catch (error) {
                    console.error('Search API error:', error);
                    const allData = this.getMockCCCDData();
                    searchResults = allData.filter(item =>
                        item.full_name.toLowerCase().includes(query.toLowerCase()) ||
                        item.occupation.toLowerCase().includes(query.toLowerCase()) ||
                        item.email.toLowerCase().includes(query.toLowerCase())
                    );
                    this.renderOptimizedTable(searchResults, 'cccdTable', 'cccd');
                }
            }

            const loadTime = performance.now() - startTime;
            console.log(`🔍 Search completed in ${loadTime.toFixed(2)}ms - Found ${searchResults.length} results`);

        } catch (error) {
            console.error('❌ Search error:', error);
            this.showError(`Lỗi khi tìm kiếm: ${error.message}`);
        } finally {
            this.hideLoading('search');
        }
    }

    renderOptimizedTable(data, containerId, type) {
        console.log(`📊 Rendering table ${containerId} with ${data?.length || 0} items`);

        const tbody = document.querySelector(`#${containerId} tbody`);

        if (!tbody) {
            console.error(`❌ Table body #${containerId} tbody not found`);
            return;
        }

        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="14" class="no-data">
                        <i class="fas fa-inbox"></i>
                        <p>Không có dữ liệu</p>
                    </td>
                </tr>
            `;
            return;
        }

        const visibleRows = Math.min(data.length, 100);
        let tableHTML = '';

        if (type === 'credit-card') {
            tableHTML = this.generateCreditCardRows(data.slice(0, visibleRows));
        } else if (type === 'cccd') {
            tableHTML = this.generateCCCDRows(data.slice(0, visibleRows));
        }

        tbody.innerHTML = tableHTML;

        setTimeout(() => {
            this.animateTableRows(tbody);
        }, 100);

        console.log(`✅ Table rendered successfully with ${visibleRows} visible rows`);
    }

    generateCreditCardRows(data) {
        return data.map(card => `
            <tr class="table-row-animate" data-id="${card.id}">
                <td><span class="id-badge">#${card.id}</span></td>
                <td class="encrypted-field">
                    <span class="card-number">${card.card_number_display || '****'}</span>
                    <small class="card-type">${card.card_type || 'N/A'}</small>
                </td>
                <td class="holder-name">
                    <div class="user-info">
                        <span class="name">${card.card_holder_name || 'N/A'}</span>
                        <small class="contact">${card.email || 'N/A'}</small>
                    </div>
                </td>
                <td><span class="expiry-date">${card.expiry_date || 'N/A'}</span></td>
                <td>${card.card_type || 'N/A'}</td>
                <td>
                    <div class="bank-info">
                        <span class="bank-name">${card.bank_name || 'N/A'}</span>
                    </div>
                </td>
                <td class="amount">${card.credit_limit_vnd || '0 ₫'}</td>
                <td class="amount">${card.current_balance_vnd || '0 ₫'}</td>
                <td class="amount">${card.available_credit_vnd || '0 ₫'}</td>
                <td>${card.phone_number || 'N/A'}</td>
                <td>${card.email || 'N/A'}</td>
                <td><span class="status-badge status-${card.status || 'unknown'}">${card.status || 'Unknown'}</span></td>
                <td class="actions">
                    <button class="btn-action btn-view" onclick="bankingSystem.viewDetails('${card.id}', 'credit-card')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="bankingSystem.editRecord('${card.id}', 'credit-card')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    generateCCCDRows(data) {
        return data.map(cccd => `
            <tr class="table-row-animate" data-id="${cccd.id}">
                <td><span class="id-badge">#${cccd.id}</span></td>
                <td class="encrypted-field">${cccd.cccd_number_display || '***'}</td>
                <td>
                    <div class="user-info">
                        <span class="name">${cccd.full_name || 'N/A'}</span>
                        <small class="contact">${cccd.email || 'N/A'}</small>
                    </div>
                </td>
                <td>${cccd.date_of_birth_display || 'N/A'}</td>
                <td>${cccd.gender || 'N/A'}</td>
                <td>${cccd.nationality || 'N/A'}</td>
                <td>${cccd.hometown || 'N/A'}</td>
                <td>${cccd.current_address || 'N/A'}</td>
                <td>${cccd.phone_number || 'N/A'}</td>
                <td>${cccd.occupation || 'N/A'}</td>
                <td>${cccd.education_level || 'N/A'}</td>
                <td><span class="status-badge status-${cccd.status || 'unknown'}">${cccd.status || 'Unknown'}</span></td>
                <td class="actions">
                    <button class="btn-action btn-view" onclick="bankingSystem.viewDetails('${cccd.id}', 'cccd')" title="Xem chi tiết">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-edit" onclick="bankingSystem.editRecord('${cccd.id}', 'cccd')" title="Chỉnh sửa">
                        <i class="fas fa-edit"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    animateTableRows(container) {
        const rows = container.querySelectorAll('.table-row-animate');
        rows.forEach((row, index) => {
            row.style.opacity = '0';
            row.style.transform = 'translateY(10px)';

            setTimeout(() => {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '1';
                row.style.transform = 'translateY(0)';
            }, index * 50);
        });
    }

    showLoading(type) {
        const loadingHTML = `
            <div class="loading-overlay" id="loading-${type}">
                <div class="loading-spinner"></div>
                <p>Đang tải dữ liệu...</p>
            </div>
        `;

        const tableContainer = document.querySelector('.table-container');
        if (tableContainer && !tableContainer.querySelector(`#loading-${type}`)) {
            tableContainer.style.position = 'relative';
            tableContainer.insertAdjacentHTML('beforeend', loadingHTML);
        }
    }

    hideLoading(type) {
        const loadingElement = document.getElementById(`loading-${type}`);
        if (loadingElement) {
            loadingElement.remove();
        }
    }

    showError(message) {
        console.error('🚨 Error:', message);

        const errorNotification = document.createElement('div');
        errorNotification.className = 'notification error';
        errorNotification.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        document.body.appendChild(errorNotification);

        setTimeout(() => {
            if (errorNotification.parentElement) {
                errorNotification.remove();
            }
        }, 5000);
    }

    setupPerformanceMonitoring() {
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`📊 Page loaded in ${loadTime.toFixed(2)}ms`);
            this.showPerformanceBadge(loadTime);
        });
    }

    showPerformanceBadge(loadTime) {
        const badge = document.createElement('div');
        badge.className = 'performance-badge';
        badge.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 5px;
            box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
            transition: opacity 0.3s ease;
        `;
        badge.innerHTML = `
            <i class="fas fa-tachometer-alt"></i>
            <span>Load: ${loadTime.toFixed(0)}ms</span>
        `;

        document.body.appendChild(badge);

        setTimeout(() => {
            badge.style.opacity = '0';
            setTimeout(() => badge.remove(), 300);
        }, 3000);
    }

    toggleProfileDropdown() {
        console.log('👤 Profile dropdown clicked - whOIaM-0001');
        this.showError('Chức năng profile đang được phát triển...');
    }

    viewDetails(id, type) {
        console.log(`👁️ Viewing ${type} details for ID: ${id}`);

        const cacheKey = type === 'credit-card' ? 'credit_cards' : 'cccd_data';
        const cached = this.cache.get(cacheKey);

        if (cached && cached.data) {
            const item = cached.data.find(item => item.id == id);
            if (item) {
                if (type === 'credit-card') {
                    this.showViewCreditCardDetails(item);
                } else {
                    this.showError('Chức năng xem chi tiết CCCD đang được phát triển...');
                }
            } else {
                this.showError('Không tìm thấy dữ liệu');
            }
        } else {
            this.showError('Dữ liệu chưa được tải');
        }
    }

    editRecord(id, type) {
        console.log(`✏️ Editing ${type} record ID: ${id}`);

        const cacheKey = type === 'credit-card' ? 'credit_cards' : 'cccd_data';
        const cached = this.cache.get(cacheKey);

        if (cached && cached.data) {
            const item = cached.data.find(item => item.id == id);
            if (item) {
                if (type === 'credit-card') {
                    this.showEditCreditCardForm(item);
                } else {
                    this.showError('Chức năng chỉnh sửa CCCD đang được phát triển...');
                }
            } else {
                this.showError('Không tìm thấy dữ liệu');
            }
        } else {
            this.showError('Dữ liệu chưa được tải');
        }
    }

    clearCache() {
        this.cache.clear();
        console.log('🗑️ Cache cleared successfully');
    }
}

// Additional CSS for animations
const additionalStyles = `
    @keyframes slideInLeft {
        from {
            opacity: 0;
            transform: translateX(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    .btn-loading {
        opacity: 0.7;
        cursor: not-allowed !important;
    }
    
    .performance-badge {
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        padding: 8px 12px;
        border-radius: 20px;
        font-size: 0.8rem;
        font-weight: 500;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 5px;
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        transition: opacity 0.3s ease;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);

// Initialize system
console.log('🚀 Initializing Banking System...');

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📋 DOM Content Loaded - Creating Banking System');
        window.bankingSystem = new OptimizedBankingSystem();
    });
} else {
    console.log('📋 DOM Already Ready - Creating Banking System');
    window.bankingSystem = new OptimizedBankingSystem();
}

// Global functions
window.closeModal = function(modalId) {
    if (window.bankingSystem) {
        window.bankingSystem.closeModal(modalId);
    }
};

window.editFromView = function() {
    if (window.bankingSystem) {
        window.bankingSystem.editFromView();
    }
};

window.OptimizedBankingSystem = OptimizedBankingSystem;

console.log('✅ Banking System Script Loaded Successfully');

// Emergency CSS injection for table fix
const emergencyTableCSS = `
    .table-container {
        background: rgba(255, 255, 255, 0.9) !important;
        border-radius: 20px !important;
        backdrop-filter: blur(20px) !important;
        box-shadow: 0 8px 32px rgba(31, 38, 135, 0.37) !important;
        overflow: hidden !important;
        margin-top: 2rem !important;
    }
    
    .table-wrapper {
        overflow-x: auto !important;
        max-height: 70vh !important;
        width: 100% !important;
    }
    
    .data-table {
        width: 100% !important;
        border-collapse: collapse !important;
        font-size: 0.85rem !important;
        background: white !important;
        table-layout: fixed !important;
        min-width: 1200px !important;
    }
    
    .data-table thead {
        background: linear-gradient(135deg, #667eea, #764ba2) !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 10 !important;
    }
    
    .data-table th {
        color: white !important;
        padding: 1rem 0.75rem !important;
        text-align: left !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
        vertical-align: middle !important;
        border-right: 1px solid rgba(255, 255, 255, 0.2) !important;
    }
    
    .data-table td {
        padding: 1rem 0.75rem !important;
        vertical-align: middle !important;
        border-right: 1px solid rgba(102, 126, 234, 0.05) !important;
        text-overflow: ellipsis !important;
        overflow: hidden !important;
        white-space: nowrap !important;
        border-bottom: 1px solid rgba(102, 126, 234, 0.1) !important;
    }
    
    .data-table tbody tr:hover {
        background: rgba(102, 126, 234, 0.05) !important;
        transform: scale(1.01) !important;
    }
`;

const emergencyTableStyle = document.createElement('style');
emergencyTableStyle.textContent = emergencyTableCSS;
document.head.appendChild(emergencyTableStyle);

console.log('🚨 Emergency Table CSS Fix Applied!');