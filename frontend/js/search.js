// Search Page JavaScript
class SearchPage {
    constructor() {
        this.currentView = 'grid';
        this.currentPage = 1;
        this.resultsPerPage = 20;
        this.totalResults = 0;
        this.searchResults = [];
        this.searchStartTime = 0;
        this.advancedFiltersVisible = false;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadAvailableData();
        this.setupAdvancedFilters();
        
        // Controlla se c'è una query nell'URL
        this.checkUrlParams();
    }

    setupEventListeners() {
        // Form di ricerca
        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        // Ricerca in tempo reale (con debounce)
        const searchQuery = document.getElementById('searchQuery');
        if (searchQuery) {
            let timeout;
            searchQuery.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    if (e.target.value.trim().length >= 3 || e.target.value.trim().length === 0) {
                        this.performSearch();
                    }
                }, 500);
            });
        }

        // Filtri avanzati
        const toggleAdvanced = document.getElementById('toggleAdvanced');
        if (toggleAdvanced) {
            toggleAdvanced.addEventListener('click', () => this.toggleAdvancedFilters());
        }

        // Rating slider
        const minRating = document.getElementById('minRating');
        if (minRating) {
            minRating.addEventListener('input', (e) => {
                this.updateRatingDisplay(e.target.value);
                this.performSearch();
            });
        }

        // Altri filtri con auto-search
        const autoSearchFilters = ['gameFilter', 'tagsFilter', 'sortField', 'sortOrder', 'limitResults'];
        autoSearchFilters.forEach(filterId => {
            const element = document.getElementById(filterId);
            if (element) {
                element.addEventListener('change', () => this.performSearch());
            }
        });
    }

    async loadAvailableData() {
        try {
            // Carica tutti i dati per popolare le liste di suggerimenti
            const allConfigs = await apiClient.searchConfigs();
            
            // Estrai giochi unici
            const games = [...new Set(allConfigs.map(c => c.game).filter(g => g))];
            this.populateDatalist('gamesList', games);
            
            // Estrai tags unici
            const allTags = allConfigs.flatMap(c => c.tags || []);
            const uniqueTags = [...new Set(allTags)];
            this.populateDatalist('tagsList', uniqueTags);
            
        } catch (error) {
            console.warn('Errore nel caricamento dei dati di suggerimento:', error);
        }
    }

    populateDatalist(datalistId, items) {
        const datalist = document.getElementById(datalistId);
        if (!datalist) return;
        
        datalist.innerHTML = items
            .sort()
            .map(item => `<option value="${item}">`)
            .join('');
    }

    setupAdvancedFilters() {
        // Nascondi i filtri avanzati inizialmente
        const advancedFilters = document.getElementById('advancedFilters');
        if (advancedFilters) {
            advancedFilters.style.display = 'none';
        }
        
        // Setup rating display
        this.updateRatingDisplay(0);
    }

    toggleAdvancedFilters() {
        const advancedFilters = document.getElementById('advancedFilters');
        const toggleBtn = document.getElementById('toggleAdvanced');
        
        if (!advancedFilters || !toggleBtn) return;
        
        this.advancedFiltersVisible = !this.advancedFiltersVisible;
        
        if (this.advancedFiltersVisible) {
            advancedFilters.style.display = 'block';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-up me-1"></i>Nascondi Filtri Avanzati';
            
            // Anima l'ingresso
            setTimeout(() => {
                advancedFilters.classList.add('fade-in');
            }, 50);
        } else {
            advancedFilters.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down me-1"></i>Filtri Avanzati';
        }
    }

    updateRatingDisplay(value) {
        const ratingValue = document.getElementById('ratingValue');
        const ratingStars = document.getElementById('ratingStars');
        
        if (!ratingValue || !ratingStars) return;
        
        if (value == 0) {
            ratingValue.textContent = 'Tutte';
            ratingStars.innerHTML = '';
        } else {
            ratingValue.textContent = value + '★';
            ratingStars.innerHTML = apiClient.generateStarRating(parseFloat(value));
        }
    }

    checkUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        const game = urlParams.get('game');
        const tags = urlParams.get('tags');
        
        if (query) {
            document.getElementById('searchQuery').value = query;
        }
        if (game) {
            document.getElementById('gameFilter').value = game;
        }
        if (tags) {
            document.getElementById('tagsFilter').value = tags;
        }
        
        // Esegui la ricerca se ci sono parametri
        if (query || game || tags) {
            this.performSearch();
        }
    }

    quickSearch(term) {
        // Determina se è un gioco o un tag
        const commonGames = ['World of Warcraft', 'League of Legends', 'Counter-Strike', 'Valorant'];
        
        if (commonGames.some(game => game.includes(term))) {
            document.getElementById('gameFilter').value = term;
            document.getElementById('searchQuery').value = '';
        } else {
            document.getElementById('tagsFilter').value = term;
            document.getElementById('searchQuery').value = '';
        }
        
        // Mostra filtri avanzati se nascosti
        if (!this.advancedFiltersVisible) {
            this.toggleAdvancedFilters();
        }
        
        this.performSearch();
    }

    handleSearch(event) {
        event.preventDefault();
        this.performSearch();
    }

    async performSearch() {
        this.searchStartTime = Date.now();
        // Raccogli parametri di ricerca
        const searchParams = this.getSearchParams();
        // Mostra loading
        this.showLoading();
        try {
            let results = [];
            // Se non ci sono filtri, non fare ricerca
            if (!this.hasActiveFilters(searchParams)) {
                this.showInitialState();
                return;
            }
            // Prova prima con il servizio di visualizzazioni avanzate
            try {
                if (await apiClient.checkVisualizationsService()) {
                    const advRes = await this.performAdvancedSearch(searchParams);
                    // Se la risposta ha la proprietà 'configs', usala
                    results = Array.isArray(advRes?.configs) ? advRes.configs : advRes;
                } else {
                    throw new Error('Servizio visualizzazioni non disponibile');
                }
            } catch (error) {
                console.warn('Ricerca avanzata fallita, uso ricerca base:', error);
                results = await this.performBasicSearch(searchParams);
            }
            // Applica filtri locali se necessario
            results = this.applyLocalFilters(results, searchParams);
            // Normalizza gli ID delle configurazioni
            this.searchResults = results.map(config => {
                if (config && !config._id && config.id) {
                    config._id = config.id;
                }
                return config;
            });
            this.totalResults = this.searchResults.length;
            this.currentPage = 1;
            this.displayResults();
            this.updateSearchStats();
        } catch (error) {
            console.error('Errore nella ricerca:', error);
            this.showError('Errore nella ricerca: ' + error.message);
        }
    }

    getSearchParams() {
        return {
            query: document.getElementById('searchQuery').value.trim(),
            game: document.getElementById('gameFilter').value.trim(),
            tags: document.getElementById('tagsFilter').value.trim(),
            sortField: document.getElementById('sortField').value,
            sortOrder: document.getElementById('sortOrder').value,
            limit: parseInt(document.getElementById('limitResults').value),
            minRating: parseFloat(document.getElementById('minRating').value),
            offset: (this.currentPage - 1) * this.resultsPerPage
        };
    }

    hasActiveFilters(params) {
        return params.query || params.game || params.tags || params.minRating > 0;
    }

    async performAdvancedSearch(params) {
        // Prepara richiesta per il servizio di visualizzazioni
        const searchRequest = {
            game: params.game || undefined,
            tags: params.tags ? params.tags.split(',').map(t => t.trim()).filter(t => t) : undefined,
            sort_field: params.sortField,
            sort_order: params.sortOrder,
            limit: params.limit,
            offset: params.offset
        };
        
        // Rimuovi campi undefined
        Object.keys(searchRequest).forEach(key => {
            if (searchRequest[key] === undefined) {
                delete searchRequest[key];
            }
        });
        
        return await apiClient.searchConfigurationsAdvanced(searchRequest);
    }

    async performBasicSearch(params) {
        // Usa il servizio configs base
        const game = params.game || params.query;
        return await apiClient.searchConfigs(game);
    }

    applyLocalFilters(results, params) {
        let filtered = [...results];
        
        // Filtro per query testuale
        if (params.query) {
            const query = params.query.toLowerCase();
            filtered = filtered.filter(config => 
                (config.title || '').toLowerCase().includes(query) ||
                (config.description || '').toLowerCase().includes(query) ||
                (config.game || '').toLowerCase().includes(query) ||
                (config.tags || []).some(tag => tag.toLowerCase().includes(query))
            );
        }
        
        // Filtro per tags
        if (params.tags) {
            const searchTags = params.tags.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
            filtered = filtered.filter(config => 
                searchTags.some(searchTag => 
                    (config.tags || []).some(tag => tag.toLowerCase().includes(searchTag))
                )
            );
        }
        
        // Filtro per rating medio reale
        if (params.minRating > 0) {
            filtered = filtered.filter(config => {
                if (typeof config.average_rating === 'number') {
                    return config.average_rating >= params.minRating;
                }
                // Se non c'è valutazione media, non mostrare
                return false;
            });
        }
        
        // Ordinamento locale se necessario
        if (!results.some(r => r.rating !== undefined)) {
            filtered = this.sortResults(filtered, params.sortField, params.sortOrder);
        }
        
        return filtered;
    }

    calculateFakeRating(config) {
        // Simula un rating basato su qualità dei dati
        let rating = 2.5; // Base
        
        if (config.description && config.description.length > 50) rating += 0.5;
        if (config.tags && config.tags.length > 0) rating += 0.5;
        if (config.tags && config.tags.length > 3) rating += 0.5;
        if (config.title && config.title.length > 10) rating += 0.5;
        
        return Math.min(5, rating);
    }

    sortResults(results, sortField, sortOrder) {
        return results.sort((a, b) => {
            let valueA = a[sortField] || '';
            let valueB = b[sortField] || '';
            
            // Gestione speciale per rating
            if (sortField === 'rating') {
                valueA = this.calculateFakeRating(a);
                valueB = this.calculateFakeRating(b);
            } else if (sortField === 'popularity') {
                // Simula popolarità basata su numero di tags
                valueA = (a.tags || []).length;
                valueB = (b.tags || []).length;
            } else if (sortField === 'created_at') {
                valueA = new Date(valueA);
                valueB = new Date(valueB);
            } else {
                valueA = valueA.toString().toLowerCase();
                valueB = valueB.toString().toLowerCase();
            }
            
            let comparison = 0;
            if (valueA > valueB) comparison = 1;
            if (valueA < valueB) comparison = -1;
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    showLoading() {
        document.getElementById('searchLoading').style.display = 'flex';
        document.getElementById('searchResults').style.display = 'none';
        document.getElementById('searchStats').style.display = 'none';
        document.getElementById('searchPagination').style.display = 'none';
    }

    showInitialState() {
        document.getElementById('searchLoading').style.display = 'none';
        document.getElementById('searchResults').innerHTML = `
            <div class="search-initial-state">
                <div class="text-center py-5">
                    <i class="fas fa-search fa-4x text-muted mb-3"></i>
                    <h4 class="text-muted">Inizia la tua ricerca</h4>
                    <p class="text-muted">
                        Usa la barra di ricerca sopra per trovare configurazioni<br>
                        o clicca su uno dei tag popolari
                    </p>
                </div>
            </div>
        `;
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('searchStats').style.display = 'none';
        document.getElementById('searchPagination').style.display = 'none';
    }

    showError(message) {
        document.getElementById('searchLoading').style.display = 'none';
        document.getElementById('searchResults').innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                ${message}
            </div>
        `;
        document.getElementById('searchResults').style.display = 'block';
        document.getElementById('searchStats').style.display = 'none';
        document.getElementById('searchPagination').style.display = 'none';
    }

    displayResults() {
        const resultsContainer = document.getElementById('searchResults');
        
        if (this.searchResults.length === 0) {
            resultsContainer.innerHTML = this.getEmptyState();
        } else {
            const paginatedResults = this.getPaginatedResults();
            resultsContainer.innerHTML = this.generateResultsHTML(paginatedResults);
        }
        
        document.getElementById('searchLoading').style.display = 'none';
        resultsContainer.style.display = 'block';
        
        this.setupPagination();
    }

    getPaginatedResults() {
        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = startIndex + this.resultsPerPage;
        return this.searchResults.slice(startIndex, endIndex);
    }

    generateResultsHTML(results) {
        if (this.currentView === 'grid') {
            return `
                <div class="row">
                    ${results.map(config => this.generateGridCard(config)).join('')}
                </div>
            `;
        } else {
            return `
                <div class="list-view">
                    ${results.map(config => this.generateListCard(config)).join('')}
                </div>
            `;
        }
    }

    generateGridCard(config) {
        const rating = typeof config.average_rating === 'number' ? config.average_rating : null;
        const truncatedDescription = apiClient.truncateText(config.description || 'Nessuna descrizione disponibile', 100);
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="config-card search-result-card">
                    <div class="config-header">
                        <h6 class="config-title">${config.title || 'Configurazione senza titolo'}</h6>
                        <small class="config-game">
                            <i class="fas fa-gamepad me-1"></i>
                            ${config.game || 'Gioco non specificato'}
                        </small>
                    </div>
                    <div class="config-body">
                        <p class="config-description">${truncatedDescription}</p>
                        ${config.tags && config.tags.length > 0 ? `
                            <div class="config-tags">
                                ${config.tags.slice(0, 4).map(tag => 
                                    `<span class="config-tag">${tag}</span>`
                                ).join('')}
                                ${config.tags.length > 4 ? `<span class="config-tag">+${config.tags.length - 4}</span>` : ''}
                            </div>
                        ` : ''}
                        <div class="config-stats">
                            <div class="config-stat">
                                <div class="rating">
                                    ${rating !== null ? apiClient.generateStarRating(rating) : apiClient.generateStarRating(0)}
                                    <small class="ms-1">${rating !== null ? rating.toFixed(1) : 'N/A'}</small>
                                </div>
                            </div>
                            <div class="config-stat">
                                <i class="fas fa-clock"></i>
                                <small>${config.created_at ? apiClient.formatDate(config.created_at) : 'Data N/A'}</small>
                            </div>
                        </div>
                        <div class="config-actions">
                            <button class="btn btn-primary btn-sm" onclick="searchPage.viewConfiguration('${config._id}')">
                                <i class="fas fa-eye me-1"></i>
                                Visualizza
                            </button>
                            <button class="btn btn-outline-info btn-sm" onclick="searchPage.showConfigDetail('${config._id}')">
                                <i class="fas fa-info-circle me-1"></i>
                                Dettagli
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateListCard(config) {
        const rating = typeof config.average_rating === 'number' ? config.average_rating : null;
        const truncatedDescription = apiClient.truncateText(config.description || 'Nessuna descrizione disponibile', 200);
        return `
            <div class="list-item-card mb-3">
                <div class="row">
                    <div class="col-md-8">
                        <div class="list-item-content">
                            <h6 class="list-item-title">${config.title || 'Configurazione senza titolo'}</h6>
                            <p class="list-item-game">
                                <i class="fas fa-gamepad me-1"></i>
                                ${config.game || 'Gioco non specificato'}
                            </p>
                            <p class="list-item-description">${truncatedDescription}</p>
                            ${config.tags && config.tags.length > 0 ? `
                                <div class="list-item-tags">
                                    ${config.tags.slice(0, 6).map(tag => 
                                        `<span class="config-tag config-tag-sm">${tag}</span>`
                                    ).join('')}
                                    ${config.tags.length > 6 ? `<span class="config-tag config-tag-sm">+${config.tags.length - 6}</span>` : ''}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="list-item-meta">
                            <div class="rating mb-2">
                                ${rating !== null ? apiClient.generateStarRating(rating) : apiClient.generateStarRating(0)}
                                <small class="ms-1">${rating !== null ? rating.toFixed(1) : 'N/A'}</small>
                            </div>
                            <p class="text-muted small mb-3">
                                <i class="fas fa-clock me-1"></i>
                                ${config.created_at ? apiClient.formatDate(config.created_at) : 'Data N/A'}
                            </p>
                            <div class="list-item-actions">
                                <button class="btn btn-primary btn-sm me-2" onclick="searchPage.viewConfiguration('${config._id}')">
                                    <i class="fas fa-eye me-1"></i>
                                    Visualizza
                                </button>
                                <button class="btn btn-outline-info btn-sm" onclick="searchPage.showConfigDetail('${config._id}')">
                                    <i class="fas fa-info-circle me-1"></i>
                                    Dettagli
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h5>Nessun risultato trovato</h5>
                <p>Prova a modificare i criteri di ricerca o a rimuovere alcuni filtri.</p>
                <button class="btn btn-outline-primary" onclick="searchPage.clearFilters()">
                    <i class="fas fa-times me-2"></i>
                    Rimuovi Filtri
                </button>
            </div>
        `;
    }

    updateSearchStats() {
        const searchTime = Date.now() - this.searchStartTime;
        
        document.getElementById('resultsCount').textContent = this.totalResults;
        document.getElementById('searchTime').textContent = searchTime;
        document.getElementById('searchStats').style.display = 'block';
    }

    setupPagination() {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        
        if (totalPages <= 1) {
            document.getElementById('searchPagination').style.display = 'none';
            return;
        }
        
        document.getElementById('searchPagination').style.display = 'block';
        
        const pagination = document.getElementById('paginationList');
        let paginationHTML = '';
        
        // Pulsante precedente
        const prevDisabled = this.currentPage === 1 ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${prevDisabled}">
                <a class="page-link" href="#" onclick="searchPage.goToPage(${this.currentPage - 1})">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
        
        // Numeri di pagina
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            const active = i === this.currentPage ? 'active' : '';
            paginationHTML += `
                <li class="page-item ${active}">
                    <a class="page-link" href="#" onclick="searchPage.goToPage(${i})">${i}</a>
                </li>
            `;
        }
        
        // Pulsante successivo
        const nextDisabled = this.currentPage === totalPages ? 'disabled' : '';
        paginationHTML += `
            <li class="page-item ${nextDisabled}">
                <a class="page-link" href="#" onclick="searchPage.goToPage(${this.currentPage + 1})">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
        
        pagination.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.totalResults / this.resultsPerPage);
        if (page < 1 || page > totalPages) return;
        
        this.currentPage = page;
        this.displayResults();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    switchView(view) {
        this.currentView = view;
        
        // Aggiorna pulsanti
        document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
        document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
        
        // Rigenera risultati
        if (this.searchResults.length > 0) {
            this.displayResults();
        }
    }

    clearFilters() {
        document.getElementById('searchQuery').value = '';
        document.getElementById('gameFilter').value = '';
        document.getElementById('tagsFilter').value = '';
        document.getElementById('sortField').value = 'created_at';
        document.getElementById('sortOrder').value = 'desc';
        document.getElementById('limitResults').value = '20';
        document.getElementById('minRating').value = '0';
        
        this.updateRatingDisplay(0);
        this.showInitialState();
        
        // Aggiorna URL
        window.history.replaceState({}, '', window.location.pathname);
    }

    async viewConfiguration(configId) {
        window.location.href = `configuration.html?id=${configId}`;
    }

    async showConfigDetail(configId) {
        try {
            const config = await apiClient.getConfig(configId);
            
            const modal = new bootstrap.Modal(document.getElementById('configDetailModal'));
            const title = document.getElementById('configDetailTitle');
            const body = document.getElementById('configDetailBody');
            const viewBtn = document.getElementById('viewFullConfigBtn');
            
            title.textContent = config.title || 'Configurazione senza titolo';
            
            body.innerHTML = `
                <div class="config-detail-content">
                    <div class="row mb-3">
                        <div class="col-sm-3"><strong>Gioco:</strong></div>
                        <div class="col-sm-9">${config.game || 'Non specificato'}</div>
                    </div>
                    <div class="row mb-3">
                        <div class="col-sm-3"><strong>Descrizione:</strong></div>
                        <div class="col-sm-9">${config.description || 'Nessuna descrizione'}</div>
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
            
            viewBtn.onclick = () => {
                window.location.href = `configuration.html?id=${configId}`;
            };
            
            modal.show();
            
        } catch (error) {
            apiClient.showError('Errore nel caricamento dei dettagli: ' + error.message);
        }
    }
}

// CSS aggiuntivo per la ricerca
const searchCSS = `
.search-header {
    text-align: center;
    padding: 2rem 0;
}

.search-container {
    background: white;
    border-radius: 15px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.advanced-filters {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 1.5rem;
    margin-top: 1rem;
}

.quick-search-container {
    background: white;
    border-radius: 15px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.quick-search-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.quick-tag {
    background: var(--light-color);
    color: var(--primary-color);
    padding: 0.5rem 1rem;
    border-radius: 20px;
    font-size: 0.9rem;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid var(--primary-color);
}

.quick-tag:hover {
    background: var(--primary-color);
    color: white;
    transform: translateY(-2px);
}

.search-stats {
    background: white;
    border-radius: 10px;
    padding: 1rem 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    margin-bottom: 1rem;
}

.results-count {
    font-weight: 600;
    color: var(--dark-color);
}

.search-time {
    font-size: 0.9rem;
}

.view-toggle .btn {
    border-radius: 20px;
}

.search-result-card {
    transition: all 0.3s ease;
}

.search-result-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
}

.list-item-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    transition: all 0.3s ease;
}

.list-item-card:hover {
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.list-item-title {
    color: var(--dark-color);
    margin-bottom: 0.5rem;
    font-weight: 600;
}

.list-item-game {
    color: var(--primary-color);
    margin-bottom: 0.75rem;
    font-size: 0.9rem;
}

.list-item-description {
    color: var(--secondary-color);
    margin-bottom: 1rem;
    line-height: 1.5;
}

.list-item-tags {
    margin-bottom: 1rem;
}

.config-tag-sm {
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
}

.list-item-meta {
    text-align: right;
}

.list-item-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
}

.rating-filter {
    position: relative;
}

.rating-display {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 0.5rem;
    font-size: 0.9rem;
}

.search-initial-state {
    padding: 3rem 1rem;
}

@media (max-width: 768px) {
    .list-item-meta {
        text-align: left;
        margin-top: 1rem;
    }
    
    .list-item-actions {
        justify-content: flex-start;
        flex-direction: column;
    }
    
    .quick-search-tags {
        justify-content: center;
    }
    
    .view-toggle {
        margin-top: 1rem;
    }
}
`;

// Aggiungi CSS alla pagina
const style = document.createElement('style');
style.textContent = searchCSS;
document.head.appendChild(style);

// Inizializza la pagina quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.searchPage = new SearchPage();
});
