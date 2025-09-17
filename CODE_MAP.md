# MAPPA DEL CODICE — GameSetupHubProject-Official

Questo documento descrive gli artefatti di codice principali del repository, organizzati per cartella e funzione. La struttura segue la suddivisione in microservizi, frontend, infrastruttura e documentazione.

## Documenti top-level

- `README.md` — Panoramica del progetto e istruzioni per avvio locale.
- `CODE_MAP.md` — Mappa del codice (questo documento).
- `ComandsFile.txt` — Elenco comandi utili o script.
- `requirements.txt` — Dipendenze Python globali.
- `start_services.bat` / `start_services.sh` — Script per avvio rapido dei servizi (Windows/Unix).

## Documentazione

- `docs/diagrammi/` — Diagrammi architetturali e di sequenza.
- `docs/relazioni/` — Relazione tecnica finale.

## Infrastruttura

- `infra/docker-compose.yml` — Definizione dei servizi Docker per sviluppo locale (MongoDB, frontend, microservizi).

---

## Frontend (sito statico servito da nginx)

- `frontend/index.html` — Dashboard principale.
- `frontend/configuration.html` — Dettaglio configurazione.
- `frontend/configurations.html` — Elenco configurazioni.
- `frontend/search.html` — Ricerca avanzata.
- `frontend/upload.html` — Form upload configurazione.
- `frontend/style.css` — Stili globali.
- `frontend/Dockerfile` — Image nginx per lo statico.

### JS (frontend/js)

- `api.js` — Client HTTP centrale, gestione chiamate ai microservizi e autenticazione.
- `auth.js` — Gestione login, registrazione, sessione utente.
- `configuration-detail.js` — Logica pagina dettaglio configurazione.
- `configurations.js` — Logica pagina elenco configurazioni.
- `dashboard.js` — Stato servizi e configurazioni recenti.
- `search.js` — Ricerca avanzata e filtri.
- `upload.js` — Gestione form upload e parametri.

#### Descrizione funzione-per-funzione (già espanso per i file principali)

- `frontend/js/api.js` —
  - `getConfig(configId)`: recupera la configurazione base dal `configs_service`.
  - `getConfigurationDetails(configId)`: recupera la vista arricchita dal `visualizations_service`.
  - `addComment(configId, comment)`: POST per aggiungere un commento.
  - `addRating(configId, rating)`: POST per inviare una valutazione.
  - `toggleLike(configId)`: aggiunge o rimuove like.
  - `login` / `register` / `getCurrentUser`: gestione autenticazione e token.
  - helper: `formatDate`, `truncateText`, `handleResponse`, `showToast`, `showError`, `showSuccess`.

- `frontend/js/configuration-detail.js` — Metodi principali: `init`, `getConfigIdFromUrl`, `setupEventListeners`, gestione rating/commenti, caricamento dettagli, rendering, utility.

- `frontend/js/auth.js` — Metodi principali: `handleLogin`, `handleRegister`, `logout`, `updateNavbar`, `showProfile`, `isLoggedIn`, `requiresAuth`, `checkAuthRequired`, `getCurrentUser`, `getToken`, `showLoginModal`, `showRegisterModal`.

- `frontend/js/configurations.js` — Metodi principali: `init`, `setupEventListeners`, `loadConfigurations`, `applyFilters`, `updatePagination`, `renderPagination`, `renderConfigurations`, `generateConfigurationCard`, `getEmptyState`, `updateStats`, `handleFilter`, `clearFilters`.

- `frontend/js/dashboard.js` — Metodi principali: `checkServicesStatus`, `updateServiceStatus`, `loadRecentConfigurations`, `generateConfigCard`, `testServiceConnection`.

- `frontend/js/search.js` — Metodi principali: `setupEventListeners`, `loadAvailableData`, `setupAdvancedFilters`, `performSearch`, `performAdvancedSearch`, `performBasicSearch`, `applyLocalFilters`, `displayResults`.

- `frontend/js/upload.js` — Metodi principali: `init`, `setupEventListeners`, `addParameter`, `setupParameterEvents`, `updateParameterInput`, `removeParameter`, `syncParametersData`, `getParametersFromSimpleForm`, `validateJson`, `updateTagPreview`, `addTag`, `showPreview`, `getFormData`, `handleSubmit`.

---

## Microservizi (Python / FastAPI)

Ogni microservizio segue la struttura:

- `Dockerfile` — Image per deploy.
- `requirements.txt` — Dipendenze specifiche.
- `app/` — Codice sorgente:
  - `main.py` — Avvio FastAPI, mount router.
  - `routes.py` — Endpoints REST.
  - `models.py` — Modelli Pydantic per request/response.
  - `database.py` — Connessione MongoDB e collections.
  - `auth.py` — Autenticazione JWT (se presente).
  - `utils.py` — Funzioni di utilità (se presente).

### configs_service

- Gestione configurazioni di gioco: upload, ricerca, lettura.
- Endpoints principali: `upload_config`, `get_config`, `search_configs`.

### users_service

- Gestione utenti: registrazione, login, info utente.
- Endpoints principali: `register`, `login`, `get_me`, `get_user_by_id`.

### valutation_service

- Gestione commenti, likes, valutazioni.
- Endpoints principali: `add_comment`, `add_like`, `add_valutation`, `delete_comment`, `delete_rating`.

### visualizations_service

- Arricchimento configurazioni con commenti, rating, likes, info autore.
- Endpoints principali: `get_configuration_details`, `get_game_configurations`, `search_configurations`.

## Database & schemi (sintesi)

- Ogni servizio ha `app/database.py` che espone `MongoClient` e le collection necessarie (es: `configs_collection`, `comments_collection`, `ratings_collection`, `likes_collection`, `users_collection`).
- I modelli Pydantic si trovano in `app/models.py` per ciascun servizio e definiscono shape di request/response.

---

## Test & automazione

- `tests/` — Test di integrazione e unitari:
  - `main.py` — Partenza automatica dei test.
  - `test_all_services.py` — Test end-to-end su tutti i servizi.
  - `test_auth_simple.py` — Test autenticazione base.
  - `test_complete_workflow.py` — Test flusso completo (register → upload → comment/like/rating → visualizations).
  - `test_integrated_search.py` — Test ricerca integrata.
  - `test_quick.py` — Test rapido.
