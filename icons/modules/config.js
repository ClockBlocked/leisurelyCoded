




/* ============================================================
   ICON FORGE — js/config.js
   Central configuration: sprite sources, varieties, categories,
   timing constants, and tunable behaviour.
   ============================================================ */

/* ------------------------------------------------------------
   1. APP META
   ------------------------------------------------------------ */
export const APP = {
  name: "Icon Forge",
  version: "1.0.0",
  tagline: "A Font Awesome icon library, forged for speed.",
  sourceUrl: "https://fontawesome.com",
};

/* ------------------------------------------------------------
   2. TIMING — artificial delays so loading UX is visible
   ------------------------------------------------------------ */
export const TIMING = {
  /* Full page transitions (top nav: Home, Categories, Varieties,
     Bookmarks, Category detail). Progress bar runs for AT LEAST
     this long even if the render is instant. */
  full: 900,

  /* Fragment transitions (style/variety switch, filter chips,
     search debounce). Spinner overlay runs at least this long. */
  fragment: 650,

  /* Progress bar pacing */
  progressTick: 90,       // ms between incremental jumps
  progressEase: 220,      // CSS transition in ms
  progressFinish: 320,    // ms to hold at 100% before fading out

  /* Spinner minimum display time */
  spinnerMin: 550,

  /* Search input debounce */
  searchDebounce: 180,

  /* Toast display time */
  toast: 1900,
};

/* ------------------------------------------------------------
   3. SPRITE SOURCES
   ------------------------------------------------------------
   Map each "variety" key (used in URLs, chips, and state)
   to a .svg sprite file (symbol-based, Font Awesome style).

   ⚠ EDIT THESE to match YOUR Font Awesome folder layout.
   If a sprite fails to load, the app logs a warning and that
   variety is marked unavailable (chips still show a count of 0).

   FA6 standard sprites:
     solid.svg, regular.svg, brands.svg,
     sharp-solid.svg, sharp-regular.svg,
     duotone.svg, thin.svg, light.svg
   ------------------------------------------------------------ */
export const SPRITES = {
  solid:   "./fontawesome/svgs/solid.svg",
  regular: "./fontawesome/svgs/regular.svg",
  brands:  "./fontawesome/svgs/brands.svg",
  sharp:   "./fontawesome/svgs/sharp-solid.svg",
  duotone: "./fontawesome/svgs/duotone.svg",
  thin:    "./fontawesome/svgs/thin.svg",
  light:   "./fontawesome/svgs/light.svg",
};

/* ------------------------------------------------------------
   4. VARIETIES
   ------------------------------------------------------------
   Displayed as the second (fragment-level) nav bar.
   "key" must match a key in SPRITES above.
   "preview" is used for the "Varieties" page banners.
   ------------------------------------------------------------ */
export const VARIETIES = [
  {
    key: "solid",
    label: "Solid",
    blurb: "The workhorse. Bold, filled shapes with maximum punch.",
    preview: ["house", "heart", "star", "bolt", "bell"],
  },
  {
    key: "regular",
    label: "Regular",
    blurb: "Outlined strokes with a lighter, more delicate feel.",
    preview: ["house", "heart", "star", "bolt", "bell"],
  },
  {
    key: "sharp",
    label: "Sharp",
    blurb: "Crisp corners and precise angles. Engineered for UI chrome.",
    preview: ["house", "heart", "star", "bolt", "bell"],
  },
  {
    key: "light",
    label: "Light",
    blurb: "Airy hairlines that whisper rather than shout.",
    preview: ["house", "heart", "star", "bolt", "bell"],
  },
  {
    key: "thin",
    label: "Thin",
    blurb: "Featherweight strokes for elegant editorial layouts.",
    preview: ["house", "heart", "star", "bolt", "bell"],
  },
  {
    key: "duotone",
    label: "Duotone",
    blurb: "Two-tone depth for icons that pop off the page.",
    preview: ["house", "heart", "star", "bolt", "bell"],
  },
  {
    key: "brands",
    label: "Brands",
    blurb: "Every logo you'll ever need for social and integration.",
    preview: ["github", "twitter", "figma", "react", "npm"],
  },
];

/* ------------------------------------------------------------
   5. CATEGORIES
   ------------------------------------------------------------
   Classified by KEYWORDS in the icon's slugged name.
   Matching is case-insensitive and looks for any keyword as a
   substring or a whole word. First matching category wins
   (categories are evaluated in array order), but icons can be
   listed in MULTIPLE categories by editing "exclusive: false".

   EDIT THE KEYWORDS freely — the classifier in data.js reads
   these arrays directly.
   ------------------------------------------------------------ */
export const CATEGORIES = [
  {
    key: "arrows",
    label: "Arrows & Directions",
    icon: "arrow-right",
    blurb: "Pointers, chevrons, carets, and every way a thing can go.",
    keywords: ["arrow", "chevron", "caret", "angle", "long-", "turn-", "level-", "rotate", "refresh", "sync", "exchange", "shuffle", "retweet", "recycle"],
  },
  {
    key: "coding",
    label: "Coding & Dev",
    icon: "code",
    blurb: "Terminals, brackets, bugs, branches — the developer's toolkit.",
    keywords: ["code", "terminal", "bug", "branch", "git", "merge", "commit", "bracket", "curly", "quote", "sitemap", "database", "server", "cloud-", "docker", "npm", "python", "java", "rust", "php", "css", "html", "js", "robot"],
  },
  {
    key: "files",
    label: "Files & Folders",
    icon: "folder",
    blurb: "Documents, archives, media types, and folder structures.",
    keywords: ["file", "folder", "doc", "pdf", "csv", "zip", "archive", "copy", "clipboard", "save", "floppy", "disk", "hdd", "download", "upload", "print", "paperclip", "pen", "pencil", "eraser", "highlighter", "marker"],
  },
  {
    key: "layout",
    label: "Layout & UI",
    icon: "table-columns",
    blurb: "Grids, columns, sidebars, and everything that frames content.",
    keywords: ["table", "column", "row", "grid", "layout", "sidebar", "panel", "window", "browser", "frame", "border", "bracket", "square", "rect", "crop", "expand", "compress", "maximize", "minimize", "panel"],
  },
  {
    key: "music",
    label: "Music & Audio",
    icon: "music",
    blurb: "Notes, waveforms, instruments, and audio controls.",
    keywords: ["music", "note", "audio", "microphone", "headphone", "headset", "speaker", "volume", "waveform", "guitar", "piano", "drum", "harp", "radio", "podcast", "record", "vinyl", "saxophone", "trumpet", "kazoo"],
  },
  {
    key: "video",
    label: "Video & Media",
    icon: "video",
    blurb: "Cameras, films, players, and the moving image.",
    keywords: ["video", "camera", "film", "movie", "clapper", "play", "pause", "stop", "record", "tv", "projector", "youtube", "vimeo", "clapperboard", "photo", "image", "picture"],
  },
  {
    key: "social",
    label: "Social & Brands",
    icon: "share-nodes",
    blurb: "Social platforms, share buttons, and community signals.",
    keywords: ["share", "heart", "thumbs", "comment", "bell", "user", "users", "group", "feed", "rss", "hashtag", "at", "reply", "retweet", "bookmark", "star", "fire", "flame"],
  },
  {
    key: "brands-cat",
    label: "Logos & Platforms",
    icon: "fab fa-github",
    blurb: "Company marks, platforms, and third-party integrations.",
    keywords: ["github", "twitter", "x-", "figma", "react", "npm", "yarn", "docker", "aws", "azure", "gcp", "google", "apple", "microsoft", "android", "chrome", "firefox", "safari", "edge", "linux", "ubuntu", "reddit", "discord", "slack", "whatsapp", "telegram", "facebook", "instagram", "linkedin", "tiktok", "youtube", "spotify", "twitch", "patreon"],
  },
  {
    key: "people",
    label: "People & Faces",
    icon: "user",
    blurb: "Faces, silhouettes, accessibility, and humanity.",
    keywords: ["user", "person", "face", "smile", "frown", "meh", "baby", "child", "adult", "man", "woman", "boy", "girl", "hand", "finger", "eye", "ear", "nose", "mouth", "brain", "heart", "child", "person"],
  },
  {
    key: "commerce",
    label: "Commerce & Money",
    icon: "cart-shopping",
    blurb: "Carts, credit cards, coins, and market signals.",
    keywords: ["cart", "shopping", "bag", "basket", "credit", "card", "money", "bill", "coin", "cash", "dollar", "euro", "pound", "yen", "rupee", "bitcoin", "ethereum", "wallet", "piggy", "receipt", "tag", "price", "gift", "store", "shop", "barcode", "qrcode"],
  },
  {
    key: "maps",
    label: "Maps & Travel",
    icon: "map",
    blurb: "Pins, globes, planes, and ways to get from here to there.",
    keywords: ["map", "location", "pin", "compass", "globe", "earth", "world", "plane", "airplane", "car", "bus", "train", "subway", "bicycle", "bike", "motorcycle", "ship", "boat", "rocket", "route", "road", "traffic", "hotel", "bed", "suitcase", "passport", "anchor"],
  },
  {
    key: "weather",
    label: "Weather & Nature",
    icon: "cloud-sun",
    blurb: "Sun, rain, snow, and everything the sky throws at us.",
    keywords: ["sun", "moon", "star", "cloud", "rain", "snow", "wind", "storm", "bolt", "thunder", "fog", "haze", "smog", "tornado", "hurricane", "umbrella", "rainbow", "fire", "flame", "leaf", "tree", "flower", "seedling", "mountain", "water", "wave", "droplet"],
  },
  {
    key: "symbols",
    label: "Symbols & Shapes",
    icon: "shapes",
    blurb: "Circles, squares, checkmarks, and universal glyphs.",
    keywords: ["circle", "square", "triangle", "diamond", "star", "hexagon", "octagon", "check", "xmark", "plus", "minus", "equals", "divide", "infinity", "ban", "info", "question", "exclamation", "asterisk", "percent", "hashtag", "at-", "ampersand"],
  },
  {
    key: "time",
    label: "Time & Calendar",
    icon: "clock",
    blurb: "Clocks, calendars, hours, and moments in time.",
    keywords: ["clock", "watch", "time", "hour", "minute", "second", "calendar", "date", "day", "week", "month", "year", "history", "hourglass", "stopwatch", "alarm", "bell"],
  },
  {
    key: "security",
    label: "Security & Privacy",
    icon: "shield-halved",
    blurb: "Locks, keys, shields, and everything that keeps things safe.",
    keywords: ["lock", "unlock", "key", "shield", "fingerprint", "eye-slash", "user-secret", "mask", "vault", "safe", "password", "privacy", "secure", "certificate", "badge", "police", "fire-extinguisher", "helmet", "warning"],
  },
  {
    key: "education",
    label: "Education & Science",
    icon: "graduation-cap",
    blurb: "Books, pencils, flasks, and the pursuit of knowing.",
    keywords: ["book", "graduation", "cap", "school", "university", "college", "student", "teacher", "chalkboard", "flask", "beaker", "atom", "microscope", "telescope", "dna", "virus", "bacteria", "magnet", "calculator", "ruler", "compass", "glasses", "diploma", "award", "trophy", "medal"],
  },
  {
    key: "health",
    label: "Health & Medical",
    icon: "heart-pulse",
    blurb: "Hospitals, medicine, wellness, and body signals.",
    keywords: ["heart", "pulse", "stethoscope", "hospital", "doctor", "nurse", "pill", "capsule", "syringe", "vaccine", "bandage", "crutch", "wheelchair", "walking", "running", "dumbbell", "weight", "apple", "tooth", "bone", "brain", "lungs", "tooth", "virus", "first-aid", "kit"],
  },
  {
    key: "transport",
    label: "Transport & Automotive",
    icon: "car",
    blurb: "Cars, planes, trains, and things that move people.",
    keywords: ["car", "truck", "van", "suv", "bus", "taxi", "plane", "helicopter", "rocket", "train", "tram", "subway", "bicycle", "bike", "motorcycle", "scooter", "boat", "ship", "anchor", "gas", "fuel", "charging", "parking", "traffic", "route", "road", "wheel", "steering"],
  },
  {
    key: "food",
    label: "Food & Drink",
    icon: "utensils",
    blurb: "Restaurants, cooking, and everything edible.",
    keywords: ["utensil", "fork", "knife", "spoon", "plate", "bowl", "cup", "mug", "glass", "bottle", "wine", "beer", "cocktail", "coffee", "tea", "pizza", "burger", "fries", "hotdog", "taco", "burrito", "sushi", "fish", "bread", "cake", "cookie", "candy", "ice-cream", "egg", "apple", "lemon", "carrot", "pepper", "mushroom", "cheese"],
  },
];

/* ------------------------------------------------------------
   6. STORAGE KEYS
   ------------------------------------------------------------ */
export const STORAGE = {
  bookmarks: "iconforge.bookmarks.v1",
  theme: "iconforge.theme.v1",
  variety: "iconforge.variety.v1",
  recent: "iconforge.recent.v1",
};

/* ------------------------------------------------------------
   7. ROUTES
   ------------------------------------------------------------ */
export const ROUTES = {
  home: "/",
  categories: "/categories",
  varieties: "/varieties",
  bookmarks: "/bookmarks",
  category: "/c/:key",   // category detail
  variety: "/v/:key",    // variety detail
  search: "/search",     // search results
};

/* ------------------------------------------------------------
   8. UI DEFAULTS
   ------------------------------------------------------------ */
export const UI = {
  defaultVariety: "solid",
  defaultTheme: "dark",
  tileMinWidth: 92,     // px — matches CSS grid minmax
  maxRecent: 12,
  toastDotColor: null,  // null = use theme default
};

/* ------------------------------------------------------------
   9. COLOR SWATCHES (stage modal)
   ------------------------------------------------------------ */
export const SWATCHES = [
  { label: "Inherit color", value: "currentColor", cls: "swatch--inherit" },
  { label: "White",   value: "#ffffff" },
  { label: "Indigo",  value: "#818cf8" },
  { label: "Cyan",    value: "#22d3ee" },
  { label: "Emerald", value: "#34d399" },
  { label: "Amber",   value: "#fbbf24" },
  { label: "Rose",    value: "#fb7185" },
  { label: "Slate",   value: "#64748b" },
];

/* ------------------------------------------------------------
   10. STAGE ACTIONS
   ------------------------------------------------------------ */
export const GLYPHS = {
  copy:  '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>',
  code:  '<path d="m8.5 8.5-4 3.5 4 3.5"/><path d="m15.5 8.5 4 3.5-4 3.5"/><path d="m13.5 5-3 14"/>',
  db:    '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6"/><path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6"/>',
  down:  '<path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
  file:  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  ext:   '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
  mark:  '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/>',
};

export const ACTIONS = [
  { id: "copy-svg", label: "Copy SVG",   glyph: "copy", primary: true },
  { id: "copy-jsx", label: "Copy JSX",   glyph: "code" },
  { id: "copy-uri", label: "Copy URI",   glyph: "db"   },
  { id: "dl-txt",   label: "Download .txt", glyph: "down" },
  { id: "dl-svg",   label: "Download .svg", glyph: "file" },
  { id: "source",   label: "Source",     glyph: "ext"  },
];

/* ------------------------------------------------------------
   11. FALLBACK / DEMO SPRITE
   ------------------------------------------------------------
   Used only if real sprites can't be fetched. Contains a handful
   of minimal symbols so the UI renders meaningfully in dev.
   ------------------------------------------------------------ */
export const FALLBACK_SYMBOLS = {
  house:     "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  heart:     "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  star:      "m12 3 2.6 6.4 6.9.5-5.2 4.5 1.7 6.7L12 17.6 6 21l1.7-6.7-5.2-4.5 6.9-.5z",
  bolt:      "M13 2 4 14h6l-1 8 9-12h-6z",
  bell:      "M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5zM10 20a2 2 0 0 0 4 0",
  user:      "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  search:    "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5 12 5 5",
  gear:      "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4-2-1 2-1-1-2-2 .5-1-2-2 1-1-2-2 1-1-1-2 1-2-1-1 1-2-1-1 2-2-.5-1 2 2 1-2 1 1 2 2-.5 1 2 2-1 1 2 2-1 1 1 2-1 2 1 1-1 2 1z",
  code:      "m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16",
  github:    "M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-2c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z",
};