# 🚀 Deploy UnderGround su Render (GRATIS)

## Prerequisiti
- Account GitHub (gratis): https://github.com
- Account Render (gratis): https://render.com

---

## Step 1: Carica su GitHub

1. Vai su https://github.com/new
2. Nome repository: `underground`
3. Lascia privato se vuoi
4. **NON** selezionare "Add README"
5. Clicca "Create repository"

6. Apri il terminale nella cartella UnderGround e esegui:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TUO_USERNAME/underground.git
git push -u origin main
```

---

## Step 2: Deploy su Render

1. Vai su https://render.com e accedi con GitHub
2. Clicca **"New +"** → **"Web Service"**
3. Seleziona il tuo repository `underground`
4. Configura:
   - **Name**: `underground` (o quello che vuoi)
   - **Region**: Frankfurt (più vicino all'Italia)
   - **Branch**: `main`
   - **Root Directory**: (lascia vuoto)
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build && cd server && npm install`
   - **Start Command**: `cd server && npm start`

5. Clicca **"Advanced"** e aggiungi:
   - **Environment Variable**: `NODE_ENV` = `production`

6. Sotto **"Instance Type"** seleziona **"Free"**

7. **IMPORTANTE - Aggiungi Disk:**
   - Clicca "Add Disk"
   - Name: `underground-data`
   - Mount Path: `/data`
   - Size: `1 GB` (gratis)

8. Clicca **"Create Web Service"**

---

## Step 3: Attendi il Deploy

- Il primo build richiede 5-10 minuti
- Quando vedi "Live" verde, la tua app è online!
- URL: `https://underground-XXXX.onrender.com`

---

## ⚠️ Note Importanti

### Piano Gratuito Render:
- L'app va in "sleep" dopo 15 min di inattività
- Si risveglia in ~30 secondi al primo accesso
- 750 ore/mese gratuite (abbastanza per uso personale)

### Per mantenere l'app sempre attiva:
Usa un servizio come https://uptimerobot.com (gratis) per pingare l'app ogni 5 minuti.

---

## 🔄 Aggiornamenti Futuri

Ogni volta che fai `git push`, Render ri-deploya automaticamente!

```bash
git add .
git commit -m "Nuove modifiche"
git push
```

---

## 🆘 Problemi?

1. Controlla i **Logs** su Render Dashboard
2. Assicurati che tutte le dipendenze siano nel package.json
3. Verifica che il database sia stato creato in `/data/underground.db`
