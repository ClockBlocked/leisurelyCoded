/* ============================================================
   modules/config.js
   ============================================================ */

export const APP = {
  name: "Icon Forge",
  version: "2.1.1",
};

export const TIMING = {
  full: 700,
  fragment: 500,
  progressTick: 90,
  progressEase: 220,
  progressFinish: 280,
  spinnerMin: 400,
  searchDebounce: 180,
  paletteDebounce: 80,
  toast: 1900,
};

export const SPRITES = {
  manifestUrl: "https://clockblocked.github.io/leisurelyCoded/icons/sprite-manifest.json",
  defaultBase: "https://clockblocked.github.io/leisurelyCoded/icons/fontawesome/sprites/",
  defaultCandidates: [
    { key: "solid",                 file: "solid.svg",                 label: "Solid" },
    { key: "regular",               file: "regular.svg",               label: "Regular" },
    { key: "light",                 file: "light.svg",                 label: "Light" },
    { key: "thin",                  file: "thin.svg",                  label: "Thin" },
    { key: "duotone",               file: "duotone.svg",               label: "Duotone" },
    { key: "brands",                file: "brands.svg",                label: "Brands" },
    { key: "sharp-solid",           file: "sharp-solid.svg",           label: "Sharp Solid" },
    { key: "sharp-regular",         file: "sharp-regular.svg",         label: "Sharp Regular" },
    { key: "sharp-light",           file: "sharp-light.svg",           label: "Sharp Light" },
    { key: "sharp-thin",            file: "sharp-thin.svg",            label: "Sharp Thin" },
    { key: "sharp-duotone-solid",   file: "sharp-duotone-solid.svg",   label: "Sharp Duotone Solid" },
    { key: "sharp-duotone-regular", file: "sharp-duotone-regular.svg", label: "Sharp Duotone Regular" },
    { key: "sharp-duotone-light",   file: "sharp-duotone-light.svg",   label: "Sharp Duotone Light" },
    { key: "sharp-duotone-thin",    file: "sharp-duotone-thin.svg",    label: "Sharp Duotone Thin" },
    { key: "duotone-regular",       file: "duotone-regular.svg",       label: "Duotone Regular" },
    { key: "duotone-light",         file: "duotone-light.svg",         label: "Duotone Light" },
    { key: "duotone-thin",          file: "duotone-thin.svg",          label: "Duotone Thin" },
    { key: "slab-regular",          file: "slab-regular.svg",          label: "Slab Regular" },
    { key: "slab-press-regular",    file: "slab-press-regular.svg",    label: "Slab Press" },
    { key: "slab-duo-regular",      file: "slab-duo-regular.svg",      label: "Slab Duo" },
    { key: "slab-press-duo-regular","file": "slab-press-duo-regular.svg","label": "Slab Press Duo" },
    { key: "jelly-regular",         file: "jelly-regular.svg",         label: "Jelly Regular" },
    { key: "jelly-fill-regular",    file: "jelly-fill-regular.svg",    label: "Jelly Fill" },
    { key: "jelly-duo-regular",     file: "jelly-duo-regular.svg",     label: "Jelly Duo" },
    { key: "utility-semibold",      file: "utility-semibold.svg",      label: "Utility" },
    { key: "utility-fill-semibold", file: "utility-fill-semibold.svg", label: "Utility Fill" },
    { key: "utility-duo-semibold",  file: "utility-duo-semibold.svg",  label: "Utility Duo" },
    { key: "whiteboard-semibold",   file: "whiteboard-semibold.svg",   label: "Whiteboard" },
    { key: "thumbprint-light",      file: "thumbprint-light.svg",      label: "Thumbprint" },
    { key: "notdog-solid",          file: "notdog-solid.svg",          label: "Notdog Solid" },
    { key: "notdog-duo-solid",      file: "notdog-duo-solid.svg",      label: "Notdog Duo" },
    { key: "vellum-solid",          file: "vellum-solid.svg",          label: "Vellum" },
    { key: "mosaic-solid",          file: "mosaic-solid.svg",          label: "Mosaic" },
    { key: "pixel-regular",         file: "pixel-regular.svg",         label: "Pixel" },
    { key: "graphite-thin",         file: "graphite-thin.svg",         label: "Graphite" },
    { key: "etch-solid",            file: "etch-solid.svg",            label: "Etch" },
    { key: "chiseled-regular",      file: "chiseled-regular.svg",      label: "Chiseled" },
    
  ],
};

/* ------------------------------------------------------------
   VARIETY_META
   ------------------------------------------------------------
   Display metadata for every variety. Used as a fallback when
   the manifest does not supply a label/blurb, and by the sprite
   registry when auto-discovery is active.
   ------------------------------------------------------------ */
export const VARIETY_META = {
  "solid": {
    label: "Solid",
    blurb: "Bold, filled shapes with maximum punch. The workhorse of the set.",
  },
  "regular": {
    label: "Regular",
    blurb: "Refined line icons with a lighter, airier feel — perfect for dense UI.",
  },
  "light": {
    label: "Light",
    blurb: "Airy hairlines that whisper rather than shout.",
  },
  "thin": {
    label: "Thin",
    blurb: "Featherweight strokes for elegant editorial layouts.",
  },
  "duotone": {
    label: "Duotone",
    blurb: "Two-tone depth for icons that pop off the page.",
  },
  "brands": {
    label: "Brands",
    blurb: "Every logo you'll ever need — social, platforms, integrations.",
  },
  "sharp-solid": {
    label: "Sharp Solid",
    blurb: "Crisp corners and precise angles, engineered for UI chrome.",
  },
  "sharp-regular": {
    label: "Sharp Regular",
    blurb: "Sharp outlines with the weight of a Regular, for tight grids.",
  },
  "sharp-light": {
    label: "Sharp Light",
    blurb: "Sharp and light — precision drawn in a single hairline.",
  },
  "sharp-thin": {
    label: "Sharp Thin",
    blurb: "The lightest sharp variant. Architectural and precise.",
  },
  "sharp-duotone-solid": {
    label: "Sharp Duotone Solid",
    blurb: "Sharp geometry with two-tone fill depth.",
  },
  "sharp-duotone-regular": {
    label: "Sharp Duotone Regular",
    blurb: "Sharp outline with a softer duotone fill.",
  },
  "sharp-duotone-light": {
    label: "Sharp Duotone Light",
    blurb: "Feather-light sharp duo for dense chrome.",
  },
  "sharp-duotone-thin": {
    label: "Sharp Duotone Thin",
    blurb: "The lightest sharp duotone — whisper-quiet.",
  },
  "duotone-regular": {
    label: "Duotone Regular",
    blurb: "Soft duotone with a Regular-weight line.",
  },
  "duotone-light": {
    label: "Duotone Light",
    blurb: "Airy duotone for subtle emphasis.",
  },
  "duotone-thin": {
    label: "Duotone Thin",
    blurb: "The lightest duotone pass.",
  },
  "slab-regular": {
    label: "Slab Regular",
    blurb: "Chunky editorial strokes with a typographic soul.",
  },
  "slab-press-regular": {
    label: "Slab Press",
    blurb: "Slab with a printing-press texture.",
  },
  "slab-duo-regular": {
    label: "Slab Duo",
    blurb: "Slab weight with two-tone depth.",
  },
  "slab-press-duo-regular": {
    label: "Slab Press Duo",
    blurb: "Slab press with duotone fill.",
  },
  "jelly-regular": {
    label: "Jelly Regular",
    blurb: "Squishy, rounded, and playful.",
  },
  "jelly-fill-regular": {
    label: "Jelly Fill",
    blurb: "Jelly outlines with filled interiors.",
  },
  "jelly-duo-regular": {
    label: "Jelly Duo",
    blurb: "Jelly with two-tone fill.",
  },
  "utility-semibold": {
    label: "Utility",
    blurb: "Functional, UI-focused strokes drawn semibold.",
  },
  "utility-fill-semibold": {
    label: "Utility Fill",
    blurb: "Utility outlines with filled interiors.",
  },
  "utility-duo-semibold": {
    label: "Utility Duo",
    blurb: "Utility weight with two-tone depth.",
  },
  "whiteboard-semibold": {
    label: "Whiteboard",
    blurb: "Marker-pen energy — hand-drawn and loose.",
  },
  "thumbprint-light": {
    label: "Thumbprint",
    blurb: "Warm, slightly irregular, human touch.",
  },
  "notdog-solid": {
    label: "Notdog Solid",
    blurb: "Playful, irregular hand-drawn character.",
  },
  "notdog-duo-solid": {
    label: "Notdog Duo",
    blurb: "Notdog with a two-tone overlay.",
  },
  "vellum-solid": {
    label: "Vellum",
    blurb: "Luxurious, high-end transparency feel.",
  },
  "mosaic-solid": {
    label: "Mosaic",
    blurb: "Geometric tiles assembled into glyphs.",
  },
  "pixel-regular": {
    label: "Pixel",
    blurb: "Retro 8-bit nostalgia.",
  },
  "graphite-thin": {
    label: "Graphite",
    blurb: "Pencil-sketch texture with a soft edge.",
  },
  "etch-solid": {
    label: "Etch",
    blurb: "Engraved, carved-in-stone aesthetic.",
  },
  "chiseled-regular": {
    label: "Chiseled",
    blurb: "Angular, sculpted facets with sharp edges.",
  },
};

export const VARIETY_GROUPS = {
  core:            ["solid", "regular", "light", "thin", "duotone", "brands"],
  sharp:           ["sharp-solid", "sharp-regular", "sharp-light", "sharp-thin"],
  "sharp-duotone": ["sharp-duotone-solid", "sharp-duotone-regular", "sharp-duotone-light", "sharp-duotone-thin"],
  duotone:         ["duotone-regular", "duotone-light", "duotone-thin"],
  slab:            ["slab-regular", "slab-press-regular", "slab-duo-regular", "slab-press-duo-regular"],
  jelly:           ["jelly-regular", "jelly-fill-regular", "jelly-duo-regular"],
  utility:         ["utility-semibold", "utility-fill-semibold", "utility-duo-semibold"],
  families:        ["whiteboard-semibold", "thumbprint-light", "notdog-solid", "notdog-duo-solid", "vellum-solid", "mosaic-solid", "pixel-regular", "graphite-thin", "etch-solid", "chiseled-regular"],
};

export const VARIETY_GROUP_LABELS = {
  core:            "Core styles",
  sharp:           "Sharp family",
  "sharp-duotone": "Sharp Duotone family",
  duotone:         "Duotone variants",
  slab:            "Slab family",
  jelly:           "Jelly family",
  utility:         "Utility family",
  families:        "Icon families",
};

export const CATEGORIES = [
  { key: "arrows",    label: "Arrows & Directions", icon: "arrow-right",   blurb: "Pointers, chevrons, carets, and every way a thing can go.", keywords: ["arrow","chevron","caret","angle","turn-","level-","rotate","refresh","sync","exchange","shuffle","retweet","recycle","sort"] },
  { key: "coding",    label: "Coding & Dev",        icon: "code",          blurb: "Terminals, brackets, bugs, branches.", keywords: ["code","terminal","bug","branch","git","merge","commit","bracket","curly","quote","sitemap","database","server","docker","npm","python","java","rust","php","css","html","robot","microchip"] },
  { key: "files",     label: "Files & Folders",     icon: "folder",        blurb: "Documents, archives, media types, and folder structures.", keywords: ["file","folder","doc","pdf","csv","zip","archive","copy","clipboard","save","floppy","disk","hdd","download","upload","print","paperclip","pen","pencil","eraser","highlighter","marker"] },
  { key: "layout",    label: "Layout & UI",         icon: "table-columns", blurb: "Grids, columns, sidebars, and everything that frames content.", keywords: ["table","column","row","grid","layout","sidebar","panel","window","browser","frame","border","crop","expand","compress","maximize","minimize","bars","object"] },
  { key: "music",     label: "Music & Audio",       icon: "music",         blurb: "Notes, waveforms, instruments, and audio controls.", keywords: ["music","note","audio","microphone","headphone","headset","speaker","volume","waveform","guitar","piano","drum","harp","radio","podcast","record","vinyl","sliders"] },
  { key: "video",     label: "Video & Media",       icon: "video",         blurb: "Cameras, films, players, and the moving image.", keywords: ["video","camera","film","movie","clapper","play","pause","stop","record","tv","projector","youtube","vimeo","photo","image","picture","aperture","retro"] },
  { key: "social",    label: "Social & Community",  icon: "share-nodes",   blurb: "Share buttons, reactions, and community signals.", keywords: ["share","heart","thumbs","comment","bell","user","users","group","feed","rss","hashtag","reply","retweet","bookmark","star","fire","flame"] },
  { key: "brands",    label: "Logos & Platforms",   icon: "github",        blurb: "Company marks, platforms, integrations.", keywords: ["github","twitter","figma","react","npm","yarn","docker","aws","azure","gcp","google","apple","microsoft","android","chrome","firefox","safari","edge","linux","ubuntu","reddit","discord","slack","whatsapp","telegram","facebook","instagram","linkedin","tiktok","youtube","spotify","twitch","patreon","atlassian","bitbucket"] },
  { key: "people",    label: "People & Faces",      icon: "user",          blurb: "Faces, silhouettes, accessibility, and humanity.", keywords: ["user","person","face","smile","frown","meh","baby","child","adult","man","woman","boy","girl","hand","finger","eye","ear","nose","mouth","brain","heart","accessibility","wheelchair"] },
  { key: "commerce",  label: "Commerce & Money",    icon: "cart-shopping", blurb: "Carts, credit cards, coins, and market signals.", keywords: ["cart","shopping","bag","basket","credit","card","money","bill","coin","cash","dollar","euro","pound","yen","rupee","bitcoin","ethereum","wallet","piggy","receipt","tag","price","gift","store","shop","barcode","qrcode"] },
  { key: "maps",      label: "Maps & Travel",       icon: "map",           blurb: "Pins, globes, planes, and ways to get from here to there.", keywords: ["map","location","pin","compass","globe","earth","world","plane","airplane","car","bus","train","subway","bicycle","bike","motorcycle","ship","boat","rocket","route","road","traffic","hotel","bed","suitcase","passport","anchor"] },
  { key: "weather",   label: "Weather & Nature",    icon: "cloud-sun",     blurb: "Sun, rain, snow, and everything the sky throws at us.", keywords: ["sun","moon","star","cloud","rain","snow","wind","storm","bolt","thunder","fog","haze","smog","tornado","hurricane","umbrella","rainbow","fire","flame","leaf","tree","flower","seedling","mountain","water","wave","droplet","meteor"] },
  { key: "symbols",   label: "Symbols & Shapes",    icon: "shapes",        blurb: "Circles, squares, checkmarks, universal glyphs.", keywords: ["circle","square","triangle","diamond","star","hexagon","octagon","check","xmark","plus","minus","equals","divide","infinity","ban","info","question","exclamation","asterisk","percent","hashtag","ampersand","shapes"] },
  { key: "time",      label: "Time & Calendar",     icon: "clock",         blurb: "Clocks, calendars, hours, and moments in time.", keywords: ["clock","watch","time","hour","minute","second","calendar","date","day","week","month","year","history","hourglass","stopwatch","alarm","bell"] },
  { key: "security",  label: "Security & Privacy",  icon: "shield-halved", blurb: "Locks, keys, shields, everything that keeps things safe.", keywords: ["lock","unlock","key","shield","fingerprint","eye-slash","user-secret","mask","vault","safe","password","privacy","secure","certificate","badge","police","helmet","warning"] },
  { key: "education", label: "Education & Science", icon: "graduation-cap",blurb: "Books, pencils, flasks, and the pursuit of knowing.", keywords: ["book","graduation","cap","school","university","college","student","teacher","chalkboard","flask","beaker","atom","microscope","telescope","dna","virus","bacteria","magnet","calculator","ruler","compass","glasses","diploma","award","trophy","medal","vial"] },
  { key: "health",    label: "Health & Medical",    icon: "heart-pulse",   blurb: "Hospitals, medicine, wellness, and body signals.", keywords: ["heart","pulse","stethoscope","hospital","doctor","nurse","pill","capsule","syringe","vaccine","bandage","crutch","wheelchair","walking","running","dumbbell","weight","apple","tooth","bone","brain","lungs","virus","first-aid","kit"] },
  { key: "transport", label: "Transport & Auto",    icon: "car",           blurb: "Cars, planes, trains, things that move people.", keywords: ["car","truck","van","suv","bus","taxi","plane","helicopter","rocket","train","tram","subway","bicycle","bike","motorcycle","scooter","boat","ship","anchor","gas","fuel","charging","parking","traffic","route","road","wheel","steering","tractor"] },
  { key: "food",      label: "Food & Drink",        icon: "utensils",      blurb: "Restaurants, cooking, and everything edible.", keywords: ["utensil","fork","knife","spoon","plate","bowl","cup","mug","glass","bottle","wine","beer","cocktail","coffee","tea","pizza","burger","fries","hotdog","taco","burrito","sushi","fish","bread","cake","cookie","candy","ice-cream","egg","apple","lemon","carrot","pepper","mushroom","cheese"] },
];

export const STORAGE = {
  bookmarks:      "iconforge.bookmarks.v3",
  collections:    "iconforge.collections.v3",
  theme:          "iconforge.theme.v3",
  variety:        "iconforge.variety.v3",
  recent:         "iconforge.recent.v3",
  paletteRecent:  "iconforge.palette-recent.v3",
};

export const UI = {
  defaultVariety: "solid",
  defaultTheme: "dark",
  maxRecent: 12,
  paletteMaxIcons: 8,
  paletteMaxPerGroup: 5,
  pageSize: 120,
  maxInlineChips: 10,
};

export const SWATCHES = [
  { label: "Inherit color", value: "currentColor", cls: "swatch--inherit" },
  { label: "White",   value: "#ffffff" },
  { label: "Slate",   value: "#94a3b8" },
  { label: "Indigo",  value: "#818cf8" },
  { label: "Sky",     value: "#38bdf8" },
  { label: "Cyan",    value: "#22d3ee" },
  { label: "Emerald", value: "#34d399" },
  { label: "Lime",    value: "#a3e635" },
  { label: "Amber",   value: "#fbbf24" },
  { label: "Orange",  value: "#fb923c" },
  { label: "Rose",    value: "#fb7185" },
  { label: "Fuchsia", value: "#e879f9" },
];

export const GLYPHS = {
  copy:  '<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>',
  code:  '<path d="m8.5 8.5-4 3.5 4 3.5"/><path d="m15.5 8.5 4 3.5-4 3.5"/><path d="m13.5 5-3 14"/>',
  db:    '<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6"/><path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6"/>',
  down:  '<path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
  file:  '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z"/><path d="M14 3v5h5"/>',
  ext:   '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4"/>',
};

export const ACTIONS = [
  { id: "copy-svg", label: "Copy SVG",      glyph: "copy", primary: true },
  { id: "copy-jsx", label: "Copy JSX",      glyph: "code" },
  { id: "copy-uri", label: "Copy URI",      glyph: "db" },
  { id: "dl-txt",   label: "Download .txt", glyph: "down" },
  { id: "dl-svg",   label: "Download .svg", glyph: "file" },
  { id: "source",   label: "Source",        glyph: "ext" },
];

export const PALETTE_COMMANDS = [
  { id: "go-home",        label: "Go to Home",              subtitle: "Icon grid",                     icon: "house",              keywords: ["home","start","index"],                 path: "/" },
  { id: "go-categories",  label: "Browse Categories",       subtitle: "Arrows, coding, layout…",       icon: "shapes",             keywords: ["categories","topics","browse"],          path: "/categories" },
  { id: "go-varieties",   label: "Browse Varieties",        subtitle: "Solid, Light, Sharp…",          icon: "layer-group",        keywords: ["varieties","styles","solid","sharp"],    path: "/varieties" },
  { id: "go-bookmarks",   label: "Open Bookmarks",          subtitle: "Your starred icons",            icon: "bookmark",           keywords: ["bookmarks","saved","favorites"],         path: "/bookmarks" },
  { id: "go-collections", label: "Open Collections",        subtitle: "Named groups of icons",         icon: "folder",             keywords: ["collections","sets","groups"],           path: "/collections" },
  { id: "toggle-theme",   label: "Toggle Theme",            subtitle: "Switch light / dark",           icon: "moon",               keywords: ["theme","dark","light"],                  action: "toggle-theme" },
  { id: "clear-recent",   label: "Clear Recently Viewed",   subtitle: "Forget the last dozen icons",   icon: "clock-rotate-left",  keywords: ["recent","clear","history"],              action: "clear-recent" },
];

export const FALLBACK_SYMBOLS = {
  house:  "M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  heart:  "M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z",
  star:   "m12 3 2.6 6.4 6.9.5-5.2 4.5 1.7 6.7L12 17.6 6 21l1.7-6.7-5.2-4.5 6.9-.5z",
  bolt:   "M13 2 4 14h6l-1 8 9-12h-6z",
  bell:   "M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5zM10 20a2 2 0 0 0 4 0",
  user:   "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 4-6 8-6s8 2 8 6",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm5 12 5 5",
  code:   "m8 8-5 4 5 4M16 8l5 4-5 4M14 4l-4 16",
  folder: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  github: "M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-2c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.6.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z",
};