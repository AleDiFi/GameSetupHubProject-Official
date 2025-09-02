# Valutations Service

## Descrizione
Microservizio dedicato alla **scrittura** di valutazioni, commenti e likes per le configurazioni di gioco. 

Questo servizio gestisce tutte le operazioni POST/PUT/DELETE relative a:
- ⭐ Valutazioni/Rating (1-5 stelle)
- 💬 Commenti
- 👍 Likes

## Funzionalità Principali

### 🔒 Autenticazione Richiesta
Tutte le operazioni richiedono autenticazione JWT tramite Bearer token.

### 📝 Operazioni Supportate

#### Valutazioni (Ratings)
- `POST /valutations/config/{config_id}/rating` - Aggiungi/aggiorna valutazione
- `DELETE /valutations/rating/{rating_id}` - Elimina valutazione

#### Commenti
- `POST /valutations/config/{config_id}/comment` - Aggiungi commento
- `DELETE /valutations/comment/{comment_id}` - Elimina commento

#### Likes
- `POST /valutations/config/{config_id}/like` - Aggiungi/rimuovi like (toggle)

## Modelli Dati

### ValutationCreate
```json
{
  "rating": 1-5,
  "comment": "string (opzionale)"
}
```

### CommentCreate
```json
{
  "comment": "string"
}
```

### LikeCreate
```json
{}
```

## Configurazione

### Variabili d'Ambiente
- `MONGODB_URL`: URL di connessione MongoDB
- `JWT_SECRET_KEY`: Chiave segreta per JWT
- `DATABASE_NAME`: Nome database MongoDB

### Dipendenze
```
fastapi
uvicorn
pymongo
python-dotenv
python-jose[cryptography]
pyjwt
python-multipart
```

## Utilizzo

### Avvio Servizio
```bash
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Esempio Richieste

#### Aggiungi Valutazione
```bash
curl -X POST "http://localhost:8000/valutations/config/123/rating" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Ottima configurazione!"}'
```

#### Aggiungi Commento
```bash
curl -X POST "http://localhost:8000/valutations/config/123/comment" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{"comment": "Molto utile questa configurazione"}'
```

#### Toggle Like
```bash
curl -X POST "http://localhost:8000/valutations/config/123/like" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Integrazione

Questo servizio lavora in coppia con il **Visualizations Service** che gestisce tutte le operazioni di lettura e visualizzazione dei dati.

Per ottenere i dati (GET), utilizzare il Visualizations Service:
- `GET /visualizations/config/{config_id}` - Dettagli configurazione con tutti i commenti/rating
- `GET /visualizations/config/{config_id}/ratings` - Solo ratings
- `GET /visualizations/config/{config_id}/comments` - Solo commenti
- `GET /visualizations/config/{config_id}/likes` - Solo likes
