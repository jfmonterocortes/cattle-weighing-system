// ── Page geometry ─────────────────────────────────────────────────────────────

const M      = 40;               // content margin (pts)
const PAGE_W = 595.28;           // A4 width
const PAGE_H = 841.89;           // A4 height
const CW     = PAGE_W - M * 2;  // usable content width = 515.28 pts

// ── Spacing scale (pts) ───────────────────────────────────────────────────────

const SP = {
  1:  4,   // micro  — inner cell padding, tight gaps
  2:  8,   // small  — between label and value
  3: 12,   // base   — section breathing room
  4: 16,   // medium — between major sections
  5: 24,   // large  — generous section gap
  6: 32,   // xlarge — page-level white space
};

// ── Typography scale (pts) ────────────────────────────────────────────────────

const FS = {
  xxs:  6.5,  // meta labels, footer, section eyebrows
  xs:   7.5,  // secondary text, unit labels
  sm:   9,    // table body, value text in small cells
  base: 10,   // standard body copy
  md:   11,   // emphasis in metadata cells
  lg:   14,   // hero metric values
  xl:   18,   // planilla number in header
};

// ── Table geometry ────────────────────────────────────────────────────────────

const ROW_H     = 18;  // body row height
const HDR_ROW_H = 22;  // column header row height

// ── Brand palette ─────────────────────────────────────────────────────────────

const BRAND       = '#192e1c';  // deep forest green — masthead strip, table header
const BRAND_MID   = '#2d5a35';  // medium green — accents, left bars, separators
const BRAND_RULE  = '#3d7046';  // in-header separator lines
const BRAND_LIGHT = '#eaf1eb';  // very light green — cell backgrounds, tints

// ── Semantic colours ──────────────────────────────────────────────────────────

const GOLD        = '#b07d00';  // paid / positive — text/icon
const GOLD_STROKE = '#c9960a';  // paid — pill border
const GOLD_BG     = '#fdf8e6';  // paid — pill / highlight background

const RED         = '#8b1c1c';  // unpaid / alert — text/icon
const RED_STROKE  = '#c0392b';  // unpaid — pill border
const RED_BG      = '#fef2f2';  // unpaid — pill / highlight background

// ── Neutral surface palette ───────────────────────────────────────────────────

const SURFACE       = '#f7f9f7';  // alternating table row tint
const BORDER        = '#dde5de';  // standard hairline borders
const BORDER_STRONG = '#b4c2b5';  // heavier separators, rules

// ── Ink palette ───────────────────────────────────────────────────────────────

const INK       = '#0f1a10';  // near-black primary text
const INK_MID   = '#435044';  // medium contrast secondary text
const INK_MUTED = '#7c8e7d';  // muted labels, footers
const WHITE     = '#ffffff';

// ── Table column definitions ──────────────────────────────────────────────────
// x values are absolute page coordinates (left margin M is included).
// Total: 30 + 185 + 80 + 80 + 140.28 = 515.28 = CW ✓
//
// Redistribution rationale:
//   Especificacion trimmed from 220→185: longest spec "BUFALO HEMBRA" ≈ 72 pt at 9 pt.
//   Kilos/No.Res widened from 75→80: extra room for formatted weights + tag strings.
//   Letras widened from 115.28→140.28: letter codes can be multi-character.

const COLS = [
  { x: M,           w: 30,     label: '#',              align: 'right' },
  { x: M + 30,      w: 185,    label: 'Especificacion', align: 'left'  },
  { x: M + 215,     w: 80,     label: 'Kilos',          align: 'right' },
  { x: M + 295,     w: 80,     label: 'No. Res',        align: 'right' },
  { x: M + 375,     w: 140.28, label: 'Letras',         align: 'left'  },
];

module.exports = {
  M, PAGE_W, PAGE_H, CW, SP, FS,
  ROW_H, HDR_ROW_H,
  BRAND, BRAND_MID, BRAND_RULE, BRAND_LIGHT,
  GOLD, GOLD_STROKE, GOLD_BG,
  RED, RED_STROKE, RED_BG,
  SURFACE, BORDER, BORDER_STRONG,
  INK, INK_MID, INK_MUTED, WHITE,
  COLS,
};
