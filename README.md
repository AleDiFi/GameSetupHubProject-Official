# GameSetupHubProject-Official

Piattaforma distribuita per la condivisione e valutazione di configurazioni per videogiochi.

---

## Indice

- [Descrizione](#descrizione)
- [Requisiti](#requisiti)
- [Installazione](#installazione)
- [Avvio del progetto](#avvio-del-progetto)
- [Struttura del progetto](#struttura-del-progetto)
- [Utilizzo](#utilizzo)
- [Test](#test)
- [Documentazione](#documentazione)

---

## Descrizione

GameSetupHub è una piattaforma comunitaria dove gli utenti possono:

- caricare configurazioni di gioco,
- ricercarle e visualizzarle,
- commentarle e valutarle.

Il sistema è basato su architettura a microservizi e utilizza API REST per l’interazione tra i componenti.

---

## Requisiti

- Python 3.10 o superiore  
- Docker installato e funzionante

---

## Installazione

1. Clona il repository:
   bash
   git clone [URL-del-repository]

## Installazione dipendenze

### Dipendenze principali

Installa le dipendenze Python comuni a tutti i servizi:
bash
pip install -r requirements.txt

### Dipendenze singoli servizi

pip install -r configs_service/requirements.txt
pip install -r users_service/requirements.txt
pip install -r valutation_service/requirements.txt
pip install -r visualizations_service/requirements.txt

## Avvio del progetto

### Avvio con Docker Compose

Per avviare tutti i servizi con Docker Compose:
bash
cd infra
docker-compose up --build

### avvio manuale

./start_services.sh

### Struttura del progetto

frontend/              → Interfaccia utente web & Client (HTML, CSS, JS)
configs_service/       → Microservizio per la gestione delle configurazioni
users_service/         → Microservizio per la gestione degli utenti
valutation_service/    → Microservizio per valutazioni e commenti
visualizations_service/→ Microservizio per la visualizzazione delle configurazioni
infra/                 → File di orchestrazione Docker
tests/                 → Test di unità e integrazione
docs/                  → Documentazione tecnica e diagrammi

## Utilizzo

### Upload Configurazioni

- **Input**: nome del gioco, parametri chiave-valore (es. risoluzione, FPS, ecc.), tag descrittivi  
- **Output**: pagina della configurazione con i dettagli della configurazione caricata

### Visualizzazione Configurazioni

- Puoi cercare le configurazioni per:
  - nome del gioco  
  - tag  
  - valutazioni  
- **Output**: lista di configurazioni con possibilità di visualizzare i dettagli

### Mi piace, Commenti e valutazione

- Ogni configurazione può ricevere Mi piace, commenti e valutazione  
- Funzionalità gestite dal servizio `valutation_service`  
- **Output**: numero di Mi piace, valutazione media e lista dei commenti

### Login

- Dopo il login viene mostrato un pop-up di conferma  
- Funzionalità gestita dal servizio `users_service`

## Test

I test si trovano nella cartella `tests/`.

## Documentazione

La documentazione del progetto si trova nella cartella docs/.

- Relazione tecnica: docs/relazione-tecnica.pdf  
- Diagrammi architetturali: docs/diagrammi/
