# MAPPA DEL CODICE — GameSetupHubProject-Official

Questo documento descrive gli artefatti di codice principali del repository. È localizzato in italiano, con correzioni di formattazione Markdown e descrizioni sintetiche funzione-per-funzione per i file principali del progetto.

## Checklist requisiti (richiesta utente)

- Traduzione in italiano: Done
- Correzione warning/format Markdown: Done
- Espansione documento con descrizioni funzione-per-funzione (file principali letti e analizzati): Done
- Espansione per file rimanenti (posso procedere on-demand): Deferred (posso completare se vuoi che includa ogni singolo file)

---

## Documenti top-level

- `README.md` — Panoramica del progetto e istruzioni per far partire i servizi in locale.

- `ARCHITECTURE.md`, `ARCHITETTURA_FINALE.md` — Diagrammi architetturali, decisioni e relazione finale del progetto.

- `CHANGELOG_TEAM.md` — Cronologia delle modifiche del team.

- `infra/docker-compose.yml` — Definizione dei servizi docker per lo sviluppo locale (mongo, frontend e microservizi).

- `start_services.sh` / `start_services.bat` — Script di comodo per avviare i container (Windows/Unix).

## Frontend (sito statico servito da nginx)

I file in `frontend/` implementano l'interfaccia utente in HTML/vanilla JS e CSS.

- `frontend/index.html` — Pagina principale / dashboard.
- `frontend/configuration.html` — Pagina dettaglio di una singola configurazione. Include lo script `configuration-detail.js` che gestisce visualizzazione, commenti e rating.
- `frontend/configurations.html` — Pagina elenco configurazioni.
- `frontend/search.html` — Interfaccia di ricerca avanzata.
- `frontend/upload.html` — Form per caricare una nuova configurazione.
- `frontend/style.css` — Stili globali.
- `frontend/Dockerfile` — Image per servire lo static con nginx.

### File JS principali e descrizioni funzione-per-funzione (frontend/js)

Di seguito le funzioni/metodi principali per i file che ho analizzato.

- `frontend/js/api.js` — Client HTTP centrale (non mostrato integralmente qui). Funzioni principali:
  - getConfig(configId): recupera la configurazione base dal `configs_service`.
  - getConfigurationDetails(configId): recupera la vista arricchita dal `visualizations_service` (usa il prefisso /visualizations).
  - addComment(configId, comment): POST per aggiungere un commento (valutation_service).
  - addRating(configId, rating): POST per inviare una valutazione.
  - toggleLike(configId): aggiunge o rimuove like.
  - login / register / getCurrentUser: gestione autenticazione e token.
  - helper: formatDate, truncateText, handleResponse, showToast, showError, showSuccess.

- `frontend/js/configuration-detail.js` — Classe ConfigurationDetail (pagina dettaglio). Metodi principali:
  - constructor / init: inizializza lo stato e legge l'ID config dall'URL.
  - getConfigIdFromUrl(): legge ?id= dalla querystring.
  - setupEventListeners(): aggancia form commento, rating e stelline.
  - setupRatingStars(), highlightStars(), resetStars(), selectRating(): gestione UI stelle rating.
  - loadConfiguration(): sequenza di caricamento: base config (getConfig), dettagli avanzati (getConfigurationDetails), autore, correlate, rendering e statistiche.
  - loadAuthorInfo(): chiama apiClient.getUserById per arricchire con username/email.
  - loadRelatedConfigurations(): ricerca di configurazioni correlate tramite apiClient.searchConfigs(game).
  - displayConfiguration(), displayTags(), displayParameters(), switchParametersView(), generateFormattedParameters(), generateParameterRow(), generateRawParameters(): rendering dei dati della configurazione e dei parametri.
  - displayAuthorCard(): mostra scheda autore.
  - displayRelatedConfigurations(): mostra liste correlate.
  - updateStatistics(): aggiorna contatori views/likes/ratings/avg.
  - loadComments(): legge `this.configuration.comments` e costruisce la lista dei commenti (gestisce anche stato vuoto). Qui risiede la logica di rendering dei commenti nella pagina.
  - showCommentForm(), cancelComment(), handleCommentSubmit(): gestione form commento (invio addComment, ricarica dettagli).
  - showRatingModal(), handleRatingSubmit(): gestione invio valutazione (addRating).
  - varie utility: likeConfiguration(), shareConfiguration(), downloadConfiguration(), copyParameters(), showLoading(), showContent(), showError().

- `frontend/js/auth.js` — Classe AuthManager:
  - constructor, initializeAuth, setupEventListeners
  - handleLogin(event): effettua login via apiClient.login, memorizza token e dati utente
  - handleRegister(event): registra un nuovo utente
  - logout(), updateNavbar(), showProfile(), isLoggedIn(), requiresAuth(), checkAuthRequired(), getCurrentUser(), getToken()
  - funzioni globali showLoginModal(), showRegisterModal()

- `frontend/js/configurations.js` — Classe ConfigurationsPage:
  - init, setupEventListeners, loadConfigurations(): carica lista e applica filtri
  - applyFilters(), updatePagination(), renderPagination(), renderConfigurations(), generateConfigurationCard()
  - getEmptyState(), updateStats(), handleFilter(), clearFilters()

- `frontend/js/dashboard.js` — Classe Dashboard:
  - checkServicesStatus(), updateServiceStatus(), loadRecentConfigurations(), generateConfigCard(), share/fallback
  - testServiceConnection(): usa apiClient per verificare reachability dei servizi

- `frontend/js/search.js` — Classe SearchPage (ricerca avanzata):
  - setupEventListeners(), loadAvailableData(), setupAdvancedFilters(), performSearch(), performAdvancedSearch(), performBasicSearch(), applyLocalFilters(), displayResults, paginazione e gestione dello stato UI.

- `frontend/js/upload.js` — Classe UploadPage (form di upload):
  - init(), setupEventListeners(), addParameter(), setupParameterEvents(), updateParameterInput(), removeParameter(), syncParametersData(), getParametersFromSimpleForm()
  - validateJson(), updateTagPreview(), addTag(), showPreview(), getFormData(), handleSubmit(): prepara payload e chiama apiClient.uploadConfig.

## Servizi (Python / FastAPI)

Architettura generale: ogni microservizio ha `app/main.py`, `app/routes.py`, `app/models.py`, `app/database.py`, `app/utils.py` (quando necessario) e `app/auth.py` se serve autenticazione.

Per brevità ho analizzato i file chiave: `visualizations_service`, `valutation_service`, `configs_service`, `users_service`. Di seguito una mappa funzione-per-funzione per i file letti.

### visualizations_service

- `visualizations_service/app/routes.py`:
  
  - _sanitize_bson(obj): funzione ricorsiva che converte ObjectId in str e rende serializzabili i documenti letti da Mongo.

  - enrich_configuration(config: dict) -> ConfigurationView: funzione che recupera commenti/ratings/likes dalle collection, normalizza gli `_id` (sostituendoli con `id` stringa), calcola average e total ratings, recupera informazioni autore con `get_user_info()` e costruisce un `ConfigurationView` pydantic.

  - get_configuration_details(config_id: str): endpoint GET `/configs/{config_id}` (montato con prefix `/visualizations`) che richiama `enrich_configuration` e ritorna `ConfigurationDetails`.

  - get_game_configurations(game_name, limit, offset): endpoint per ottenere configurazioni per gioco; arricchisce ciascuna configurazione.

  - search_configurations(...): endpoint di ricerca con filtri (game/title/tags) che arricchisce i risultati.

  - stats endpoints: get_popular_games(limit) e get_top_configurations(limit) che eseguono aggregazioni su ratings_collection e arricchiscono i config top.

- `visualizations_service/app/utils.py`:
  - get_user_info(user_id): effettua richiesta HTTP al users service per ottenere username/email.
  - get_configuration_from_service(config_id): chiama il configs service per ottenere la configurazione base.
  - get_configurations_by_game(game): chiama configs service per ottenere liste filtrate per gioco.

- `visualizations_service/app/models.py` (Pydantic):
  - ConfigurationView: modello con campi id, game, title, description, parameters, tags, author, created_at, average_rating, total_ratings, comments, comments_count, likes_count.
  - ConfigurationDetails: alias / estensione di ConfigurationView.
  - GameConfigurationsView, SearchConfigsResponse: modelli per risposte di gruppo.

Nota operativa: era necessario convertire ObjectId in stringa prima di passare i documenti ai modelli Pydantic per evitare errori di serializzazione.

### valutation_service (ratings/comments/likes)

- `valutation_service/app/routes.py`:
  - add_comment(config_id, comment: CommentCreate, user): POST `/config/{config_id}/comment` — crea un documento in `comments_collection` con campi `config_id`, `user_id`, `comment`, `created_at` e ritorna l'id.
  - add_like(config_id, like: LikeCreate, user): POST `/config/{config_id}/like` — aggiunge o rimuove un like nella `likes_collection` (toggle) e ritorna messaggio.
  - add_valutation(config_id, valutation: ValutationCreate, user): POST `/config/{config_id}/rating` — crea o aggiorna rating per l'utente nella `ratings_collection`.
  - delete_comment(comment_id, user): DELETE `/comment/{comment_id}` — elimina commento se il caller è l'autore.
  - delete_rating(config_id, user): DELETE `/config/{config_id}/rating` — elimina la valutazione dell'utente per la config (implementazione usa varie strategie per trovare e aggiornare ratings nel doc della config).

### configs_service

- `configs_service/app/routes.py`:
  - upload_config(config: ConfigCreate, user): POST `/` — inserisce una nuova configurazione nella `configs_collection` (imposta created_at, updated_at, views=0) e ritorna id.
  - get_config(config_id): GET `/{config_id}` — legge la configurazione; prova a convertire `config_id` in ObjectId ma accetta anche str; converte `_id` in stringa prima del return.
  - search_configs(game: str = None): GET `/` — restituisce lista di configurazioni, applicando regex su campo `game` se passato; converte gli `_id` in stringa.

### users_service

- `users_service/app/routes.py`:

  - oauth2_scheme / get_current_user(token): decodifica JWT, valida e recupera l'utente dal DB (controlla existence tramite `ObjectId(user_id)`). Restituisce dict con `user_id`, `email`, `username`.

  - register(user: UserRegister): POST `/register` — registra un nuovo utente (hash password) e salva nel `users_collection`.

  - login(form_data): POST `/login` — autentica con form-data (OAuth2PasswordRequestForm) e ritorna access_token (JWT).

  - login_json(user_data: UserLogin): POST `/login-json` — login via JSON payload.

  - get_me(): GET `/me` — ritorna info utente corrente dal token.

  - get_user_by_id(user_id): GET `/{user_id}` — ritorna username/email/`user_id` dato l'`_id` nel DB.

## Database & schemi (sintesi)

- Ogni servizio ha `app/database.py` che espone `MongoClient` e le collection necessarie (es: `configs_collection`, `comments_collection`, `ratings_collection`, `likes_collection`, `users_collection`).

- I modelli Pydantic si trovano in `app/models.py` per ciascun servizio e definiscono shape di request/response.

## Tests & automazione

- `tests/` contiene test di integrazione e unitari (es. `tests/test_users.py`) e vari script top-level di test (p.es. `test_quick.py`, `test_complete_workflow.py`). Esiste uno script end-to-end che esercita la sequenza register → upload config → comment/like/rating → visualizations.

## Note operative e possibili miglioramenti

- Rimozione logging di debug temporaneo: `visualizations_service/app/routes.py` contiene prints diagnostici che possono essere rimossi o trasformati in logger con livello DEBUG.

- Serializzazione: mantenere la pratica di convertire `ObjectId` in `str` prima di passare dati a Pydantic o usare encoder personalizzati.

- Documento: posso estendere la mappa funzione-per-funzione per ogni file rimanente se vuoi l'elenco completo file-per-file (attualmente ho espanso i file principali letti).

---
