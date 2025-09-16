// API Configuration
const API_CONFIG = {
    USERS_SERVICE: 'http://localhost:8001',
    CONFIGS_SERVICE: 'http://localhost:8002',
    VISUALIZATIONS_SERVICE: 'http://localhost:8003',
    VALUATIONS_SERVICE: 'http://localhost:8004'
};

// API Client Class
class ApiClient {
    constructor() {
        this.token = localStorage.getItem('authToken');
    }

    // Helper per creare headers con autenticazione
    getHeaders(includeAuth = true) {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (includeAuth && this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Helper per gestire le risposte
    async handleResponse(response) {
        if (!response.ok) {
            if (response.status === 401) {
                // Token scaduto o non valido
                this.logout();
                throw new Error('Sessione scaduta. Effettua nuovamente il login.');
            }
            
            let errorMessage = 'Errore del server';
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // Se non riesce a parsare l'errore, usa il messaggio di default
            }
            
            throw new Error(errorMessage);
        }
        
        return response.json();
    }

    // Helper per mostrare toast di errore
    showError(message) {
        this.showToast(message, 'error');
    }

    // Helper per mostrare toast di successo
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    // Sistema di notifiche toast
    showToast(message, type = 'info') {
        // Crea container se non esiste
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 9999;
            `;
            document.body.appendChild(container);
        }

        // Crea toast
        const toast = document.createElement('div');
        toast.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show`;
        toast.style.cssText = `
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            min-width: 300px;
        `;
        
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;

        container.appendChild(toast);

        // Rimuovi automaticamente dopo 5 secondi
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }

    // Logout
    logout() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        this.token = null;
        window.location.href = 'index.html';
    }

    // === USERS SERVICE ===
    
    async checkUsersService() {
        try {
            const response = await fetch(`${API_CONFIG.USERS_SERVICE}/docs`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async register(userData) {
        const response = await fetch(`${API_CONFIG.USERS_SERVICE}/users/register`, {
            method: 'POST',
            headers: this.getHeaders(false),
            body: JSON.stringify(userData)
        });
        
        return this.handleResponse(response);
    }

    async login(credentials) {
        const response = await fetch(`${API_CONFIG.USERS_SERVICE}/users/login-json`, {
            method: 'POST',
            headers: this.getHeaders(false),
            body: JSON.stringify(credentials)
        });
        
        const data = await this.handleResponse(response);
        
        if (data.access_token) {
            this.token = data.access_token;
            localStorage.setItem('authToken', this.token);
            
            // Ottieni info utente
            const userData = await this.getCurrentUser();
            localStorage.setItem('userData', JSON.stringify(userData));
        }
        
        return data;
    }

    async getCurrentUser() {
        const response = await fetch(`${API_CONFIG.USERS_SERVICE}/users/me`, {
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    }

    async getUserById(userId) {
        const response = await fetch(`${API_CONFIG.USERS_SERVICE}/users/${userId}`, {
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    }

    // === CONFIGS SERVICE ===
    
    async checkConfigsService() {
        try {
            const response = await fetch(`${API_CONFIG.CONFIGS_SERVICE}/docs`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async uploadConfig(configData) {
        const response = await fetch(`${API_CONFIG.CONFIGS_SERVICE}/configs/`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(configData)
        });
        
        return this.handleResponse(response);
    }

    async getConfig(configId) {
        const response = await fetch(`${API_CONFIG.CONFIGS_SERVICE}/configs/${configId}`, {
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    }

    async searchConfigs(game = null) {
        let url = `${API_CONFIG.CONFIGS_SERVICE}/configs/`;
        if (game) {
            url += `?game=${encodeURIComponent(game)}`;
        }
        
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    }

    // === VISUALIZATIONS SERVICE ===
    
    async checkVisualizationsService() {
        try {
            const response = await fetch(`${API_CONFIG.VISUALIZATIONS_SERVICE}/docs`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async getConfigurationDetails(configId) {
    const response = await fetch(`${API_CONFIG.VISUALIZATIONS_SERVICE}/visualizations/configs/${configId}`, {
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async searchConfigurationsAdvanced(searchParams) {
        // Costruisci la query string dai parametri
        const params = new URLSearchParams();
        if (searchParams.game) params.append('game', searchParams.game);
        if (searchParams.title) params.append('title', searchParams.title);
        if (searchParams.tags && Array.isArray(searchParams.tags)) {
            searchParams.tags.forEach(tag => params.append('tags', tag));
        }
        if (searchParams.limit) params.append('limit', searchParams.limit);
        if (searchParams.offset) params.append('offset', searchParams.offset);
        // Aggiungi altri parametri se necessario

        const url = `${API_CONFIG.VISUALIZATIONS_SERVICE}/visualizations/search?${params.toString()}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async getConfigurationsByGame(game, limit = 10, offset = 0) {
        const url = `${API_CONFIG.VISUALIZATIONS_SERVICE}/visualizations/game/${encodeURIComponent(game)}?limit=${limit}&offset=${offset}`;
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        
        return this.handleResponse(response);
    }

    // === VALUATIONS SERVICE ===
    
    async checkValuationsService() {
        try {
            const response = await fetch(`${API_CONFIG.VALUATIONS_SERVICE}/docs`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    async addComment(configId, comment) {
    const response = await fetch(`${API_CONFIG.VALUATIONS_SERVICE}/valutations/config/${configId}/comment`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(comment)
        });
        
        return this.handleResponse(response);
    }

    async deleteComment(commentId) {
        const response = await fetch(`${API_CONFIG.VALUATIONS_SERVICE}/valutations/comment/${commentId}`, {
            method: 'DELETE',
            headers: this.getHeaders()
        });
        return this.handleResponse(response);
    }

    async editComment(commentId, commentText) {
        const response = await fetch(`${API_CONFIG.VALUATIONS_SERVICE}/valutations/comment/${commentId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify({ comment: commentText })
        });
        return this.handleResponse(response);
    }

    async toggleLike(configId) {
        const response = await fetch(`${API_CONFIG.VALUATIONS_SERVICE}/valutations/config/${configId}/like`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({})
        });
        return this.handleResponse(response);
    }

    async addRating(configId, rating) {
        const response = await fetch(`${API_CONFIG.VALUATIONS_SERVICE}/valutations/config/${configId}/rating`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ rating })
        });
        return this.handleResponse(response);
    }

    // === UTILITY METHODS ===
    
    async checkAllServices() {
        const services = {
            users: await this.checkUsersService(),
            configs: await this.checkConfigsService(),
            visualizations: await this.checkVisualizationsService(),
            valuations: await this.checkValuationsService()
        };
        
        return services;
    }

    // Helper per formattare date
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('it-IT', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // Helper per troncare testo
    truncateText(text, maxLength = 100) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    // Helper per generare stelle di rating
    generateStarRating(rating, maxRating = 5) {
        let stars = '';
        for (let i = 1; i <= maxRating; i++) {
            if (i <= rating) {
                stars += '<i class="fas fa-star star"></i>';
            } else {
                stars += '<i class="far fa-star star empty"></i>';
            }
        }
        return stars;
    }
}

// Esporta una singola istanza
const apiClient = new ApiClient();

// Utility functions globali
window.apiClient = apiClient;
window.API_CONFIG = API_CONFIG;
