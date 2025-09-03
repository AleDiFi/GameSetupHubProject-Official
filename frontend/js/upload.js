// Upload Page JavaScript
class UploadPage {
    constructor() {
        this.parameters = [];
        this.parameterCounter = 0;
        this.currentActiveTab = 'simple';
        
        this.init();
    }

    init() {
        // Controlla se l'utente è loggato
        if (!authManager.checkAuthRequired()) {
            return;
        }

        // Setup event listeners
        this.setupEventListeners();
        
        // Aggiungi il primo parametro di default
        this.addParameter();
    }

    setupEventListeners() {
        // Form submission
        const uploadForm = document.getElementById('uploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Tags input con preview in tempo reale
        const tagsInput = document.getElementById('configTags');
        if (tagsInput) {
            tagsInput.addEventListener('input', () => this.updateTagPreview());
        }

        // JSON validation in tempo reale
        const jsonInput = document.getElementById('configParametersJson');
        if (jsonInput) {
            jsonInput.addEventListener('input', () => this.validateJson());
        }

        // Tab switching
        const tabs = document.querySelectorAll('#configInputTabs button');
        tabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', (e) => {
                this.currentActiveTab = e.target.dataset.bsTarget.replace('#', '');
                this.syncParametersData();
            });
        });

        // Auto-save in localStorage ogni 30 secondi
        setInterval(() => this.autoSave(), 30000);
        
        // Carica dati salvati se presenti
        this.loadSavedData();
    }

    addParameter() {
        this.parameterCounter++;
        const parameterId = `param_${this.parameterCounter}`;
        
        const parameterHtml = `
            <div class="parameter-item" data-id="${parameterId}">
                <div class="parameter-header">
                    <input type="text" class="form-control parameter-name" 
                           placeholder="Nome parametro" required>
                    <select class="form-select parameter-type">
                        <option value="string">Testo</option>
                        <option value="number">Numero</option>
                        <option value="boolean">Booleano</option>
                        <option value="object">Oggetto</option>
                        <option value="array">Array</option>
                    </select>
                    <button type="button" class="btn btn-outline-danger btn-sm" 
                            onclick="uploadPage.removeParameter('${parameterId}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <div class="parameter-value">
                    <input type="text" class="form-control parameter-input" 
                           placeholder="Valore del parametro">
                    <small class="form-text text-muted parameter-help">
                        Inserisci il valore per questo parametro
                    </small>
                </div>
            </div>
        `;

        document.getElementById('parametersList').insertAdjacentHTML('beforeend', parameterHtml);
        
        // Setup event listeners per il nuovo parametro
        this.setupParameterEvents(parameterId);
        
        // Aggiorna la sincronizzazione
        this.syncParametersData();
    }

    setupParameterEvents(parameterId) {
        const parameterElement = document.querySelector(`[data-id="${parameterId}"]`);
        
        // Type change handler
        const typeSelect = parameterElement.querySelector('.parameter-type');
        typeSelect.addEventListener('change', () => {
            this.updateParameterInput(parameterId);
            this.syncParametersData();
        });

        // Value change handler
        const inputs = parameterElement.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', () => this.syncParametersData());
        });
    }

    updateParameterInput(parameterId) {
        const parameterElement = document.querySelector(`[data-id="${parameterId}"]`);
        const type = parameterElement.querySelector('.parameter-type').value;
        const valueContainer = parameterElement.querySelector('.parameter-value');
        
        let inputHtml = '';
        let helpText = '';

        switch (type) {
            case 'string':
                inputHtml = `<input type="text" class="form-control parameter-input" placeholder="Valore testo">`;
                helpText = 'Inserisci un valore di testo';
                break;
            case 'number':
                inputHtml = `<input type="number" class="form-control parameter-input" placeholder="0">`;
                helpText = 'Inserisci un numero';
                break;
            case 'boolean':
                inputHtml = `
                    <select class="form-select parameter-input">
                        <option value="true">True</option>
                        <option value="false">False</option>
                    </select>
                `;
                helpText = 'Seleziona vero o falso';
                break;
            case 'object':
                inputHtml = `<textarea class="form-control parameter-input" rows="3" placeholder='{"chiave": "valore"}'></textarea>`;
                helpText = 'Inserisci un oggetto JSON valido';
                break;
            case 'array':
                inputHtml = `<textarea class="form-control parameter-input" rows="2" placeholder='["item1", "item2"]'></textarea>`;
                helpText = 'Inserisci un array JSON valido';
                break;
        }

        valueContainer.innerHTML = `
            ${inputHtml}
            <small class="form-text text-muted parameter-help">${helpText}</small>
        `;

        // Re-attach event listener
        const newInput = valueContainer.querySelector('.parameter-input');
        newInput.addEventListener('input', () => this.syncParametersData());
    }

    removeParameter(parameterId) {
        const parameterElement = document.querySelector(`[data-id="${parameterId}"]`);
        if (parameterElement) {
            parameterElement.remove();
            this.syncParametersData();
        }
    }

    syncParametersData() {
        if (this.currentActiveTab === 'simple') {
            // Sync from simple to JSON
            const parameters = this.getParametersFromSimpleForm();
            const jsonTextarea = document.getElementById('configParametersJson');
            jsonTextarea.value = JSON.stringify(parameters, null, 2);
            this.validateJson();
        } else {
            // Sync from JSON to simple (quando si passa da JSON a simple)
            // Per ora non implementiamo il sync inverso per evitare complessità
        }
    }

    getParametersFromSimpleForm() {
        const parameters = {};
        const parameterItems = document.querySelectorAll('.parameter-item');
        
        parameterItems.forEach(item => {
            const name = item.querySelector('.parameter-name').value.trim();
            const type = item.querySelector('.parameter-type').value;
            const valueInput = item.querySelector('.parameter-input');
            
            if (!name) return;
            
            let value = valueInput.value;
            
            try {
                switch (type) {
                    case 'number':
                        value = parseFloat(value) || 0;
                        break;
                    case 'boolean':
                        value = value === 'true';
                        break;
                    case 'object':
                    case 'array':
                        value = JSON.parse(value || (type === 'object' ? '{}' : '[]'));
                        break;
                    default:
                        // string - mantieni come è
                        break;
                }
                
                parameters[name] = value;
            } catch (error) {
                // In caso di errore di parsing, usa il valore come stringa
                parameters[name] = valueInput.value;
            }
        });
        
        return parameters;
    }

    validateJson() {
        const jsonInput = document.getElementById('configParametersJson');
        const validation = document.getElementById('jsonValidation');
        
        try {
            const parsed = JSON.parse(jsonInput.value || '{}');
            validation.innerHTML = `
                <div class="alert alert-success alert-sm mt-2">
                    <i class="fas fa-check-circle me-1"></i>
                    JSON valido
                </div>
            `;
            return true;
        } catch (error) {
            validation.innerHTML = `
                <div class="alert alert-danger alert-sm mt-2">
                    <i class="fas fa-exclamation-circle me-1"></i>
                    Errore JSON: ${error.message}
                </div>
            `;
            return false;
        }
    }

    updateTagPreview() {
        const tagsInput = document.getElementById('configTags');
        const preview = document.getElementById('tagPreview');
        
        const tags = tagsInput.value.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        if (tags.length === 0) {
            preview.innerHTML = '';
            return;
        }
        
        const tagsHtml = tags.map(tag => 
            `<span class="config-tag">${tag}</span>`
        ).join(' ');
        
        preview.innerHTML = `<div class="mt-2"><strong>Preview:</strong> ${tagsHtml}</div>`;
    }

    addTag(tagName) {
        const tagsInput = document.getElementById('configTags');
        const currentTags = tagsInput.value.split(',').map(t => t.trim()).filter(t => t);
        
        if (!currentTags.includes(tagName)) {
            currentTags.push(tagName);
            tagsInput.value = currentTags.join(', ');
            this.updateTagPreview();
        }
    }

    showPreview() {
        const formData = this.getFormData();
        if (!formData) return;
        
        const previewSection = document.getElementById('previewSection');
        const previewContent = document.getElementById('configPreview');
        
        const previewHtml = `
            <div class="config-card">
                <div class="config-header">
                    <h6 class="config-title">${formData.title}</h6>
                    <small class="config-game">
                        <i class="fas fa-gamepad me-1"></i>
                        ${formData.game}
                    </small>
                </div>
                <div class="config-body">
                    <p class="config-description">${formData.description || 'Nessuna descrizione'}</p>
                    
                    ${formData.tags.length > 0 ? `
                        <div class="config-tags">
                            ${formData.tags.map(tag => `<span class="config-tag">${tag}</span>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="config-stats">
                        <div class="config-stat">
                            <i class="fas fa-cog"></i>
                            <small>${Object.keys(formData.parameters).length} parametri</small>
                        </div>
                        <div class="config-stat">
                            <i class="fas fa-user"></i>
                            <small>${authManager.getCurrentUser().username}</small>
                        </div>
                    </div>
                    
                    <div class="parameters-preview">
                        <strong>Parametri:</strong>
                        <pre class="bg-light p-2 rounded mt-2" style="max-height: 200px; overflow-y: auto;">${JSON.stringify(formData.parameters, null, 2)}</pre>
                    </div>
                </div>
            </div>
        `;
        
        previewContent.innerHTML = previewHtml;
        previewSection.style.display = 'block';
        
        // Scroll to preview
        previewSection.scrollIntoView({ behavior: 'smooth' });
    }

    getFormData() {
        const title = document.getElementById('configTitle').value.trim();
        const game = document.getElementById('configGame').value.trim();
        const description = document.getElementById('configDescription').value.trim();
        const tagsInput = document.getElementById('configTags').value.trim();
        
        // Validazione base
        if (!title || !game) {
            apiClient.showError('Titolo e gioco sono obbligatori');
            return null;
        }
        
        // Ottieni parametri
        let parameters = {};
        
        if (this.currentActiveTab === 'simple') {
            parameters = this.getParametersFromSimpleForm();
        } else {
            // JSON tab
            const jsonInput = document.getElementById('configParametersJson');
            try {
                parameters = JSON.parse(jsonInput.value || '{}');
            } catch (error) {
                apiClient.showError('Il JSON dei parametri non è valido: ' + error.message);
                return null;
            }
        }
        
        // Processa i tags
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        return {
            title,
            game,
            description,
            tags,
            parameters
        };
    }

    async handleSubmit(event) {
        event.preventDefault();
        
        // Controlla se l'utente è loggato
        if (!authManager.isLoggedIn()) {
            apiClient.showError('Devi essere loggato per caricare una configurazione');
            showLoginModal();
            return;
        }
        
        const formData = this.getFormData();
        if (!formData) return;
        
        // Disabilita il form durante l'upload
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Caricamento...';
        
        try {
            const response = await apiClient.uploadConfig(formData);
            
            // Mostra messaggio di successo
            apiClient.showSuccess('Configurazione caricata con successo!');
            
            // Pulisci il form
            this.clearForm();
            
            // Rimuovi auto-save
            this.clearSavedData();
            
            // Redirect alle configurazioni dopo un breve delay
            setTimeout(() => {
                window.location.href = `configuration.html?id=${response.id}`;
            }, 1500);
            
        } catch (error) {
            apiClient.showError('Errore nel caricamento: ' + error.message);
        } finally {
            // Riabilita il form
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    clearForm() {
        // Reset form principale
        document.getElementById('uploadForm').reset();
        
        // Reset parametri
        document.getElementById('parametersList').innerHTML = '';
        this.parameterCounter = 0;
        this.addParameter();
        
        // Reset JSON
        document.getElementById('configParametersJson').value = '';
        
        // Reset preview
        document.getElementById('tagPreview').innerHTML = '';
        document.getElementById('previewSection').style.display = 'none';
        
        // Reset validation
        document.getElementById('jsonValidation').innerHTML = '';
        
        // Torna al tab semplice
        const simpleTab = document.getElementById('simple-tab');
        const bootstrap_tab = new bootstrap.Tab(simpleTab);
        bootstrap_tab.show();
        this.currentActiveTab = 'simple';
    }

    // Auto-save functionality
    autoSave() {
        if (!authManager.isLoggedIn()) return;
        
        const formData = {
            title: document.getElementById('configTitle').value,
            game: document.getElementById('configGame').value,
            description: document.getElementById('configDescription').value,
            tags: document.getElementById('configTags').value,
            json: document.getElementById('configParametersJson').value,
            activeTab: this.currentActiveTab,
            timestamp: Date.now()
        };
        
        localStorage.setItem('upload_autosave', JSON.stringify(formData));
    }

    loadSavedData() {
        const savedData = localStorage.getItem('upload_autosave');
        if (!savedData) return;
        
        try {
            const data = JSON.parse(savedData);
            
            // Controlla se i dati non sono troppo vecchi (più di 24 ore)
            if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
                this.clearSavedData();
                return;
            }
            
            // Chiedi all'utente se vuole ripristinare
            if (confirm('Sono stati trovati dati non salvati. Vuoi ripristinare la bozza?')) {
                document.getElementById('configTitle').value = data.title || '';
                document.getElementById('configGame').value = data.game || '';
                document.getElementById('configDescription').value = data.description || '';
                document.getElementById('configTags').value = data.tags || '';
                document.getElementById('configParametersJson').value = data.json || '';
                
                this.updateTagPreview();
                this.validateJson();
                
                // Switcha al tab salvato
                if (data.activeTab === 'json') {
                    const jsonTab = document.getElementById('json-tab');
                    const bootstrap_tab = new bootstrap.Tab(jsonTab);
                    bootstrap_tab.show();
                }
            } else {
                this.clearSavedData();
            }
        } catch (error) {
            console.error('Errore nel caricamento dei dati salvati:', error);
            this.clearSavedData();
        }
    }

    clearSavedData() {
        localStorage.removeItem('upload_autosave');
    }
}

// CSS aggiuntivo per la pagina di upload
const uploadCSS = `
.upload-header {
    text-align: center;
    padding: 2rem 0;
}

.upload-card {
    background: white;
    border-radius: 15px;
    padding: 2rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    margin-bottom: 2rem;
}

.form-section {
    margin-bottom: 2.5rem;
    padding-bottom: 2rem;
    border-bottom: 1px solid #e9ecef;
}

.form-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
}

.section-title {
    color: var(--dark-color);
    margin-bottom: 1.5rem;
    font-weight: 600;
}

.parameter-item {
    background: #f8f9fa;
    border-radius: 10px;
    padding: 1rem;
    margin-bottom: 1rem;
    border: 2px solid transparent;
    transition: all 0.3s ease;
}

.parameter-item:hover {
    border-color: var(--primary-color);
    background: #fff;
}

.parameter-header {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    align-items: center;
}

.parameter-header .parameter-name {
    flex: 2;
}

.parameter-header .parameter-type {
    flex: 1;
}

.parameter-value {
    margin-left: 0;
}

.json-editor {
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
}

.config-input-tabs {
    background: white;
    border-radius: 10px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.nav-tabs {
    border: none;
    background: var(--light-color);
}

.nav-tabs .nav-link {
    border: none;
    color: var(--secondary-color);
    font-weight: 500;
    padding: 1rem 1.5rem;
}

.nav-tabs .nav-link.active {
    background: white;
    color: var(--primary-color);
    border-bottom: 3px solid var(--primary-color);
}

.tab-content {
    padding: 1.5rem;
    background: white;
}

.tips-card {
    background: white;
    border-radius: 15px;
    padding: 1.5rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    position: sticky;
    top: 20px;
}

.tips-title {
    color: var(--dark-color);
    margin-bottom: 1rem;
    font-weight: 600;
}

.tip-item {
    display: flex;
    gap: 0.75rem;
    margin-bottom: 1rem;
    align-items: flex-start;
}

.tip-item:last-child {
    margin-bottom: 0;
}

.tip-item i {
    font-size: 1.2rem;
    margin-top: 0.2rem;
}

.tip-item strong {
    color: var(--dark-color);
    display: block;
    margin-bottom: 0.25rem;
}

.tip-item p {
    margin: 0;
    color: var(--secondary-color);
    font-size: 0.9rem;
    line-height: 1.4;
}

.popular-tags-card {
    background: white;
    border-radius: 15px;
    padding: 1rem;
    box-shadow: 0 4px 20px rgba(0,0,0,0.1);
}

.popular-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.tag-suggestion {
    background: var(--light-color);
    color: var(--primary-color);
    padding: 0.25rem 0.75rem;
    border-radius: 15px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.3s ease;
    border: 1px solid var(--primary-color);
}

.tag-suggestion:hover {
    background: var(--primary-color);
    color: white;
}

.submit-actions {
    text-align: center;
    padding-top: 1rem;
}

.alert-sm {
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
}

@media (max-width: 768px) {
    .parameter-header {
        flex-direction: column;
    }
    
    .parameter-header .parameter-name,
    .parameter-header .parameter-type {
        flex: none;
        width: 100%;
    }
    
    .submit-actions .d-flex {
        flex-direction: column;
    }
    
    .tips-card {
        position: static;
        margin-top: 2rem;
    }
}
`;

// Aggiungi CSS alla pagina
const style = document.createElement('style');
style.textContent = uploadCSS;
document.head.appendChild(style);

// Inizializza la pagina quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
    window.uploadPage = new UploadPage();
});
