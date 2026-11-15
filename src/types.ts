export type Genre =
  | "Epic Fantasy"
  | "Sci-Fi & Cyberpunk"
  | "Mystery & Thriller"
  | "Historical Fiction"
  | "Romance & Drama"
  | "Horror & Gothic"
  | "Non-Fiction & Self-Help"
  | "Young Adult"
  | "Poetry & Anthology"
  | "Children's Illustrated";

export interface DiagramComparisonRow {
  category: string;
  currentSystem: string;
  humanSystem: string;
  impact: string;
}

export interface DiagramFlowStep {
  step: number;
  title: string;
  desc: string;
}

export interface DiagramStructurePayload {
  title: string;
  subtitle: string;
  diagramType: "workflow_comparison" | "process_flowchart" | "comparison_matrix" | "system_architecture" | "infographic_table";
  summary: string;
  comparisonData: {
    leftColumnTitle: string;
    rightColumnTitle: string;
    rows: DiagramComparisonRow[];
  };
  flowchartSteps: {
    currentFlow: DiagramFlowStep[];
    humanFlow: DiagramFlowStep[];
  };
  keyTakeaways: string[];
  markdownTable: string;
}

export interface ChapterIllustration {
  id: string;
  title: string;
  prompt: string;
  enhancedPrompt?: string;
  style: string;
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  imageUrl: string;
  caption?: string;
  placement: "header" | "inline" | "fullpage" | "tail";
  diagramData?: DiagramStructurePayload;
  plateType?: "illustration" | "workflow_chart" | "comparison_table" | "infographic";
  sourceType?: "ai_generated" | "uploaded_file" | "external_url" | "diagram_plate";
  fileName?: string;
  fileSizeBytes?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

export type FootnoteType =
  | "real_world_fact"
  | "academic_source"
  | "in_universe_lore"
  | "historical_reference"
  | "scientific_data";

export type FootnoteVerificationStatus =
  | "verified_real_publication"
  | "in_universe_lore"
  | "author_attribution_alert"
  | "hallucination_warning"
  | "unverified";

export interface RealSourceAlternative {
  title: string;
  author?: string;
  sourceName?: string;
  url?: string;
  snippet?: string;
}

export interface FootnoteReference {
  id: string;
  number: number;
  marker: string; // e.g. "[^1]"
  title: string;
  authorOrCreator?: string; // Cited author or originator
  sourceUrl?: string;
  sourceName?: string;
  publicationYear?: string;
  description: string;
  footnoteType?: FootnoteType;
  verificationStatus?: FootnoteVerificationStatus;
  verifiedWithGoogle?: boolean;
  searchQuery?: string;
  chapterNumber?: number;
  snippet?: string;
  verificationNotes?: string;
  isAttributedToCurrentUser?: boolean;
  userPublishedConfirmation?: boolean; // Has the author confirmed they actually published this?
  realSourceAlternatives?: RealSourceAlternative[];
}

export interface SingleFootnoteAuditResult {
  footnoteId: string;
  originalTitle: string;
  citedAuthor?: string;
  status: FootnoteVerificationStatus;
  confidenceScore: number;
  explanation: string;
  isAttributedToCurrentUser: boolean;
  suggestedFix: string;
  verifiedRealAuthor?: string;
  verifiedSourceUrl?: string;
  verifiedSourceName?: string;
  realSourceAlternatives?: RealSourceAlternative[];
}

export interface FootnoteAuditResult {
  totalAudited: number;
  verifiedCount: number;
  inUniverseCount: number;
  falseAttributionCount: number;
  hallucinationCount: number;
  unverifiedCount: number;
  verdictSummary: string;
  authorAttributionAlertsCount: number;
  detailedResults: SingleFootnoteAuditResult[];
}

export interface Chapter {
  id: string;
  number: number;
  act: string;
  title: string;
  summary: string;
  goal: string;
  conflict: string;
  cliffhanger: string;
  pov: string;
  setting: string;
  targetWords: number;
  wordCount: number;
  content: string;
  status: "draft" | "review" | "polished" | "final";
  illustrations: ChapterIllustration[];
  notes?: string;
  footnotes?: FootnoteReference[];
}

export interface IdeaOutlineAct {
  id: string;
  actName: string;
  summary: string;
  chapters: {
    id: string;
    number: number;
    title: string;
    summary: string;
    goal: string;
    conflict: string;
    cliffhanger: string;
    pov: string;
    setting: string;
    targetWords: number;
    footnotes?: FootnoteReference[];
  }[];
}

export interface IdeaOutline {
  logline: string;
  expandedPremise: string;
  thematicQuestion: string;
  coreConflict: string;
  targetAudience: string;
  acts: IdeaOutlineAct[];
  globalFootnotes: FootnoteReference[];
  googleSearchSources?: {
    title: string;
    uri: string;
    snippet?: string;
  }[];
  searchQueriesUsed?: string[];
  verifiedClaimsCount?: number;
}

export interface FactVerificationResult {
  claim: string;
  verdict: "Verified" | "Partially Accurate" | "Fictionalized" | "Unverified";
  confidenceScore: number;
  explanation: string;
  suggestedCorrection?: string;
  historicalContext?: string;
  sources: {
    title: string;
    uri: string;
  }[];
  suggestedFootnote?: FootnoteReference;
}

export interface LoreEntry {
  id: string;
  name: string;
  category: "Character" | "Location" | "Magic/Tech" | "Faction" | "Artifact" | "Timeline" | "Custom";
  tagline: string;
  description: string;
  secretsOrFlaws?: string;
  sensoryDetails?: {
    sight?: string;
    sound?: string;
    scent?: string;
  };
  relatedEntities?: string[];
  plotHooks?: string[];
  avatarUrl?: string;
}

export interface SalesBlurb {
  hook: string;
  body: string;
  callToAction: string;
}

export interface PrintSpecs {
  recommendedTrimSize: string;
  estimatedPageCount: number;
  spineWidthInches: number;
  margins: {
    insideGutter: string;
    outside: string;
    top: string;
    bottom: string;
  };
}

export interface PublishingKit {
  commercialTitle?: string;
  catchySubtitle?: string;
  salesBlurb: SalesBlurb;
  amazonKeywords: string[];
  bisacCategories: string[];
  compTitles?: string[];
  targetAudience: string;
  pricingRecommendations?: {
    ebook: number;
    paperback: number;
    hardcover: number;
  };
  marketingHook?: string;
  launchStrategy?: string;
  queryLetter?: string;
  printSpecs?: PrintSpecs;
  isbn?: string;
  copyrightYear?: string;
  publisherImprint?: string;
}

export interface FormattingSettings {
  trimSize: "6x9" | "5.5x8.5" | "8x10" | "pocket";
  fontPreset: "garamond" | "baskerville" | "caslon" | "merriweather" | "cinzel" | "courier" | "inter" | "custom";
  googleFontFamily?: string;
  fontColor?: string;
  fontSize: "10pt" | "11pt" | "12pt" | "13pt" | string;
  fontSizePx?: number;
  lineSpacing: "1.4" | "1.5" | "1.6" | "1.8" | string;
  lineHeightValue?: number;
  letterSpacingEm?: number;
  paragraphIndentEm?: number;
  paragraphSpacingEm?: number;
  textAlign?: "left" | "justify" | "center" | "right";
  chapterHeadingCase?: "title" | "small-caps" | "uppercase" | "roman";
  chapterWordBudget?: number;
  dropCaps: boolean;
  dropCapSize?: number;
  sceneBreakSymbol: "* * *" | "✦ ✦ ✦" | "❦" | "— ♦ —" | "···" | string;
  showPageNumbers: boolean;
  runningHeaders: boolean;
  includeFrontMatter: boolean;
  includeBackMatter: boolean;
  dedicationText: string;
  copyrightText: string;
  authorBio: string;
  newsletterLink: string;
  acknowledgments: string;
}

export type PublisherPlatform =
  | "amazon_kdp"
  | "ingram_spark"
  | "barnes_noble"
  | "apple_books"
  | "kobo"
  | "draft2digital"
  | "lulu_blurb"
  | "universal_pdf";

export interface PublisherExportConfig {
  id: PublisherPlatform;
  name: string;
  company: string;
  tagline: string;
  targetFormat: "Paperback & eBook (KDP)" | "Hardcover & POD (Ingram)" | "NOOK & Hardcover (B&N)" | "ePub & Digital (Apple)" | "ePub3 & Audio (Kobo)" | "Multi-Distributor (D2D)" | "Global Print & Spiral (Lulu)" | "All-in-One Standalone PDF";
  colorSpace: "RGB (Digital) / CMYK Profile (Print)" | "CMYK SWOP (Ingram 300DPI)" | "RGB Standard" | "PDF/X-1a:2001";
  interiorFileExtension: ".pdf" | ".epub" | ".docx";
  coverRequirement: "Full Wrap Spread (Back + Spine + Front)" | "Front Cover 300DPI" | "Front Cover + Separate Spine";
  guidelinesUrl: string;
  recommendedTrim: string;
}

export interface TaggedAuthorRoyalty {
  id: string;
  name: string;
  role: "Influenced By" | "Co-Author" | "Sampled Text" | "Stylistic Homage" | "Lore Contributor";
  sharePercentage: number; // e.g. 10 (%)
  workReferenced?: string; // e.g. "Dune / Frank Herbert"
  omegaAccountId?: string; // e.g. "omega_acct_12345"
  walletAddress?: string;
  payoutStatus?: "Active" | "Pending" | "Verified";
  totalMicroRoyaltiesReceived?: number;
}

export interface MicroRoyaltyTransaction {
  id: string;
  timestamp: string;
  recipientName: string;
  recipientAccount: string;
  amount: number; // in USD
  sharePercent: number;
  bookTitle: string;
  originalityScore: number;
  status: "Completed (Direct Author Allocation)" | "Completed (Attribution Share)" | "Completed (Omega Settlement)" | "Verified On-Chain (C2PA)" | "Pending" | string;
  txHash: string;
  badgeCertificationId: string;
}

export interface OriginalityReport {
  score: number; // 0 - 100
  authorSharePercent: number; // e.g. 100 if score == 100, or score if split
  copyrightStatus: "Certified 100% Original (AI-Assisted Human Author)" | "Certified 100% Original (AI-Assisted Author)" | "Split Multi-Author Royalty Attribution";
  c2paManifestHash: string;
  humanBadgeRoyaltyTier?: "Gold Standard (100% Direct Author Payout)" | "Cleanroom Multi-Attribution (Micro-Royalty Split)";
  badgeRoyaltyTier?: "Gold Standard (100% Direct Author Payout)" | "Cleanroom Multi-Attribution (Micro-Royalty Split)";
  is100PercentOriginal: boolean;
  totalMicroRoyaltiesSubmitted: number;
  taggedAuthors: TaggedAuthorRoyalty[];
  recentTransactions: MicroRoyaltyTransaction[];
  breakdown: {
    originalHumanVoice: number; // percentage
    aiSynthesisNovelty: number; // percentage
    stylisticHomageSimilarity: number; // percentage
    referencedTextPercent: number; // percentage
  };
  analysisNotes: string;
  lastAuditedAt?: string;
}

export interface OffloadMetadata {
  driveFileId: string;
  driveWebViewLink?: string;
  driveFileName: string;
  offloadedAt: string;
  originalSizeBytes: number;
  originalSizeFormatted: string;
  compressedSizeBytes: number;
  compressedSizeFormatted: string;
  chapterCount: number;
  loreCount: number;
  reason: string;
}

export type LoreCategory = "Character" | "Location" | "Magic/Tech" | "Faction" | "Artifact" | "Timeline" | "Custom" | string;

export interface ChapterOutlineStub {
  id: string;
  number: number;
  act: string;
  title: string;
  summary: string;
  goal?: string;
  conflict?: string;
  cliffhanger?: string;
  pov?: string;
  setting?: string;
  targetWords: number;
  wordCount: number;
  status: "draft" | "review" | "polished" | "final" | "in-progress" | "complete";
  hasIllustrations?: boolean;
  illustrationCount?: number;
  hasFootnotes?: boolean;
  footnoteCount?: number;
}

export interface LoreSummaryStub {
  id: string;
  name: string;
  category: LoreCategory;
  tagline: string;
}

export interface FirestoreBookMetadataStub {
  id: string;
  userId?: string;
  title: string;
  subtitle?: string;
  author: string;
  genre: Genre;
  targetWordCount: number;
  currentWordCount: number;
  dailyWordCountGoal?: number;
  wordGoalMode?: "project" | "daily";
  dailyWordBaselineCount?: number;
  dailyWordBaselineDate?: string;
  premise: string;
  tone: string;
  targetAudience?: string;
  coverImageUrl?: string;
  coverTitleFont?: string;
  coverAccentColor?: string;
  isOffloadedToDrive: true;
  offloadMetadata: OffloadMetadata;
  chapterOutlines: ChapterOutlineStub[];
  loreSummaries: LoreSummaryStub[];
  createdAt: string;
  updatedAt: string;
  _stubVersion: string;
}

export interface Book {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  genre: Genre;
  targetWordCount: number;
  currentWordCount: number;
  dailyWordCountGoal?: number;
  wordGoalMode?: "project" | "daily";
  dailyWordBaselineCount?: number;
  dailyWordBaselineDate?: string;
  premise: string;
  tone: string;
  targetAudience?: string;
  coverImageUrl?: string;
  coverImage?: string;
  frontCoverImage?: string;
  coverTitleFont?: string;
  coverAccentColor?: string;
  chapters: Chapter[];
  mediaLibrary?: ChapterIllustration[];
  loreEntries: LoreEntry[];
  publishingKit: PublishingKit;
  formattingSettings: FormattingSettings;
  originalityReport?: OriginalityReport;
  isOffloadedToDrive?: boolean;
  offloadMetadata?: OffloadMetadata;
  createdAt: string;
  updatedAt: string;
}

export type AgentId = "architect" | "stylist" | "editor" | "scholar" | "artisan" | "publisher";

export interface RealmAgent {
  id: AgentId;
  name: string;
  title: string;
  realm: string;
  icon: string;
  badgeColor: string;
  description: string;
  specialties: string[];
  promptStarters: string[];
  quote: string;
}

export interface ChatMessage {
  id: string;
  agentId: AgentId;
  role: "user" | "agent" | "system";
  text: string;
  timestamp: string;
  suggestedActions?: {
    label: string;
    actionType: "insert_text" | "replace_selection" | "apply_outline" | "create_lore";
    payload: any;
  }[];
}

export interface CritiqueResult {
  readabilityScore: number;
  pacingScore: number;
  dialogueScore: number;
  sensoryScore: number;
  overallVerdict: string;
  strengths: string[];
  weaknesses: string[];
  lineEdits: {
    original: string;
    suggestion: string;
    reason: string;
  }[];
  plotConsistencyNotes: string;
}

export interface ApplyRecommendationsResult {
  editedContent: string;
  changesApplied: string[];
  editorialVerdict: string;
  improvedReadabilityScore: number;
  improvedPacingScore: number;
  wordCount: number;
}

export interface ChapterAuditSummaryItem {
  chapterNumber: number;
  title: string;
  score: number;
  status: string;
  keyNote: string;
}

export interface CouncilFinalSweepReport {
  overallScore: number;
  readinessStatus: "Ready for Typesetting & Art" | "Minor Adjustments Recommended" | "Ready for Final Proofing";
  narrativeArcVerdict: string;
  voiceCohesionScore: number;
  loreConsistencyScore: number;
  pacingRhythmScore: number;
  chapterAuditSummary: ChapterAuditSummaryItem[];
  keyStrengths: string[];
  finalTouchRecommendations: string[];
}

export interface FullBookFormattingChoices {
  recommendedTrimSize: "6x9" | "5.5x8.5" | "8x10" | "pocket";
  recommendedFontPreset: FormattingSettings["fontPreset"];
  recommendedGoogleFont: string;
  recommendedFontSize: string;
  recommendedLineSpacing: string;
  recommendedChapterHeadingCase: "title" | "small-caps" | "uppercase" | "roman";
  recommendedSceneBreakSymbol: string;
  dropCapsRecommended: boolean;
  typographyRationale: string;
  globalStyleDirectives: string[];
}

export interface FullBookChapterAudit {
  chapterId: string;
  chapterNumber: number;
  title: string;
  critique: CritiqueResult;
  continuityLinks: string[];
  formattingNotes: string;
  priorityFocus: "all" | "line_edits" | "pacing" | "dialogue" | "sensory" | "voice";
}

export interface FullBookReadAuditResult {
  bookDigest: {
    narrativeSummary: string;
    coreThemes: string[];
    characterArcSummary: string[];
    continuityWarnings: string[];
    crossChapterEliminatedDoubleEdits: string[];
  };
  formattingChoices: FullBookFormattingChoices;
  overallHealthScore: number;
  chapterAudits: FullBookChapterAudit[];
  auditedAt: string;
}

export interface SubstackArticle {
  id: string;
  chapterNumber: number;
  chapterTitle: string;
  articleTitle: string;
  subtitle: string;
  targetAudience: string;
  ideologyTheme: string;
  contentMarkdown: string;
  executiveSummary: string;
  discussionPrompts: string[];
  referenceMaterials: {
    title: string;
    description: string;
    url?: string;
    sourceType?: string;
  }[];
  callToAction: string;
  suggestedTags: string[];
  estimatedReadTimeMins: number;
  generatedAt: string;
}

export type ReelAspectRatio = "9:16" | "16:9" | "1:1";

export interface ReelScene {
  id: string;
  order: number;
  durationSec: number;
  headline: string;
  scriptText: string;
  visualPrompt: string;
  visualType: "ai_image" | "video_backdrop" | "book_cover" | "kinetic_typography";
  visualUrl?: string;
  cameraMovement: "zoom_in" | "zoom_out" | "pan_left" | "pan_right" | "slow_float";
  overlayText: string;
  hashtags: string[];
  mentions: string[];
  speedMultiplier: number;
}

export interface VoiceOverTrack {
  id: string;
  mode: "ai_tts" | "mic_record" | "uploaded_audio";
  voiceName: "Kore" | "Fenrir" | "Puck" | "Zephyr" | "Charon";
  audioUrl?: string;
  audioBase64?: string;
  durationSec: number;
  speechRate: number; // 0.75 to 2.0
  recordedAt?: string;
}

export interface ReelProject {
  id: string;
  title: string;
  platform: "TikTok" | "Instagram Reels" | "YouTube Shorts" | "Substack Video";
  aspectRatio: ReelAspectRatio;
  targetAudience: string;
  hookHeadline: string;
  scenes: ReelScene[];
  voiceOver: VoiceOverTrack;
  fullScript: string;
  backgroundMusicPreset: "cinematic_epic" | "dark_mystery" | "ambient_lofi" | "cyberpunk_synth" | "none";
  activeHashtags: string[];
  activeMentions: string[];
  overlaySpeedBadge: string;
  createdAt: string;
  updatedAt: string;
}

export interface LogoDesignProject {
  id: string;
  bookTitle: string;
  subtitle?: string;
  authorName: string;
  style: "gothic_crest" | "minimalist_serif" | "cyberpunk_neon" | "vintage_gold" | "royal_emblem";
  monogramLetters: string;
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  iconSymbol: "quill" | "crown" | "dragon" | "sword" | "flame" | "shield" | "star" | "book" | "compass";
  fontFamily: string;
  svgData?: string;
  pngUrl?: string;
  createdAt: string;
}

export type TesterAppAccess =
  | "TomeCrafter"
  | "ForgeOS"
  | "RLM Pro Studio"
  | "RL Easy Flow"
  | "Omega App"
  | "RLMV Music Video Editor";
export type OmegaSubscriptionStatus = "active" | "trialing" | "past_due" | "canceled" | "sandbox_reset";

export interface EcosystemAppMeta {
  id: TesterAppAccess;
  fleetId?: string;
  name: string;
  tagline: string;
  description: string;
  logoKey: string;
  defaultBadgeColor: string;
  omegaPlanId: string;
  appUrl?: string;
  status?: "Optimal" | "Unlinked";
  activationState?: "ACTIVE" | "PENDING";
  trackingCode?: string;
}

export interface AppLogoRegistry {
  TomeCrafter?: string;
  ForgeOS?: string;
  "RLM Pro Studio"?: string;
  "RL Easy Flow"?: string;
  "Omega App"?: string;
  "RLMV Music Video Editor"?: string;
  [key: string]: string | undefined;
}

export interface OmegaFundMetrics {
  totalSubscribers: number;
  monthlyRecurringVolume: number; // in USD
  fundAllocationPercent: 50; // strictly 50%
  fundAccountTotalTransferred: number; // in USD
  omegaHubUrl: string;
  omegaCovenantAccountId: string;
  omegaSettlementStatus: "active" | "pending_gateway" | "sandbox_active";
  gatewaySecretConfigured?: boolean;
  sdkVersion?: string;
  ecosystemApps?: string[];
  lastPayoutTimestamp: string;
}

export interface BetaTester {
  id: string;
  name: string;
  email: string;
  app_access_list: TesterAppAccess[];
  current_subscription_status: OmegaSubscriptionStatus;
  omegaAccountId?: string;
  monthlyTierUsd?: number;
  addedAt: string;
  lastActive?: string;
  notes?: string;
}

export interface FeedbackItem {
  id: string;
  testerId: string;
  testerName: string;
  testerEmail: string;
  app: TesterAppAccess;
  category: "Bug" | "Feature Request" | "UX / Design" | "Performance" | "General";
  rating: number; // 1-5
  message: string;
  status: "new" | "reviewed" | "in_progress" | "resolved";
  submittedAt: string;
}

export interface BroadcastMessage {
  id: string;
  app: TesterAppAccess | "All Apps";
  subject: string;
  content: string;
  sentAt: string;
  recipientCount: number;
  adminSender: string;
}

// ----------------------------------------------------------------------------
// Author Website Generator & Design Studio Types
// ----------------------------------------------------------------------------

export type AuthorWebsiteGenrePreset =
  | "dark_fantasy"
  | "epic_fantasy"
  | "cyberpunk_scifi"
  | "romance_pastel"
  | "literary_minimalist"
  | "thriller_nordic"
  | "thought_leader"
  | "historical_parchment";

export type AuthorWebsiteLayout =
  | "modern_landing"
  | "book_showcase"
  | "lead_magnet"
  | "literary_portfolio"
  | "bento_hub";

export type MajorAuthorPlatformKey =
  | "amazon_author"
  | "goodreads"
  | "substack"
  | "bookbub"
  | "storyorigin"
  | "bookfunnel"
  | "patreon"
  | "spotify"
  | "apple_books"
  | "kobo"
  | "barnes_noble"
  | "tiktok"
  | "youtube"
  | "instagram"
  | "twitter"
  | "discord"
  | "custom_site";

export interface MajorAuthorPlatform {
  key: MajorAuthorPlatformKey;
  name: string;
  category: "Retailers & Profiles" | "Newsletters & VIP" | "Audio & Podcasts" | "Social & Video" | "Community";
  officialSignUpUrl: string;
  placeholder: string;
  iconName: string;
  authorUrl: string;
  enabled: boolean;
  notes?: string;
}

export interface AuthorWebsiteBook {
  id: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  tagline: string;
  synopsis: string;
  genre: string;
  price?: string;
  releaseDate?: string;
  isFeatured: boolean;
  amazonUrl?: string;
  appleBooksUrl?: string;
  barnesNobleUrl?: string;
  koboUrl?: string;
  signedPaperbackUrl?: string;
  sampleChapterTitle?: string;
  sampleChapterExcerpt?: string;
}

export interface AuthorWebsiteReview {
  id: string;
  reviewerName: string;
  reviewerTitle: string;
  rating: number;
  quote: string;
  source: string;
}

export interface AuthorWebsiteEvent {
  id: string;
  title: string;
  date: string;
  location: string;
  linkUrl?: string;
  isVirtual: boolean;
}

export interface AuthorWebsiteConfig {
  id: string;
  authorName: string;
  tagline: string;
  bio: string;
  authorPhotoUrl?: string;
  location: string;
  genrePreset: AuthorWebsiteGenrePreset;
  layout: AuthorWebsiteLayout;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  textMutedColor: string;
  fontHeading: string;
  fontBody: string;
  borderRadius: "sharp" | "subtle" | "rounded" | "pill";
  heroHeadline: string;
  heroSubtitle: string;
  heroCtaText: string;
  heroCtaUrl: string;
  heroSecondaryCtaText: string;
  heroSecondaryCtaUrl: string;
  featuredBook: AuthorWebsiteBook;
  allBooks: AuthorWebsiteBook[];
  newsletterHeadline: string;
  newsletterSubtitle: string;
  newsletterLeadMagnetTitle: string;
  newsletterLeadMagnetDescription: string;
  newsletterButtonText: string;
  mediaKitUrl: string;
  contactEmail: string;
  platforms: Record<MajorAuthorPlatformKey, MajorAuthorPlatform>;
  reviews: AuthorWebsiteReview[];
  events: AuthorWebsiteEvent[];
  showEthicalAiBadge: boolean;
  showUpcomingEvents: boolean;
  showReviews: boolean;
  showAllBooks: boolean;
  showMediaKit: boolean;
  showContactForm: boolean;
  showPublisherBox?: boolean;
  publisherName?: string;
  publisherLocation?: string;
  publisherWebsiteUrl?: string;
  publisherTagline?: string;
  publisherIsbn?: string;
  customCss?: string;
  lastSaved: string;
}

// ----------------------------------------------------------------------------
// Author Store & Merchandise Builder Types
// ----------------------------------------------------------------------------

export type StoreProductCategory =
  | "books_physical"
  | "books_digital"
  | "audiobooks"
  | "apparel"
  | "drinkware"
  | "accessories"
  | "art_prints"
  | "collector_boxes"
  | "digital_lore";

export type ProductInventoryStatus = "in_stock" | "limited" | "pre_order" | "made_to_order" | "sold_out";

export interface StoreExternalLink {
  id: string;
  platformName: string; // e.g. "Amazon KDP", "Barnes & Noble", "Apple Books", "Kobo", "Printful", "Shopify"
  url: string;
  iconType: "amazon" | "book" | "audio" | "cart" | "external" | "store";
  badgeText?: string; // e.g. "Prime 1-Day", "eBook $4.99", "Audiobook"
  isPrimary?: boolean;
}

export interface StoreProduct {
  id: string;
  title: string;
  subtitle?: string;
  category: StoreProductCategory;
  price: number; // in USD
  originalPrice?: number; // for discount display
  currency: string; // "USD", "GBP", "EUR", "CAD", "AUD"
  description: string;
  highlights: string[];
  imageUrl: string;
  additionalImages?: string[];
  inventoryStatus: ProductInventoryStatus;
  stockQuantity?: number;
  sku?: string;
  isFeatured: boolean;
  isDigital: boolean;
  digitalDownloadUrl?: string;
  omegaPlanId?: string;
  omegaPayUrl?: string; // Direct Omega Pay button link
  externalPurchaseLinks: StoreExternalLink[];
  tags: string[];
  specs?: {
    format?: string; // "Hardcover", "Paperback", "Heavyweight Cotton", "Ceramic 15oz"
    dimensions?: string; // "6x9 in", "Unisex S-3XL", "11x17 in"
    pageCount?: number;
    isbn?: string;
    shippingEstimateDays?: string; // "2-4 business days"
  };
  royaltyContributionPercent: number; // e.g. 50 (%) Creator Fund
  createdAt: string;
  updatedAt: string;
}

export interface StoreOmegaSettlementConfig {
  accountId?: string;
  isConnected: boolean;
  accountStatus: "active" | "pending_verification" | "sandbox_ready" | "disconnected" | "pending_configuration" | string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  country: string;
  defaultCurrency: string;
  fundSplitActive: boolean; // 50% Creator Fund split
  fundSplitPercent: 50;
  testMode: boolean;
  omegaHubUrl?: string;
  lastPayoutAmount?: number;
  lastPayoutDate?: string;
}

export interface StoreConfig {
  id: string;
  storeName: string;
  authorSlug: string; // e.g. "cody-germain" -> store URL: /store/cody-germain
  tagline: string;
  bioSnippet: string;
  bannerImageUrl: string;
  logoImageUrl?: string;
  currency: string;
  themeColor: "emerald" | "amber" | "indigo" | "rose" | "teal" | "stone";
  headerLayout: "hero_banner" | "minimal_clean" | "split_featured";
  noticeBannerText: string;
  enableNoticeBanner: boolean;
  freeShippingThresholdUsd?: number;
  contactEmail: string;
  socialLinks: {
    website?: string;
    twitter?: string;
    instagram?: string;
    substack?: string;
    tiktok?: string;
    patreon?: string;
  };
  omegaSettlement: StoreOmegaSettlementConfig;
  customDomain?: string;
  shareableUrl: string;
  allowGuestCheckout: boolean;
  isPublished: boolean;
  lastUpdated: string;
}

export interface StoreCartItem {
  product: StoreProduct;
  quantity: number;
  selectedOption?: string;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  items: {
    productId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    imageUrl: string;
  }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  fundContributionAmount: number; // 50% split calculated
  status: "paid" | "processing" | "shipped" | "delivered" | "refunded" | "pending_omega_pay" | "confirmed";
  omegaTransactionId?: string;
  omegaCheckoutUrl?: string;
  shippingAddress?: {
    line1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  createdAt: string;
}

// ----------------------------------------------------------------------------
// Tiered Subscription & Selectable Add-On Tabs Engine Types
// ----------------------------------------------------------------------------

export type SubscriptionPlanId = "free" | "author_pro" | "guild_master";

export interface PlanGenerationLimits {
  monthlyAiProseWords: number; // e.g. 5,000 for free, 60,000 for pro, 200,000 for master
  monthlyCoverArtRenders: number; // e.g. 3 for free, 30 for pro, 100 for master
  activeManuscriptsLimit: number; // e.g. 1 for free, 5 for pro, 50 for master
  storeProductsLimit: number; // e.g. 3 for free, 25 for pro, 999 for master
  monthlyExportsLimit: number; // e.g. 5 for free, 50 for pro, 500 for master
  allowedExportFormats: ("pdf_basic" | "pdf_kdp_300dpi" | "epub" | "docx" | "markdown" | "audio_master")[];
  platformFeePercent: number; // 5% for free, 0% for paid tiers
}

export interface SubscriptionTier {
  id: SubscriptionPlanId;
  name: string;
  tagline: string;
  priceMonthlyUsd: number;
  priceAnnualMonthlyUsd: number; // discounted rate
  badgeLabel?: string;
  isPopular?: boolean;
  limits: PlanGenerationLimits;
  includedTabs: string[]; // List of Tab IDs automatically included
  features: string[];
  omegaPlanId: string;
  fundContributionMonthlyUsd: number; // exactly 50%
}

export interface ModularTabAddon {
  id: string;
  tabKey: string;
  name: string;
  iconName: string;
  category: "Creation Suite" | "Publishing & Reach" | "Generation Boosters";
  monthlyPriceUsd: number;
  tagline: string;
  description: string;
  unlocksFeatures: string[];
  extraWordQuota?: number;
  extraArtQuota?: number;
  isIncludedInMaster: boolean;
}

export interface UserGenerationUsage {
  aiProseWordsUsed: number;
  aiProseWordsLimit: number;
  coverArtRendersUsed: number;
  coverArtRendersLimit: number;
  storeProductsListed: number;
  storeProductsLimit: number;
  exportsUsedThisMonth: number;
  exportsLimitThisMonth: number;
  billingCycleResetDate: string; // ISO date string
}

export interface UserSubscriptionState {
  currentPlanId: SubscriptionPlanId;
  status: "active" | "trialing" | "past_due" | "canceled";
  activeAddonTabIds: string[]; // IDs of selectable add-on tabs purchased
  billingInterval: "monthly" | "annual";
  totalMonthlyChargeUsd: number;
  fundContributionMonthlyUsd: number; // 50% of total
  omegaMemberId?: string;
  omegaSubscriptionId?: string;
  currentPeriodEnd: string;
  usage: UserGenerationUsage;
  unlockedTabs: string[]; // All tabs accessible by base tier + add-ons
}

export interface StudioLogoMeta {
  url: string;
  storagePath: string;
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
  uploadedAt: string;
  uploadedByEmail: string;
  uploadedByUid: string;
  aspectRatio?: string;
  verifiedAdmin: boolean;
}

export interface StudioSettings {
  studioName: string;
  imprintName: string;
  tagline: string;
  description: string;
  studioLogo?: StudioLogoMeta;
  websiteUrl?: string;
  supportEmail?: string;
  headquarters?: string;
  authorizedAdminEmails: string[];
  autoApplyToBookImprint: boolean;
  autoApplyToTitlePage: boolean;
  autoApplyToSpine: boolean;
  updatedAt: string;
}

// ----------------------------------------------------------------------------
// 8-Department Publishing Studio & Specialist Staff Types
// ----------------------------------------------------------------------------

export type DepartmentId =
  | "scripting"
  | "proofreading"
  | "editing"
  | "illustration"
  | "cover_design"
  | "formatting"
  | "publishing_distribution"
  | "marketing";

export type StudioApplyActionType =
  | "update_blurb"
  | "update_keywords"
  | "update_formatting"
  | "save_chapter_notes"
  | "append_chapter_scene"
  | "none";

export interface DepartmentTaskDefinition {
  id: string;
  label: string;
  description: string;
  targetScope: "book" | "chapter";
  applyActionType: StudioApplyActionType;
}

export interface DepartmentStaffAgent {
  id: string;
  name: string;
  role: string;
  departmentId: DepartmentId;
  leadAgentId: AgentId;
  specialtySummary: string;
  deliverables: string[];
  promptStarters: string[];
  tasks: DepartmentTaskDefinition[];
  systemGuidance: string;
}

export interface StudioDepartment {
  id: DepartmentId;
  name: string;
  shortLabel: string;
  leadTitle: string;
  leadAgentId: AgentId;
  description: string;
  essentialWorkflowSteps: string[];
  primaryTab: string;
  primaryTabLabel: string;
  secondaryTab?: string;
  secondaryTabLabel?: string;
  staff: DepartmentStaffAgent[];
}

export interface StudioTaskChecklistItem {
  item: string;
  status: "pass" | "action_needed" | "recommended";
  actionNote: string;
}

export interface StudioApplyableData {
  salesBlurbHook?: string;
  salesBlurbBody?: string;
  salesBlurbCta?: string;
  marketingHook?: string;
  launchStrategy?: string;
  keywords?: string[];
  bisacCategories?: string[];
  trimSize?: "6x9" | "5.5x8.5" | "8x10" | "pocket";
  fontPreset?: FormattingSettings["fontPreset"];
  dropCaps?: boolean;
  sceneBreakSymbol?: string;
  coverPrompt?: string;
  chapterNotes?: string;
  chapterProseAddition?: string;
}

export interface StudioDeliverableResult {
  id: string;
  departmentId: DepartmentId;
  staffId: string;
  staffName: string;
  taskId: string;
  taskLabel: string;
  chapterId?: string;
  chapterTitle?: string;
  title: string;
  executiveSummary: string;
  checklist: StudioTaskChecklistItem[];
  deliverableMarkdown: string;
  applyableData?: StudioApplyableData;
  generatedAt: string;
}

export type KanbanColumnId = "pending" | "in_progress" | "review" | "completed";

export interface CustomStudioTask {
  id: string;
  departmentId: DepartmentId;
  staffId: string;
  title: string;
  description: string;
  column: KanbanColumnId;
  pendingNote?: string;
  createdAt: string;
}

