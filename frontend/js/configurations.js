// Configurations Page JavaScript
class ConfigurationsPage {
    constructor() {
        this.configurations = [];
        this.filteredConfigurations = [];
        this.currentPage = 1;
        this.itemsPerPage = 6;
        this.totalPages = 1;
        this.currentFilters = {
            game: '',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        
        this.init();
    }

    async init() {
        // Setup degli event listeners
        this.setupEventListeners();
        
        // Carica le configurazioni
        await this.loadConfigurations();
    }

    setupEventListeners() {
        // Form di filtro
        const filterForm = document.getElementById('filterForm');
        if (filterForm) {
            filterForm.addEventListener('submit', (e) => this.handleFilter(e));
        }

        // Input di ricerca in tempo reale
        const gameFilter = document.getElementById('gameFilter');
        if (gameFilter) {
            let timeout;
            gameFilter.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.currentFilters.game = e.target.value;
                    this.applyFilters();
                }, 500);
            });
        }

        // Select di ordinamento
        const sortBy = document.getElementById('sortBy');
        const sortOrder = document.getElementById('sortOrder');
        
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                this.currentFilters.sortBy = e.target.value;
                this.applyFilters();
            });
        }

        if (sortOrder) {
            sortOrder.addEventListener('change', (e) => {
                this.currentFilters.sortOrder = e.target.value;
                this.applyFilters();
            });
        }
    }

    async loadConfigurations() {
        const loadingElement = document.getElementById('configurations-loading');
        const listElement = document.getElementById('configurations-list');

        try {
            // Mostra loading
            loadingElement.style.display = 'flex';
            listElement.style.display = 'none';

            // Carica le configurazioni
            this.configurations = await apiClient.searchConfigs();
            
            // Applica i filtri iniziali
            this.applyFilters();
            
            // Calcola e mostra le statistiche
            this.updateStats();

        } catch (error) {
            console.error('Errore nel caricamento delle configurazioni:', error);
            apiClient.showError('Errore nel caricamento delle configurazioni: ' + error.message);
            
            // Mostra stato di errore
            listElement.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Impossibile caricare le configurazioni. Riprova più tardi.
                </div>
            `;
        } finally {
            // Nascondi loading
            loadingElement.style.display = 'none';
            listElement.style.display = 'block';
        }
    }

    applyFilters() {
        // Filtra le configurazioni
        this.filteredConfigurations = this.configurations.filter(config => {
            const matchesGame = !this.currentFilters.game || 
                config.game.toLowerCase().includes(this.currentFilters.game.toLowerCase()) ||
                config.title.toLowerCase().includes(this.currentFilters.game.toLowerCase());
            
            return matchesGame;
        });

        // Ordina le configurazioni
        this.filteredConfigurations.sort((a, b) => {
            const field = this.currentFilters.sortBy;
            const order = this.currentFilters.sortOrder;
            
            let valueA = a[field] || '';
            let valueB = b[field] || '';
            
            // Gestione speciale per le date
            if (field === 'created_at') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            } else {
                valueA = valueA.toString().toLowerCase();
                valueB = valueB.toString().toLowerCase();
            }
            
            let comparison = 0;
            if (valueA > valueB) comparison = 1;
            if (valueA < valueB) comparison = -1;
            
            return order === 'asc' ? comparison : -comparison;
        });

        // Aggiorna la paginazione
        this.updatePagination();
        
        // Mostra le configurazioni
        this.renderConfigurations();
    }

    updatePagination() {
        this.totalPages = Math.ceil(this.filteredConfigurations.length / this.itemsPerPage);
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        if (this.currentPage < 1) this.currentPage = 1;

        this.renderPagination();
    }

    renderPagination() {
        const paginationNav = document.getElementById('pagination-nav');
        const pagination = document.getElementById('pagination');

        if (this.totalPages <= 1) {
            paginationNav.style.display = 'none';
            return;
        }

        paginationNav.style.display = 'block';
        
        let paginationHtml = '';

        // Pulsante precedente
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        paginationHtml += `
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" onclick="configurationsPage.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;

        // Numeri di pagina
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);

        if (startPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="configurationsPage.goToPage(1)">1</a>
                </li>
            `;
            if (startPage > 2) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const active = i === this.currentPage ? 'active' : '';
            paginationHtml += `
                <li class="page-item ${active}">
                    <a class="page-link" href="#" onclick="configurationsPage.goToPage(${i})">${i}</a>
                </li>
            `;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
            }
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="configurationsPage.goToPage(${this.totalPages})">${this.totalPages}</a>
                </li>
            `;
        }

        // Pulsante successivo
        const nextDisabled = this.currentPage === this.totalPages ? 'disabled' : '';
        paginationHtml += `
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" onclick="configurationsPage.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;

        pagination.innerHTML = paginationHtml;
    }

    renderConfigurations() {
        const listElement = document.getElementById('configurations-list');
        
        if (this.filteredConfigurations.length === 0) {
            listElement.innerHTML = this.getEmptyState();
            return;
        }

        // Calcola gli elementi da mostrare per la pagina corrente
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageConfigurations = this.filteredConfigurations.slice(startIndex, endIndex);

        // Genera HTML
        const configurationsHtml = pageConfigurations.map(config => this.generateConfigurationCard(config)).join('');
        
        listElement.innerHTML = `
            <div class="row">
                ${configurationsHtml}
            </div>
        `;

        // Anima l'ingresso delle carte
        setTimeout(() => {
            document.querySelectorAll('.config-card').forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('fade-in');
                }, index * 100);
            });
        }, 50);
    }

    generateConfigurationCard(config) {
        const truncatedDescription = apiClient.truncateText(config.description || 'Nessuna descrizione disponibile', 120);
        const createdDate = config.created_at ? apiClient.formatDate(config.created_at) : 'Data non disponibile';
        const tags = config.tags || [];
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="config-card">
                    <div class="config-header">
                        <h6 class="config-title">${config.title || 'Configurazione senza titolo'}</h6>
                        <small class="config-game">
                            <i class="fas fa-gamepad me-1"></i>
                            ${config.game || 'Gioco non specificato'}
                        </small>
                    </div>
                    <div class="config-body">
                        <p class="config-description">${truncatedDescription}</p>
                        
                        ${tags.length > 0 ? `
                            <div class="config-tags">
                                ${tags.slice(0, 4).map(tag => 
                                    `<span class="config-tag">${tag}</span>`
                                ).join('')}
                                ${tags.length > 4 ? `<span class="config-tag">+${tags.length - 4}</span>` : ''}
                            </div>
                        ` : ''}
                        
                        <div class="config-stats">
                            <div class="config-stat">
                                <i class="fas fa-clock"></i>
                                <small>${createdDate}</small>
                            </div>
                            <div class="config-stat">
                                <i class="fas fa-user"></i>
                                <small>ID: ${config.user_id ? config.user_id.substring(0, 8) : 'N/A'}</small>
                            </div>
                        </div>
                        
                        <div class="config-actions">
                            <button class="btn btn-primary btn-sm" onclick="configurationsPage.viewConfiguration('${config._id}')">
                                <i class="fas fa-eye me-1"></i>
                                Visualizza
                            </button>
                            <button class="btn btn-outline-info btn-sm" onclick="configurationsPage.showConfigDetails('${config._id}')">
                                <i class="fas fa-info-circle me-1"></i>
                                Dettagli
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="configurationsPage.shareConfiguration('${config._id}')">
                                <i class="fas fa-share me-1"></i>
                                Condividi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyState() {
        let message = 'Nessuna configurazione trovata';
        let description = 'Non ci sono configurazioni che corrispondono ai criteri di ricerca.';
        let actionButton = '';

        if (this.configurations.length === 0) {
            message = 'Nessuna configurazione disponibile';
            description = 'Sembra che non ci siano ancora configurazioni nel sistema.';
            actionButton = `
                <a href="upload.html" class="btn btn-primary">
                    <i class="fas fa-upload me-2"></i>
                    Carica la Prima Configurazione
                </a>
            `;
        } else {
            actionButton = `
                <button class="btn btn-outline-primary" onclick="configurationsPage.clearFilters()">
                    <i class="fas fa-times me-2"></i>
                    Rimuovi Filtri
                </button>
            `;
        }

        return `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h5>${message}</h5>
                <p>${description}</p>
                ${actionButton}
            </div>
        `;
    }

    updateStats() {
        const statsSection = document.getElementById('stats-section');
        
        if (this.configurations.length === 0) {
            statsSection.style.display = 'none';
            return;
        }

        statsSection.style.display = 'flex';

        // Totale configurazioni
        document.getElementById('total-configs').textContent = this.configurations.length;

        // Giochi unici
        const uniqueGames = [...new Set(this.configurations.map(c => c.game))];
        document.getElementById('unique-games').textContent = uniqueGames.length;

        // Configurazioni recenti (ultimi 7 giorni)
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentConfigs = this.configurations.filter(c => {
            if (!c.created_at) return false;
            return new Date(c.created_at) > sevenDaysAgo;
        });
        document.getElementById('recent-count').textContent = recentConfigs.length;

        // Valutazione media (placeholder per ora)
        document.getElementById('avg-rating').textContent = '4.2★';
    }

    handleFilter(event) {
        event.preventDefault();
        
        this.currentFilters.game = document.getElementById('gameFilter').value;
        this.currentFilters.sortBy = document.getElementById('sortBy').value;
        this.currentFilters.sortOrder = document.getElementById('sortOrder').value;
        
        this.currentPage = 1;
        this.applyFilters();
    }

    clearFilters() {
        document.getElementById('gameFilter').value = '';
        document.getElementById('sortBy').value = 'created_at';
        document.getElementById('sortOrder').value = 'desc';
        
        this.currentFilters = {
            game: '',
            sortBy: 'created_at',
            sortOrder: 'desc'
        };
        
        this.currentPage = 1;
        this.applyFilters();
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages) return;
        
        this.currentPage = page;
        this.renderConfigurations();
        this.renderPagination();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    async viewConfiguration(configId) {
        try {
            window.location.href = `configuration.html?id=${configId}`;
        } catch (error) {
            apiClient.showError('Errore nell\'apertura della configurazione');
        }
    }

    async showConfigDetails(configId) {
        try {
            const config = await apiClient.getConfig(configId);
            
            const modalTitle = document.getElementById('configModalTitle');
            const modalBody = document.getElementById('configModalBody');
            const viewFullBtn = document.getElementById('viewFullConfig');
            
            modalTitle.textContent = config.title || 'Configurazione senza titolo';
            
            modalBody.innerHTML = `
                <div class="config-details">
                    <div class="row mb-3">
                        <div class="col-sm-3"><strong>Gioco:</strong></div>
                        <div class="col-sm-9">${config.game || 'Non specificato'}</div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-sm-3"><strong>Descrizione:</strong></div>
                        <div class="col-sm-9">${config.description || 'Nessuna descrizione'}</div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-sm-3"><strong>Data creazione:</strong></div>
                        <div class="col-sm-9">${config.created_at ? apiClient.formatDate(config.created_at) : 'Non disponibile'}</div>
                    </div>
                    ${config.tags && config.tags.length > 0 ? `
                        <div class="row mb-3">
                            <div class="col-sm-3"><strong>Tags:</strong></div>
                            <div class="col-sm-9">
                                ${config.tags.map(tag => `<span class="config-tag">${tag}</span>`).join(' ')}
                            </div>
                        </div>
                    ` : ''}
                    <div class="row mb-3">
                        <div class="col-sm-3"><strong>Parametri:</strong></div>
                        <div class="col-sm-9">
                            <pre class="bg-light p-2 rounded" style="max-height: 200px; overflow-y: auto;">${JSON.stringify(config.parameters, null, 2)}</pre>
                        </div>
                    </div>
                </div>
            `;
            
            viewFullBtn.onclick = () => {
                window.location.href = `configuration.html?id=${configId}`;
            };
            
            const modal = new bootstrap.Modal(document.getElementById('configModal'));
            modal.show();
            
        } catch (error) {
            apiClient.showError('Errore nel caricamento dei dettagli: ' + error.message);
        }
    }

    shareConfiguration(configId) {
        const shareUrl = `${window.location.origin}/configuration.html?id=${configId}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'Configurazione Game Config Hub',
                text: 'Guarda questa configurazione interessante!',
                url: shareUrl
            }).catch(err => {
                console.log('Errore nella condivisione:', err);
                this.fallbackShare(shareUrl);
            });
        } else {
            this.fallbackShare(shareUrl);
        }
    }

    fallbackShare(url) {
        navigator.clipboard.writeText(url).then(() => {
            apiClient.showSuccess('Link copiato negli appunti!');
        }).catch(() => {
            apiClient.showError('Impossibile copiare il link');
        });
    }

    async refresh() {
        await this.loadConfigurations();
        apiClient.showSuccess('Configurazioni aggiornate!');
    }
}

// Inizializza la pagina quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.configurationsPage = new ConfigurationsPage();
});

// CSS aggiuntivo per le statistiche
const additionalCSS = `
.stats-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    text-align: center;
    transition: all 0.3s ease;
    margin-bottom: 1rem;
}

.stats-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 20px rgba(0,0,0,0.15);
}

.stats-icon {
    font-size: 2rem;
    color: var(--primary-color);
    margin-bottom: 0.5rem;
}

.stats-content h4 {
    font-size: 2rem;
    font-weight: bold;
    margin: 0;
    color: var(--dark-color);
}

.stats-content p {
    margin: 0;
    color: var(--secondary-color);
    font-size: 0.9rem;
}
`;

// Aggiungi CSS alla pagina
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);
