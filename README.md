# THE ROOM BARBERIA - Gestione Orari Dipendenti

App mobile per la gestione degli orari dei dipendenti della barberia THE ROOM, con due sedi a Costabissara e Vicenza Est.

## 📱 Funzionalità

### Per i Dipendenti
- ✅ Inserimento ore lavorate giornaliere
- ✅ Selezione sede (Costabissara o Vicenza Est)
- ✅ Richiesta ferie, permessi e malattia
- ✅ Vista calendario mensile con codifica colori
- ✅ Modifica/cancellazione voci del mese corrente
- ✅ Promemoria settimanale (ogni lunedì alle 9:00)

### Per l'Amministratore (Marius)
- ✅ Dashboard con statistiche aziendali
- ✅ Approvazione/rifiuto ferie e permessi
- ✅ Storico approvazioni (in attesa/approvate/rifiutate)
- ✅ Gestione dipendenti (CRUD completo)
- ✅ Esportazione PDF mensile per ufficio paghe

## 🏗️ Stack Tecnologico

- **Frontend**: Expo (React Native) con TypeScript
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Autenticazione**: JWT
- **Notifiche**: Expo Notifications

## 👥 Dipendenti Configurati

- **Marius** (Admin)
- Jessica
- Andrea
- Francesca
- Giada
- Leonardo

## 🚀 Setup Locale

### Backend

```bash
cd backend
pip install -r requirements.txt

# Crea .env con:
# MONGO_URL=mongodb://localhost:27017
# DB_NAME=theroom_barberia
# SECRET_KEY=la-tua-chiave-segreta

uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend

```bash
cd frontend
yarn install

# Crea .env con:
# EXPO_PUBLIC_BACKEND_URL=http://your-backend-url

yarn start
```

### Inizializzazione Database

Dopo aver avviato il backend per la prima volta:

```bash
curl -X POST http://localhost:8001/api/seed
```

## 🌐 Deploy in Produzione

### Backend - Opzioni consigliate
- **Railway.app** (~5€/mese): Deploy semplice con MongoDB integrato
- **Render.com**: Piano gratuito disponibile
- **Vercel**: Gratis per progetti piccoli (solo serverless)
- **MongoDB Atlas**: Database cloud gratuito (512MB)

### Frontend - Build Mobile
```bash
# Genera build Android
npx eas-cli build --platform android

# Genera build iOS
npx eas-cli build --platform ios
```

## 🔐 Credenziali Default

> ⚠️ **IMPORTANTE**: Cambia queste password al primo accesso!

| Utente | Username | Password |
|--------|----------|----------|
| Marius (Admin) | `marius` | `marius2025` |
| Jessica | `jessica` | `jessica2025` |
| Andrea | `andrea` | `andrea2025` |
| Francesca | `francesca` | `francesca2025` |
| Giada | `giada` | `giada2025` |
| Leonardo | `leonardo` | `leonardo2025` |

## 📂 Struttura Progetto

```
/
├── backend/
│   ├── server.py          # API FastAPI principale
│   ├── requirements.txt   # Dipendenze Python
│   └── .env               # Variabili d'ambiente
├── frontend/
│   ├── app/               # Schermate (Expo Router)
│   │   ├── login.tsx
│   │   ├── admin/         # Schermate admin
│   │   └── employee/      # Schermate dipendenti
│   ├── src/utils/         # Utility (notifiche, PDF)
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Autenticazione
- `POST /api/auth/login` - Login utente
- `GET /api/auth/me` - Profilo utente corrente

### Time Entries
- `GET /api/time-entries` - Lista voci (con filtro mese)
- `POST /api/time-entries` - Crea nuova voce
- `PUT /api/time-entries/{id}` - Modifica voce
- `DELETE /api/time-entries/{id}` - Elimina voce

### Admin
- `GET /api/users` - Lista utenti
- `POST /api/users` - Crea utente
- `PUT /api/users/{id}` - Modifica utente
- `DELETE /api/users/{id}` - Elimina utente
- `GET /api/approvals?status_filter=pending` - Richieste da approvare
- `PUT /api/approvals/{id}` - Approva/rifiuta richiesta

## 📄 Licenza

Software proprietario di THE ROOM BARBERIA.
