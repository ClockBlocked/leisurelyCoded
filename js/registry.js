/* ============================================================
   registry.js — component metadata only.
   Actual component code lives in /components/{category}/{id}.html
   ============================================================ */

/* ------------------------------------------------------------------
   The base URL for every component file. Change this one line and
   every entry below updates. Use a relative path like '/components/'
   if you want local testing to work without hitting GitHub Pages.
   ------------------------------------------------------------------ */
window.UI_COMPONENT_BASE_URL = "https://clockblocked.github.io/leisurelyCoded/components/";

const BASE = window.UI_COMPONENT_BASE_URL;
const c = (folder, id) => `${BASE}${folder}/${id}.html`;

window.UI_REGISTRY = [
  /* ================= BUTTONS ================= */
  {
    id: "primary-button",
    name: "Primary Button",
    category: "Buttons",
    tier: "free",
    description: "High-emphasis action button with spring-eased hover lift and glow.",
    path: c("buttons", "primary-button"),
  },

  {
    id: "button-variants",
    name: "Button Variants",
    category: "Buttons",
    tier: "free",
    description: "Solid, outline, ghost, soft, danger, success, and link styles.",
    path: c("buttons", "button-variants"),
  },

  {
    id: "button-sizes",
    name: "Button Sizes",
    category: "Buttons",
    tier: "free",
    description: "Small, default, and large scales that all share the same tokens.",
    path: c("buttons", "button-sizes"),
  },

  {
    id: "button-group",
    name: "Button Group",
    category: "Buttons",
    tier: "free",
    description: "Segmented controls with merged radii and active state.",
    path: c("buttons", "button-group"),
  },

  {
    id: "button-loading",
    name: "Loading Button",
    category: "Buttons",
    tier: "pro",
    description: "In-button spinner that preserves width and colors on submit.",
    path: c("buttons", "button-loading"),
  },

  {
    id: "split-button",
    name: "Split Button",
    category: "Buttons",
    tier: "pro",
    description: "Primary action with an attached caret for secondary options.",
    path: c("buttons", "split-button"),
  },

  {
    id: "fab",
    name: "Floating Action Button",
    category: "Buttons",
    tier: "pro",
    description: "Circular CTA that rotates and scales on hover.",
    path: c("buttons", "fab"),
  },

  /* ================= FORMS ================= */
  {
    id: "text-input",
    name: "Text Input",
    category: "Forms",
    tier: "free",
    description: "Labeled input with focus ring and helper text.",
    path: c("forms", "text-input"),
  },

  {
    id: "textarea",
    name: "Textarea",
    category: "Forms",
    tier: "free",
    description: "Resizable multi-line field with matching focus styles.",
    path: c("forms", "textarea"),
  },

  {
    id: "select",
    name: "Select",
    category: "Forms",
    tier: "free",
    description: "Native select with a custom chevron drawn in CSS.",
    path: c("forms", "select"),
  },

  {
    id: "checkbox",
    name: "Checkbox",
    category: "Forms",
    tier: "free",
    description: "Accessible checkbox with animated checkmark pop.",
    path: c("forms", "checkbox"),
  },

  {
    id: "radio",
    name: "Radio Group",
    category: "Forms",
    tier: "free",
    description: "Radio buttons with an animated inner dot.",
    path: c("forms", "radio"),
  },

  {
    id: "switch",
    name: "Toggle Switch",
    category: "Forms",
    tier: "free",
    description: "Pill switch with a spring-driven thumb.",
    path: c("forms", "switch"),
  },

  {
    id: "floating-label",
    name: "Floating Label Input",
    category: "Forms",
    tier: "pro",
    description: "Label shrinks and moves up when the field has content.",
    path: c("forms", "floating-label"),
  },

  {
    id: "input-icon",
    name: "Input with Icon",
    category: "Forms",
    tier: "pro",
    description: "Leading icon plus an optional trailing action button.",
    path: c("forms", "input-icon"),
  },

  {
    id: "otp-input",
    name: "OTP Input",
    category: "Forms",
    tier: "pro",
    description: "One-time-code boxes that auto-advance and support paste.",
    path: c("forms", "otp-input"),
  },

  {
    id: "tag-input",
    name: "Tag Input",
    category: "Forms",
    tier: "pro",
    description: "Type and press Enter to add removable chips.",
    path: c("forms", "tag-input"),
  },

  {
    id: "file-drop",
    name: "File Drop",
    category: "Forms",
    tier: "pro",
    description: "Click or drag files in; shows a live file list.",
    path: c("forms", "file-drop"),
  },

  {
    id: "range-slider",
    name: "Range Slider",
    category: "Forms",
    tier: "pro",
    description: "Native range input restyled with a live readout.",
    path: c("forms", "range-slider"),
  },

  {
    id: "validation-states",
    name: "Validation States",
    category: "Forms",
    tier: "pro",
    description: "Error, success, and helper text patterns in one block.",
    path: c("forms", "validation-states"),
  },

  {
    id: "color-picker",
    name: "Color Picker",
    category: "Forms",
    tier: "pro",
    description: "Swatch grid with a selected ring.",
    path: c("forms", "color-picker"),
  },

  {
    id: "rating",
    name: "Star Rating",
    category: "Forms",
    tier: "pro",
    description: "Click-to-set stars with hover preview.",
    path: c("forms", "rating"),
  },

  /* ================= DATA ================= */
  {
    id: "badge",
    name: "Badges",
    category: "Data",
    tier: "free",
    description: "Status pills in every semantic color.",
    path: c("data", "badge"),
  },

  {
    id: "chip",
    name: "Filter Chips",
    category: "Data",
    tier: "free",
    description: "Clickable filter chips with an active state.",
    path: c("data", "chip"),
  },

  {
    id: "avatar",
    name: "Avatars",
    category: "Data",
    tier: "free",
    description: "Sizes plus square variant with initials fallback.",
    path: c("data", "avatar"),
  },

  {
    id: "avatar-group",
    name: "Avatar Group",
    category: "Data",
    tier: "pro",
    description: "Stacked avatars with overlap and hover lift.",
    path: c("data", "avatar-group"),
  },

  {
    id: "avatar-status",
    name: "Avatar with Status",
    category: "Data",
    tier: "pro",
    description: "Presence dots for online, away, busy, and offline.",
    path: c("data", "avatar-status"),
  },

  {
    id: "card",
    name: "Card",
    category: "Data",
    tier: "free",
    description: "Header, body, and footer with a hover lift.",
    path: c("data", "card"),
  },

  {
    id: "stat-card",
    name: "Stat Cards",
    category: "Data",
    tier: "free",
    description: "KPI tiles with delta indicators.",
    path: c("data", "stat-card"),
  },

  {
    id: "data-table",
    name: "Sortable Data Table",
    category: "Data",
    tier: "pro",
    description: "Click any header to sort the rows.",
    path: c("data", "data-table"),
  },

  {
    id: "timeline",
    name: "Timeline",
    category: "Data",
    tier: "free",
    description: "Vertical event log with done and idle states.",
    path: c("data", "timeline"),
  },

  {
    id: "file-tree",
    name: "File Tree",
    category: "Data",
    tier: "pro",
    description: "Collapsible folders with an active file state.",
    path: c("data", "file-tree"),
  },

  {
    id: "calendar",
    name: "Calendar",
    category: "Data",
    tier: "pro",
    description: "Month grid with today, selected, and event dots.",
    path: c("data", "calendar"),
  },

  {
    id: "kanban",
    name: "Kanban Board",
    category: "Data",
    tier: "pro",
    description: "Drag cards between columns. Fully HTML5 drag and drop.",
    path: c("data", "kanban"),
  },

  /* ================= NAVIGATION ================= */
  {
    id: "breadcrumb",
    name: "Breadcrumb",
    category: "Navigation",
    tier: "free",
    description: "Path navigation with chevron separators.",
    path: c("navigation", "breadcrumb"),
  },

  {
    id: "pagination",
    name: "Pagination",
    category: "Navigation",
    tier: "free",
    description: "Page numbers with prev/next and an ellipsis.",
    path: c("navigation", "pagination"),
  },

  {
    id: "tabs",
    name: "Pill Tabs",
    category: "Navigation",
    tier: "free",
    description: "Segmented tab switcher with animated active pill.",
    path: c("navigation", "tabs"),
  },

  {
    id: "tabs-underline",
    name: "Underline Tabs",
    category: "Navigation",
    tier: "pro",
    description: "Minimal tabs with a sliding underline.",
    path: c("navigation", "tabs-underline"),
  },

  {
    id: "vertical-tabs",
    name: "Vertical Tabs",
    category: "Navigation",
    tier: "pro",
    description: "Side navigation paired with a content pane.",
    path: c("navigation", "vertical-tabs"),
  },

  {
    id: "steps",
    name: "Step Indicator",
    category: "Navigation",
    tier: "pro",
    description: "Horizontal progress through a multi-step flow.",
    path: c("navigation", "steps"),
  },

  {
    id: "accordion",
    name: "Accordion",
    category: "Navigation",
    tier: "pro",
    description: "Expandable sections with a rotating chevron.",
    path: c("navigation", "accordion"),
  },

  /* ================= FEEDBACK ================= */
  {
    id: "alert",
    name: "Alerts",
    category: "Feedback",
    tier: "free",
    description: "Inline messages for info, success, warning, and danger.",
    path: c("feedback", "alert"),
  },

  {
    id: "toast",
    name: "Toasts",
    category: "Feedback",
    tier: "pro",
    description: "Stacked notifications with auto-dismiss and progress bars.",
    path: c("feedback", "toast"),
  },

  {
    id: "progress",
    name: "Progress Bars",
    category: "Feedback",
    tier: "free",
    description: "Determinate bars with a striped animated variant.",
    path: c("feedback", "progress"),
  },

  {
    id: "skeleton",
    name: "Skeleton Loaders",
    category: "Feedback",
    tier: "free",
    description: "Shimmer placeholders that match final content shape.",
    path: c("feedback", "skeleton"),
  },

  {
    id: "empty-state",
    name: "Empty State",
    category: "Feedback",
    tier: "pro",
    description: "Illustration, copy, and CTA for zero-data screens.",
    path: c("feedback", "empty-state"),
  },

  /* ================= OVERLAYS ================= */
  {
    id: "modal",
    name: "Modal Dialog",
    category: "Overlays",
    tier: "pro",
    description: "Centered dialog with backdrop blur and ESC to close.",
    path: c("overlays", "modal"),
  },

  {
    id: "drawer",
    name: "Side Drawer",
    category: "Overlays",
    tier: "pro",
    description: "Slide-in panel from the right edge.",
    path: c("overlays", "drawer"),
  },

  {
    id: "dropdown",
    name: "Dropdown Menu",
    category: "Overlays",
    tier: "pro",
    description: "Anchored menu that closes on outside click.",
    path: c("overlays", "dropdown"),
  },

  {
    id: "context-menu",
    name: "Context Menu",
    category: "Overlays",
    tier: "pro",
    description: "Right-click anywhere in the zone to open a menu at the cursor.",
    path: c("overlays", "context-menu"),
  },

  {
    id: "popover",
    name: "Popover",
    category: "Overlays",
    tier: "pro",
    description: "Rich panel anchored to a trigger button.",
    path: c("overlays", "popover"),
  },

  {
    id: "tooltip",
    name: "Tooltip",
    category: "Overlays",
    tier: "free",
    description: "Pure-CSS tooltips on hover and focus.",
    path: c("overlays", "tooltip"),
  },

  {
    id: "command-palette",
    name: "Command Palette",
    category: "Overlays",
    tier: "pro",
    description: "Searchable command list with keyboard navigation.",
    path: c("overlays", "command-palette"),
  },

  {
    id: "notifications",
    name: "Notification List",
    category: "Overlays",
    tier: "pro",
    description: "Read and unread items with dismiss buttons.",
    path: c("overlays", "notifications"),
  },

  /* ================= LAYOUT ================= */
  {
    id: "chat",
    name: "Chat Interface",
    category: "Layout",
    tier: "pro",
    description: "Message bubbles, avatars, typing indicator, and send.",
    path: c("layout", "chat"),
  },

  {
    id: "pricing",
    name: "Pricing Cards",
    category: "Layout",
    tier: "pro",
    description: "Three tiers with a highlighted featured plan.",
    path: c("layout", "pricing"),
  },

  {
    id: "testimonial",
    name: "Testimonial",
    category: "Layout",
    tier: "pro",
    description: "Quote card with stars, avatar, and attribution.",
    path: c("layout", "testimonial"),
  },

  {
    id: "multi-step-form",
    name: "Multi-Step Form",
    category: "Layout",
    tier: "pro",
    description: "Wizard with step indicator and next/back navigation.",
    path: c("layout", "multi-step-form"),
  },

  {
    id: "search-results",
    name: "Search with Results",
    category: "Layout",
    tier: "pro",
    description: "Live filtering across a result list.",
    path: c("layout", "search-results"),
  },

  {
    id: "sortable-list",
    name: "Sortable List",
    category: "Layout",
    tier: "pro",
    description: "Drag rows to reorder them.",
    path: c("layout", "sortable-list"),
  },

  {
    id: "copy-field",
    name: "Copy Field",
    category: "Layout",
    tier: "pro",
    description: "Read-only input with an inline copy button and feedback.",
    path: c("layout", "copy-field"),
  },

  {
    id: "theme-switcher",
    name: "Theme Switcher",
    category: "Layout",
    tier: "pro",
    description: "Light / dark / system segmented control that flips data-theme.",
    path: c("layout", "theme-switcher"),
  },
];

/* ------------------------------------------------------------------
   Fast lookup by id.
   ------------------------------------------------------------------ */
window.UI_REGISTRY_BY_ID = Object.fromEntries(window.UI_REGISTRY.map((item) => [item.id, item]));
