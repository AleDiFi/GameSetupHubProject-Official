# Test del Servizio di Visualizzazione

Ecco alcuni esempi di utilizzo del nuovo servizio di visualizzazione:

## 1. Visualizzare tutte le configurazioni di un gioco

```bash
curl -X GET "http://localhost:8003/visualizations/game/minecraft?limit=10&sort_by=average_rating&order=desc"
```

## 2. Visualizzare dettagli di una configurazione specifica

```bash
curl -X GET "http://localhost:8003/visualizations/config/{config_id}"
```

## 3. Aggiungere una valutazione (richiede autenticazione)

```bash
curl -X POST "http://localhost:8003/visualizations/rating" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "config_id": "config_id_here",
       "rating": 5,
       "comment": "Ottima configurazione!"
     }'
```

## 4. Aggiungere un commento (richiede autenticazione)

```bash
curl -X POST "http://localhost:8003/visualizations/comment" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "config_id": "config_id_here",
       "comment": "Questa configurazione funziona perfettamente!"
     }'
```

## 5. Ottenere solo le valutazioni di una configurazione

```bash
curl -X GET "http://localhost:8003/visualizations/config/{config_id}/ratings"
```

## 6. Ottenere solo i commenti di una configurazione

```bash
curl -X GET "http://localhost:8003/visualizations/config/{config_id}/comments"
```

## Parametri di query disponibili per la visualizzazione di gioco:

- `limit`: numero massimo di configurazioni da restituire (default: 10, max: 50)
- `offset`: numero di configurazioni da saltare per la paginazione (default: 0)
- `sort_by`: campo per ordinamento (`created_at`, `average_rating`, `title`) (default: `created_at`)
- `order`: direzione ordinamento (`asc`, `desc`) (default: `desc`)

## Esempio di risposta completa:

```json
{
  "game": "minecraft",
  "total_configurations": 25,
  "configurations": [
    {
      "id": "507f1f77bcf86cd799439011",
      "game": "minecraft",
      "title": "Configurazione Survival Avanzata",
      "description": "Una configurazione ottimizzata per il survival mode",
      "parameters": {
        "difficulty": "hard",
        "mob_spawning": "true",
        "keep_inventory": "false"
      },
      "tags": ["survival", "hardcore", "vanilla"],
      "author": "player123",
      "created_at": "2025-01-10T15:30:00Z",
      "average_rating": 4.8,
      "total_ratings": 15,
      "comments_count": 8
    }
  ]
}
```
