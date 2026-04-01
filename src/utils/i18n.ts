// Internationalization (i18n) system

export type Language = 'it' | 'en' | 'es' | 'fr' | 'de';

type TranslationKeys = {
  // Navigation
  feed: string;
  reels: string;
  channels: string;
  groups: string;
  messages: string;
  create: string;
  profile: string;
  
  // Header
  search: string;
  notifications: string;
  settings: string;
  
  // Auth
  login: string;
  register: string;
  username: string;
  password: string;
  displayName: string;
  age: string;
  loading: string;
  
  // Settings
  settingsTitle: string;
  account: string;
  privacy: string;
  appearance: string;
  sounds: string;
  accessibility: string;
  
  // Appearance settings
  colorTheme: string;
  darkMode: string;
  darkModeOn: string;
  darkModeOff: string;
  fontSize: string;
  language: string;
  
  // Theme names
  themeSunset: string;
  themeOcean: string;
  themeMint: string;
  themePurple: string;
  themeDark: string;
  
  // Font sizes
  fontSmall: string;
  fontNormal: string;
  fontLarge: string;
  fontXLarge: string;
  
  // Notifications settings
  enableNotifications: string;
  enableNotificationsDesc: string;
  messagePreview: string;
  messagePreviewDesc: string;
  
  // Sound settings
  notificationSounds: string;
  notificationSoundsDesc: string;
  vibration: string;
  vibrationDesc: string;
  
  // Accessibility
  autoPlayVideos: string;
  autoPlayVideosDesc: string;
  reduceMotion: string;
  reduceMotionDesc: string;
  
  // Privacy
  privateProfile: string;
  privateProfileDesc: string;
  safeComments: string;
  safeCommentsDesc: string;
  saveChanges: string;
  saving: string;
  
  // General
  memberSince: string;
  email: string;
};

const translations: Record<Language, TranslationKeys> = {
  it: {
    // Navigation
    feed: 'Feed',
    reels: 'Reels',
    channels: 'Canali',
    groups: 'Gruppi',
    messages: 'Messaggi',
    create: 'Crea',
    profile: 'Profilo',
    
    // Header
    search: 'Cerca',
    notifications: 'Notifiche',
    settings: 'Impostazioni',
    
    // Auth
    login: 'Accedi',
    register: 'Registrati',
    username: 'Username',
    password: 'Password',
    displayName: 'Nome visualizzato',
    age: 'Età',
    loading: 'Caricamento...',
    
    // Settings
    settingsTitle: 'Impostazioni',
    account: 'Account',
    privacy: 'Privacy',
    appearance: 'Aspetto',
    sounds: 'Suoni',
    accessibility: 'Accessibilità',
    
    // Appearance settings
    colorTheme: 'Tema colori',
    darkMode: 'Modalità scura',
    darkModeOn: 'Attiva - tema scuro',
    darkModeOff: 'Disattiva - tema chiaro',
    fontSize: 'Dimensione testo',
    language: 'Lingua',
    
    // Theme names
    themeSunset: 'Tramonto',
    themeOcean: 'Oceano',
    themeMint: 'Menta',
    themePurple: 'Viola',
    themeDark: 'Scuro',
    
    // Font sizes
    fontSmall: 'Piccolo',
    fontNormal: 'Normale',
    fontLarge: 'Grande',
    fontXLarge: 'Molto grande',
    
    // Notifications settings
    enableNotifications: 'Abilita notifiche',
    enableNotificationsDesc: 'Ricevi tutte le notifiche dell\'app',
    messagePreview: 'Anteprima messaggi',
    messagePreviewDesc: 'Mostra contenuto nelle notifiche',
    
    // Sound settings
    notificationSounds: 'Suoni notifiche',
    notificationSoundsDesc: 'Riproduci suoni per le notifiche',
    vibration: 'Vibrazione',
    vibrationDesc: 'Vibra per notifiche importanti',
    
    // Accessibility
    autoPlayVideos: 'Riproduci video automaticamente',
    autoPlayVideosDesc: 'I video si avviano da soli nel feed',
    reduceMotion: 'Riduci movimento',
    reduceMotionDesc: 'Limita le animazioni nell\'app',
    
    // Privacy
    privateProfile: 'Profilo privato',
    privateProfileDesc: 'Solo gli amici possono vedere i tuoi post',
    safeComments: 'Commenti sicuri',
    safeCommentsDesc: 'Filtra contenuti inappropriati nei commenti',
    saveChanges: 'Salva modifiche',
    saving: 'Salvataggio...',
    
    // General
    memberSince: 'Membro dal',
    email: 'Email',
  },
  
  en: {
    // Navigation
    feed: 'Feed',
    reels: 'Reels',
    channels: 'Channels',
    groups: 'Groups',
    messages: 'Messages',
    create: 'Create',
    profile: 'Profile',
    
    // Header
    search: 'Search',
    notifications: 'Notifications',
    settings: 'Settings',
    
    // Auth
    login: 'Login',
    register: 'Register',
    username: 'Username',
    password: 'Password',
    displayName: 'Display name',
    age: 'Age',
    loading: 'Loading...',
    
    // Settings
    settingsTitle: 'Settings',
    account: 'Account',
    privacy: 'Privacy',
    appearance: 'Appearance',
    sounds: 'Sounds',
    accessibility: 'Accessibility',
    
    // Appearance settings
    colorTheme: 'Color theme',
    darkMode: 'Dark mode',
    darkModeOn: 'On - dark theme',
    darkModeOff: 'Off - light theme',
    fontSize: 'Font size',
    language: 'Language',
    
    // Theme names
    themeSunset: 'Sunset',
    themeOcean: 'Ocean',
    themeMint: 'Mint',
    themePurple: 'Purple',
    themeDark: 'Dark',
    
    // Font sizes
    fontSmall: 'Small',
    fontNormal: 'Normal',
    fontLarge: 'Large',
    fontXLarge: 'Extra large',
    
    // Notifications settings
    enableNotifications: 'Enable notifications',
    enableNotificationsDesc: 'Receive all app notifications',
    messagePreview: 'Message preview',
    messagePreviewDesc: 'Show content in notifications',
    
    // Sound settings
    notificationSounds: 'Notification sounds',
    notificationSoundsDesc: 'Play sounds for notifications',
    vibration: 'Vibration',
    vibrationDesc: 'Vibrate for important notifications',
    
    // Accessibility
    autoPlayVideos: 'Auto-play videos',
    autoPlayVideosDesc: 'Videos start automatically in feed',
    reduceMotion: 'Reduce motion',
    reduceMotionDesc: 'Limit animations in the app',
    
    // Privacy
    privateProfile: 'Private profile',
    privateProfileDesc: 'Only friends can see your posts',
    safeComments: 'Safe comments',
    safeCommentsDesc: 'Filter inappropriate content in comments',
    saveChanges: 'Save changes',
    saving: 'Saving...',
    
    // General
    memberSince: 'Member since',
    email: 'Email',
  },
  
  es: {
    // Navigation
    feed: 'Inicio',
    reels: 'Reels',
    channels: 'Canales',
    groups: 'Grupos',
    messages: 'Mensajes',
    create: 'Crear',
    profile: 'Perfil',
    
    // Header
    search: 'Buscar',
    notifications: 'Notificaciones',
    settings: 'Ajustes',
    
    // Auth
    login: 'Iniciar sesión',
    register: 'Registrarse',
    username: 'Usuario',
    password: 'Contraseña',
    displayName: 'Nombre visible',
    age: 'Edad',
    loading: 'Cargando...',
    
    // Settings
    settingsTitle: 'Ajustes',
    account: 'Cuenta',
    privacy: 'Privacidad',
    appearance: 'Apariencia',
    sounds: 'Sonidos',
    accessibility: 'Accesibilidad',
    
    // Appearance settings
    colorTheme: 'Tema de colores',
    darkMode: 'Modo oscuro',
    darkModeOn: 'Activado - tema oscuro',
    darkModeOff: 'Desactivado - tema claro',
    fontSize: 'Tamaño de texto',
    language: 'Idioma',
    
    // Theme names
    themeSunset: 'Atardecer',
    themeOcean: 'Océano',
    themeMint: 'Menta',
    themePurple: 'Morado',
    themeDark: 'Oscuro',
    
    // Font sizes
    fontSmall: 'Pequeño',
    fontNormal: 'Normal',
    fontLarge: 'Grande',
    fontXLarge: 'Muy grande',
    
    // Notifications settings
    enableNotifications: 'Activar notificaciones',
    enableNotificationsDesc: 'Recibir todas las notificaciones',
    messagePreview: 'Vista previa de mensajes',
    messagePreviewDesc: 'Mostrar contenido en notificaciones',
    
    // Sound settings
    notificationSounds: 'Sonidos de notificación',
    notificationSoundsDesc: 'Reproducir sonidos para notificaciones',
    vibration: 'Vibración',
    vibrationDesc: 'Vibrar para notificaciones importantes',
    
    // Accessibility
    autoPlayVideos: 'Reproducción automática',
    autoPlayVideosDesc: 'Los videos se inician solos',
    reduceMotion: 'Reducir movimiento',
    reduceMotionDesc: 'Limitar animaciones en la app',
    
    // Privacy
    privateProfile: 'Perfil privado',
    privateProfileDesc: 'Solo amigos pueden ver tus publicaciones',
    safeComments: 'Comentarios seguros',
    safeCommentsDesc: 'Filtrar contenido inapropiado',
    saveChanges: 'Guardar cambios',
    saving: 'Guardando...',
    
    // General
    memberSince: 'Miembro desde',
    email: 'Correo',
  },
  
  fr: {
    // Navigation
    feed: 'Fil',
    reels: 'Reels',
    channels: 'Chaînes',
    groups: 'Groupes',
    messages: 'Messages',
    create: 'Créer',
    profile: 'Profil',
    
    // Header
    search: 'Rechercher',
    notifications: 'Notifications',
    settings: 'Paramètres',
    
    // Auth
    login: 'Connexion',
    register: 'S\'inscrire',
    username: 'Nom d\'utilisateur',
    password: 'Mot de passe',
    displayName: 'Nom affiché',
    age: 'Âge',
    loading: 'Chargement...',
    
    // Settings
    settingsTitle: 'Paramètres',
    account: 'Compte',
    privacy: 'Confidentialité',
    appearance: 'Apparence',
    sounds: 'Sons',
    accessibility: 'Accessibilité',
    
    // Appearance settings
    colorTheme: 'Thème de couleurs',
    darkMode: 'Mode sombre',
    darkModeOn: 'Activé - thème sombre',
    darkModeOff: 'Désactivé - thème clair',
    fontSize: 'Taille du texte',
    language: 'Langue',
    
    // Theme names
    themeSunset: 'Coucher de soleil',
    themeOcean: 'Océan',
    themeMint: 'Menthe',
    themePurple: 'Violet',
    themeDark: 'Sombre',
    
    // Font sizes
    fontSmall: 'Petit',
    fontNormal: 'Normal',
    fontLarge: 'Grand',
    fontXLarge: 'Très grand',
    
    // Notifications settings
    enableNotifications: 'Activer les notifications',
    enableNotificationsDesc: 'Recevoir toutes les notifications',
    messagePreview: 'Aperçu des messages',
    messagePreviewDesc: 'Afficher le contenu dans les notifications',
    
    // Sound settings
    notificationSounds: 'Sons de notification',
    notificationSoundsDesc: 'Jouer des sons pour les notifications',
    vibration: 'Vibration',
    vibrationDesc: 'Vibrer pour les notifications importantes',
    
    // Accessibility
    autoPlayVideos: 'Lecture automatique',
    autoPlayVideosDesc: 'Les vidéos démarrent automatiquement',
    reduceMotion: 'Réduire les mouvements',
    reduceMotionDesc: 'Limiter les animations',
    
    // Privacy
    privateProfile: 'Profil privé',
    privateProfileDesc: 'Seuls les amis peuvent voir vos publications',
    safeComments: 'Commentaires sécurisés',
    safeCommentsDesc: 'Filtrer le contenu inapproprié',
    saveChanges: 'Enregistrer',
    saving: 'Enregistrement...',
    
    // General
    memberSince: 'Membre depuis',
    email: 'Email',
  },
  
  de: {
    // Navigation
    feed: 'Feed',
    reels: 'Reels',
    channels: 'Kanäle',
    groups: 'Gruppen',
    messages: 'Nachrichten',
    create: 'Erstellen',
    profile: 'Profil',
    
    // Header
    search: 'Suchen',
    notifications: 'Benachrichtigungen',
    settings: 'Einstellungen',
    
    // Auth
    login: 'Anmelden',
    register: 'Registrieren',
    username: 'Benutzername',
    password: 'Passwort',
    displayName: 'Anzeigename',
    age: 'Alter',
    loading: 'Laden...',
    
    // Settings
    settingsTitle: 'Einstellungen',
    account: 'Konto',
    privacy: 'Datenschutz',
    appearance: 'Aussehen',
    sounds: 'Töne',
    accessibility: 'Barrierefreiheit',
    
    // Appearance settings
    colorTheme: 'Farbthema',
    darkMode: 'Dunkelmodus',
    darkModeOn: 'An - Dunkles Thema',
    darkModeOff: 'Aus - Helles Thema',
    fontSize: 'Schriftgröße',
    language: 'Sprache',
    
    // Theme names
    themeSunset: 'Sonnenuntergang',
    themeOcean: 'Ozean',
    themeMint: 'Minze',
    themePurple: 'Lila',
    themeDark: 'Dunkel',
    
    // Font sizes
    fontSmall: 'Klein',
    fontNormal: 'Normal',
    fontLarge: 'Groß',
    fontXLarge: 'Sehr groß',
    
    // Notifications settings
    enableNotifications: 'Benachrichtigungen aktivieren',
    enableNotificationsDesc: 'Alle App-Benachrichtigungen erhalten',
    messagePreview: 'Nachrichtenvorschau',
    messagePreviewDesc: 'Inhalt in Benachrichtigungen anzeigen',
    
    // Sound settings
    notificationSounds: 'Benachrichtigungstöne',
    notificationSoundsDesc: 'Töne für Benachrichtigungen abspielen',
    vibration: 'Vibration',
    vibrationDesc: 'Bei wichtigen Benachrichtigungen vibrieren',
    
    // Accessibility
    autoPlayVideos: 'Automatische Wiedergabe',
    autoPlayVideosDesc: 'Videos starten automatisch',
    reduceMotion: 'Bewegung reduzieren',
    reduceMotionDesc: 'Animationen einschränken',
    
    // Privacy
    privateProfile: 'Privates Profil',
    privateProfileDesc: 'Nur Freunde können deine Beiträge sehen',
    safeComments: 'Sichere Kommentare',
    safeCommentsDesc: 'Unangemessene Inhalte filtern',
    saveChanges: 'Änderungen speichern',
    saving: 'Speichern...',
    
    // General
    memberSince: 'Mitglied seit',
    email: 'E-Mail',
  },
};

export function getTranslations(language: Language): TranslationKeys {
  return translations[language] || translations.it;
}

export function t(language: Language, key: keyof TranslationKeys): string {
  const trans = translations[language] || translations.it;
  return trans[key] || key;
}

export default translations;
