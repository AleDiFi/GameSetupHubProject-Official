// Dashboard JavaScript
class Dashboard {
    constructor() {
        this.services = {};
        this.recentConfigs = [];
        this.init();
    }

    async init() {
        // Controlla lo stato dei servizi
        await this.checkServicesStatus();
        
        // Carica le configurazioni recenti
        await this.loadRecentConfigurations();
    }

    async checkServicesStatus() {
        const serviceElements = {
            users: document.getElementById('users-status'),
            configs: document.getElementById('configs-status'),
            visualizations: document.getElementById('visualizations-status'),
            valuations: document.getElementById('valuations-status')
        };

        try {
            // Controlla tutti i servizi
            const statuses = await apiClient.checkAllServices();
            
            // Aggiorna gli indicatori di stato
            Object.keys(statuses).forEach(serviceName => {
                const element = serviceElements[serviceName];
                const isOnline = statuses[serviceName];
                
                if (element) {
                    this.updateServiceStatus(element, isOnline);
                }
                
                this.services[serviceName] = isOnline;
            });

        } catch (error) {
            console.error('Errore nel controllo dei servizi:', error);
            
            // Marca tutti i servizi come offline in caso di errore
            Object.values(serviceElements).forEach(element => {
                if (element) {
                    this.updateServiceStatus(element, false);
                }
            });
        }
    }

    updateServiceStatus(element, isOnline) {
        element.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
        
        if (isOnline) {
            element.innerHTML = `
                <i class="fas fa-check-circle"></i>
                Online
            `;
        } else {
            element.innerHTML = `
                <i class="fas fa-times-circle"></i>
                Offline
            `;
        }
    }

    async loadRecentConfigurations() {
        const recentConfigsElement = document.getElementById('recent-configs');
        
        try {
            // Prova prima con il servizio di visualizzazioni per avere dati più ricchi
            let configs = [];
            
            if (this.services.visualizations || this.services.configs) {
                try {
                    // Cerca configurazioni senza filtri per ottenere le più recenti
                    if (this.services.configs) {
                        configs = await apiClient.searchConfigs();
                    }
                } catch (error) {
                    console.warn('Errore nel caricamento configurazioni:', error);
                }
            }

            if (configs.length === 0) {
                // Mostra stato vuoto
                recentConfigsElement.innerHTML = this.getEmptyState();
                return;
            }

            // Limita alle prime 5 configurazioni
            const recentConfigs = configs.slice(0, 5);
            
            // Genera HTML per le configurazioni
            const configsHtml = recentConfigs.map(config => this.generateConfigCard(config)).join('');
            
            recentConfigsElement.innerHTML = configsHtml;
            
        } catch (error) {
            console.error('Errore nel caricamento delle configurazioni recenti:', error);
            recentConfigsElement.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Impossibile caricare le configurazioni recenti.
                    ${error.message}
                </div>
            `;
        }
    }

    generateConfigCard(config) {
        const truncatedDescription = apiClient.truncateText(config.description || 'Nessuna descrizione disponibile', 80);
        const createdDate = config.created_at ? apiClient.formatDate(config.created_at) : 'Data non disponibile';
        const tags = config.tags || [];
        
        return `
            <div class="config-card fade-in">
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
                            ${tags.slice(0, 3).map(tag => 
                                `<span class="config-tag">${tag}</span>`
                            ).join('')}
                            ${tags.length > 3 ? `<span class="config-tag">+${tags.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="config-stats">
                        <div class="config-stat">
                            <i class="fas fa-clock"></i>
                            <small>${createdDate}</small>
                        </div>
                    </div>
                    
                    <div class="config-actions">
                        <button class="btn btn-primary btn-sm" onclick="dashboard.viewConfiguration('${config._id}')">
                            <i class="fas fa-eye me-1"></i>
                            Visualizza
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" onclick="dashboard.shareConfiguration('${config._id}')">
                            <i class="fas fa-share me-1"></i>
                            Condividi
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-cog"></i>
                <h5>Nessuna configurazione trovata</h5>
                <p>Sembra che non ci siano ancora configurazioni nel sistema.</p>
                <a href="upload.html" class="btn btn-primary">
                    <i class="fas fa-upload me-2"></i>
                    Carica la Prima Configurazione
                </a>
            </div>
        `;
    }

    async viewConfiguration(configId) {
        try {
            // Reindirizza alla pagina di dettaglio
            window.location.href = `configuration.html?id=${configId}`;
        } catch (error) {
            apiClient.showError('Errore nell\'apertura della configurazione');
        }
    }

    shareConfiguration(configId) {
        // Crea URL di condivisione
        const shareUrl = `${window.location.origin}/configuration.html?id=${configId}`;
        
        // Prova a usare la Web Share API se disponibile
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
        // Fallback: copia negli appunti
        navigator.clipboard.writeText(url).then(() => {
            apiClient.showSuccess('Link copiato negli appunti!');
        }).catch(() => {
            // Fallback del fallback: mostra il link in un modal
            this.showShareModal(url);
        });
    }

    showShareModal(url) {
        const modalHtml = `
            <div class="modal fade" id="shareModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-share me-2"></i>
                                Condividi Configurazione
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>Copia questo link per condividere la configurazione:</p>
                            <div class="input-group">
                                <input type="text" class="form-control" value="${url}" readonly id="shareUrl">
                                <button class="btn btn-primary" onclick="dashboard.copyToClipboard('shareUrl')">
                                    <i class="fas fa-copy"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Rimuovi modal esistente
        const existingModal = document.getElementById('shareModal');
        if (existingModal) existingModal.remove();

        // Aggiungi e mostra il modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('shareModal'));
        modal.show();

        // Cleanup
        document.getElementById('shareModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    copyToClipboard(inputId) {
        const input = document.getElementById(inputId);
        input.select();
        document.execCommand('copy');
        apiClient.showSuccess('Link copiato negli appunti!');
        
        // Chiudi il modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('shareModal'));
        modal.hide();
    }

    // Metodo per aggiornare la dashboard
    async refresh() {
        await this.checkServicesStatus();
        await this.loadRecentConfigurations();
        apiClient.showSuccess('Dashboard aggiornata!');
    }

    // Metodo per setup degli event listeners specifici della dashboard
    setupEventListeners() {
        // Click sui service cards per test connessione
        document.querySelectorAll('.service-card').forEach(card => {
            card.addEventListener('click', async (e) => {
                const serviceName = card.dataset.service;
                await this.testServiceConnection(serviceName);
            });
        });

        // Refresh button se presente
        const refreshBtn = document.getElementById('refresh-dashboard');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.refresh());
        }
    }

    async testServiceConnection(serviceName) {
        const statusElement = document.getElementById(`${serviceName}-status`);
        
        // Mostra loading
        statusElement.className = 'status-indicator checking';
        statusElement.innerHTML = `
            <div class="spinner-border spinner-border-sm"></div>
            Test connessione...
        `;

        try {
            let isOnline = false;
            
            switch (serviceName) {
                case 'users':
                    isOnline = await apiClient.checkUsersService();
                    break;
                case 'configs':
                    isOnline = await apiClient.checkConfigsService();
                    break;
                case 'visualizations':
                    isOnline = await apiClient.checkVisualizationsService();
                    break;
                case 'valuations':
                    isOnline = await apiClient.checkValuationsService();
                    break;
            }

            this.updateServiceStatus(statusElement, isOnline);
            this.services[serviceName] = isOnline;
            
            const message = isOnline ? 
                `Servizio ${serviceName} online e funzionante!` : 
                `Servizio ${serviceName} non raggiungibile`;
                
            apiClient.showToast(message, isOnline ? 'success' : 'error');
            
        } catch (error) {
            this.updateServiceStatus(statusElement, false);
            this.services[serviceName] = false;
            apiClient.showError(`Errore nel test del servizio ${serviceName}: ${error.message}`);
        }
    }
}

// Inizializza la dashboard quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
    
    // Setup event listeners dopo un breve delay per assicurarsi che tutto sia caricato
    setTimeout(() => {
        if (window.dashboard) {
            window.dashboard.setupEventListeners();
        }
    }, 500);
});

// Esporta per uso globale
window.Dashboard = Dashboard;
