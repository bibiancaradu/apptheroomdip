# 🚀 Deploy THE ROOM BARBERIA - Guida Rapida

## ⚠️ IMPORTANTE - Leggi prima di iniziare

### Per il **Backend** (FastAPI + MongoDB):
- ✅ **USA Render.com** (FUNZIONA - guida sotto)
- ❌ **NON usare Vercel** per il backend (FastAPI non funziona bene su Vercel serverless con MongoDB persistent)

### Per il **Frontend** (App Mobile):
- ✅ **USA Expo EAS Build** per generare APK Android (la SOLUZIONE GIUSTA per i tuoi dipendenti)
- ⚠️ **Vercel** può ospitare solo la versione WEB dell'app, NON quella mobile

---

## 🎯 SOLUZIONE CONSIGLIATA (Funziona al 100%)

```
┌─────────────────────────────────────────────────────┐
│  Backend → Render.com (Python Web Service)          │
│  Database → MongoDB Atlas (già configurato ✅)      │
│  App Mobile → Expo EAS Build → APK Android         │
└─────────────────────────────────────────────────────┘
```

---

## 📦 PASSO 1: Deploy Backend su Render

### 1.1 Vai su Render.com
1. Vai su [render.com](https://render.com) e fai login con GitHub
2. Click **"New +"** → **"Web Service"**
3. Connetti il tuo repository GitHub `theroom-barberia-app`

### 1.2 Configura il Servizio
Compila ESATTAMENTE così:

| Campo | Valore |
|-------|--------|
| **Name** | `theroom-barberia-backend` |
| **Region** | Frankfurt (più vicina all'Italia) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn server:app --host 0.0.0.0 --port $PORT` |
| **Plan** | `Free` |

### 1.3 Aggiungi le Variabili d'Ambiente
Click su **"Environment"** e aggiungi queste 3 variabili:

| Key | Value |
|-----|-------|
| `MONGO_URL` | `mongodb+srv://USER:PASS@cluster.mongodb.net/...` *(la tua connection string MongoDB Atlas)* |
| `DB_NAME` | `theroom_barberia` |
| `SECRET_KEY` | Click "Generate" oppure inserisci una stringa casuale lunga |

### 1.4 Deploy!
1. Click **"Create Web Service"**
2. Attendi **5-10 minuti** per il primo build
3. Quando vedi "Your service is live 🎉" prendi nota dell'URL, tipo:
   ```
   https://theroom-barberia-backend.onrender.com
   ```

### 1.5 Inizializza il Database
Apri il terminale e lancia (sostituisci con il tuo URL):
```bash
curl -X POST https://theroom-barberia-backend.onrender.com/api/seed
```

Dovresti ricevere:
```json
{
  "message": "Database inizializzato con successo",
  "users": [...]
}
```

### 1.6 Verifica che Funzioni
```bash
curl https://theroom-barberia-backend.onrender.com/api/auth/login \
  -X POST -H "Content-Type: application/json" \
  -d '{"username":"marius","password":"marius2025"}'
```

Se vedi un `access_token`, **🎉 IL BACKEND È ONLINE!**

---

## 📱 PASSO 2: Genera l'App Android (APK)

### 2.1 Aggiorna il file .env del frontend
Nel tuo computer, modifica `frontend/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://theroom-barberia-backend.onrender.com
```

### 2.2 Setup EAS Build (gratis)
```bash
cd frontend

# Installa EAS CLI globalmente
npm install -g eas-cli

# Login con account Expo (gratis, crealo se non l'hai)
eas login

# Configura il progetto per le build
eas build:configure
```

### 2.3 Genera l'APK
```bash
# Build per Android (APK installabile)
eas build --platform android --profile preview
```

- Aspetta 10-15 minuti
- Riceverai un **link** per scaricare l'APK
- Esempio: `https://expo.dev/artifacts/eas/abc123.apk`

### 2.4 Distribuisci ai Dipendenti
1. **Scarica l'APK** dal link Expo
2. **Invia ai dipendenti** via WhatsApp/Email
3. I dipendenti devono:
   - Aprire il link APK sul telefono Android
   - Permettere "Origini sconosciute" nelle impostazioni
   - Installare l'app
4. ✅ **Login con le credenziali** che hai impostato

---

## ⚠️ NOTE IMPORTANTI su Render Free Tier

### Sleep Automatico (15 minuti di inattività)
- Il backend si "addormenta" dopo 15 min senza richieste
- La prima richiesta successiva impiega **30-60 secondi** a rispondere
- **Soluzione**: usa un servizio gratuito come [UptimeRobot](https://uptimerobot.com) per fare ping ogni 5 min e tenerlo sveglio

### Per Produzione Seria
Upgrade a **Render Starter** ($7/mese): no sleep, performance migliori, build più veloci

---

## ❌ Problemi Risolti Rispetto alla Versione Precedente

| Problema | Soluzione Applicata |
|----------|---------------------|
| `requirements.txt` con 125 pacchetti inutili | ✅ Ridotto a 11 pacchetti essenziali |
| `litellm` con URL Emergent non accessibile | ✅ Rimosso (non necessario) |
| Porta hardcoded 8001 | ✅ Ora usa `$PORT` di Render |
| Manca `Procfile` | ✅ Aggiunto |
| Manca `runtime.txt` per Python version | ✅ Aggiunto (Python 3.11.9) |
| Manca `render.yaml` blueprint | ✅ Aggiunto (deploy con 1 click) |

---

## 🆘 Troubleshooting

### Errore: "Application failed to respond"
- Verifica che `MONGO_URL` sia corretto nelle env variables
- Controlla i log su Render Dashboard → Logs

### Errore: "Build failed"
- Verifica che **Root Directory** sia `backend` (non vuoto)
- Verifica che Python version sia 3.11

### Errore: "MongoDB connection failed"
- Controlla che IP `0.0.0.0/0` sia in whitelist su MongoDB Atlas (Network Access)
- Verifica username/password nella connection string

### L'app mobile non si connette al backend
- Verifica `EXPO_PUBLIC_BACKEND_URL` in `frontend/.env`
- **Rigenera la build APK** dopo aver modificato `.env`
- Testa il backend con `curl` per verificare che risponda

---

## 📊 Costi Finali

| Servizio | Costo |
|----------|-------|
| MongoDB Atlas (M0) | **GRATIS** ✅ |
| Render Free Tier | **GRATIS** ✅ (con sleep) |
| Render Starter (opzionale, no sleep) | $7/mese |
| Expo EAS Build | **GRATIS** ✅ |
| **TOTALE** | **0€/mese** 🎉 |

---

## 🎯 Riepilogo Finale

1. ✅ MongoDB Atlas → Già configurato
2. 📦 **Push i nuovi file su GitHub**
3. 🚀 Deploy su Render (segui passo 1 sopra)
4. 📱 Genera APK con EAS Build (passo 2)
5. 💈 Distribuisci ai dipendenti THE ROOM BARBERIA

**Buon lavoro!** Se hai problemi specifici, manda screenshot degli errori 🙌
