# Visualizations Service

## Descrizione
Microservizio dedicato alla **visualizzazione e lettura** dei dati relativi alle configurazioni di gioco, inclusi valutazioni, commenti e likes.

Questo servizio gestisce tutte le operazioni GET per:
- 🎮 Configurazioni di gioco
- ⭐ Valutazioni/Ratings
- 💬 Commenti
- 👍 Likes
- 📊 Statistiche aggregate

## Funzionalità Principali

### 📖 Solo Operazioni di Lettura
Questo servizio è ottimizzato per la lettura e visualizzazione dei dati. Per operazioni di scrittura utilizzare il **Valutations Service**.

### 🎯 Endpoint Principali

#### Configurazioni per Gioco
- `GET /visualizations/game/{game_name}` - Lista configurazioni di un gioco
  - Supporta paginazione (`limit`, `offset`)
  - Ordinamento (`sort_by`: created_at, average_rating, title, likes_count)
  - Direzione (`order`: asc, desc)

#### Dettagli Configurazione
- `GET /visualizations/config/{config_id}` - Dettagli completi con commenti, rating e likes

#### Dati Specifici
- `GET /visualizations/config/{config_id}/ratings` - Solo valutazioni
- `GET /visualizations/config/{config_id}/comments` - Solo commenti  
- `GET /visualizations/config/{config_id}/likes` - Solo likes

#### Statistiche
- `GET /visualizations/stats/popular-games` - Giochi più popolari
- `GET /visualizations/stats/top-configurations` - Configurazioni top-rated

## Modelli Dati

### ConfigurationView
```json
{
  "id": "string",
  "game": "string",
  "title": "string", 
  "description": "string",
  "parameters": {},
  "tags": [],
  "author": "string",
  "created_at": "datetime",
  "average_rating": 4.5,
  "total_ratings": 10,
  "comments_count": 5,
  "likes_count": 20
}
```

### ConfigurationDetails
Estende ConfigurationView aggiungendo:
```json
{
  "comments": [...],
  "ratings": [...],
  "likes": [...]
}
```

## Configurazione

### Variabili d'Ambiente
- `MONGODB_URL`: URL di connessione MongoDB  
- `DATABASE_NAME`: Nome database MongoDB
- `CONFIGS_SERVICE_URL`: URL del servizio configurations
- `USERS_SERVICE_URL`: URL del servizio users

### Dipendenze
```
fastapi
uvicorn
pymongo
python-dotenv
requests
python-multipart
```

## Utilizzo

### Avvio Servizio
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

### Esempi Richieste

#### Lista Configurazioni Gioco
```bash
curl "http://localhost:8001/visualizations/game/cyberpunk2077?limit=10&sort_by=average_rating&order=desc"
```

#### Dettagli Configurazione
```bash
curl "http://localhost:8001/visualizations/config/123"
```

#### Solo Commenti
```bash  
curl "http://localhost:8001/visualizations/config/123/comments"
```

#### Statistiche
```bash
curl "http://localhost:8001/visualizations/stats/popular-games"
curl "http://localhost:8001/visualizations/stats/top-configurations?limit=5"
```

## Integrazione

Questo servizio lavora in coppia con il **Valutations Service**:

- **Visualizations Service** (questo) → Solo GET/lettura dati
- **Valutations Service** → Solo POST/PUT/DELETE per scrittura

### Flusso Tipico
1. Frontend chiama Visualizations Service per mostrare dati
2. Per interazioni utente (like, comment, rating) chiama Valutations Service  
3. Dopo scrittura, ricarica dati da Visualizations Service

## Performance

- Utilizza aggregazioni MongoDB per statistiche efficienti
- Cache-friendly per operazioni di lettura intensive
- Ottimizzato per query complesse con join tra collections

## Come eseguire

```bash
docker build -t visualizations-service .
docker run -p 8003:8000 visualizations-service
```
