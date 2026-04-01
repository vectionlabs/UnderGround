# UnderGround - Social Platform per Gen-Z

Una piattaforma social moderna con React, Vite, e backend Node.js/Express con SQLite.

## Funzionalità

- **Feed**: Post con immagini, like e commenti
- **Reels**: Galleria di immagini in formato verticale
- **Canali**: Canali pubblici tematici
- **Gruppi**: Gruppi privati con chat
- **Messaggi diretti**: Chat privata tra utenti
- **Profilo avanzato**: Avatar, banner, badge, mood emoji, social links

## Requisiti

- Node.js 18+
- npm o yarn

## Installazione

### 1. Installa dipendenze frontend
```bash
npm install
```

### 2. Installa dipendenze backend
```bash
cd server
npm install
cd ..
```

## Avvio

### Avvia in modalità sviluppo (richiede 2 terminali)

**Terminale 1 - Backend:**
```bash
cd server
npm start
```

**Terminale 2 - Frontend:**
```bash
npm run dev
```

### URL
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Struttura Progetto

```
UnderGround/
├── server/                 # Backend Node.js/Express
│   ├── db.js              # Schema SQLite e helpers
│   ├── index.js           # Entry point Express
│   ├── moderation.js      # Moderazione contenuti
│   └── routes/            # API routes
│       ├── auth.js        # Autenticazione
│       ├── posts.js       # Post e commenti
│       ├── channels.js    # Canali pubblici
│       ├── groups.js      # Gruppi privati
│       ├── messages.js    # Messaggi diretti
│       └── reels.js       # Reels
├── src/
│   ├── components/        # Componenti React
│   │   ├── Icons.tsx      # Icone SVG
│   │   ├── ImageUploader.tsx
│   │   ├── Feed.tsx
│   │   ├── Reels.tsx
│   │   ├── Channels.tsx
│   │   ├── Groups.tsx
│   │   ├── Messages.tsx
│   │   ├── Profile.tsx
│   │   └── CreatePost.tsx
│   ├── hooks/
│   │   └── useApi.ts      # API client
│   └── App.tsx            # Componente principale
└── package.json
```

## Database

Il database SQLite viene creato automaticamente in `server/underground.db` al primo avvio del backend.

### Tabelle
- `users` - Utenti registrati
- `posts` - Post con immagini Base64
- `comments` - Commenti ai post
- `likes` - Like ai post
- `channels` - Canali pubblici
- `channel_members` - Membri dei canali
- `groups` - Gruppi privati
- `group_members` - Membri dei gruppi
- `group_messages` - Messaggi nei gruppi
- `direct_messages` - Messaggi privati
- `reels` - Reels con immagini
- `reel_likes` - Like ai reels

## API Endpoints

### Auth
- `POST /api/auth/register` - Registrazione
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `PATCH /api/auth/profile` - Aggiorna profilo
- `GET /api/auth/users/:id` - Ottieni utente

### Posts
- `GET /api/posts` - Lista post
- `POST /api/posts` - Crea post
- `POST /api/posts/:id/like` - Like/unlike
- `GET /api/posts/:id/comments` - Lista commenti
- `POST /api/posts/:id/comments` - Aggiungi commento
- `DELETE /api/posts/:id` - Elimina post

### Channels
- `GET /api/channels` - Lista canali
- `POST /api/channels` - Crea canale
- `POST /api/channels/:id/join` - Iscriviti
- `POST /api/channels/:id/leave` - Esci

### Groups
- `GET /api/groups` - Lista gruppi
- `POST /api/groups` - Crea gruppo
- `GET /api/groups/:id/members` - Lista membri
- `POST /api/groups/:id/invite` - Invita utente
- `POST /api/groups/:id/leave` - Esci
- `GET /api/groups/:id/messages` - Messaggi gruppo
- `POST /api/groups/:id/messages` - Invia messaggio

### Messages
- `GET /api/messages/conversations` - Conversazioni
- `GET /api/messages/with/:id` - Messaggi con utente
- `POST /api/messages/send` - Invia messaggio
- `GET /api/messages/unread` - Conteggio non letti
- `GET /api/messages/search-users` - Cerca utenti

### Reels
- `GET /api/reels` - Lista reels
- `POST /api/reels` - Crea reel
- `POST /api/reels/:id/like` - Like/unlike
- `DELETE /api/reels/:id` - Elimina reel

## Tecnologie

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion
- **Backend**: Node.js, Express, better-sqlite3, bcrypt
- **Database**: SQLite
