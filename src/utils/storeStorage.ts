import { StoreConfig, StoreProduct, StoreOrder } from "../types";
import { OMEGA_HUB_DEFAULT_URL } from "./ecosystemLogos";

export const STORE_CONFIG_KEY = "tomecrafter_store_config_v1";
export const STORE_PRODUCTS_KEY = "tomecrafter_store_products_v1";
export const STORE_ORDERS_KEY = "tomecrafter_store_orders_v1";

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  id: "store-main-default",
  storeName: "The Literary Forge & Emporium",
  authorSlug: "cody-germain",
  tagline: "Official Signed Hardcovers, Luxury Editions & Exclusive Bookish Merchandise",
  bioSnippet: "Direct from the author's personal study. Every physical book is hand-signed and certified with the 50% Creator Fund guarantee.",
  bannerImageUrl: "https://images.unsplash.com/photo-1507842229451-79b1be886a29?auto=format&fit=crop&w=1600&q=80",
  logoImageUrl: "",
  currency: "USD",
  themeColor: "amber",
  headerLayout: "hero_banner",
  noticeBannerText: "✨ Hand-signed with custom dedication wax seal. Free worldwide shipping on orders over $50!",
  enableNoticeBanner: true,
  freeShippingThresholdUsd: 50,
  contactEmail: "codygermain032@gmail.com",
  socialLinks: {
    website: "https://tomecrafter.ai.studio",
    twitter: "https://twitter.com/tomecrafter",
    instagram: "https://instagram.com/tomecrafter",
    substack: "https://substack.com/@codygermain",
  },
  omegaSettlement: {
    accountId: "omega_covenant_app_pub_01",
    isConnected: true,
    accountStatus: "active",
    chargesEnabled: true,
    payoutsEnabled: true,
    country: "US",
    defaultCurrency: "USD",
    fundSplitActive: true,
    fundSplitPercent: 50,
    testMode: false,
    omegaHubUrl: OMEGA_HUB_DEFAULT_URL,
    lastPayoutAmount: 0,
  },
  customDomain: "store.codygermain.com",
  shareableUrl: "https://tomecrafter.ai.studio/store/cody-germain",
  allowGuestCheckout: true,
  isPublished: true,
  lastUpdated: new Date().toISOString(),
};

export const INITIAL_STORE_PRODUCTS: StoreProduct[] = [
  {
    id: "prod-1",
    title: "Shadows Over Eldoria (Signed Deluxe Hardcover)",
    subtitle: "Gold Foil Stamped Spine • Hand-Numbered & Embossed",
    category: "books_physical",
    price: 34.99,
    originalPrice: 42.00,
    currency: "USD",
    description: "An heirloom-grade collector's edition of 'Shadows Over Eldoria'. Features Smyth-sewn binding, custom gold-gilded edges, a silk ribbon bookmark, and the author's signature with a real wax seal of House Eldoria.",
    highlights: [
      "Hand-signed by author Cody Germain",
      "Gold foil embossed dust jacket and cloth casing",
      "Exclusive color foldout map of the Silver Marches",
      "Includes 2 bonus author's commentary chapters",
    ],
    imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80",
    inventoryStatus: "in_stock",
    stockQuantity: 42,
    sku: "SOE-HC-SIGN-01",
    isFeatured: true,
    isDigital: false,
    externalPurchaseLinks: [
      {
        id: "link-amz-1",
        platformName: "Amazon KDP Hardcover",
        url: "https://amazon.com/dp/B0DELUXE01",
        iconType: "amazon",
        badgeText: "Prime 1-Day",
      },
      {
        id: "link-bn-1",
        platformName: "Barnes & Noble",
        url: "https://barnesandnoble.com/s/Shadows+Over+Eldoria",
        iconType: "book",
        badgeText: "B&N Press",
      },
    ],
    tags: ["Bestseller", "Signed", "Hardcover", "Fantasy"],
    specs: {
      format: "Hardcover (Foil Stamped Cloth)",
      dimensions: "6.14 x 9.21 in",
      pageCount: 432,
      isbn: "978-1-987654-32-1",
      shippingEstimateDays: "2-3 business days",
    },
    royaltyContributionPercent: 50,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-10T12:00:00Z",
  },
  {
    id: "prod-2",
    title: "The Whispering Quill (Embroidered Heavyweight Hoodie)",
    subtitle: "100% Organic Ring-Spun Cotton • Literary Minimalist",
    category: "apparel",
    price: 48.00,
    originalPrice: 55.00,
    currency: "USD",
    description: "Ultra-plush 400 GSM heavyweight pullover hoodie featuring an intricately embroidered feather quill and subtle runes down the left sleeve. Designed for late-night writing marathons and cozy reading sessions.",
    highlights: [
      "Custom high-density chest embroidery",
      "Double-layered fleece lined hood",
      "Concealed headphone cable loop in pouch pocket",
      "Pre-shrunk organic ring-spun cotton blend",
    ],
    imageUrl: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80",
    inventoryStatus: "in_stock",
    stockQuantity: 28,
    sku: "TWQ-HOOD-BLK",
    isFeatured: true,
    isDigital: false,
    externalPurchaseLinks: [
      {
        id: "link-printful-1",
        platformName: "Direct Print-on-Demand",
        url: "https://tomecrafter.merch.store/whispering-quill-hoodie",
        iconType: "store",
        badgeText: "Fast Global Fulfillment",
      },
    ],
    tags: ["Apparel", "Merchandise", "Writing Swag", "Cozy"],
    specs: {
      format: "Heavyweight 400 GSM Cotton",
      dimensions: "Unisex S / M / L / XL / 2XL",
      shippingEstimateDays: "3-5 business days",
    },
    royaltyContributionPercent: 50,
    createdAt: "2026-08-05T14:20:00Z",
    updatedAt: "2026-08-12T09:15:00Z",
  },
  {
    id: "prod-3",
    title: "Cartographer's Realm Map (Archival Velvet Art Print)",
    subtitle: "18x24 Hand-Illustrated Realm of Eldoria • 310gsm Rag",
    category: "art_prints",
    price: 24.50,
    currency: "USD",
    description: "A museum-quality giclée fine art print of the high-fantasy world map created in the TomeCrafter World Codex. Printed on 310gsm 100% cotton archival rag with antique sepia inks.",
    highlights: [
      "Hand-numbered limited run of 250 copies",
      "Archival pigment inks rated for 100+ years lightfastness",
      "Shipped rolled in a heavy-duty protective craft tube",
    ],
    imageUrl: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
    inventoryStatus: "in_stock",
    stockQuantity: 75,
    sku: "ELD-MAP-1824",
    isFeatured: false,
    isDigital: false,
    externalPurchaseLinks: [],
    tags: ["Art", "Map", "Worldbuilding", "Fine Art"],
    specs: {
      format: "Museum Archival Giclée Print",
      dimensions: "18 x 24 in",
      shippingEstimateDays: "2-4 business days",
    },
    royaltyContributionPercent: 50,
    createdAt: "2026-08-08T11:00:00Z",
    updatedAt: "2026-08-14T16:00:00Z",
  },
  {
    id: "prod-4",
    title: "The Scribe's Elixir (15oz Matte Ceramic Author Mug)",
    subtitle: "'Fueling the Next Chapter' • Microwave & Dishwasher Safe",
    category: "drinkware",
    price: 18.00,
    currency: "USD",
    description: "Substantial 15oz matte ceramic mug with deep charcoal interior and gold-embossed author emblem. Comfortable ergonomic handle engineered for long revision sessions.",
    highlights: [
      "Large 15oz capacity for coffee, tea, or midnight potions",
      "Scratch-resistant ceramic glaze",
      "Lead and BPA free certified",
    ],
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
    inventoryStatus: "in_stock",
    stockQuantity: 60,
    sku: "MUG-SCRIBE-15OZ",
    isFeatured: false,
    isDigital: false,
    externalPurchaseLinks: [],
    tags: ["Mug", "Drinkware", "Merch", "Coffee"],
    specs: {
      format: "Matte Stoneware Ceramic",
      dimensions: "15 oz (450 ml)",
      shippingEstimateDays: "2-3 business days",
    },
    royaltyContributionPercent: 50,
    createdAt: "2026-08-09T09:30:00Z",
    updatedAt: "2026-08-15T11:20:00Z",
  },
  {
    id: "prod-5",
    title: "The Eldoria Codex & Unabridged Audio Master Bundle (Digital)",
    subtitle: "ePub + DRM-Free M4B Audiobook + High-Res World Bible",
    category: "books_digital",
    price: 14.99,
    originalPrice: 22.00,
    currency: "USD",
    description: "Instant high-fidelity digital delivery. Includes DRM-free ePub for Kindle/Apple Books/Kobo, 320kbps full-cast unabridged audiobook file, and the 68-page PDF behind-the-scenes World Codex.",
    highlights: [
      "Immediate one-click download link sent to your email",
      "DRM-free files compatible with all e-readers and phones",
      "Includes 12 full-color digital character portraits",
    ],
    imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
    inventoryStatus: "in_stock",
    stockQuantity: 9999,
    sku: "DIG-SOE-BUNDLE",
    isFeatured: true,
    isDigital: true,
    digitalDownloadUrl: "https://tomecrafter.ai.studio/downloads/eldoria-master-bundle.zip",
    externalPurchaseLinks: [
      {
        id: "link-apple-1",
        platformName: "Apple Books eBook",
        url: "https://books.apple.com/us/book/shadows-over-eldoria/id12345678",
        iconType: "book",
        badgeText: "Apple Books",
      },
      {
        id: "link-kobo-1",
        platformName: "Rakuten Kobo",
        url: "https://kobo.com/us/en/ebook/shadows-over-eldoria",
        iconType: "book",
        badgeText: "Kobo Plus",
      },
    ],
    tags: ["Digital", "eBook", "Audiobook", "Instant Access"],
    specs: {
      format: "DRM-Free ePub, M4B Audiobook, PDF",
      shippingEstimateDays: "Instant Digital Delivery",
    },
    royaltyContributionPercent: 50,
    createdAt: "2026-08-11T13:00:00Z",
    updatedAt: "2026-08-16T10:00:00Z",
  },
  {
    id: "prod-6",
    title: "Dragon Crest & Scribe Enamel Pin Set (Dual Pack)",
    subtitle: "Hard Enamel with Gold Plating & Rubber Clutch Backs",
    category: "accessories",
    price: 15.00,
    currency: "USD",
    description: "Collector's two-piece hard enamel pin set showcasing the TomeCrafter Quill and the Dragon Crest of Eldoria. Polished smooth with rich gold plating on custom backing cards.",
    highlights: [
      "Dual rubber pin clutches for secure hold on jackets or totes",
      "Hand-filled cloisonné-style hard enamel",
      "Includes signed backing card with serial number",
    ],
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80",
    inventoryStatus: "in_stock",
    stockQuantity: 110,
    sku: "PIN-DRAGON-QUILL",
    isFeatured: false,
    isDigital: false,
    externalPurchaseLinks: [],
    tags: ["Pins", "Collectibles", "Enamel", "Accessories"],
    specs: {
      format: "Hard Enamel / Gold Plated Zinc Alloy",
      dimensions: "1.5 in (38mm) each",
      shippingEstimateDays: "2-3 business days",
    },
    royaltyContributionPercent: 50,
    createdAt: "2026-08-12T16:00:00Z",
    updatedAt: "2026-08-17T09:00:00Z",
  },
];

export function getStoredStoreConfig(): StoreConfig {
  try {
    const saved = localStorage.getItem(STORE_CONFIG_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (!parsed.omegaSettlement) {
        parsed.omegaSettlement = { ...DEFAULT_STORE_CONFIG.omegaSettlement };
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error reading store config:", e);
  }
  return DEFAULT_STORE_CONFIG;
}

export function saveStoredStoreConfig(config: StoreConfig): void {
  try {
    config.lastUpdated = new Date().toISOString();
    config.shareableUrl = `https://tomecrafter.ai.studio/store/${config.authorSlug || "author"}`;
    localStorage.setItem(STORE_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error("Error saving store config:", e);
  }
}

export function getStoredStoreProducts(): StoreProduct[] {
  try {
    const saved = localStorage.getItem(STORE_PRODUCTS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading store products:", e);
  }
  return INITIAL_STORE_PRODUCTS;
}

export function saveStoredStoreProducts(products: StoreProduct[]): void {
  try {
    localStorage.setItem(STORE_PRODUCTS_KEY, JSON.stringify(products));
  } catch (e) {
    console.error("Error saving store products:", e);
  }
}

export function getStoredStoreOrders(): StoreOrder[] {
  try {
    const saved = localStorage.getItem(STORE_ORDERS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error("Error reading store orders:", e);
  }
  return [
    {
      id: "ord-1001",
      orderNumber: "TC-88291",
      customerName: "Eleanor Vance",
      customerEmail: "eleanor.vance@highfantasy.org",
      items: [
        {
          productId: "prod-1",
          title: "Shadows Over Eldoria (Signed Deluxe Hardcover)",
          quantity: 1,
          unitPrice: 34.99,
          imageUrl: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=400&q=80",
        },
        {
          productId: "prod-4",
          title: "The Scribe's Elixir (15oz Matte Ceramic Author Mug)",
          quantity: 1,
          unitPrice: 18.00,
          imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80",
        },
      ],
      subtotal: 52.99,
      shipping: 0, // Qualified for free shipping
      tax: 4.24,
      total: 57.23,
      currency: "USD",
      fundContributionAmount: 28.61, // 50% split
      status: "processing",
      shippingAddress: {
        line1: "742 Evergreen Terrace",
        city: "Springfield",
        state: "OR",
        postalCode: "97477",
        country: "US",
      },
      createdAt: "2026-08-20T18:42:00Z",
    },
    {
      id: "ord-1002",
      orderNumber: "TC-88292",
      customerName: "Julian Thorne",
      customerEmail: "jthorne@guildmaster.io",
      items: [
        {
          productId: "prod-5",
          title: "The Eldoria Codex & Unabridged Audio Master Bundle (Digital)",
          quantity: 1,
          unitPrice: 14.99,
          imageUrl: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
        },
      ],
      subtotal: 14.99,
      shipping: 0,
      tax: 0,
      total: 14.99,
      currency: "USD",
      fundContributionAmount: 7.49,
      status: "paid",
      createdAt: "2026-08-21T09:12:00Z",
    },
  ];
}

export function saveStoredStoreOrders(orders: StoreOrder[]): void {
  try {
    localStorage.setItem(STORE_ORDERS_KEY, JSON.stringify(orders));
  } catch (e) {
    console.error("Error saving store orders:", e);
  }
}
