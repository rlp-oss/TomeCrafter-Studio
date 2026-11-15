import {
  AuthorWebsiteConfig,
  AuthorWebsiteGenrePreset,
  AuthorWebsiteLayout,
  MajorAuthorPlatform,
  MajorAuthorPlatformKey,
  Book,
} from "../types";

export const DEFAULT_MAJOR_PLATFORMS: Record<MajorAuthorPlatformKey, MajorAuthorPlatform> = {
  amazon_author: {
    key: "amazon_author",
    name: "Amazon Author Central",
    category: "Retailers & Profiles",
    officialSignUpUrl: "https://author.amazon.com",
    placeholder: "https://amazon.com/author/yourname",
    iconName: "ShoppingBag",
    authorUrl: "",
    enabled: true,
    notes: "Official Amazon Author Profile for US, UK, and worldwide book listings",
  },
  goodreads: {
    key: "goodreads",
    name: "Goodreads Author Program",
    category: "Retailers & Profiles",
    officialSignUpUrl: "https://www.goodreads.com/author/program",
    placeholder: "https://goodreads.com/author/show/123456.Your_Name",
    iconName: "BookOpen",
    authorUrl: "",
    enabled: true,
    notes: "Claim your Goodreads author badge, host giveaways, and answer fan Q&As",
  },
  substack: {
    key: "substack",
    name: "Substack Newsletter",
    category: "Newsletters & VIP",
    officialSignUpUrl: "https://substack.com/signup",
    placeholder: "https://yournewsletter.substack.com",
    iconName: "Mail",
    authorUrl: "",
    enabled: true,
    notes: "Direct subscriber relationship, serialized novels, and paid reader memberships",
  },
  bookbub: {
    key: "bookbub",
    name: "BookBub Author Profile",
    category: "Retailers & Profiles",
    officialSignUpUrl: "https://www.bookbub.com/authors",
    placeholder: "https://bookbub.com/authors/your-name",
    iconName: "Sparkles",
    authorUrl: "",
    enabled: true,
    notes: "New release alerts sent to your BookBub followers automatically on launch day",
  },
  storyorigin: {
    key: "storyorigin",
    name: "StoryOrigin (Reviewers & Swaps)",
    category: "Newsletters & VIP",
    officialSignUpUrl: "https://storyoriginapp.com",
    placeholder: "https://storyoriginapp.com/profile/your-handle",
    iconName: "Share2",
    authorUrl: "",
    enabled: false,
    notes: "Newsletter builder, ARC review copies, and group author promo swaps",
  },
  bookfunnel: {
    key: "bookfunnel",
    name: "BookFunnel (Lead Magnets)",
    category: "Newsletters & VIP",
    officialSignUpUrl: "https://bookfunnel.com",
    placeholder: "https://dl.bookfunnel.com/your-code",
    iconName: "DownloadCloud",
    authorUrl: "",
    enabled: false,
    notes: "Frictionless reader magnet delivery to Kindle, Kobo, Apple, and e-readers",
  },
  patreon: {
    key: "patreon",
    name: "Patreon Reader Guild",
    category: "Community",
    officialSignUpUrl: "https://www.patreon.com",
    placeholder: "https://patreon.com/yourguild",
    iconName: "Crown",
    authorUrl: "",
    enabled: false,
    notes: "Early access chapters, behind-the-scenes worldbuilding lore, and signed book tiers",
  },
  spotify: {
    key: "spotify",
    name: "Spotify (Audiobooks / Podcast)",
    category: "Audio & Podcasts",
    officialSignUpUrl: "https://podcasters.spotify.com",
    placeholder: "https://open.spotify.com/show/your-audiobook-id",
    iconName: "Headphones",
    authorUrl: "",
    enabled: false,
    notes: "Audiobook distribution and author audio commentary streams",
  },
  apple_books: {
    key: "apple_books",
    name: "Apple Books for Authors",
    category: "Retailers & Profiles",
    officialSignUpUrl: "https://authors.apple.com",
    placeholder: "https://books.apple.com/us/author/your-name/id123456",
    iconName: "Book",
    authorUrl: "",
    enabled: true,
    notes: "Direct Apple Books store landing page for iOS, iPadOS, and Mac readers",
  },
  kobo: {
    key: "kobo",
    name: "Kobo Writing Life",
    category: "Retailers & Profiles",
    officialSignUpUrl: "https://www.kobo.com/writinglife",
    placeholder: "https://kobo.com/us/en/ebook/your-book-title",
    iconName: "Layers",
    authorUrl: "",
    enabled: false,
    notes: "Global reach in Canada, Europe, Australia, and Rakuten Kobo Plus subscribers",
  },
  barnes_noble: {
    key: "barnes_noble",
    name: "Barnes & Noble Press",
    category: "Retailers & Profiles",
    officialSignUpUrl: "https://press.barnesandnoble.com",
    placeholder: "https://barnesandnoble.com/s/Your+Author+Name",
    iconName: "Bookmark",
    authorUrl: "",
    enabled: true,
    notes: "Nook eBook and hardcover print on demand in US brick-and-mortar storefronts",
  },
  tiktok: {
    key: "tiktok",
    name: "TikTok / BookTok",
    category: "Social & Video",
    officialSignUpUrl: "https://www.tiktok.com",
    placeholder: "https://tiktok.com/@yourbooktokhandle",
    iconName: "Video",
    authorUrl: "",
    enabled: true,
    notes: "Viral #BookTok book teasers, tropes, voice reels, and aesthetic moodboards",
  },
  youtube: {
    key: "youtube",
    name: "YouTube Channel / BookTube",
    category: "Social & Video",
    officialSignUpUrl: "https://www.youtube.com",
    placeholder: "https://youtube.com/@YourAuthorChannel",
    iconName: "PlayCircle",
    authorUrl: "",
    enabled: false,
    notes: "Cinematic book trailers, writing vlogs, ambient audiobooks, and live launches",
  },
  instagram: {
    key: "instagram",
    name: "Instagram / Bookstagram",
    category: "Social & Video",
    officialSignUpUrl: "https://www.instagram.com",
    placeholder: "https://instagram.com/yourauthorgram",
    iconName: "Camera",
    authorUrl: "",
    enabled: true,
    notes: "Aesthetic cover reveals, quotes, moodboards, and reader community photos",
  },
  twitter: {
    key: "twitter",
    name: "X / Twitter",
    category: "Social & Video",
    officialSignUpUrl: "https://x.com",
    placeholder: "https://x.com/yourhandle",
    iconName: "MessageCircle",
    authorUrl: "",
    enabled: false,
    notes: "Industry commentary, #PitMad pitches, and writer community discussions",
  },
  discord: {
    key: "discord",
    name: "Discord Reader Realm",
    category: "Community",
    officialSignUpUrl: "https://discord.com",
    placeholder: "https://discord.gg/yourservercode",
    iconName: "Users",
    authorUrl: "",
    enabled: false,
    notes: "Live reader discussions, spoiler channels, buddy reads, and Q&A sessions",
  },
  custom_site: {
    key: "custom_site",
    name: "Personal Domain / Store",
    category: "Community",
    officialSignUpUrl: "https://www.namecheap.com",
    placeholder: "https://www.yourauthorname.com",
    iconName: "Globe",
    authorUrl: "",
    enabled: false,
    notes: "Direct-to-consumer store for signed copies, merchandise, and reader portal",
  },
};

export interface GenreStyleConfig {
  id: AuthorWebsiteGenrePreset;
  name: string;
  genreTag: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  cardBackgroundColor: string;
  textColor: string;
  textMutedColor: string;
  fontHeading: string;
  fontBody: string;
  googleFontsImport: string;
  borderRadius: "sharp" | "subtle" | "rounded" | "pill";
  vibe: string;
}

export const GENRE_PRESET_STYLES: Record<AuthorWebsiteGenrePreset, GenreStyleConfig> = {
  dark_fantasy: {
    id: "dark_fantasy",
    name: "Dark Fantasy & Gothic",
    genreTag: "Dark Fantasy / Horror / Grimdark",
    description: "Obsidian dark canvas, blood-crimson & burnished gold accents, antique Cinzel serif, atmospheric mist glow.",
    primaryColor: "#dc2626",
    secondaryColor: "#991b1b",
    accentColor: "#d97706",
    backgroundColor: "#0c0a09",
    cardBackgroundColor: "#1c1917",
    textColor: "#f5f5f4",
    textMutedColor: "#a8a29e",
    fontHeading: "'Cinzel', serif",
    fontBody: "'Cormorant Garamond', serif",
    googleFontsImport: "https://fonts.googleapis.com/css2?family=Cinzel:wght@600;800;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&display=swap",
    borderRadius: "subtle",
    vibe: "Gothic, dark, majestic, eerie, immortal",
  },
  epic_fantasy: {
    id: "epic_fantasy",
    name: "Epic High Fantasy & Lore",
    genreTag: "High Fantasy / Sword & Sorcery",
    description: "Midnight sapphire navy, imperial golden crests, majestic Playfair Display, royal heraldic presence.",
    primaryColor: "#f59e0b",
    secondaryColor: "#b45309",
    accentColor: "#38bdf8",
    backgroundColor: "#0a0f1d",
    cardBackgroundColor: "#131e36",
    textColor: "#f8fafc",
    textMutedColor: "#94a3b8",
    fontHeading: "'Playfair Display', serif",
    fontBody: "'Merriweather', serif",
    googleFontsImport: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;0,900;1,600&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&display=swap",
    borderRadius: "rounded",
    vibe: "Noble, mythic, sweeping adventure, ancient kingdoms",
  },
  cyberpunk_scifi: {
    id: "cyberpunk_scifi",
    name: "Cyberpunk & Space Opera",
    genreTag: "Sci-Fi / Cyberpunk / Dystopian",
    description: "Deep carbon black, electric neon cyan & magenta, Orbitron tech headers, futuristic digital matrix vibe.",
    primaryColor: "#06b6d4",
    secondaryColor: "#3b82f6",
    accentColor: "#ec4899",
    backgroundColor: "#09090b",
    cardBackgroundColor: "#18181b",
    textColor: "#fafafa",
    textMutedColor: "#a1a1aa",
    fontHeading: "'Orbitron', sans-serif",
    fontBody: "'Space Grotesk', sans-serif",
    googleFontsImport: "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&family=Space+Grotesk:wght@300;400;500;700&display=swap",
    borderRadius: "sharp",
    vibe: "Futuristic, neon, high-tech, neon noir, fast-paced",
  },
  romance_pastel: {
    id: "romance_pastel",
    name: "Romance & Romantic Comedy",
    genreTag: "Contemporary Romance / Rom-Com / Cozy",
    description: "Warm rose quartz & peach blush, modern editorial Fraunces serif, soft curves, inviting warmth.",
    primaryColor: "#e11d48",
    secondaryColor: "#f43f5e",
    accentColor: "#d97706",
    backgroundColor: "#fff1f2",
    cardBackgroundColor: "#ffffff",
    textColor: "#1c1917",
    textMutedColor: "#78716c",
    fontHeading: "'Fraunces', serif",
    fontBody: "'Plus Jakarta Sans', sans-serif",
    googleFontsImport: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,800;1,9..144,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
    borderRadius: "pill",
    vibe: "Romantic, heartfelt, charming, vibrant, emotional",
  },
  literary_minimalist: {
    id: "literary_minimalist",
    name: "Literary Fiction & Editorial",
    genreTag: "Literary Fiction / Memoir / Essays",
    description: "Warm bone cream canvas, rich charcoal text, pristine EB Garamond typography, generous negative space.",
    primaryColor: "#18181b",
    secondaryColor: "#3f3f46",
    accentColor: "#b45309",
    backgroundColor: "#fafaf9",
    cardBackgroundColor: "#ffffff",
    textColor: "#1c1917",
    textMutedColor: "#57534e",
    fontHeading: "'EB Garamond', serif",
    fontBody: "'Lora', serif",
    googleFontsImport: "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,500;0,700;0,800;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap",
    borderRadius: "sharp",
    vibe: "Thoughtful, prestigious, timeless, intellectual, refined",
  },
  thriller_nordic: {
    id: "thriller_nordic",
    name: "Psychological Thriller & Noir",
    genreTag: "Thriller / Mystery / Crime / Suspense",
    description: "Cold midnight slate, hazard amber alert, punchy high-impact Montserrat headers, razor-sharp tension.",
    primaryColor: "#f59e0b",
    secondaryColor: "#d97706",
    accentColor: "#38bdf8",
    backgroundColor: "#020617",
    cardBackgroundColor: "#0f172a",
    textColor: "#f8fafc",
    textMutedColor: "#94a3b8",
    fontHeading: "'Montserrat', sans-serif",
    fontBody: "'Inter', sans-serif",
    googleFontsImport: "https://fonts.googleapis.com/css2?family=Montserrat:wght@700;800;900&family=Inter:wght@300;400;500;700&display=swap",
    borderRadius: "subtle",
    vibe: "High tension, adrenaline, mystery, dangerous secrets",
  },
  thought_leader: {
    id: "thought_leader",
    name: "Thought Leader & Non-Fiction",
    genreTag: "Non-Fiction / Business / Self-Help / Philosophy",
    description: "Crisp white/slate canvas, executive indigo navy, modern geometric sans, podcast & press credentials.",
    primaryColor: "#4338ca",
    secondaryColor: "#6366f1",
    accentColor: "#0284c7",
    backgroundColor: "#f8fafc",
    cardBackgroundColor: "#ffffff",
    textColor: "#0f172a",
    textMutedColor: "#475569",
    fontHeading: "'Plus Jakarta Sans', sans-serif",
    fontBody: "'Inter', sans-serif",
    googleFontsImport: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap",
    borderRadius: "rounded",
    vibe: "Authoritative, insightful, credible, transformative",
  },
  historical_parchment: {
    id: "historical_parchment",
    name: "Historical Fiction & Antique",
    genreTag: "Historical Fiction / Regency / Saga",
    description: "Aged parchment sepia background, deep mahogany ink, ornamental fleuron dividers, classic Baskerville.",
    primaryColor: "#78350f",
    secondaryColor: "#92400e",
    accentColor: "#b45309",
    backgroundColor: "#fef3c7",
    cardBackgroundColor: "#fffbeb",
    textColor: "#451a03",
    textMutedColor: "#78350f",
    fontHeading: "'Cinzel Decorative', serif",
    fontBody: "'Baskervville', serif",
    googleFontsImport: "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Baskervville:ital@0;1&display=swap",
    borderRadius: "subtle",
    vibe: "Historic, opulent, heritage, timeless legacy",
  },
};

export const PRESET_LAYOUTS: { id: AuthorWebsiteLayout; name: string; description: string; iconName: string }[] = [
  {
    id: "modern_landing",
    name: "Bestseller Landing Page",
    description: "Hero teaser with direct retailer buttons, author biography, featured book spotlight, reviews, and VIP newsletter signup.",
    iconName: "Layout",
  },
  {
    id: "book_showcase",
    name: "Book-Centric Showcase",
    description: "Grand 3D book cover centerpiece with sample chapter 1 reader, retailer purchase links, review quotes, and author background.",
    iconName: "BookOpen",
  },
  {
    id: "lead_magnet",
    name: "VIP Reader Magnet & Novella",
    description: "High-converting free prequel novella lead magnet with instant download, reader testimonials, and author catalog.",
    iconName: "Gift",
  },
  {
    id: "literary_portfolio",
    name: "Literary Portfolio & Press",
    description: "Editorial layout highlighting essays, awards, full book catalog, speaking events, and media kit download.",
    iconName: "Feather",
  },
  {
    id: "bento_hub",
    name: "Modern Bento-Grid Hub",
    description: "Interactive grid tiles showcasing latest books, BookTok/Reel preview, Spotify audiobook player, and social links.",
    iconName: "Grid",
  },
];

/**
 * Generates an initial complete author website configuration tailored to a book.
 */
export function generateDefaultAuthorWebsite(book: Book): AuthorWebsiteConfig {
  const genreLower = (book.genre || "").toLowerCase();
  let genrePreset: AuthorWebsiteGenrePreset = "epic_fantasy";

  if (genreLower.includes("dark") || genreLower.includes("horror") || genreLower.includes("grim")) {
    genrePreset = "dark_fantasy";
  } else if (genreLower.includes("sci") || genreLower.includes("cyber") || genreLower.includes("space")) {
    genrePreset = "cyberpunk_scifi";
  } else if (genreLower.includes("romance") || genreLower.includes("cozy") || genreLower.includes("comedy")) {
    genrePreset = "romance_pastel";
  } else if (genreLower.includes("literary") || genreLower.includes("memoir") || genreLower.includes("essay")) {
    genrePreset = "literary_minimalist";
  } else if (genreLower.includes("thriller") || genreLower.includes("mystery") || genreLower.includes("crime")) {
    genrePreset = "thriller_nordic";
  } else if (genreLower.includes("non") || genreLower.includes("business") || genreLower.includes("self")) {
    genrePreset = "thought_leader";
  } else if (genreLower.includes("hist") || genreLower.includes("regency") || genreLower.includes("period")) {
    genrePreset = "historical_parchment";
  }

  const style = GENRE_PRESET_STYLES[genrePreset];
  const firstChapter = book.chapters && book.chapters.length > 0 ? book.chapters[0] : null;
  const authorLower = (book.author || "").toLowerCase();
  const isGermain = authorLower.includes("germain");
  const defaultBio = book.formattingSettings?.authorBio?.trim()
    ? book.formattingSettings.authorBio.trim()
    : isGermain
    ? "C.W. (Cody) Germain is an independent software systems architect and founder based in Red Deer, Alberta, Canada, building cleanroom AI systems, C2PA provenance infrastructure, and equitable economic frameworks."
    : `${book.author || "C.W. Germain"} is an independent author and researcher crafting rigorous ${book.genre || "Non-Fiction"} works.`;

  return {
    id: `site-${book.id || "default"}`,
    authorName: book.author || "C.W. Germain",
    tagline: isGermain
      ? "Software Systems Architect & Founder · Red Deer, Alberta"
      : `Author of ${book.genre || "Non-Fiction"} Works`,
    bio: defaultBio,
    authorPhotoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80",
    location: isGermain ? "Red Deer, Alberta, Canada" : "Red Deer, Alberta, Canada",
    genrePreset,
    layout: "modern_landing",
    primaryColor: style.primaryColor,
    secondaryColor: style.secondaryColor,
    accentColor: style.accentColor,
    backgroundColor: style.backgroundColor,
    cardBackgroundColor: style.cardBackgroundColor,
    textColor: style.textColor,
    textMutedColor: style.textMutedColor,
    fontHeading: style.fontHeading,
    fontBody: style.fontBody,
    borderRadius: style.borderRadius,
    heroHeadline: book.title ? `Step into the Realm of ${book.title}` : "The Official Home of The Sovereign Author",
    heroSubtitle: book.premise || "A comprehensive roadmap to ethical AI, human provenance, and creator rights in an era of automated synthesis.",
    heroCtaText: "Order on Amazon",
    heroCtaUrl: "#order",
    heroSecondaryCtaText: "Read Chapter 1 Free",
    heroSecondaryCtaUrl: "#sample",
    featuredBook: {
      id: book.id || "b1",
      title: book.title || "The Sovereign Author",
      subtitle: book.subtitle || "A Roadmap To Ethical AI Evolution",
      coverUrl: book.coverImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
      tagline: "The definitive blueprint for creator rights and ethical provenance.",
      synopsis: book.premise || "A groundbreaking exploration of ethical AI, creator cleanrooms, and human provenance in an age of automated synthesis.",
      genre: book.genre || "Non-Fiction & Self-Help",
      price: "$16.99 Paperback / $4.99 Kindle",
      releaseDate: "Available Worldwide in Hardcover, Paperback, & Kindle Unlimited",
      isFeatured: true,
      amazonUrl: "https://amazon.com",
      appleBooksUrl: "https://books.apple.com",
      barnesNobleUrl: "https://barnesandnoble.com",
      koboUrl: "https://kobo.com",
      signedPaperbackUrl: "https://yourauthorstore.com/signed-edition",
      sampleChapterTitle: firstChapter?.title || "Chapter 1: The Genesis of Provenance",
      sampleChapterExcerpt: firstChapter?.content ? firstChapter.content.slice(0, 1400) : "We stand at the threshold of the greatest paradigm shift in the history of creative labor. For millennia, every story told, every canvas painted, and every melody composed carried an unbroken chain of human intention...",
    },
    allBooks: [
      {
        id: "b1",
        title: book.title || "The Sovereign Author",
        subtitle: book.subtitle || "A Roadmap To Ethical AI Evolution",
        coverUrl: book.coverImageUrl || "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
        tagline: "The definitive blueprint for creator rights and ethical provenance.",
        synopsis: book.premise || "A comprehensive roadmap to ethical AI, human provenance, and creator rights.",
        genre: book.genre || "Non-Fiction & Self-Help",
        price: "$4.99 eBook / $16.99 Print",
        releaseDate: "Bestseller - Available Now",
        isFeatured: true,
        amazonUrl: "https://amazon.com",
      },
      {
        id: "b2",
        title: "The Cleanroom Protocol",
        subtitle: "Architectures for Sovereign Authorship",
        coverUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop&q=80",
        tagline: "Cryptographic attribution and the new creative economy.",
        synopsis: "The engineering blueprint for verifying machine learning training lineages and executing autonomous micro-royalties.",
        genre: "Non-Fiction & Self-Help",
        price: "$4.99 eBook / $17.99 Print",
        releaseDate: "Coming Autumn 2026 - Pre-Order Open",
        isFeatured: false,
        amazonUrl: "https://amazon.com",
      },
    ],
    newsletterHeadline: genreLower.includes("non") ? "Join The Provenance & Research Guild" : "Join The VIP Reader Guild",
    newsletterSubtitle: genreLower.includes("non")
      ? "Receive exclusive research whitepapers, early framework excerpts, and architectural updates on creator provenance directly to your inbox."
      : "Receive the exclusive companion prequel novella, deleted scenes, map illustrations, and VIP chapter drops directly to your inbox.",
    newsletterLeadMagnetTitle: genreLower.includes("non")
      ? `Free Master Guide: The ${book.title ? book.title.replace(/^The\s+/i, "") : "Provenance"} Protocol`
      : `Free Prequel Novella: ${book.title ? book.title.split(":")[0] : "The Lost Chronicles"}`,
    newsletterLeadMagnetDescription: genreLower.includes("non")
      ? "Download the complete executive whitepaper and ethical implementation blueprint free when you join our research circle."
      : "Download the complete 85-page prequel novella free when you join our VIP reader circle.",
    newsletterButtonText: genreLower.includes("non") ? "Download Master Blueprint & Join" : "Get My Free Book & Join",
    mediaKitUrl: "https://yourauthorname.com/media-kit.zip",
    contactEmail: "contact@yourauthorname.com",
    platforms: { ...DEFAULT_MAJOR_PLATFORMS },
    reviews: genreLower.includes("non")
      ? [
          {
            id: "r1",
            reviewerName: "The Ethical AI Review",
            reviewerTitle: "Essential Reading",
            rating: 5,
            quote: "A transformative blueprint for the creative economy. Rigorous, visionary, and profoundly actionable.",
            source: "Ethical Technology Journal",
          },
          {
            id: "r2",
            reviewerName: "Cleanroom Provenance Guild",
            reviewerTitle: "Top Author Recommendation",
            rating: 5,
            quote: "The definitive analysis of creator rights and human attribution in an era of automated synthesis.",
            source: "Creator Rights Collective",
          },
          {
            id: "r3",
            reviewerName: "Academic & Tech Forum",
            reviewerTitle: "Starred Review",
            rating: 5,
            quote: "Lucid prose, uncompromising intellectual integrity, and a viable framework for sustainable creative labor.",
            source: "Digital Humanities Quarterly",
          },
        ]
      : [
          {
            id: "r1",
            reviewerName: "The Literary Chronicle",
            reviewerTitle: "Starred Review",
            rating: 5,
            quote: "A breathtaking triumph of storytelling and character nuance. Unputdownable from the first sentence to the thunderous climax.",
            source: "Literary Chronicle",
          },
          {
            id: "r2",
            reviewerName: "Speculative Fiction Guild",
            reviewerTitle: "Top Reader Recommendation",
            rating: 5,
            quote: "The worldbuilding is razor-sharp and the tension never lets up. If you love sweeping narratives with heart, this is your next obsession.",
            source: "Reader Choice Review",
          },
          {
            id: "r3",
            reviewerName: "Goodreads Top Reviewer",
            reviewerTitle: "Starred Review",
            rating: 5,
            quote: "Evocative prose, unforgettable depth, and thematic resonance that stayed with me long after the final page.",
            source: "Goodreads Star Reviewer",
          },
        ],
    events: [
      {
        id: "e1",
        title: "Live Launch Q&A & Virtual Signing",
        date: "September 15, 2026 • 7:00 PM EST",
        location: "YouTube Live & Discord VIP Stage",
        linkUrl: "https://youtube.com",
        isVirtual: true,
      },
      {
        id: "e2",
        title: "WorldCon 2026 Author Panel & Signing",
        date: "October 22-25, 2026",
        location: "Seattle Convention Center, Booth 412",
        linkUrl: "https://worldcon.org",
        isVirtual: false,
      },
    ],
    showEthicalAiBadge: true,
    showUpcomingEvents: true,
    showReviews: true,
    showAllBooks: true,
    showMediaKit: true,
    showContactForm: true,
    showPublisherBox: true,
    publisherName:
      book.publishingKit?.publisherImprint || "Rhythm Logic Publishing",
    publisherLocation: "Red Deer, Alberta, Canada",
    publisherWebsiteUrl:
      book.formattingSettings?.newsletterLink || "https://rhythmlogicpublishing.com",
    publisherTagline:
      "Independent Publishing Imprint · Registered Edition & Provenance Catalog",
    publisherIsbn: book.publishingKit?.isbn || "",
    lastSaved: new Date().toISOString(),
  };
}

/**
 * Builds a complete, standalone, production-ready single-file HTML package.
 * Can be hosted directly on Vercel, Netlify, GitHub Pages, or embedded anywhere.
 */
export function generateStandaloneHtml(config: AuthorWebsiteConfig): string {
  const style = GENRE_PRESET_STYLES[config.genrePreset] || GENRE_PRESET_STYLES.epic_fantasy;
  const isDark = config.backgroundColor.startsWith("#0") || config.backgroundColor.startsWith("#1");

  const activePlatforms = (Object.values(config.platforms) as MajorAuthorPlatform[]).filter(
    (p: MajorAuthorPlatform) => p.enabled && p.authorUrl
  );

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(config.authorName)} | Official Author Website</title>
  <meta name="description" content="${escapeHtml(config.tagline)} - Official website of author ${escapeHtml(config.authorName)}.">
  
  <!-- Google Fonts Import -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="${style.googleFontsImport}" rel="stylesheet">
  
  <!-- Tailwind CSS CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: "${config.primaryColor}",
            secondary: "${config.secondaryColor}",
            accent: "${config.accentColor}",
            siteBg: "${config.backgroundColor}",
            cardBg: "${config.cardBackgroundColor}",
            siteText: "${config.textColor}",
            siteMuted: "${config.textMutedColor}",
          },
          fontFamily: {
            heading: [${config.fontHeading}],
            body: [${config.fontBody}],
          }
        }
      }
    }
  </script>

  <style>
    body {
      background-color: ${config.backgroundColor};
      color: ${config.textColor};
      font-family: ${config.fontBody};
    }
    h1, h2, h3, h4, h5, h6, .font-heading {
      font-family: ${config.fontHeading};
    }
    ${config.customCss || ""}
  </style>
</head>
<body class="min-h-screen antialiased flex flex-col justify-between selection:bg-primary selection:text-white">

  <!-- ========================================================================= -->
  <!-- NAVIGATION -->
  <!-- ========================================================================= -->
  <header class="sticky top-0 z-50 backdrop-blur-md border-b" style="background-color: ${config.backgroundColor}cc; border-color: ${config.cardBackgroundColor};">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
      <a href="#" class="flex items-center space-x-2.5 group">
        <span class="text-xl font-heading font-black tracking-tight" style="color: ${config.textColor}">
          ${escapeHtml(config.authorName)}
        </span>
        <span class="text-xs px-2 py-0.5 rounded-full font-mono font-semibold" style="background-color: ${config.primaryColor}20; color: ${config.primaryColor}; border: 1px solid ${config.primaryColor}40;">
          Author Official
        </span>
      </a>

      <!-- Desktop Nav -->
      <nav class="hidden md:flex items-center space-x-6 text-sm font-medium">
        <a href="#books" class="hover:text-primary transition-colors">Books</a>
        <a href="#about" class="hover:text-primary transition-colors">About</a>
        <a href="#newsletter" class="hover:text-primary transition-colors">VIP Newsletter</a>
        ${config.showReviews ? `<a href="#reviews" class="hover:text-primary transition-colors">Reviews</a>` : ""}
        ${config.showUpcomingEvents ? `<a href="#events" class="hover:text-primary transition-colors">Events</a>` : ""}
        <a href="#contact" class="hover:text-primary transition-colors">Contact</a>
      </nav>

      <a href="#newsletter" class="hidden sm:inline-flex items-center px-4 py-2 text-xs font-bold rounded-lg transition-all shadow-md hover:opacity-95" style="background-color: ${config.primaryColor}; color: #ffffff;">
        Join VIP Reader Guild
      </a>
    </div>
  </header>

  <!-- ========================================================================= -->
  <!-- HERO SECTION -->
  <!-- ========================================================================= -->
  <section class="relative overflow-hidden py-16 sm:py-24 border-b" style="border-color: ${config.cardBackgroundColor}">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
      
      <div class="lg:col-span-7 space-y-6">
        <div class="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider" style="background-color: ${config.primaryColor}15; color: ${config.primaryColor}; border: 1px solid ${config.primaryColor}30;">
          <span>✦ ${escapeHtml(config.tagline)}</span>
        </div>

        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-heading font-black leading-tight" style="color: ${config.textColor}">
          ${escapeHtml(config.heroHeadline)}
        </h1>

        <p class="text-base sm:text-lg leading-relaxed max-w-xl" style="color: ${config.textMutedColor}">
          ${escapeHtml(config.heroSubtitle)}
        </p>

        <!-- CTA Buttons -->
        <div class="flex flex-wrap gap-4 pt-2">
          ${config.heroCtaText ? `
            <a href="${escapeHtml(config.heroCtaUrl || '#order')}" class="px-6 py-3.5 rounded-xl font-heading font-bold text-sm shadow-xl transition-all hover:scale-105" style="background-color: ${config.primaryColor}; color: #ffffff;">
              ${escapeHtml(config.heroCtaText)} →
            </a>
          ` : ""}

          ${config.heroSecondaryCtaText ? `
            <a href="${escapeHtml(config.heroSecondaryCtaUrl || '#sample')}" class="px-6 py-3.5 rounded-xl font-heading font-bold text-sm border transition-all hover:opacity-80" style="border-color: ${config.primaryColor}80; color: ${config.textColor}; background-color: ${config.cardBackgroundColor};">
              ${escapeHtml(config.heroSecondaryCtaText)}
            </a>
          ` : ""}
        </div>

        <!-- Social / Retailer Quick Bar -->
        ${activePlatforms.length > 0 ? `
          <div class="pt-4 flex items-center space-x-3 text-xs" style="color: ${config.textMutedColor}">
            <span>Available on:</span>
            <div class="flex flex-wrap gap-2">
              ${activePlatforms.slice(0, 5).map(p => `
                <a href="${escapeHtml(p.authorUrl)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded-md text-[11px] font-mono border hover:text-primary transition-colors" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}30;">
                  ${escapeHtml(p.name.split(" ")[0])}
                </a>
              `).join("")}
            </div>
          </div>
        ` : ""}
      </div>

      <!-- Hero Book Cover Display with Typeset Shield -->
      <div class="lg:col-span-5 flex justify-center">
        <div class="relative group max-w-xs sm:max-w-sm w-full">
          <div class="absolute -inset-2 rounded-3xl blur-xl opacity-35 group-hover:opacity-60 transition-opacity" style="background-color: ${config.primaryColor};"></div>
          
          <!-- Typeset 3D Book Jacket -->
          <div class="relative rounded-2xl overflow-hidden shadow-2xl border flex flex-col justify-between p-6 aspect-[2/3] min-h-[420px] text-center" style="border-color: ${config.primaryColor}50; background-color: #0c0a09;">
            <!-- Background Artwork -->
            <img src="${escapeHtml(config.featuredBook.coverUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80')}" alt="${escapeHtml(config.featuredBook.title)}" class="absolute inset-0 w-full h-full object-cover" />
            
            <!-- High-Contrast Top & Bottom Gradient Shields to prevent ghost text bleed -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/80 pointer-events-none"></div>

            <!-- Top Tag -->
            <div class="relative z-10">
              <span class="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 border border-amber-400/40 backdrop-blur-md">
                ${escapeHtml(config.featuredBook.genre || "Official Edition")}
              </span>
            </div>

            <!-- Dynamic Typeset Center/Bottom -->
            <div class="relative z-10 space-y-2 pt-8">
              <h3 class="text-2xl sm:text-3xl font-heading font-black text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)] tracking-tight leading-tight">
                ${escapeHtml(config.featuredBook.title)}
              </h3>
              ${config.featuredBook.subtitle ? `
                <p class="text-xs font-serif italic text-amber-200/90 drop-shadow line-clamp-2 max-w-[240px] mx-auto">
                  ${escapeHtml(config.featuredBook.subtitle)}
                </p>
              ` : ""}
              <div class="pt-3">
                <span class="inline-block text-xs font-mono font-bold uppercase tracking-widest text-amber-400 drop-shadow-md px-3 py-1 rounded-lg bg-black/60 border border-white/20">
                  ${escapeHtml(config.authorName)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>

  <!-- ========================================================================= -->
  <!-- FEATURED BOOK & SAMPLE CHAPTER -->
  <!-- ========================================================================= -->
  <section id="books" class="py-16 sm:py-20 border-b" style="border-color: ${config.cardBackgroundColor}">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
      <div class="text-center space-y-2 max-w-2xl mx-auto">
        <span class="text-xs font-mono uppercase tracking-widest font-bold" style="color: ${config.primaryColor}">Featured Release</span>
        <h2 class="text-3xl sm:text-4xl font-heading font-black" style="color: ${config.textColor}">
          ${escapeHtml(config.featuredBook.title)}
        </h2>
        <p class="text-sm" style="color: ${config.textMutedColor}">
          ${escapeHtml(config.featuredBook.subtitle || config.featuredBook.tagline)}
        </p>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 sm:p-8 rounded-3xl border shadow-xl" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}30;">
        <div class="lg:col-span-4 flex justify-center">
          <div class="relative rounded-2xl overflow-hidden shadow-2xl border flex flex-col justify-between p-5 aspect-[2/3] max-w-[280px] w-full text-center" style="border-color: ${config.primaryColor}40; background-color: #0c0a09;">
            <img src="${escapeHtml(config.featuredBook.coverUrl || '')}" alt="${escapeHtml(config.featuredBook.title)}" class="absolute inset-0 w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/80 pointer-events-none"></div>
            
            <div class="relative z-10">
              <span class="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 border border-amber-400/40 backdrop-blur-md">
                ${escapeHtml(config.featuredBook.genre)}
              </span>
            </div>

            <div class="relative z-10 space-y-1.5 pt-6">
              <div class="font-heading font-black text-xl text-white drop-shadow leading-tight">
                ${escapeHtml(config.featuredBook.title)}
              </div>
              ${config.featuredBook.subtitle ? `
                <div class="text-[11px] font-serif italic text-amber-200/90 drop-shadow line-clamp-2">
                  ${escapeHtml(config.featuredBook.subtitle)}
                </div>
              ` : ""}
              <div class="pt-2">
                <span class="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-400 px-2 py-0.5 rounded bg-black/50 border border-white/10">
                  ${escapeHtml(config.authorName)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="lg:col-span-8 space-y-5 flex flex-col justify-between">
          <div class="space-y-4">
            <div class="flex items-center space-x-2">
              <span class="px-2.5 py-1 rounded text-xs font-mono font-semibold" style="background-color: ${config.primaryColor}20; color: ${config.primaryColor};">
                ${escapeHtml(config.featuredBook.genre)}
              </span>
              <span class="text-xs font-mono" style="color: ${config.textMutedColor}">
                ${escapeHtml(config.featuredBook.price || '')}
              </span>
            </div>

            <p class="text-base leading-relaxed" style="color: ${config.textColor}">
              ${escapeHtml(config.featuredBook.synopsis)}
            </p>

            ${config.featuredBook.sampleChapterTitle ? `
              <div id="sample" class="p-4 rounded-xl border mt-4" style="background-color: ${config.backgroundColor}; border-color: ${config.primaryColor}20;">
                <h4 class="font-heading font-bold text-sm mb-2" style="color: ${config.primaryColor}">
                  📖 Excerpt: ${escapeHtml(config.featuredBook.sampleChapterTitle)}
                </h4>
                <p class="text-xs leading-relaxed italic" style="color: ${config.textMutedColor}">
                  "${escapeHtml(config.featuredBook.sampleChapterExcerpt || '')}"
                </p>
              </div>
            ` : ""}
          </div>

          <!-- Retailer Buy Buttons Grid -->
          <div id="order" class="space-y-2 pt-4 border-t" style="border-color: ${config.primaryColor}20">
            <div class="text-xs font-mono font-semibold" style="color: ${config.textMutedColor}">Order Your Copy Now:</div>
            <div class="flex flex-wrap gap-2.5">
              ${config.featuredBook.amazonUrl ? `<a href="${escapeHtml(config.featuredBook.amazonUrl)}" target="_blank" class="px-4 py-2 rounded-lg font-bold text-xs shadow hover:opacity-90" style="background-color: ${config.primaryColor}; color: #ffffff;">Amazon Kindle / Paperback</a>` : ""}
              ${config.featuredBook.appleBooksUrl ? `<a href="${escapeHtml(config.featuredBook.appleBooksUrl)}" target="_blank" class="px-4 py-2 rounded-lg font-medium text-xs border hover:opacity-80" style="background-color: ${config.backgroundColor}; border-color: ${config.primaryColor}40; color: ${config.textColor}">Apple Books</a>` : ""}
              ${config.featuredBook.barnesNobleUrl ? `<a href="${escapeHtml(config.featuredBook.barnesNobleUrl)}" target="_blank" class="px-4 py-2 rounded-lg font-medium text-xs border hover:opacity-80" style="background-color: ${config.backgroundColor}; border-color: ${config.primaryColor}40; color: ${config.textColor}">Barnes & Noble</a>` : ""}
              ${config.featuredBook.koboUrl ? `<a href="${escapeHtml(config.featuredBook.koboUrl)}" target="_blank" class="px-4 py-2 rounded-lg font-medium text-xs border hover:opacity-80" style="background-color: ${config.backgroundColor}; border-color: ${config.primaryColor}40; color: ${config.textColor}">Kobo</a>` : ""}
              ${config.featuredBook.signedPaperbackUrl ? `<a href="${escapeHtml(config.featuredBook.signedPaperbackUrl)}" target="_blank" class="px-4 py-2 rounded-lg font-bold text-xs border hover:opacity-80" style="background-color: ${config.secondaryColor}20; border-color: ${config.secondaryColor}; color: ${config.secondaryColor}">✍️ Signed Collector's Hardcover</a>` : ""}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================= -->
  <!-- ABOUT THE AUTHOR -->
  <!-- ========================================================================= -->
  <section id="about" class="py-16 sm:py-20 border-b" style="border-color: ${config.cardBackgroundColor}">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
      <div class="lg:col-span-4 flex justify-center">
        <div class="relative">
          <img src="${escapeHtml(config.authorPhotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80')}" alt="${escapeHtml(config.authorName)}" class="rounded-3xl shadow-2xl w-64 sm:w-72 aspect-square object-cover border-2" style="border-color: ${config.primaryColor}50;" />
          <div class="absolute -bottom-3 -right-3 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-md" style="background-color: ${config.primaryColor}; color: #ffffff;">
            📍 ${escapeHtml(config.location || 'Author Realm')}
          </div>
        </div>
      </div>

      <div class="lg:col-span-8 space-y-4">
        <span class="text-xs font-mono uppercase tracking-widest font-bold" style="color: ${config.primaryColor}">Meet the Author</span>
        <h2 class="text-3xl sm:text-4xl font-heading font-black" style="color: ${config.textColor}">
          ${escapeHtml(config.authorName)}
        </h2>
        <p class="text-base leading-relaxed" style="color: ${config.textColor}">
          ${escapeHtml(config.bio)}
        </p>

        ${config.showEthicalAiBadge ? `
          <div class="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl border text-xs font-medium" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}30; color: ${config.textMutedColor}">
            <span>🛡️ Certified 100% Human-Created Heart & Soul Narrative Pledge</span>
          </div>
        ` : ""}

        ${config.showMediaKit ? `
          <div class="pt-2">
            <a href="${escapeHtml(config.mediaKitUrl || '#')}" class="inline-flex items-center space-x-2 text-xs font-mono font-semibold hover:underline" style="color: ${config.primaryColor}">
              <span>📦 Download Official Press Kit & Author Headshots →</span>
            </a>
          </div>
        ` : ""}

        ${config.showPublisherBox !== false && config.publisherName ? `
          <div id="publisher" class="mt-6 p-5 rounded-2xl border space-y-2" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}35;">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-[11px] font-mono uppercase tracking-widest font-bold" style="color: ${config.primaryColor}">
                Publisher &amp; Imprint
              </span>
              ${config.publisherIsbn ? `
                <span class="text-[11px] font-mono" style="color: ${config.textMutedColor}">
                  ISBN: ${escapeHtml(config.publisherIsbn)}
                </span>
              ` : ""}
            </div>
            <div class="text-lg font-heading font-bold" style="color: ${config.textColor}">
              ${escapeHtml(config.publisherName)}
            </div>
            ${config.publisherLocation ? `
              <div class="text-xs font-mono" style="color: ${config.textMutedColor}">
                ${escapeHtml(config.publisherLocation)}
              </div>
            ` : ""}
            ${config.publisherTagline ? `
              <p class="text-xs leading-relaxed" style="color: ${config.textMutedColor}">
                ${escapeHtml(config.publisherTagline)}
              </p>
            ` : ""}
            ${config.publisherWebsiteUrl ? `
              <div class="pt-1">
                <a href="${escapeHtml(config.publisherWebsiteUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center space-x-1 text-xs font-mono font-semibold hover:underline" style="color: ${config.primaryColor}">
                  <span>Visit Publisher Imprint →</span>
                </a>
              </div>
            ` : ""}
          </div>
        ` : ""}
      </div>
    </div>
  </section>

  <!-- ========================================================================= -->
  <!-- VIP NEWSLETTER LEAD MAGNET -->
  <!-- ========================================================================= -->
  <section id="newsletter" class="py-16 sm:py-24 border-b relative overflow-hidden" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}30;">
    <div class="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
      <span class="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider" style="background-color: ${config.primaryColor}20; color: ${config.primaryColor};">
        🎁 VIP Reader Circle
      </span>

      <h2 class="text-3xl sm:text-5xl font-heading font-black" style="color: ${config.textColor}">
        ${escapeHtml(config.newsletterHeadline)}
      </h2>

      <p class="text-base max-w-xl mx-auto" style="color: ${config.textMutedColor}">
        ${escapeHtml(config.newsletterSubtitle)}
      </p>

      <div class="p-6 rounded-2xl border max-w-lg mx-auto space-y-4 shadow-xl" style="background-color: ${config.backgroundColor}; border-color: ${config.primaryColor}40;">
        <div class="text-sm font-heading font-bold" style="color: ${config.primaryColor}">
          ✦ ${escapeHtml(config.newsletterLeadMagnetTitle)}
        </div>
        <p class="text-xs" style="color: ${config.textMutedColor}">
          ${escapeHtml(config.newsletterLeadMagnetDescription)}
        </p>

        <form onsubmit="event.preventDefault(); document.getElementById('newsletter-success').classList.remove('hidden'); this.classList.add('hidden');" class="space-y-3">
          <input type="text" placeholder="Your First Name" required class="w-full px-4 py-2.5 text-xs rounded-xl border focus:outline-none" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}30; color: ${config.textColor}" />
          <input type="email" placeholder="Your Best Email Address" required class="w-full px-4 py-2.5 text-xs rounded-xl border focus:outline-none" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}30; color: ${config.textColor}" />
          <button type="submit" class="w-full py-3 rounded-xl font-heading font-bold text-xs shadow-lg transition-all hover:opacity-90 cursor-pointer" style="background-color: ${config.primaryColor}; color: #ffffff;">
            ${escapeHtml(config.newsletterButtonText)} →
          </button>
        </form>

        <div id="newsletter-success" class="hidden p-4 rounded-xl border text-center space-y-2" style="background-color: ${config.primaryColor}15; border-color: ${config.primaryColor}; color: ${config.textColor}">
          <div class="font-bold text-xs text-primary">🎉 Welcome to the Guild!</div>
          <div class="text-xs text-siteMuted">Check your inbox for your free download link.</div>
        </div>
      </div>
    </div>
  </section>

  <!-- ========================================================================= -->
  <!-- REVIEWS & ENDORSEMENTS -->
  <!-- ========================================================================= -->
  ${config.showReviews && config.reviews.length > 0 ? `
    <section id="reviews" class="py-16 sm:py-20 border-b" style="border-color: ${config.cardBackgroundColor}">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 space-y-10">
        <div class="text-center space-y-2">
          <span class="text-xs font-mono uppercase tracking-widest font-bold" style="color: ${config.primaryColor}">Critical Acclaim</span>
          <h2 class="text-3xl font-heading font-black" style="color: ${config.textColor}">Praise & Reviews</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          ${config.reviews.map(r => `
            <div class="p-6 rounded-2xl border space-y-3 flex flex-col justify-between" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}20;">
              <div class="space-y-2">
                <div class="text-amber-400 text-sm">★★★★★</div>
                <p class="text-xs leading-relaxed italic" style="color: ${config.textColor}">
                  "${escapeHtml(r.quote)}"
                </p>
              </div>
              <div class="pt-3 border-t text-[11px]" style="border-color: ${config.primaryColor}20">
                <div class="font-bold" style="color: ${config.primaryColor}">${escapeHtml(r.reviewerName)}</div>
                <div style="color: ${config.textMutedColor}">${escapeHtml(r.reviewerTitle)}</div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  ` : ""}

  <!-- ========================================================================= -->
  <!-- CONTACT & PLATFORMS FOOTER -->
  <!-- ========================================================================= -->
  <footer id="contact" class="py-16 border-t" style="background-color: ${config.backgroundColor}; border-color: ${config.cardBackgroundColor}">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 space-y-12">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
        <div class="space-y-3">
          <h3 class="text-2xl font-heading font-bold" style="color: ${config.textColor}">
            Connect with ${escapeHtml(config.authorName)}
          </h3>
          <p class="text-xs max-w-md" style="color: ${config.textMutedColor}">
            For literary inquiries, speaking engagements, ARC reviews, or fan mail:
          </p>
          <div class="font-mono text-xs" style="color: ${config.primaryColor}">
            ✉️ ${escapeHtml(config.contactEmail || 'contact@yourauthorname.com')}
          </div>
        </div>

        <!-- Major Platforms Grid -->
        <div class="flex flex-wrap gap-2.5 justify-start md:justify-end">
          ${activePlatforms.map(p => `
            <a href="${escapeHtml(p.authorUrl)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 rounded-lg text-xs font-medium border hover:opacity-80 transition-all flex items-center space-x-1.5" style="background-color: ${config.cardBackgroundColor}; border-color: ${config.primaryColor}30; color: ${config.textColor}">
              <span>✦</span>
              <span>${escapeHtml(p.name)}</span>
            </a>
          `).join("")}
        </div>
      </div>

      <div class="pt-8 border-t text-center text-xs space-y-1" style="border-color: ${config.cardBackgroundColor}; color: ${config.textMutedColor}">
        <div>© ${new Date().getFullYear()} ${escapeHtml(config.authorName)}${config.publisherName ? ` · Published by ${escapeHtml(config.publisherName)}${config.publisherLocation ? ` (${escapeHtml(config.publisherLocation)})` : ""}` : ""}. All Rights Reserved.</div>
        <div class="text-[10px] opacity-75">Generated with TomeCrafter Author Studio</div>
      </div>
    </div>
  </footer>

</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
