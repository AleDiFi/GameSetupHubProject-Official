# 🏗️ Architettura Microservizi Ottimizzata - Game Setup Hub

## 📋 **Panoramica Architettura Finale**

L'architettura è stata riorganizzata con successo per separare le responsabilità di **scrittura** e **lettura**, integrando le funzionalità di ricerca per ottimizzare le prestazioni e ridurre la complessità.

## 🎯 **Servizi Attivi:**

### 1. **Users Service** (Port 8001)
- **Responsabilità**: Gestione utenti e autenticazione
- **Endpoints**: `/users/register`, `/users/login-json`, `/users/me`, `/users/{user_id}`
- **Funzionalità**: JWT tokens, hash password, validazione credenziali

### 2. **Configs Service** (Port 8002) 
- **Responsabilità**: Gestione configurazioni di gioco
- **Endpoints**: `/configs/` (POST/GET), `/configs/{id}` (GET/PUT/DELETE)
- **Funzionalità**: CRUD configurazioni, validazione parametri

### 3. **Visualizations Service** (Port 8003) - ⭐ **CON RICERCA INTEGRATA**
- **Responsabilità**: 
  - Visualizzazione e lettura configurazioni (SOLO GET)
  - **Ricerca avanzata integrata** (ex Search Service)
- **Endpoints**:
  - `/visualizations/config/{id}` - Dettagli configurazione con statistiche
  - `/visualizations/game/{game}` - Configurazioni per gioco
  - `/visualizations/search` - **🔍 Ricerca avanzata integrata**
  - `/visualizations/stats/*` - Statistiche e metriche
- **Funzionalità**: 
  - Aggregazione ratings, commenti, likes
  - Ricerca per gioco, titolo, tag
  - Ordinamento (popolarità, rating, data)
  - Paginazione risultati

### 4. **Valutations Service** (Port 8004)
- **Responsabilità**: Operazioni di scrittura valutazioni (SOLO POST/DELETE)
- **Endpoints**:
  - `/valutations/config/{id}/rating` (POST)
  - `/valutations/config/{id}/comment` (POST) 
  - `/valutations/config/{id}/like` (POST)
  - `/valutations/config/{id}/rating/{rating_id}` (DELETE)
- **Funzionalità**: Scrittura rating, commenti, likes con autenticazione JWT

## ✅ **Ottimizzazioni Implementate:**

### 🔄 **Search Service → Visualizations Service**
- **PRIMA**: 5 servizi separati (Users, Configs, Visualizations, Valutations, Search)
- **DOPO**: 4 servizi ottimizzati con ricerca integrata
- **Benefici**:
  - ⚡ Ridotta latenza (no chiamate inter-service per ricerca)
  - 🛠️ Manutenzione semplificata 
  - 💾 Meno risorse Docker
  - 🔄 Coerenza dati (accesso diretto al DB)

### 📊 **Separazione Lettura/Scrittura**
- **Valutations Service**: Solo operazioni di **scrittura** (POST/DELETE)
- **Visualizations Service**: Solo operazioni di **lettura** (GET) + ricerca
- **Benefici**:
  - 🔒 Sicurezza migliorata (separazione responsabilità)
  - ⚖️ Scalabilità indipendente
  - 🎯 Architettura CQRS (Command Query Responsibility Segregation)

## 🗄️ **Database Strategy:**
- **MongoDB condiviso** tra tutti i servizi
- **Collections**: 
  - `configurations` (Configs + Visualizations read)
  - `ratings` (Valutations write + Visualizations read)  
  - `comments` (Valutations write + Visualizations read)
  - `likes` (Valutations write + Visualizations read)
  - `users` (Users service)

## 🔐 **Autenticazione:**
- **JWT Token**: Generato da Users Service
- **Secret Key**: "supersegreto123" (sincronizzato)
- **Libreria**: `python-jose` su tutti i servizi
- **Payload**: `{"user_id": "...", "email": "..."}`

## 🎚️ **Endpoint Principali Integrati:**

### 🔍 **Ricerca Avanzata** (`/visualizations/search`)
```
GET /visualizations/search?game=StarCraft&tags=rush&sort_by=popularity&limit=10
```
- **Filtri**: gioco, titolo, tag
- **Ordinamento**: popolarità, rating, data, titolo  
- **Paginazione**: limit/offset
- **Enrichment**: Rating medi, conteggi commenti/likes automatici

### 📝 **Scrittura Valutazioni** (`/valutations/config/{id}/rating`)
```
POST /valutations/config/{id}/rating
Authorization: Bearer {jwt_token}
{
  "rating": 5,
  "comment": "Ottima configurazione!"
}
```

### 📖 **Visualizzazione Arricchita** (`/visualizations/config/{id}`)
```
GET /visualizations/config/{id}
```
Ritorna configurazione con:
- Rating medio e totale voti
- Conteggio commenti e likes
- Informazioni autore
- Lista completa commenti e rating

## 🧪 **Test di Validazione:**
- ✅ `test_quick.py` - Test end-to-end base
- ✅ `test_integrated_search.py` - Test ricerca integrata  
- ✅ `test_complete_workflow.py` - Workflow completo separato
- ✅ Autenticazione JWT tra tutti i servizi
- ✅ CORS e middleware configurati

## 🚀 **Come Avviare:**
```bash
cd infra
docker-compose up -d
```

## 📈 **Risultati Ottenuti:**
- ⚡ **Performance**: Ricerca più veloce (no network calls)
- 🎯 **Architettura**: Separazione lettura/scrittura completa
- 🛠️ **Manutenibilità**: Meno servizi da gestire
- 🔒 **Sicurezza**: JWT sincronizzato e funzionante
- 📊 **Funzionalità**: Ricerca avanzata con enrichment automatico

L'architettura ora rispetta perfettamente il pattern **CQRS** con un servizio dedicato alla scrittura (Valutations) e uno ottimizzato per la lettura e ricerca (Visualizations).
