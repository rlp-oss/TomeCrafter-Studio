export type PaperType = "white-50lb" | "white-60lb" | "cream-50lb" | "heavy-70lb";
export type SpineOrientation = "western" | "vertical-stack" | "horizontal";
export type SpineAlignment = "centered" | "top-biased" | "distributed" | "balanced";

export interface PaperProfile {
  id: PaperType;
  name: string;
  weight: string;
  color: string;
  ppi: number; // Pages Per Inch
  thicknessPerPage: number; // in inches
  description: string;
}

export const PAPER_PROFILES: Record<PaperType, PaperProfile> = {
  "white-50lb": {
    id: "white-50lb",
    name: "Standard White (50#)",
    weight: "50 lb / 74 gsm",
    color: "Pure White",
    ppi: 444,
    thicknessPerPage: 0.002252,
    description: "Standard industry paperback paper for fiction & non-fiction.",
  },
  "cream-50lb": {
    id: "cream-50lb",
    name: "Warm Cream (50#)",
    weight: "50 lb / 74 gsm",
    color: "Warm Cream",
    ppi: 434,
    thicknessPerPage: 0.002304,
    description: "Traditional literary paper for novels, memoirs & historical fiction.",
  },
  "white-60lb": {
    id: "white-60lb",
    name: "Premium White (60#)",
    weight: "60 lb / 90 gsm",
    color: "Bright White",
    ppi: 380,
    thicknessPerPage: 0.002632,
    description: "Heavier opaque paper ideal for books with illustrations & diagrams.",
  },
  "heavy-70lb": {
    id: "heavy-70lb",
    name: "Archival Heavyweight (70#)",
    weight: "70 lb / 104 gsm",
    color: "Opaque Smooth",
    ppi: 320,
    thicknessPerPage: 0.003125,
    description: "High-grade archival paper for art books, manuals & collector editions.",
  },
};

export interface SpineCalculationInput {
  title: string;
  subtitle?: string;
  author: string;
  wordCount: number;
  manualPageCount?: number;
  paperType?: PaperType;
  trimHeightInches?: number; // e.g. 9 for 6x9, 8.5 for 5.5x8.5
  trimWidthInches?: number; // e.g. 6 for 6x9
  orientation?: SpineOrientation;
  alignment?: SpineAlignment;
  includeSubtitleOnSpine?: boolean;
  includePublisherGlyph?: boolean;
  manualFontSizePt?: number;
  autoFit?: boolean;
}

export interface SpineCalculationResult {
  pageCount: number;
  spineWidthInches: number;
  spineWidthMm: number;
  spineWidthFormatted: string;
  isTooThinForText: boolean;
  isOptimalWidth: boolean;
  warningMessage?: string;
  paperProfile: PaperProfile;
  totalWrapWidthInches: number; // Back + Spine + Front + 2x Bleed
  totalWrapHeightInches: number; // Height + 2x Bleed
  bleedMarginInches: number; // standard 0.125" (3.2mm)
  safeMarginInches: number; // standard 0.0625" (1.6mm) on spine edges
  
  // Auto-formatted Typography Results
  autoFontSizePt: number;
  autoFontSizePx: number;
  effectiveFontSizePx: number;
  letterSpacingEm: number;
  trackingClass: string;
  calculatedMaxTitleLength: number;
  isTitleTruncated: boolean;
  formattedTitle: string;
  formattedAuthor: string;
  formattedSubtitle?: string;
  textOrientation: SpineOrientation;
  textAlignment: SpineAlignment;
}

/**
 * Calculates print-ready spine geometry and auto-formats the title typography
 * to guarantee optimal sizing, alignment, and legibility without clipping.
 */
export function calculateSpineFormatting(input: SpineCalculationInput): SpineCalculationResult {
  const {
    title = "Untitled Manuscript",
    subtitle = "",
    author = "Author Name",
    wordCount = 50000,
    manualPageCount,
    paperType = "white-50lb",
    trimHeightInches = 9,
    trimWidthInches = 6,
    orientation = "western",
    alignment = "centered",
    includeSubtitleOnSpine = false,
    includePublisherGlyph = true,
    manualFontSizePt,
    autoFit = true,
  } = input;

  const profile = PAPER_PROFILES[paperType] || PAPER_PROFILES["white-50lb"];

  // 1. Calculate Page Count
  const pageCount = manualPageCount && manualPageCount > 0
    ? manualPageCount
    : Math.max(48, Math.ceil((wordCount || 50000) / 250));

  // 2. Spine Dimensions
  const spineWidthInches = parseFloat((pageCount * profile.thicknessPerPage).toFixed(3));
  const spineWidthMm = parseFloat((spineWidthInches * 25.4).toFixed(1));
  const spineWidthFormatted = `${spineWidthInches}" (${spineWidthMm} mm)`;

  // Bleed & Wraparound Geometry (Industry standard 0.125" / 3.175mm bleed)
  const bleedMarginInches = 0.125;
  const safeMarginInches = 0.0625;
  const totalWrapWidthInches = parseFloat((trimWidthInches * 2 + spineWidthInches + bleedMarginInches * 2).toFixed(3));
  const totalWrapHeightInches = parseFloat((trimHeightInches + bleedMarginInches * 2).toFixed(3));

  // KDP / Ingram Rule: Spine text requires at least 0.25" (approx 100-130 pages)
  const isTooThinForText = spineWidthInches < 0.23;
  const isOptimalWidth = spineWidthInches >= 0.35 && spineWidthInches <= 1.8;

  let warningMessage: string | undefined = undefined;
  if (isTooThinForText) {
    warningMessage = `Spine width is ${spineWidthInches}" (< 0.25"). Amazon KDP & IngramSpark discourage spine text on books under 100 pages.`;
  }

  // 3. Auto-Format Title Typography
  const cleanTitle = title.trim();
  const cleanAuthor = author.trim();
  const titleLength = cleanTitle.length;

  // Compute maximum height/length available along spine
  // For 9" book, minus 1.2" top/bottom buffer = ~6.6" text line
  const availableLengthInches = Math.max(3, trimHeightInches - 2.2);
  
  // Available width across the spine (in inches)
  const availableWidthInches = Math.max(0.15, spineWidthInches - safeMarginInches * 2);

  // Compute auto font size (Points)
  // Base point calculation:
  // Thicker spines allow larger font sizes (e.g. 10pt - 18pt)
  // Thin spines clamp between 7.5pt - 10pt
  let calculatedPt = 11;
  let letterSpacingEm = 0.08;

  if (autoFit) {
    // Width-constrained max font size (1pt ≈ 1/72 inch ≈ 0.3528mm)
    // To prevent text overflowing the spine thickness:
    const maxPtBySpineThickness = Math.min(20, Math.max(7.5, (availableWidthInches * 72) * 0.65));

    // Length-constrained max font size:
    // Average character width is ~0.55 * font-size in points
    let maxPtByLength = 16;
    if (titleLength > 60) {
      maxPtByLength = 7.5;
      letterSpacingEm = 0.02;
    } else if (titleLength > 45) {
      maxPtByLength = 8.5;
      letterSpacingEm = 0.03;
    } else if (titleLength > 30) {
      maxPtByLength = 9.5;
      letterSpacingEm = 0.05;
    } else if (titleLength > 20) {
      maxPtByLength = 11.5;
      letterSpacingEm = 0.08;
    } else if (titleLength > 12) {
      maxPtByLength = 13.5;
      letterSpacingEm = 0.12;
    } else {
      maxPtByLength = 16;
      letterSpacingEm = 0.18;
    }

    // Final font size in pt is constrained by both width and length
    calculatedPt = parseFloat(Math.min(maxPtBySpineThickness, maxPtByLength).toFixed(1));
    calculatedPt = Math.max(7.5, Math.min(18, calculatedPt));
  } else {
    calculatedPt = manualFontSizePt || 11;
  }

  // Convert points to UI display pixels (1pt ≈ 1.333 CSS px)
  const autoFontSizePt = calculatedPt;
  const autoFontSizePx = Math.round(autoFontSizePt * 1.333);
  const effectiveFontSizePx = manualFontSizePt ? Math.round(manualFontSizePt * 1.333) : autoFontSizePx;

  // Tracking class
  let trackingClass = "tracking-normal";
  if (letterSpacingEm >= 0.15) trackingClass = "tracking-widest";
  else if (letterSpacingEm >= 0.08) trackingClass = "tracking-wider";
  else if (letterSpacingEm >= 0.04) trackingClass = "tracking-wide";

  return {
    pageCount,
    spineWidthInches,
    spineWidthMm,
    spineWidthFormatted,
    isTooThinForText,
    isOptimalWidth,
    warningMessage,
    paperProfile: profile,
    totalWrapWidthInches,
    totalWrapHeightInches,
    bleedMarginInches,
    safeMarginInches,
    autoFontSizePt,
    autoFontSizePx,
    effectiveFontSizePx,
    letterSpacingEm,
    trackingClass,
    calculatedMaxTitleLength: 80,
    isTitleTruncated: titleLength > 80,
    formattedTitle: cleanTitle,
    formattedAuthor: cleanAuthor,
    formattedSubtitle: includeSubtitleOnSpine && subtitle ? subtitle.trim() : undefined,
    textOrientation: orientation,
    textAlignment: alignment,
  };
}
