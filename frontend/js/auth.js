// Authentication Management
class AuthManager {
    constructor() {
        this.token = localStorage.getItem('authToken');
        this.userData = JSON.parse(localStorage.getItem('userData') || 'null');
        this.initializeAuth();
    }

    initializeAuth() {
        // Controlla se l'utente è loggato all'avvio
        this.updateNavbar();
        
        // Setup degli event listeners per i form
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => this.handleRegister(e));
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // Disabilita il form durante il login
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Login in corso...';
        
        try {
            const response = await apiClient.login({ email, password });
            
            // Aggiorna i dati locali
            this.token = response.access_token;
            this.userData = await apiClient.getCurrentUser();
            
            // Chiudi il modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
            modal.hide();
            
            // Aggiorna la navbar
            this.updateNavbar();
            
            // Mostra messaggio di successo
            apiClient.showSuccess(`Benvenuto, ${this.userData.username}!`);
            
            // Reset del form
            document.getElementById('loginForm').reset();
            
        } catch (error) {
            apiClient.showError(error.message);
        } finally {
            // Riabilita il form
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    async handleRegister(event) {
        event.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        
        // Validazione base
        if (password.length < 6) {
            apiClient.showError('La password deve essere di almeno 6 caratteri');
            return;
        }
        
        // Disabilita il form durante la registrazione
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2"></div>Registrazione...';
        
        try {
            await apiClient.register({ username, email, password });
            
            // Chiudi il modal di registrazione
            const modal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
            modal.hide();
            
            // Mostra messaggio di successo
            apiClient.showSuccess('Registrazione completata! Ora puoi effettuare il login.');
            
            // Apri il modal di login
            setTimeout(() => {
                const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                loginModal.show();
                
                // Pre-compila l'email
                document.getElementById('loginEmail').value = email;
            }, 500);
            
            // Reset del form
            document.getElementById('registerForm').reset();
            
        } catch (error) {
            apiClient.showError(error.message);
        } finally {
            // Riabilita il form
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    logout() {
        // Rimuovi dati locali
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        this.token = null;
        this.userData = null;
        
        // Aggiorna la navbar
        this.updateNavbar();
        
        // Mostra messaggio
        apiClient.showSuccess('Logout effettuato con successo');
        
        // Redirect alla homepage se necessario
        if (this.requiresAuth()) {
            window.location.href = 'index.html';
        }
    }

    updateNavbar() {
        const navbarUser = document.getElementById('navbar-user');
        if (!navbarUser) return;

        if (this.isLoggedIn()) {
            // Utente loggato
            navbarUser.innerHTML = `
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                        <i class="fas fa-user me-1"></i>
                        ${this.userData.username}
                    </a>
                    <ul class="dropdown-menu">
                        <li>
                            <a class="dropdown-item" href="#" onclick="authManager.showProfile()">
                                <i class="fas fa-user-circle me-2"></i>
                                Profilo
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="upload.html">
                                <i class="fas fa-upload me-2"></i>
                                Carica Config
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item" href="#" onclick="authManager.logout()">
                                <i class="fas fa-sign-out-alt me-2"></i>
                                Logout
                            </a>
                        </li>
                    </ul>
                </li>
            `;
        } else {
            // Utente non loggato
            navbarUser.innerHTML = `
                <li class="nav-item">
                    <button class="btn btn-outline-light me-2" onclick="showLoginModal()">
                        <i class="fas fa-sign-in-alt me-1"></i>
                        Login
                    </button>
                </li>
                <li class="nav-item">
                    <button class="btn btn-light" onclick="showRegisterModal()">
                        <i class="fas fa-user-plus me-1"></i>
                        Registrati
                    </button>
                </li>
            `;
        }
    }

    showProfile() {
        if (!this.isLoggedIn()) {
            apiClient.showError('Devi essere loggato per vedere il profilo');
            return;
        }

        // Crea e mostra modal del profilo
        const modalHtml = `
            <div class="modal fade" id="profileModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-user-circle me-2"></i>
                                Il Mio Profilo
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="text-center mb-4">
                                <div class="profile-avatar">
                                    <i class="fas fa-user-circle fa-5x text-primary"></i>
                                </div>
                            </div>
                            <div class="profile-info">
                                <div class="row mb-3">
                                    <div class="col-4"><strong>Username:</strong></div>
                                    <div class="col-8">${this.userData.username}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-4"><strong>Email:</strong></div>
                                    <div class="col-8">${this.userData.email}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-4"><strong>ID Utente:</strong></div>
                                    <div class="col-8">
                                        <small class="text-muted">${this.userData.user_id}</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                Chiudi
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Rimuovi modal esistente se presente
        const existingModal = document.getElementById('profileModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Aggiungi il nuovo modal
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Mostra il modal
        const modal = new bootstrap.Modal(document.getElementById('profileModal'));
        modal.show();

        // Rimuovi il modal quando viene chiuso
        document.getElementById('profileModal').addEventListener('hidden.bs.modal', function () {
            this.remove();
        });
    }

    isLoggedIn() {
        return !!(this.token && this.userData);
    }

    requiresAuth() {
        // Lista delle pagine che richiedono autenticazione
        const authRequiredPages = ['upload.html'];
        const currentPage = window.location.pathname.split('/').pop();
        return authRequiredPages.includes(currentPage);
    }

    // Guard per pagine che richiedono autenticazione
    checkAuthRequired() {
        if (this.requiresAuth() && !this.isLoggedIn()) {
            apiClient.showError('Devi essere loggato per accedere a questa pagina');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
            return false;
        }
        return true;
    }

    // Helper per ottenere l'utente corrente
    getCurrentUser() {
        return this.userData;
    }

    // Helper per ottenere il token
    getToken() {
        return this.token;
    }
}

// Funzioni globali per i modals
function showLoginModal() {
    const modal = new bootstrap.Modal(document.getElementById('loginModal'));
    modal.show();
}

function showRegisterModal() {
    // Chiudi login modal se aperto
    const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (loginModal) {
        loginModal.hide();
    }
    
    // Apri register modal
    const modal = new bootstrap.Modal(document.getElementById('registerModal'));
    modal.show();
}

// Inizializza il manager dell'autenticazione
const authManager = new AuthManager();

// Esporta globalmente
window.authManager = authManager;
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
