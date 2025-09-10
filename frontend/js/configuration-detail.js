// Configuration Detail Page JavaScript
class ConfigurationDetail {
    constructor() {
        this.configId = null;
        this.configuration = null;
        this.currentParametersView = 'formatted';
        this.userHasLiked = false;
        this.userRating = 0;
        
        this.init();
    }

    init() {
        // Ottieni l'ID della configurazione dall'URL
        this.configId = this.getConfigIdFromUrl();
        
        if (!this.configId) {
            this.showError('ID configurazione non specificato');
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Carica la configurazione
        this.loadConfiguration();
    }

    getConfigIdFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    }

    setupEventListeners() {
        // Comment form
        const commentForm = document.getElementById('commentForm');
        if (commentForm) {
            commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        }

        // Rating form
        const ratingForm = document.getElementById('ratingForm');
        if (ratingForm) {
            ratingForm.addEventListener('submit', (e) => this.handleRatingSubmit(e));
        }

        // Rating stars interaction
        this.setupRatingStars();
    }

    setupRatingStars() {
        const ratingStars = document.querySelectorAll('.rating-star');
        ratingStars.forEach((star, index) => {
            star.addEventListener('mouseenter', () => this.highlightStars(index + 1));
            star.addEventListener('mouseleave', () => this.resetStars());
            star.addEventListener('click', () => this.selectRating(index + 1));
        });
    }

    highlightStars(rating) {
        const ratingStars = document.querySelectorAll('.rating-star');
        ratingStars.forEach((star, index) => {
            if (index < rating) {
                star.classList.add('highlighted');
            } else {
                star.classList.remove('highlighted');
            }
        });
    }

    resetStars() {
        const selectedRating = parseInt(document.getElementById('selectedRating').value);
        const ratingStars = document.querySelectorAll('.rating-star');
        ratingStars.forEach((star, index) => {
            star.classList.remove('highlighted');
            if (index < selectedRating) {
                star.classList.add('selected');
            } else {
                star.classList.remove('selected');
            }
        });
    }

    selectRating(rating) {
        document.getElementById('selectedRating').value = rating;
        const ratingText = document.getElementById('ratingText');
        const submitBtn = document.getElementById('submitRating');
        
        const ratingTexts = [
            '', 'Pessimo', 'Scarso', 'Sufficiente', 'Buono', 'Eccellente'
        ];
        
        ratingText.textContent = ratingTexts[rating];
        submitBtn.disabled = false;
        
        this.resetStars();
    }

    async loadConfiguration() {
        try {
            this.showLoading();

            // Carica la vista arricchita (visualizations) che include i dati base e le statistiche
            const advancedDetails = await apiClient.getConfigurationDetails(this.configId);
            console.log('[DEBUG] advancedDetails:', advancedDetails);
            this.configuration = advancedDetails;

            // Carica informazioni utente autore
            await this.loadAuthorInfo();

            // Carica configurazioni correlate
            this.loadRelatedConfigurations();

            // Mostra la configurazione
            this.displayConfiguration();

            // Carica commenti (placeholder)
            this.loadComments();

            // Aggiorna statistiche
            this.updateStatistics();

        } catch (error) {
            console.error('Errore nel caricamento della configurazione:', error);
            this.showError('Impossibile caricare la configurazione: ' + error.message);
        }
    }

    async loadAuthorInfo() {
        if (!this.configuration.user_id) return;
        
        try {
            const author = await apiClient.getUserById(this.configuration.user_id);
            this.configuration.author = author;
        } catch (error) {
            console.warn('Impossibile caricare informazioni autore:', error);
            this.configuration.author = {
                username: 'Utente Sconosciuto',
                email: 'N/A'
            };
        }
    }

    async loadRelatedConfigurations() {
        try {
            if (!this.configuration.game) return;
            
            const relatedConfigs = await apiClient.searchConfigs(this.configuration.game);
            
            // Filtra la configurazione corrente e limita a 5 risultati
            const filtered = relatedConfigs
                .filter(config => config._id !== this.configId)
                .slice(0, 5);
            
            this.displayRelatedConfigurations(filtered);
            
        } catch (error) {
            console.warn('Impossibile caricare configurazioni correlate:', error);
            document.getElementById('relatedConfigs').innerHTML = `
                <p class="text-muted">Nessuna configurazione correlata trovata.</p>
            `;
        }
    }

    displayConfiguration() {
        // Aggiorna il titolo della pagina
        document.title = `${this.configuration.title || 'Configurazione'} - Game Config Hub`;
        
        // Header
        document.getElementById('configTitle').textContent = this.configuration.title || 'Configurazione senza titolo';
        document.getElementById('breadcrumbTitle').textContent = this.configuration.title || 'Dettaglio';
        
        // Meta info
        document.getElementById('configGame').innerHTML = `
            <i class="fas fa-gamepad me-1"></i>
            ${this.configuration.game || 'Gioco non specificato'}
        `;
        
        document.getElementById('configDate').innerHTML = `
            <i class="fas fa-clock me-1"></i>
            ${this.configuration.created_at ? apiClient.formatDate(this.configuration.created_at) : 'Data non disponibile'}
        `;
        
        document.getElementById('configAuthor').innerHTML = `
            <i class="fas fa-user me-1"></i>
            ${this.configuration.author ? this.configuration.author.username : 'Autore sconosciuto'}
        `;
        
        // Descrizione
        const description = this.configuration.description || 'Nessuna descrizione disponibile per questa configurazione.';
        document.getElementById('configDescription').textContent = description;
        
        // Tags
        this.displayTags();
        
        // Parametri
        this.displayParameters();
        
        // Author card
        this.displayAuthorCard();
        
        // Mostra il contenuto
        this.showContent();
    }

    displayTags() {
        const tags = this.configuration.tags || [];
        const tagsSection = document.getElementById('tagsSection');
        const tagsContainer = document.getElementById('configTags');
        
        if (tags.length === 0) {
            tagsSection.style.display = 'none';
            return;
        }
        
        tagsSection.style.display = 'block';
        tagsContainer.innerHTML = tags.map(tag => 
            `<span class="config-tag config-tag-large">${tag}</span>`
        ).join('');
    }

    displayParameters() {
        this.switchParametersView(this.currentParametersView);
    }

    switchParametersView(view) {
        this.currentParametersView = view;
        const parametersContent = document.getElementById('parametersContent');
        const formattedBtn = document.getElementById('formattedViewBtn');
        const rawBtn = document.getElementById('rawViewBtn');
        
        // Aggiorna pulsanti
        formattedBtn.classList.toggle('active', view === 'formatted');
        rawBtn.classList.toggle('active', view === 'raw');
        
        if (view === 'formatted') {
            parametersContent.innerHTML = this.generateFormattedParameters();
        } else {
            parametersContent.innerHTML = this.generateRawParameters();
        }
    }

    generateFormattedParameters() {
        const parameters = this.configuration.parameters || {};
        
        if (Object.keys(parameters).length === 0) {
            return `
                <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    Nessun parametro configurato per questa configurazione.
                </div>
            `;
        }
        
        return `
            <div class="formatted-parameters">
                ${Object.entries(parameters).map(([key, value]) => this.generateParameterRow(key, value)).join('')}
            </div>
        `;
    }

    generateParameterRow(key, value) {
        const valueType = typeof value;
        let displayValue = value;
        let valueClass = 'parameter-value-' + valueType;
        
        if (valueType === 'object' && value !== null) {
            if (Array.isArray(value)) {
                displayValue = `[${value.join(', ')}]`;
                valueClass = 'parameter-value-array';
            } else {
                displayValue = JSON.stringify(value, null, 2);
                valueClass = 'parameter-value-object';
            }
        } else if (valueType === 'boolean') {
            displayValue = value ? 'Vero' : 'Falso';
        }
        
        return `
            <div class="parameter-row">
                <div class="parameter-key">
                    <strong>${key}</strong>
                    <span class="parameter-type">(${valueType})</span>
                </div>
                <div class="parameter-value ${valueClass}">
                    ${valueType === 'object' && !Array.isArray(value) ? 
                        `<pre>${displayValue}</pre>` : 
                        `<span>${displayValue}</span>`
                    }
                </div>
            </div>
        `;
    }

    generateRawParameters() {
        const parameters = this.configuration.parameters || {};
        
        return `
            <div class="raw-parameters">
                <pre class="json-display"><code>${JSON.stringify(parameters, null, 2)}</code></pre>
            </div>
        `;
    }

    displayAuthorCard() {
        if (!this.configuration.author) return;
        
        document.getElementById('authorName').textContent = this.configuration.author.username;
        document.getElementById('authorEmail').textContent = this.configuration.author.email;
    }

    displayRelatedConfigurations(configs) {
        const container = document.getElementById('relatedConfigs');
        
        if (configs.length === 0) {
            container.innerHTML = `
                <p class="text-muted">Nessuna configurazione correlata trovata.</p>
            `;
            return;
        }
        
        container.innerHTML = configs.map(config => `
            <div class="related-config-item">
                <h6 class="related-config-title">
                    <a href="configuration.html?id=${config._id}">
                        ${config.title || 'Configurazione senza titolo'}
                    </a>
                </h6>
                <p class="related-config-game">
                    <i class="fas fa-gamepad me-1"></i>
                    ${config.game || 'Gioco non specificato'}
                </p>
                ${config.tags && config.tags.length > 0 ? `
                    <div class="related-config-tags">
                        ${config.tags.slice(0, 3).map(tag => 
                            `<span class="config-tag config-tag-sm">${tag}</span>`
                        ).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    updateStatistics() {
        // Supporta più nomi di campo provenienti da diversi servizi
        const views = (this.configuration.views ?? this.configuration.views_count) ?? 0;
        const likes = (this.configuration.likes_count ?? this.configuration.likes) ?? 0;

        // Calcola il numero di valutazioni da vari possibili campi
        let ratingsCount = 0;
        if (Array.isArray(this.configuration.ratings)) {
            ratingsCount = this.configuration.ratings.length;
        } else if (typeof this.configuration.total_ratings === 'number') {
            ratingsCount = this.configuration.total_ratings;
        } else if (typeof this.configuration.ratings_count === 'number') {
            ratingsCount = this.configuration.ratings_count;
        }

        const avg = this.configuration.average_rating ?? null;

        const viewsEl = document.getElementById('viewsCount');
        const likesEl = document.getElementById('likesCount');
        const ratingsEl = document.getElementById('ratingsCount');
        const avgEl = document.getElementById('avgRating');

        if (viewsEl) viewsEl.textContent = String(views);
        if (likesEl) likesEl.textContent = String(likes);
        if (ratingsEl) ratingsEl.textContent = String(ratingsCount);
        if (avgEl) avgEl.textContent = avg !== null && avg !== undefined ? (Number(avg).toFixed(1) + '\u2605') : 'Nessuna valutazione';
    }

    async loadComments() {
        const commentsList = document.getElementById('commentsList');
        const comments = this.configuration && this.configuration.comments ? this.configuration.comments : [];

        if (comments.length === 0) {
            commentsList.innerHTML = `
                <div class="text-center py-4">
                    <i class="fas fa-comments fa-3x text-muted mb-3"></i>
                    <p class="text-muted">Nessun commento ancora.</p>
                    <button class="btn btn-outline-primary" onclick="configDetail.showCommentForm()">
                        <i class="fas fa-plus me-2"></i>
                        Aggiungi il primo commento
                    </button>
                </div>
            `;
            // Aggiorna contatore commenti
            const cntEl = document.getElementById('commentsCount');
            if (cntEl) cntEl.textContent = `(0)`;
            return;
        }

        // Costruisci HTML per i commenti e mostra sempre CTA per aggiungere un commento
        const addButtonHtml = `
            <div class="mb-3 text-end">
                <button class="btn btn-outline-primary btn-sm" onclick="configDetail.showCommentForm()">
                    <i class="fas fa-plus me-1"></i> Aggiungi Commento
                </button>
            </div>
        `;

        commentsList.innerHTML = addButtonHtml + comments.map(comment => {
            const author = comment.username || comment.user_id || 'Utente';
            const text = comment.comment || comment.text || '';
            let createdAt = '';
            if (comment.created_at) {
                try {
                    createdAt = apiClient.formatDate(comment.created_at);
                } catch (e) {
                    createdAt = String(comment.created_at);
                }
            }

            return `
                <div class="comment-item mb-3">
                    <div class="d-flex gap-3">
                        <div class="author-avatar bg-secondary text-white rounded-circle d-flex align-items-center justify-content-center" style="width:48px;height:48px;">
                            <strong>${(author || 'U').charAt(0).toUpperCase()}</strong>
                        </div>
                        <div class="flex-grow-1">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <strong>${author}</strong>
                                    <div class="text-muted small">${createdAt}</div>
                                </div>
                            </div>
                            <p class="mb-0 mt-2">${text}</p>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Aggiorna contatore commenti (usa comment_count se disponibile)
        const cntEl2 = document.getElementById('commentsCount');
        const commentsCount = this.configuration && (this.configuration.comments_count ?? comments.length);
        if (cntEl2) cntEl2.textContent = `(${commentsCount})`;
    }

    showCommentForm() {
        if (!authManager.isLoggedIn()) {
            showLoginModal();
            return;
        }
        
        document.getElementById('addCommentForm').style.display = 'block';
        document.getElementById('commentText').focus();
    }

    cancelComment() {
        document.getElementById('addCommentForm').style.display = 'none';
        document.getElementById('commentText').value = '';
    }

    async handleCommentSubmit(event) {
        event.preventDefault();
        
        const commentText = document.getElementById('commentText').value.trim();
        if (!commentText) {
            apiClient.showError('Il commento non può essere vuoto');
            return;
        }
        
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Invio...';
        
        try {
            await apiClient.addComment(this.configId, commentText);
            apiClient.showSuccess('Commento aggiunto con successo!');

            // Ricarica i dettagli aggiornati (comments incluse)
            const updated = await apiClient.getConfigurationDetails(this.configId);
            this.configuration = { ...this.configuration, ...updated };
            this.loadComments();
            this.cancelComment();

        } catch (error) {
            apiClient.showError('Errore nell\'aggiunta del commento: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    showRatingModal() {
        if (!authManager.isLoggedIn()) {
            showLoginModal();
            return;
        }
        
        const modal = new bootstrap.Modal(document.getElementById('ratingModal'));
        modal.show();
    }

    async handleRatingSubmit(event) {
        event.preventDefault();
        
        const rating = parseInt(document.getElementById('selectedRating').value);
        if (rating === 0) {
            apiClient.showError('Seleziona una valutazione');
            return;
        }
        
        const submitBtn = document.getElementById('submitRating');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Invio...';
        
        try {
            await apiClient.addRating(this.configId, rating);
            apiClient.showSuccess('Valutazione inviata con successo!');

            // Chiudi il modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('ratingModal'));
            modal.hide();

            // Ricarica i dettagli aggiornati (avg, total_ratings, ratings list)
            const updated = await apiClient.getConfigurationDetails(this.configId);
            this.configuration = { ...this.configuration, ...updated };
            this.updateStatistics();
            this.loadComments();
            
        } catch (error) {
            apiClient.showError('Errore nell\'invio della valutazione: ' + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    async likeConfiguration() {
        if (!authManager.isLoggedIn()) {
            showLoginModal();
            return;
        }
        const likeBtn = document.getElementById('likeBtn');
        const likeText = document.getElementById('likeText');
        const originalText = likeBtn.innerHTML;
        likeBtn.disabled = true;
        likeBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>...';
        try {
            const response = await apiClient.toggleLike(this.configId);
            // Ricarica i dettagli aggiornati per avere il conteggio reale e lo stato
            const updated = await apiClient.getConfigurationDetails(this.configId);
            this.configuration = { ...this.configuration, ...updated };
            this.updateStatistics();
            // Aggiorna stato del bottone in base a liked_by
            const userData = authManager.getCurrentUser();
            const liked_by = this.configuration.liked_by || [];
            this.userHasLiked = liked_by.includes(userData.user_id);
            if (this.userHasLiked) {
                likeText.textContent = 'Ti Piace';
                likeBtn.classList.remove('btn-primary');
                likeBtn.classList.add('btn-success');
            } else {
                likeText.textContent = 'Mi Piace';
                likeBtn.classList.remove('btn-success');
                likeBtn.classList.add('btn-primary');
            }
        } catch (error) {
            apiClient.showError('Errore nell\'operazione: ' + error.message);
        } finally {
            likeBtn.disabled = false;
            likeBtn.innerHTML = originalText;
        }
    }

    shareConfiguration() {
        const shareUrl = window.location.href;
        const shareTitle = this.configuration.title || 'Configurazione interessante';
        
        if (navigator.share) {
            navigator.share({
                title: shareTitle + ' - Game Config Hub',
                text: `Guarda questa configurazione per ${this.configuration.game}!`,
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

    downloadConfiguration() {
        const configData = {
            title: this.configuration.title,
            game: this.configuration.game,
            description: this.configuration.description,
            tags: this.configuration.tags,
            parameters: this.configuration.parameters,
            author: this.configuration.author ? this.configuration.author.username : 'Sconosciuto',
            created_at: this.configuration.created_at,
            downloaded_at: new Date().toISOString(),
            source: window.location.href
        };
        
        const dataStr = JSON.stringify(configData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `${this.configuration.title || 'configurazione'}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        apiClient.showSuccess('Download avviato!');
    }

    copyParameters() {
        const parametersJson = JSON.stringify(this.configuration.parameters, null, 2);
        
        navigator.clipboard.writeText(parametersJson).then(() => {
            apiClient.showSuccess('Parametri copiati negli appunti!');
        }).catch(() => {
            apiClient.showError('Impossibile copiare i parametri');
        });
    }

    showLoading() {
        document.getElementById('configLoading').style.display = 'flex';
        document.getElementById('configContent').style.display = 'none';
        document.getElementById('configError').style.display = 'none';
    }

    showContent() {
        document.getElementById('configLoading').style.display = 'none';
        document.getElementById('configContent').style.display = 'block';
        document.getElementById('configError').style.display = 'none';
        
        // Anima l'ingresso del contenuto
        setTimeout(() => {
            document.getElementById('configContent').classList.add('fade-in');
        }, 50);
    }

    showError(message) {
        document.getElementById('configLoading').style.display = 'none';
        document.getElementById('configContent').style.display = 'none';
        document.getElementById('configError').style.display = 'block';
        
        const errorDiv = document.getElementById('configError');
        errorDiv.innerHTML = `
            <div class="alert alert-danger">
                <h4 class="alert-heading">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Errore
                </h4>
                <p>${message}</p>
                <hr>
                <div class="d-flex gap-2">
                    <a href="configurations.html" class="btn btn-primary">
                        <i class="fas fa-list me-2"></i>
                        Vedi Tutte le Configurazioni
                    </a>
                    <a href="search.html" class="btn btn-outline-primary">
                        <i class="fas fa-search me-2"></i>
                        Cerca Configurazioni
                    </a>
                </div>
            </div>
        `;
    }
}

// CSS aggiuntivo per la pagina di dettaglio
const configDetailCSS = `
.config-detail-header {
    background: var(--gradient-primary);
    color: white;
    border-radius: 15px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.config-detail-title {
    font-size: 2.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
    line-height: 1.2;
}

.config-detail-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 2rem;
    opacity: 0.9;
}

.config-detail-meta > span {
    display: flex;
    align-items: center;
    font-size: 1rem;
}

.config-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    align-items: center;
}

.config-section {
    background: white;
    border-radius: 15px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    overflow: hidden;
}

.section-title {
    background: var(--gradient-info);
    color: var(--dark-color);
    margin: 0;
    padding: 1.5rem 2rem;
    font-size: 1.3rem;
    font-weight: 600;
    border-bottom: 1px solid rgba(0,0,0,0.1);
}

.section-content {
    padding: 2rem;
}

.description-text {
    font-size: 1.1rem;
    line-height: 1.7;
    color: var(--secondary-color);
    margin: 0;
}

.tags-container {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.config-tag-large {
    font-size: 0.9rem;
    padding: 0.5rem 1rem;
    border-radius: 20px;
}

.parameters-container {
    position: relative;
}

.parameters-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
}

.formatted-parameters {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 1.5rem;
}

.parameter-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1rem 0;
    border-bottom: 1px solid #e9ecef;
}

.parameter-row:last-child {
    border-bottom: none;
}

.parameter-key {
    flex: 0 0 30%;
    font-weight: 600;
}

.parameter-type {
    font-size: 0.8rem;
    color: var(--primary-color);
    font-weight: normal;
    margin-left: 0.5rem;
}

.parameter-value {
    flex: 1;
    text-align: right;
    word-break: break-word;
}

.parameter-value pre {
    background: white;
    border: 1px solid #dee2e6;
    border-radius: 5px;
    padding: 0.75rem;
    margin: 0;
    font-size: 0.9rem;
    text-align: left;
}

.parameter-value-boolean {
    color: var(--primary-color);
    font-weight: 600;
}

.parameter-value-number {
    color: var(--success-color);
    font-weight: 600;
}

.parameter-value-array {
    color: var(--info-color);
    font-style: italic;
}

.raw-parameters {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 0;
    overflow: hidden;
}

.json-display {
    background: #2d3748;
    color: #e2e8f0;
    margin: 0;
    padding: 1.5rem;
    font-size: 0.9rem;
    overflow-x: auto;
}

.sidebar-card {
    background: white;
    border-radius: 15px;
    padding: 1.5rem;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.sidebar-title {
    color: var(--dark-color);
    font-weight: 600;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid var(--primary-color);
}

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.stat-item {
    text-align: center;
    padding: 1rem;
    background: var(--light-color);
    border-radius: 10px;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: bold;
    color: var(--primary-color);
    margin-bottom: 0.25rem;
}

.stat-label {
    font-size: 0.8rem;
    color: var(--secondary-color);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.author-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.author-avatar {
    flex-shrink: 0;
}

.author-details h6 {
    margin: 0;
    color: var(--dark-color);
}

.author-details p {
    margin: 0;
    font-size: 0.9rem;
}

.related-config-item {
    padding: 1rem 0;
    border-bottom: 1px solid #e9ecef;
}

.related-config-item:last-child {
    border-bottom: none;
}

.related-config-title {
    margin-bottom: 0.5rem;
}

.related-config-title a {
    color: var(--dark-color);
    text-decoration: none;
    font-weight: 600;
}

.related-config-title a:hover {
    color: var(--primary-color);
}

.related-config-game {
    color: var(--secondary-color);
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
}

.related-config-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
}

.config-tag-sm {
    font-size: 0.7rem;
    padding: 0.2rem 0.5rem;
}

.comments-count {
    color: var(--secondary-color);
    font-weight: normal;
    font-size: 1rem;
}

.add-comment-form {
    background: var(--light-color);
    border-radius: 10px;
    padding: 1.5rem;
    margin-bottom: 2rem;
}

.rating-input {
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    font-size: 2rem;
    margin: 1rem 0;
}

.rating-star {
    color: #e9ecef;
    cursor: pointer;
    transition: all 0.2s ease;
}

.rating-star:hover,
.rating-star.highlighted {
    color: #ffc107;
    transform: scale(1.1);
}

.rating-star.selected {
    color: #ffc107;
}

@media (max-width: 768px) {
    .config-detail-title {
        font-size: 2rem;
    }
    
    .config-detail-meta {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .config-actions {
        margin-top: 1rem;
        justify-content: center;
    }
    
    .parameter-row {
        flex-direction: column;
        gap: 0.5rem;
    }
    
    .parameter-value {
        text-align: left;
    }
    
    .stats-grid {
        grid-template-columns: 1fr;
    }
    
    .parameters-toolbar {
        flex-direction: column;
        align-items: stretch;
    }
}
`;

// Aggiungi CSS alla pagina
const style = document.createElement('style');
style.textContent = configDetailCSS;
document.head.appendChild(style);

// Inizializza la pagina quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.configDetail = new ConfigurationDetail();
});
