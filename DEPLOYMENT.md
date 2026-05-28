# THE ROOM BARBERIA - Guida Deploy in Produzione

Questa guida ti accompagna passo-passo nel deploy dell'app in produzione.

## 📋 Indice

1. [Opzione 1: Railway.app (€)](#opzione-1-railwayapp-consigliato)
2. [Opzione 2: Render.com + MongoDB Atlas (Gratis)](#opzione-2-rendercom--mongodb-atlas-gratis)
3. [Build Mobile App](#build-mobile-app)
4. [Configurazione Post-Deploy](#configurazione-post-deploy)

---

## Opzione 1: Railway.app (CONSIGLIATO)

**Costo**: ~5€/mese | **Difficoltà**: ⭐ Facile | **Tempo**: 10 minuti

### Passo 1: Crea Account Railway
1. Vai su [railway.app](https://railway.app)
2. Registrati con il tuo account GitHub
3. Aggiungi metodo di pagamento (carta o PayPal)

### Passo 2: Deploy MongoDB
1. Click "New Project" → "Provision MongoDB"
2. Railway creerà un MongoDB pronto all'uso
3. Click sul servizio MongoDB → "Variables" → copia `MONGO_URL`

### Passo 3: Deploy Backend
1. Nel progetto, click "New" → "GitHub Repo"
2. Seleziona il repository `theroom-barberia-app`
3. Railway rileverà la cartella `backend/`
4. Vai in "Settings" → "Root Directory" → imposta `backend`
5. Vai in "Variables" e aggiungi:
   ```
   MONGO_URL=<URL copiata da MongoDB step 2>
   DB_NAME=theroom_barberia
   SECRET_KEY=<genera con: openssl rand -hex 32>
   ```
6. Vai in "Settings" → "Generate Domain" → otterrai un URL tipo `theroom-backend.up.railway.app`

### Passo 4: Inizializza Database
```bash
curl -X POST https://theroom-backend.up.railway.app/api/seed
```

✅ **Backend pronto in produzione!**

---

## Opzione 2: Render.com + MongoDB Atlas (Gratis)

**Costo**: 0€/mese | **Difficoltà**: ⭐⭐ Medio | **Tempo**: 20 minuti

### Passo 1: Setup MongoDB Atlas (Gratis)
1. Vai su [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Registrati e crea un **M0 Cluster** (Free Forever)
3. Crea un utente database in "Database Access"
4. Aggiungi IP `0.0.0.0/0` in "Network Access" (consente accesso da Render)
5. Click "Connect" → "Connect your application" → copia la connection string
   ```
   mongodb+srv://USERNAME:PASSWORD@cluster0.xxxxx.mongodb.net/theroom_barberia
   ```

### Passo 2: Deploy Backend su Render
1. Vai su [render.com](https://render.com) e registrati
2. Click "New" → "Web Service"
3. Connetti il tuo GitHub e seleziona `theroom-barberia-app`
4. Configurazione:
   - **Name**: `theroom-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free
5. In "Environment Variables" aggiungi:
   ```
   MONGO_URL=<connection string da Atlas>
   DB_NAME=theroom_barberia
   SECRET_KEY=<chiave casuale sicura>
   ```
6. Click "Create Web Service"
7. Aspetta 5-10 minuti per il primo deploy
8. URL pubblico: `https://theroom-backend.onrender.com`

### Passo 3: Inizializza Database
```bash
curl -X POST https://theroom-backend.onrender.com/api/seed
```

✅ **Backend gratuito attivo!**

> ⚠️ **Nota Render Free Tier**: Il backend si ferma dopo 15 minuti di inattività. Riparte automaticamente alla prima richiesta (impiega 30-60 secondi). Per produzione seria, considera il piano a 7$/mese.

---

## Build Mobile App

Una volta che il backend è online, aggiorna l'app frontend e genera le build.

### Passo 1: Aggiorna Frontend
Modifica `frontend/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://il-tuo-backend-url.com
```

### Passo 2: Setup EAS Build (Gratis)
```bash
cd frontend

# Installa EAS CLI
npm install -g eas-cli

# Login con account Expo gratuito
eas login

# Configura il progetto
eas build:configure
```

### Passo 3: Build Android (.apk)
```bash
# Build APK installabile direttamente
eas build --platform android --profile preview

# Aspetta 10-15 minuti
# Riceverai un link per scaricare l'APK
```

### Passo 4: Distribuisci ai Dipendenti
1. Scarica l'APK dal link Expo
2. Invia ai dipendenti via WhatsApp/Email
3. Loro devono abilitare "Origini sconosciute" su Android e installarlo
4. ✅ App installata!

### Build iOS (Opzionale)
```bash
eas build --platform ios --profile preview
```
⚠️ Richiede account Apple Developer (99$/anno)

---

## Configurazione Post-Deploy

### 🔐 Cambia le Password di Default
Dopo il primo login come `marius`:
1. Vai in "Dipendenti"
2. Per ogni dipendente, click ✏️ → cambia password
3. Comunica le nuove password ai dipendenti

### 📊 Backup Database
**MongoDB Atlas**: Backup automatici inclusi
**Railway**: Backup giornalieri automatici
**Self-hosted**: Configura backup manuali

### 🔔 Notifiche Push
Le notifiche locali (lunedì alle 9:00) funzionano già nelle build APK/IPA. Non richiede configurazione aggiuntiva.

### 🌐 Dominio Personalizzato (Opzionale)
Sia Railway che Render permettono domini custom:
- Esempio: `api.theroombarberia.it`
- Richiede dominio registrato (~10€/anno)

---

## 🆘 Troubleshooting

### Backend non risponde
- Controlla i log su Railway/Render
- Verifica le variabili d'ambiente
- Controlla connessione MongoDB

### App mobile non si connette
- Verifica `EXPO_PUBLIC_BACKEND_URL` nel `.env`
- Rigenera la build dopo modifica `.env`
- Controlla che il backend sia accessibile da browser

### Database vuoto dopo deploy
- Esegui il comando seed: `curl -X POST <BACKEND_URL>/api/seed`

---

## 💰 Costi Riepilogativi

| Componente | Gratuito | Pagamento |
|------------|----------|-----------|
| MongoDB Atlas (512MB) | ✅ | - |
| Render.com (con sleep) | ✅ | $7/mese (no sleep) |
| Railway.app | ❌ | ~$5/mese |
| Expo (build illimitate) | ✅ | - |
| Apple Developer (iOS) | ❌ | $99/anno |
| Google Play (Android) | ❌ | $25 una tantum |

**Setup consigliato GRATIS**: MongoDB Atlas + Render + Build APK Android = **0€/mese** 🎉

---

## 📞 Supporto

Per problemi specifici:
- MongoDB Atlas: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- Railway: [docs.railway.app](https://docs.railway.app)
- Render: [render.com/docs](https://render.com/docs)
- Expo: [docs.expo.dev](https://docs.expo.dev)
