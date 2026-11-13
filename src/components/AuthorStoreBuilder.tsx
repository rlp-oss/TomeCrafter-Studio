import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  ShoppingBag,
  Plus,
  Edit,
  Trash2,
  ExternalLink,
  Share2,
  QrCode,
  CreditCard,
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Eye,
  Settings,
  Package,
  BookOpen,
  DollarSign,
  TrendingUp,
  Tag,
  Layers,
  ArrowRight,
  ShieldCheck,
  Coins,
  RefreshCw,
  X,
  Minus,
  Truck,
  Download,
  Flame,
  Globe,
  Sliders,
  Code,
  Heart,
  HelpCircle,
} from "lucide-react";
import {
  StoreConfig,
  StoreProduct,
  StoreProductCategory,
  StoreExternalLink,
  StoreOrder,
  StoreCartItem,
  Book,
} from "../types";
import {
  getStoredStoreConfig,
  saveStoredStoreConfig,
  getStoredStoreProducts,
  saveStoredStoreProducts,
  getStoredStoreOrders,
  saveStoredStoreOrders,
} from "../utils/storeStorage";

interface AuthorStoreBuilderProps {
  activeBook?: Book;
  onNavigateTab?: (tab: string) => void;
}

export const AuthorStoreBuilder: React.FC<AuthorStoreBuilderProps> = ({
  activeBook,
  onNavigateTab,
}) => {
  // Store sub-navigation
  const [activeSubTab, setActiveSubTab] = useState<
    "products" | "ai_generator" | "links" | "stripe_connect" | "settings" | "orders" | "preview"
  >("products");

  // Store data state
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(() => getStoredStoreConfig());
  const [products, setProducts] = useState<StoreProduct[]>(() => getStoredStoreProducts());
  const [orders, setOrders] = useState<StoreOrder[]>(() => getStoredStoreOrders());

  // Category filter
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Product Edit/Create Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StoreProduct | null>(null);

  // Form State for editing/creating product
  const [formTitle, setFormTitle] = useState("");
  const [formSubtitle, setFormSubtitle] = useState("");
  const [formCategory, setFormCategory] = useState<StoreProductCategory>("books_physical");
  const [formPrice, setFormPrice] = useState<number>(24.99);
  const [formOriginalPrice, setFormOriginalPrice] = useState<number | undefined>(undefined);
  const [formDescription, setFormDescription] = useState("");
  const [formHighlights, setFormHighlights] = useState<string[]>([""]);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formInventoryStatus, setFormInventoryStatus] = useState<StoreProduct["inventoryStatus"]>("in_stock");
  const [formStockQuantity, setFormStockQuantity] = useState<number>(50);
  const [formSku, setFormSku] = useState("");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formIsDigital, setFormIsDigital] = useState(false);
  const [formDigitalUrl, setFormDigitalUrl] = useState("");
  const [formExternalLinks, setFormExternalLinks] = useState<StoreExternalLink[]>([]);
  const [formFormatSpec, setFormFormatSpec] = useState("");
  const [formDimensionsSpec, setFormDimensionsSpec] = useState("");
  const [formShippingDaysSpec, setFormShippingDaysSpec] = useState("2-4 business days");

  // AI Product Generator state
  const [aiGenCategory, setAiGenCategory] = useState<StoreProductCategory>("books_physical");
  const [aiGenItemName, setAiGenItemName] = useState("");
  const [aiGenTargetPrice, setAiGenTargetPrice] = useState("29.99");
  const [isGeneratingProduct, setIsGeneratingProduct] = useState(false);

  // Link Matrix Manager State
  const [newLinkPlatform, setNewLinkPlatform] = useState("Amazon KDP");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [newLinkBadge, setNewLinkBadge] = useState("Prime 1-Day");
  const [newLinkTargetProduct, setNewLinkTargetProduct] = useState<string>("all");

  // Customer Preview Cart & Checkout State
  const [cart, setCart] = useState<StoreCartItem[]>([]);
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("reader@highfantasy.org");
  const [customerName, setCustomerName] = useState("Alex Rivers");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccessOrder, setCheckoutSuccessOrder] = useState<StoreOrder | null>(null);

  // UI Toast & Action Notification
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Save changes automatically
  useEffect(() => {
    saveStoredStoreConfig(storeConfig);
  }, [storeConfig]);

  useEffect(() => {
    saveStoredStoreProducts(products);
  }, [products]);

  useEffect(() => {
    saveStoredStoreOrders(orders);
  }, [orders]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (product?: StoreProduct) => {
    if (product) {
      setEditingProduct(product);
      setFormTitle(product.title);
      setFormSubtitle(product.subtitle || "");
      setFormCategory(product.category);
      setFormPrice(product.price);
      setFormOriginalPrice(product.originalPrice);
      setFormDescription(product.description);
      setFormHighlights(product.highlights && product.highlights.length > 0 ? product.highlights : [""]);
      setFormImageUrl(product.imageUrl);
      setFormInventoryStatus(product.inventoryStatus);
      setFormStockQuantity(product.stockQuantity ?? 50);
      setFormSku(product.sku || "");
      setFormIsFeatured(product.isFeatured);
      setFormIsDigital(product.isDigital);
      setFormDigitalUrl(product.digitalDownloadUrl || "");
      setFormExternalLinks(product.externalPurchaseLinks || []);
      setFormFormatSpec(product.specs?.format || "");
      setFormDimensionsSpec(product.specs?.dimensions || "");
      setFormShippingDaysSpec(product.specs?.shippingEstimateDays || "2-4 business days");
    } else {
      setEditingProduct(null);
      setFormTitle(activeBook ? `${activeBook.title} (Signed Edition)` : "Signed Deluxe Hardcover");
      setFormSubtitle("Gold Foil Spine • Hand-Signed by Author");
      setFormCategory("books_physical");
      setFormPrice(29.99);
      setFormOriginalPrice(35.00);
      setFormDescription(
        activeBook
          ? `Exclusive author-direct signed copy of '${activeBook.title}'. Includes real wax seal and custom author dedication.`
          : "An exclusive heirloom-grade physical edition directly from the author's studio."
      );
      setFormHighlights([
        "Hand-signed by author with custom wax seal",
        "High quality 70lb acid-free paper",
        "Exclusive author's afterword commentary",
      ]);
      setFormImageUrl(
        activeBook?.coverImageUrl ||
          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80"
      );
      setFormInventoryStatus("in_stock");
      setFormStockQuantity(50);
      setFormSku(`BOOK-${Math.floor(100 + Math.random() * 900)}`);
      setFormIsFeatured(true);
      setFormIsDigital(false);
      setFormDigitalUrl("");
      setFormExternalLinks([]);
      setFormFormatSpec("Hardcover / 6x9 in");
      setFormDimensionsSpec("6 x 9 in");
      setFormShippingDaysSpec("2-3 business days");
    }
    setIsProductModalOpen(true);
  };

  // Save Product
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Product title is required.", "error");
      return;
    }

    const cleanHighlights = formHighlights.filter((h) => h.trim().length > 0);

    const productData: StoreProduct = {
      id: editingProduct ? editingProduct.id : `prod-${Date.now()}`,
      title: formTitle.trim(),
      subtitle: formSubtitle.trim() || undefined,
      category: formCategory,
      price: Number(formPrice) || 0,
      originalPrice: formOriginalPrice ? Number(formOriginalPrice) : undefined,
      currency: storeConfig.currency,
      description: formDescription.trim(),
      highlights: cleanHighlights,
      imageUrl:
        formImageUrl.trim() ||
        "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80",
      inventoryStatus: formInventoryStatus,
      stockQuantity: Number(formStockQuantity) || 0,
      sku: formSku.trim() || undefined,
      isFeatured: formIsFeatured,
      isDigital: formIsDigital,
      digitalDownloadUrl: formDigitalUrl.trim() || undefined,
      externalPurchaseLinks: formExternalLinks,
      tags: [formCategory.replace("_", " ")],
      specs: {
        format: formFormatSpec.trim() || undefined,
        dimensions: formDimensionsSpec.trim() || undefined,
        shippingEstimateDays: formShippingDaysSpec.trim() || undefined,
      },
      royaltyContributionPercent: 50,
      createdAt: editingProduct ? editingProduct.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingProduct) {
      setProducts(products.map((p) => (p.id === editingProduct.id ? productData : p)));
      showToast(`Updated product "${productData.title}"`);
    } else {
      setProducts([productData, ...products]);
      showToast(`Added new product "${productData.title}" to your store!`);
    }

    setIsProductModalOpen(false);
  };

  // Delete Product
  const handleDeleteProduct = (productId: string) => {
    if (confirm("Are you sure you want to remove this product from your store?")) {
      setProducts(products.filter((p) => p.id !== productId));
      showToast("Product removed from catalog.", "success");
    }
  };

  // AI Product Copy Generation
  const handleGenerateAiProduct = async () => {
    setIsGeneratingProduct(true);
    try {
      const response = await axios.post("/api/store/ai-generate-product", {
        category: aiGenCategory,
        title: aiGenItemName || (activeBook ? activeBook.title : "Fantasy Masterpiece"),
        genre: activeBook?.genre || "Epic Fantasy",
        bookPremise: activeBook?.premise || "An epic chronicle of magic and destiny.",
        targetPrice: aiGenTargetPrice || "29.99",
      });

      if (response.data?.success && response.data.productDraft) {
        const draft = response.data.productDraft;
        // Populate modal with draft
        setEditingProduct(null);
        setFormTitle(draft.title || aiGenItemName);
        setFormSubtitle(draft.subtitle || "");
        setFormCategory(aiGenCategory);
        setFormPrice(draft.suggestedPrice || Number(aiGenTargetPrice) || 29.99);
        setFormOriginalPrice(draft.originalPrice);
        setFormDescription(draft.description || "");
        setFormHighlights(draft.highlights && draft.highlights.length > 0 ? draft.highlights : [""]);
        setFormImageUrl(
          aiGenCategory === "apparel"
            ? "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=800&q=80"
            : aiGenCategory === "drinkware"
            ? "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80"
            : aiGenCategory === "art_prints"
            ? "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80"
            : "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80"
        );
        setFormInventoryStatus("in_stock");
        setFormStockQuantity(50);
        setFormSku(`AI-${Math.floor(1000 + Math.random() * 9000)}`);
        setFormIsFeatured(true);
        setFormIsDigital(aiGenCategory === "books_digital" || aiGenCategory === "audiobooks");
        setFormFormatSpec(draft.specs?.format || "");
        setFormDimensionsSpec(draft.specs?.dimensions || "");
        setFormShippingDaysSpec(draft.specs?.shippingEstimateDays || "2-4 business days");

        setIsProductModalOpen(true);
        showToast("AI Generated product copy ready! Review and click Save.");
      }
    } catch (err: any) {
      console.error("AI Product generator error:", err);
      showToast(err.response?.data?.error || "Failed to generate product copy.", "error");
    } finally {
      setIsGeneratingProduct(false);
    }
  };

  // Add Link to Product or Global Catalog
  const handleAddExternalLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLinkUrl.trim()) {
      showToast("Please provide a valid URL.", "error");
      return;
    }

    const newLink: StoreExternalLink = {
      id: `link-${Date.now()}`,
      platformName: newLinkPlatform,
      url: newLinkUrl.trim(),
      iconType:
        newLinkPlatform.toLowerCase().includes("amazon")
          ? "amazon"
          : newLinkPlatform.toLowerCase().includes("audio")
          ? "audio"
          : "book",
      badgeText: newLinkBadge.trim() || undefined,
      isPrimary: true,
    };

    if (newLinkTargetProduct === "all") {
      // Add to all products in catalog
      const updated = products.map((p) => ({
        ...p,
        externalPurchaseLinks: [...p.externalPurchaseLinks, newLink],
      }));
      setProducts(updated);
      showToast(`Added ${newLinkPlatform} link to all ${products.length} products!`);
    } else {
      // Add to specific product
      const updated = products.map((p) =>
        p.id === newLinkTargetProduct
          ? { ...p, externalPurchaseLinks: [...p.externalPurchaseLinks, newLink] }
          : p
      );
      setProducts(updated);
      showToast(`Added ${newLinkPlatform} link to selected product.`);
    }

    setNewLinkUrl("");
  };

  // Stripe Connect Onboarding trigger
  const handleStripeConnectOnboard = async () => {
    try {
      const response = await axios.post("/api/store/connect/onboard", {
        authorEmail: storeConfig.contactEmail,
        storeName: storeConfig.storeName,
        country: storeConfig.stripeConnect.country,
      });

      if (response.data?.success) {
        setStoreConfig({
          ...storeConfig,
          stripeConnect: {
            ...storeConfig.stripeConnect,
            accountId: response.data.accountId,
            isConnected: true,
            accountStatus: "active",
            chargesEnabled: true,
            payoutsEnabled: true,
          },
        });
        showToast("Stripe Connect Express successfully connected with 50% Fund Routing!");
      }
    } catch (e) {
      showToast("Failed to connect Stripe account.", "error");
    }
  };

  // Copy Store Link to Clipboard
  const handleCopyStoreLink = () => {
    navigator.clipboard.writeText(storeConfig.shareableUrl);
    setCopiedLink(true);
    showToast("Shareable Storefront URL copied to clipboard!");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  // Cart operations in Customer Live Preview
  const handleAddToCart = (product: StoreProduct) => {
    const existing = cart.find((i) => i.product.id === product.id);
    if (existing) {
      setCart(
        cart.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
    setIsCartDrawerOpen(true);
  };

  const handleUpdateCartQty = (productId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as StoreCartItem[]
    );
  };

  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );
  const cartShipping =
    cartSubtotal >= (storeConfig.freeShippingThresholdUsd || 50) ? 0 : 4.99;
  const cartTax = +(cartSubtotal * 0.08).toFixed(2);
  const cartTotal = +(cartSubtotal + cartShipping + cartTax).toFixed(2);
  const cartFundSplit = +(cartTotal * 0.5).toFixed(2);

  // Execute Simulated Stripe Checkout
  const handleSimulateCheckout = async () => {
    if (cart.length === 0) return;
    setIsCheckingOut(true);

    try {
      const itemsPayload = cart.map((i) => ({
        productId: i.product.id,
        title: i.product.title,
        quantity: i.quantity,
        unitPrice: i.product.price,
        imageUrl: i.product.imageUrl,
      }));

      const response = await axios.post("/api/store/create-checkout-session", {
        items: itemsPayload,
        customerEmail,
        customerName,
        authorSlug: storeConfig.authorSlug,
        currency: storeConfig.currency,
      });

      if (response.data?.success && response.data.order) {
        const newOrder: StoreOrder = response.data.order;
        setOrders([newOrder, ...orders]);
        setCheckoutSuccessOrder(newOrder);
        setCart([]);
        showToast("Stripe Checkout completed! 50% routed to Creator Fund.");
      }
    } catch (err) {
      showToast("Checkout simulation failed.", "error");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Filtered Products
  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.subtitle && p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-stone-950 text-stone-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-[#19150e] to-stone-900 border border-amber-500/30 rounded-2xl p-5 shadow-2xl">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 p-2 shadow-lg shadow-amber-950/50 shrink-0">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-serif font-bold text-stone-100 flex items-center gap-2">
                <span>Author Book & Merchandise Store Builder</span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Stripe Connect
                </span>
              </h1>
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center space-x-1">
                <Coins className="w-3 h-3 text-emerald-400" />
                <span>50% Creator Fund Routing</span>
              </span>
            </div>
            <p className="text-xs text-stone-300 mt-1 max-w-3xl leading-relaxed">
              Build your custom author storefront for signed hardcovers, paperbacks, exclusive apparel, mugs, art prints, and digital bundles with direct Stripe Connect checkout and shareable URL.
            </p>
          </div>
        </div>

        {/* Action Controls: Shareable URL & Live Preview */}
        <div className="flex flex-wrap items-center gap-2.5 self-start xl:self-auto">
          {/* Shareable URL Copy Button */}
          <div className="flex items-center bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 space-x-2 text-xs">
            <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="font-mono text-[11px] text-stone-300 max-w-[140px] sm:max-w-[200px] truncate">
              {storeConfig.shareableUrl}
            </span>
            <button
              onClick={handleCopyStoreLink}
              className="p-1 hover:text-amber-400 text-stone-400 transition-colors"
              title="Copy Storefront URL"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Add Product Button */}
          <button
            onClick={() => handleOpenEditProduct()}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg shadow-amber-950/60 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>

          {/* Customer Live Preview Button */}
          <button
            onClick={() => setActiveSubTab("preview")}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-stone-950 font-bold text-xs shadow-lg transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Live Storefront Preview</span>
          </button>
        </div>
      </div>

      {/* Sub-Navigation Bar */}
      <div className="flex items-center space-x-1 bg-stone-900/90 p-1.5 rounded-2xl border border-stone-800 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab("products")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === "products"
              ? "bg-amber-500 text-stone-950 font-bold shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Product Catalog ({products.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("ai_generator")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === "ai_generator"
              ? "bg-amber-500 text-stone-950 font-bold shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>AI Product & Merch Writer</span>
        </button>

        <button
          onClick={() => setActiveSubTab("links")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === "links"
              ? "bg-amber-500 text-stone-950 font-bold shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <LinkIcon className="w-4 h-4" />
          <span>External Buy Links & Matrix</span>
        </button>

        <button
          onClick={() => setActiveSubTab("stripe_connect")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === "stripe_connect"
              ? "bg-amber-500 text-stone-950 font-bold shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Stripe Connect & 50% Split</span>
        </button>

        <button
          onClick={() => setActiveSubTab("settings")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === "settings"
              ? "bg-amber-500 text-stone-950 font-bold shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Store Settings & QR Share</span>
        </button>

        <button
          onClick={() => setActiveSubTab("orders")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
            activeSubTab === "orders"
              ? "bg-amber-500 text-stone-950 font-bold shadow"
              : "text-stone-400 hover:text-stone-200"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Orders & Fund Ledger ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab("preview")}
          className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ml-auto ${
            activeSubTab === "preview"
              ? "bg-emerald-500 text-stone-950 font-bold shadow"
              : "text-emerald-400 hover:text-emerald-300"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Customer Live View</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`px-4 py-3 rounded-xl border flex items-center justify-between text-xs font-medium shadow-xl ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          <div className="flex items-center space-x-2">
            {toastMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-stone-200 text-xs font-mono"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 1: PRODUCT & MERCHANDISE CATALOG */}
      {/* ========================================================================= */}
      {activeSubTab === "products" && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Active Products</div>
              <div className="text-xl font-bold text-amber-400 font-serif">{products.length}</div>
              <div className="text-[10px] text-stone-500">Books & Merch in Catalog</div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Stripe Connect Status</div>
              <div className="text-sm font-bold text-emerald-400 flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Connected (Active)</span>
              </div>
              <div className="text-[10px] text-stone-500">Express Payouts Enabled</div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">50% Fund Split</div>
              <div className="text-xl font-bold text-emerald-300 font-serif">50.0%</div>
              <div className="text-[10px] text-emerald-400/80">Creator Fund Routing</div>
            </div>

            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 space-y-1">
              <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider">Total Sales Volume</div>
              <div className="text-xl font-bold text-stone-100 font-serif">
                ${orders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}
              </div>
              <div className="text-[10px] text-stone-500">{orders.length} orders fulfilled</div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-3.5 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <input
                type="text"
                placeholder="Search products by title, format, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-3.5 pr-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end overflow-x-auto scrollbar-none">
              <span className="text-xs text-stone-400 font-medium whitespace-nowrap">Category:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Categories ({products.length})</option>
                <option value="books_physical">Signed Books (Hardcover/Paperback)</option>
                <option value="books_digital">Digital eBooks & Bundles</option>
                <option value="audiobooks">Audiobook Master Files</option>
                <option value="apparel">Author Apparel & Hoodies</option>
                <option value="drinkware">Ceramic Mugs & Tumblers</option>
                <option value="accessories">Enamel Pins & Bookmarks</option>
                <option value="art_prints">Archival World Maps & Art</option>
                <option value="collector_boxes">Collector Swag Boxes</option>
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Product Image & Badges */}
                  <div className="relative h-48 bg-stone-950 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80" />

                    {/* Top Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-stone-950/80 backdrop-blur-md text-amber-300 border border-amber-500/40 uppercase">
                        {product.category.replace("_", " ")}
                      </span>
                      {product.isFeatured && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500 text-stone-950 font-bold flex items-center space-x-1">
                          <Flame className="w-3 h-3" />
                          <span>Featured</span>
                        </span>
                      )}
                    </div>

                    {/* Stock Status Badge */}
                    <div className="absolute bottom-2.5 left-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                          product.inventoryStatus === "in_stock"
                            ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                            : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                        }`}
                      >
                        {product.isDigital ? "Instant Download" : `${product.stockQuantity || 0} In Stock`}
                      </span>
                    </div>

                    {/* Price Badge */}
                    <div className="absolute bottom-2.5 right-2.5 bg-stone-950/90 backdrop-blur-md px-2.5 py-1 rounded-xl border border-stone-700 text-right">
                      <div className="text-sm font-bold text-amber-400 font-serif">
                        ${product.price.toFixed(2)}
                      </div>
                      {product.originalPrice && (
                        <div className="text-[10px] line-through text-stone-500">
                          ${product.originalPrice.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2.5">
                    <div>
                      <h3 className="font-serif font-bold text-sm text-stone-100 line-clamp-1">{product.title}</h3>
                      {product.subtitle && (
                        <p className="text-[11px] text-stone-400 line-clamp-1">{product.subtitle}</p>
                      )}
                    </div>

                    <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed font-sans">
                      {product.description}
                    </p>

                    {/* Highlights */}
                    {product.highlights && (product.highlights || []).length > 0 && (
                      <div className="space-y-1 pt-1">
                        {(product.highlights || []).slice(0, 2).map((h, i) => (
                          <div key={i} className="text-[11px] text-stone-400 flex items-start space-x-1.5">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                            <span className="truncate">{h}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* External Buy Links attached */}
                    {product.externalPurchaseLinks && (product.externalPurchaseLinks || []).length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-1">
                        {(product.externalPurchaseLinks || []).map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 rounded bg-stone-950 hover:bg-stone-800 border border-stone-800 text-[10px] text-stone-300 flex items-center space-x-1 transition-colors"
                          >
                            <span>{link.platformName}</span>
                            <ExternalLink className="w-2.5 h-2.5 text-stone-500" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-3 border-t border-stone-800/80 bg-stone-950/40 flex items-center justify-between">
                  <div className="text-[10px] font-mono text-emerald-400 flex items-center space-x-1">
                    <Coins className="w-3 h-3" />
                    <span>50% Creator Fund</span>
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      onClick={() => handleOpenEditProduct(product)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 transition-colors"
                      title="Edit Product Details"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-900/60 text-stone-400 hover:text-rose-300 transition-colors"
                      title="Remove Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        handleAddToCart(product);
                        setActiveSubTab("preview");
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-medium flex items-center space-x-1 transition-colors"
                    >
                      <span>Preview Buy</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-stone-900/50 border border-dashed border-stone-800 rounded-2xl p-12 text-center space-y-3">
              <Package className="w-10 h-10 text-stone-600 mx-auto" />
              <div className="text-sm font-semibold text-stone-300">No products match your criteria</div>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Add signed books, hoodies, mugs, or digital bundles to your author catalog.
              </p>
              <button
                onClick={() => handleOpenEditProduct()}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors"
              >
                Add Your First Product
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: AI PRODUCT & MERCHANDISE COPYWRITER */}
      {/* ========================================================================= */}
      {activeSubTab === "ai_generator" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-stone-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>AI Product Copywriter & Merch Architect</span>
                </span>
                <p className="text-xs text-stone-400 mt-1">
                  Leverage Gemini to craft high-converting product descriptions, bullet points, and pricing models tailored to your book's universe.
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Merchandise Category</label>
                  <select
                    value={aiGenCategory}
                    onChange={(e) => setAiGenCategory(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  >
                    <option value="books_physical">Signed Deluxe Hardcover / Collector's Book</option>
                    <option value="books_digital">Digital eBook & World Codex Bundle</option>
                    <option value="audiobooks">Unabridged Cast Audio Master Pack</option>
                    <option value="apparel">Author Heavyweight Embroidered Hoodie / Tee</option>
                    <option value="drinkware">Scribe's Ceramic Mug / Midnight Coffee Cup</option>
                    <option value="art_prints">Archival Realm Map Giclée Print</option>
                    <option value="accessories">Cloisonné Enamel Pins & Metal Bookmarks</option>
                    <option value="collector_boxes">Limited Edition Mystery Swag Box</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Product Concept / Working Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Shadows Over Eldoria (Signed Gold Foil Edition)"
                    value={aiGenItemName}
                    onChange={(e) => setAiGenItemName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-stone-300 font-medium">Target Price Point ($ USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="29.99"
                    value={aiGenTargetPrice}
                    onChange={(e) => setAiGenTargetPrice(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs space-y-1 text-stone-400">
                  <div className="text-stone-300 font-medium">Active Book Context:</div>
                  <div className="text-amber-400 font-serif">{activeBook?.title || "Default Manuscript"}</div>
                  <div className="text-[11px] text-stone-500 line-clamp-2">{activeBook?.premise}</div>
                </div>

                <button
                  onClick={handleGenerateAiProduct}
                  disabled={isGeneratingProduct}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs transition-all shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isGeneratingProduct ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Drafting Evocative Copy & Specs...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Generate Product Copy & Open Editor</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Coins className="w-4 h-4" />
                <span>The 50% Creator Fund Guarantee</span>
              </span>

              <p className="text-xs text-stone-300 leading-relaxed">
                Every product listed on your TomeCrafter Storefront is automatically encoded with the sovereign creator guarantee:
              </p>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-stone-950 border border-emerald-500/30 text-xs space-y-1">
                  <div className="font-semibold text-emerald-300 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Direct Author Royalty Allocation</span>
                  </div>
                  <p className="text-stone-400 text-[11px]">
                    50% of the net transaction is immediately transferred into your Stripe Connect Creator Fund Account without third-party distributor deductions.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-xs space-y-1">
                  <div className="font-semibold text-stone-200 flex items-center space-x-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Signed Heirloom Authenticity</span>
                  </div>
                  <p className="text-stone-400 text-[11px]">
                    Readers receive certified author-direct provenance tags and optional wax seal signatures with their order.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: EXTERNAL BUY LINKS & RETAILER MATRIX */}
      {/* ========================================================================= */}
      {activeSubTab === "links" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Add Link Form */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="border-b border-stone-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                  <LinkIcon className="w-4 h-4" />
                  <span>Attach External Buy Link</span>
                </span>
                <p className="text-xs text-stone-400 mt-1">
                  Add direct purchase buttons for Amazon KDP, Barnes & Noble, Apple Books, Kobo, or custom print-on-demand fulfillment.
                </p>
              </div>

              <form onSubmit={handleAddExternalLink} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Retailer / Platform Name</label>
                  <select
                    value={newLinkPlatform}
                    onChange={(e) => {
                      setNewLinkPlatform(e.target.value);
                      if (e.target.value === "Amazon KDP") setNewLinkBadge("Prime 1-Day");
                      else if (e.target.value === "Apple Books") setNewLinkBadge("Apple Books");
                      else if (e.target.value === "Barnes & Noble") setNewLinkBadge("B&N Press");
                      else if (e.target.value === "Audible") setNewLinkBadge("Audiobook");
                      else setNewLinkBadge("Available Now");
                    }}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                  >
                    <option value="Amazon KDP">Amazon KDP (Hardcover & Paperback)</option>
                    <option value="Amazon Kindle">Amazon Kindle (eBook)</option>
                    <option value="Barnes & Noble">Barnes & Noble Press</option>
                    <option value="Apple Books">Apple Books</option>
                    <option value="Rakuten Kobo">Rakuten Kobo</option>
                    <option value="Audible">Audible / ACX Audiobook</option>
                    <option value="Bookshop.org">Bookshop.org (Indie Booksellers)</option>
                    <option value="Printful Merch">Printful (Print-on-Demand Merch)</option>
                    <option value="Shopify Store">Shopify External Storefront</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Destination Product URL *</label>
                  <input
                    type="url"
                    required
                    placeholder="https://amazon.com/dp/B0..."
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Button Badge Tagline</label>
                  <input
                    type="text"
                    placeholder="e.g. Prime 1-Day Delivery"
                    value={newLinkBadge}
                    onChange={(e) => setNewLinkBadge(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Attach To Product</label>
                  <select
                    value={newLinkTargetProduct}
                    onChange={(e) => setNewLinkTargetProduct(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                  >
                    <option value="all">Apply to ALL Catalog Products</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} (${p.price})
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow"
                >
                  Attach Buy Link
                </button>
              </form>
            </div>
          </div>

          {/* Active Link Matrix List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center space-x-2 border-b border-stone-800 pb-3">
                <Globe className="w-4 h-4 text-amber-400" />
                <span>Connected Retailer Link Matrix</span>
              </span>

              <div className="space-y-3">
                {products.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-xs text-stone-200 truncate">{p.title}</div>
                      <span className="text-[10px] font-mono text-amber-400">${p.price}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {p.externalPurchaseLinks && (p.externalPurchaseLinks || []).length > 0 ? (
                        (p.externalPurchaseLinks || []).map((link) => (
                          <div
                            key={link.id}
                            className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-700 text-[11px] text-stone-300 flex items-center space-x-2"
                          >
                            <span>{link.platformName}</span>
                            {link.badgeText && (
                              <span className="text-[9px] font-mono px-1 rounded bg-amber-500/20 text-amber-300">
                                {link.badgeText}
                              </span>
                            )}
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-stone-400 hover:text-stone-200"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-stone-500 italic">No external links attached yet.</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: STRIPE CONNECT & 50% CREATOR FUND SETUP */}
      {/* ========================================================================= */}
      {activeSubTab === "stripe_connect" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-stone-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center space-x-2">
                    <CreditCard className="w-4 h-4" />
                    <span>Stripe Connect Express Onboarding</span>
                  </span>
                  <p className="text-xs text-stone-400 mt-1">
                    Connect your bank account or debit card for seamless payouts and automatic 50% creator fund routing.
                  </p>
                </div>
                <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                  Active Connected
                </span>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-stone-500">Connected Account ID:</span>
                    <div className="font-mono text-stone-200 font-bold">{storeConfig.stripeConnect.accountId}</div>
                  </div>
                  <div>
                    <span className="text-stone-500">Payout Status:</span>
                    <div className="font-semibold text-emerald-400">Direct Express Enabled</div>
                  </div>
                  <div>
                    <span className="text-stone-500">Operating Country:</span>
                    <div className="font-mono text-stone-200">{storeConfig.stripeConnect.country} (USD)</div>
                  </div>
                  <div>
                    <span className="text-stone-500">Fund Routing Rule:</span>
                    <div className="font-mono text-emerald-300 font-bold">50% Creator Split</div>
                  </div>
                </div>

                <div className="border-t border-stone-800 pt-3 flex items-center justify-between text-xs">
                  <span className="text-stone-400">Last Payout Amount:</span>
                  <span className="font-mono font-bold text-amber-400">
                    ${storeConfig.stripeConnect.lastPayoutAmount?.toFixed(2)} on {storeConfig.stripeConnect.lastPayoutDate}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleStripeConnectOnboard}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold text-xs transition-colors flex items-center space-x-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sync & Refresh Stripe Account</span>
                </button>

                <button
                  onClick={() => {
                    setStoreConfig({
                      ...storeConfig,
                      stripeConnect: {
                        ...storeConfig.stripeConnect,
                        testMode: !storeConfig.stripeConnect.testMode,
                      },
                    });
                    showToast(
                      `Switched Stripe Connect to ${
                        !storeConfig.stripeConnect.testMode ? "Test Sandbox Mode" : "Live Production Mode"
                      }`
                    );
                  }}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-mono transition-colors ${
                    storeConfig.stripeConnect.testMode
                      ? "bg-amber-950/40 border-amber-500/50 text-amber-300"
                      : "bg-stone-900 border-stone-700 text-stone-300"
                  }`}
                >
                  Mode: {storeConfig.stripeConnect.testMode ? "Sandbox (Test)" : "Live"}
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-300 flex items-center space-x-2 border-b border-stone-800 pb-3">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Backend Secret & Security Architecture</span>
              </span>

              <p className="text-xs text-stone-400 leading-relaxed">
                All payment intents, transfer groupings, and Stripe Connect application fee splits are calculated securely in server routes:
              </p>

              <div className="p-3 rounded-xl bg-stone-950 border border-stone-800 text-[11px] font-mono text-emerald-400/90 space-y-1">
                <div>// Server-Side Payout Calculation</div>
                <div>application_fee = total * 0.50;</div>
                <div>transfer_data.destination = authorStripeId;</div>
                <div>c2pa_provenance_verified = true;</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 5: STORE SETTINGS & SHAREABLE URL / QR GENERATOR */}
      {/* ========================================================================= */}
      {activeSubTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Settings Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5">
              <div className="border-b border-stone-800 pb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Storefront Customization & Branding</span>
                </span>
                <p className="text-xs text-stone-400 mt-1">
                  Customize your store name, author slug, hero banner, announcement message, and free shipping thresholds.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-stone-300 font-medium">Store Display Name</label>
                    <input
                      type="text"
                      value={storeConfig.storeName}
                      onChange={(e) => setStoreConfig({ ...storeConfig, storeName: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-300 font-medium">Author Slug (Store URL)</label>
                    <input
                      type="text"
                      value={storeConfig.authorSlug}
                      onChange={(e) =>
                        setStoreConfig({
                          ...storeConfig,
                          authorSlug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                          shareableUrl: `https://tomecrafter.ai.studio/store/${e.target.value.toLowerCase().replace(/\s+/g, "-")}`,
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Store Tagline</label>
                  <input
                    type="text"
                    value={storeConfig.tagline}
                    onChange={(e) => setStoreConfig({ ...storeConfig, tagline: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Author Studio Bio Snippet</label>
                  <textarea
                    rows={2}
                    value={storeConfig.bioSnippet}
                    onChange={(e) => setStoreConfig({ ...storeConfig, bioSnippet: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-stone-300 font-medium">Hero Banner Image URL</label>
                    <input
                      type="text"
                      value={storeConfig.bannerImageUrl}
                      onChange={(e) => setStoreConfig({ ...storeConfig, bannerImageUrl: e.target.value })}
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-stone-300 font-medium">Free Shipping Threshold ($ USD)</label>
                    <input
                      type="number"
                      value={storeConfig.freeShippingThresholdUsd ?? 50}
                      onChange={(e) =>
                        setStoreConfig({
                          ...storeConfig,
                          freeShippingThresholdUsd: Number(e.target.value),
                        })
                      }
                      className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Top Announcement Bar Text</label>
                  <input
                    type="text"
                    value={storeConfig.noticeBannerText}
                    onChange={(e) => setStoreConfig({ ...storeConfig, noticeBannerText: e.target.value })}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  onClick={() => showToast("Storefront settings saved successfully!")}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors shadow"
                >
                  Save Store Settings
                </button>
              </div>
            </div>
          </div>

          {/* QR Code & Shareable Link Card */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-5 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center justify-center space-x-2 border-b border-stone-800 pb-3">
                <QrCode className="w-4 h-4" />
                <span>Instant QR Code & Share URL</span>
              </span>

              {/* QR Code Display Frame */}
              <div className="w-48 h-48 mx-auto bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-2xl border-4 border-amber-500/40">
                <div className="w-full h-full border-2 border-dashed border-stone-900 rounded-xl flex flex-col items-center justify-center text-stone-950 text-center p-2">
                  <QrCode className="w-20 h-20 text-stone-900 mb-1" />
                  <span className="text-[10px] font-mono font-bold tracking-tight">SCAN FOR SIGNED BOOKS</span>
                  <span className="text-[8px] font-mono text-stone-600 truncate max-w-full">
                    {storeConfig.authorSlug}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-stone-200">Shareable Storefront Link:</div>
                <div className="bg-stone-950 border border-stone-800 rounded-xl p-2.5 text-[11px] font-mono text-amber-300 break-all select-all">
                  {storeConfig.shareableUrl}
                </div>
                <button
                  onClick={handleCopyStoreLink}
                  className="w-full py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium transition-colors flex items-center justify-center space-x-1.5"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied!" : "Copy Share Link"}</span>
                </button>
              </div>

              {/* Embed Code Snippet */}
              <div className="pt-2 border-t border-stone-800 text-left space-y-1.5">
                <div className="text-[11px] font-semibold text-stone-400 flex items-center space-x-1">
                  <Code className="w-3 h-3 text-amber-400" />
                  <span>Embed on Your Blog / Substack / Website:</span>
                </div>
                <pre className="bg-stone-950 p-2.5 rounded-lg border border-stone-800 text-[10px] font-mono text-stone-400 overflow-x-auto">
                  {`<iframe src="${storeConfig.shareableUrl}" width="100%" height="600" frameborder="0"></iframe>`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 6: ORDERS & 50% CREATOR FUND LEDGER */}
      {/* ========================================================================= */}
      {activeSubTab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-3.5 rounded-2xl">
            <div>
              <h3 className="font-serif font-bold text-sm text-stone-100">Customer Orders & Fund Split Ledger</h3>
              <p className="text-xs text-stone-400">
                Audited Stripe Connect transactions with automatic 50% Creator Fund allocation breakdown.
              </p>
            </div>
            <div className="text-xs font-mono px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-bold">
              Total Creator Fund Dispatched: $
              {orders.reduce((sum, o) => sum + o.fundContributionAmount, 0).toFixed(2)}
            </div>
          </div>

          <div className="bg-stone-900/90 border border-stone-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300">
                <thead className="bg-stone-950/90 text-stone-400 font-mono uppercase text-[11px] border-b border-stone-800">
                  <tr>
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4">Purchased Items</th>
                    <th className="py-3.5 px-4">Total Paid</th>
                    <th className="py-3.5 px-4">50% Creator Fund</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60">
                  {(orders || []).map((order) => (
                    <tr key={order.id} className="hover:bg-stone-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-amber-400">{order.orderNumber}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-200">{order.customerName}</div>
                        <div className="text-[11px] text-stone-500 font-mono">{order.customerEmail}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          {(order.items || []).map((it, idx) => (
                            <div key={idx} className="text-stone-300 text-[11px]">
                              {it.quantity}x {it.title}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-stone-100">${order.total.toFixed(2)}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">
                        ${order.fundContributionAmount.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                          {order.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right text-stone-500 font-mono text-[11px]">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 7: FULL INTERACTIVE CUSTOMER LIVE STOREFRONT PREVIEW */}
      {/* ========================================================================= */}
      {activeSubTab === "preview" && (
        <div className="space-y-6">
          {/* Top Announcement Bar */}
          {storeConfig.enableNoticeBanner && (
            <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-stone-950 text-xs font-bold py-2 px-4 rounded-xl text-center shadow-md">
              {storeConfig.noticeBannerText}
            </div>
          )}

          {/* Hero Banner Section */}
          <div className="relative rounded-3xl overflow-hidden border border-stone-800 shadow-2xl min-h-[260px] flex items-end p-6 sm:p-10">
            <img
              src={storeConfig.bannerImageUrl}
              alt={storeConfig.storeName}
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/70 to-transparent" />

            <div className="relative z-10 space-y-2 max-w-2xl">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono">
                <span>Official Author Direct Store</span>
                <span>•</span>
                <span>50% Creator Fund Split</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-serif font-bold text-stone-100">{storeConfig.storeName}</h2>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">{storeConfig.tagline}</p>
              <p className="text-xs text-stone-400 italic">{storeConfig.bioSnippet}</p>
            </div>

            {/* Floating Cart Button in Header */}
            <div className="absolute top-6 right-6 z-20">
              <button
                onClick={() => setIsCartDrawerOpen(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-2xl bg-stone-900/90 hover:bg-stone-900 border border-amber-500/40 text-amber-300 font-bold text-xs shadow-2xl transition-all"
              >
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})</span>
                {cart.length > 0 && (
                  <span className="font-mono text-emerald-400 ml-1">
                    ${cartSubtotal.toFixed(2)}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
            {["all", "books_physical", "books_digital", "audiobooks", "apparel", "drinkware", "art_prints", "accessories"].map(
              (cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-amber-500 text-stone-950 font-bold shadow"
                      : "bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800"
                  }`}
                >
                  {cat === "all" ? "All Items" : cat.replace("_", " ")}
                </button>
              )
            )}
          </div>

          {/* Customer Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="bg-stone-900/90 border border-stone-800 hover:border-amber-500/60 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between transition-all"
              >
                <div>
                  <div className="relative h-56 bg-stone-950 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80" />

                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-stone-950/80 backdrop-blur-md text-amber-300 border border-amber-500/40 uppercase">
                        {product.category.replace("_", " ")}
                      </span>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-stone-950/90 px-3 py-1.5 rounded-xl border border-stone-700">
                      <div className="text-base font-bold text-amber-400 font-serif">
                        ${product.price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <h3 className="font-serif font-bold text-base text-stone-100">{product.title}</h3>
                    {product.subtitle && (
                      <p className="text-xs text-stone-400">{product.subtitle}</p>
                    )}
                    <p className="text-xs text-stone-300 leading-relaxed font-sans line-clamp-3">
                      {product.description}
                    </p>

                    {product.highlights && (product.highlights || []).length > 0 && (
                      <div className="space-y-1 pt-1">
                        {(product.highlights || []).map((h, idx) => (
                          <div key={idx} className="text-xs text-stone-400 flex items-start space-x-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{h}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 border-t border-stone-800 bg-stone-950/60 space-y-2">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs tracking-wide transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Add to Bag • ${product.price.toFixed(2)}</span>
                  </button>

                  {/* External Retailer Options */}
                  {product.externalPurchaseLinks && (product.externalPurchaseLinks || []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(product.externalPurchaseLinks || []).map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center py-1.5 px-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-[10px] text-stone-300 flex items-center justify-center space-x-1 transition-colors"
                        >
                          <span>Buy on {link.platformName}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-stone-500" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SLIDE-OUT CUSTOMER CART & STRIPE CHECKOUT DRAWER */}
      {/* ========================================================================= */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-stone-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-stone-900 border-l border-stone-800 h-full flex flex-col justify-between p-6 shadow-2xl overflow-y-auto">
            {/* Header */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-5 h-5 text-amber-400" />
                  <h3 className="font-serif font-bold text-base text-stone-100">Your Reading Bag</h3>
                </div>
                <button
                  onClick={() => setIsCartDrawerOpen(false)}
                  className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Cart Items List */}
              {cart.length > 0 ? (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div
                      key={item.product.id}
                      className="p-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center space-x-3"
                    >
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.title}
                        className="w-12 h-16 object-cover rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-xs text-stone-200 truncate">{item.product.title}</div>
                        <div className="text-[11px] text-amber-400 font-mono">
                          ${item.product.price.toFixed(2)}
                        </div>

                        <div className="flex items-center space-x-2 mt-1">
                          <button
                            onClick={() => handleUpdateCartQty(item.product.id, -1)}
                            className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-mono px-1.5">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateCartQty(item.product.id, 1)}
                            className="w-5 h-5 rounded bg-stone-800 hover:bg-stone-700 flex items-center justify-center text-xs"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="font-mono font-bold text-xs text-stone-200">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center text-stone-500 text-xs">Your shopping bag is empty.</div>
              )}
            </div>

            {/* Checkout Bottom Sheet */}
            {cart.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-stone-800">
                {/* Cost Breakdown */}
                <div className="space-y-1.5 text-xs text-stone-300 font-mono">
                  <div className="flex justify-between">
                    <span className="text-stone-400">Subtotal:</span>
                    <span>${cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Shipping:</span>
                    <span>{cartShipping === 0 ? "FREE" : `$${cartShipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-400">Estimated Tax:</span>
                    <span>${cartTax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm text-stone-100 border-t border-stone-800 pt-1.5">
                    <span>Total:</span>
                    <span className="text-amber-400">${cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* 50% Fund Split Highlight */}
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs space-y-1 text-emerald-300">
                  <div className="font-semibold flex items-center space-x-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    <span>50% Creator Fund Routing</span>
                  </div>
                  <div className="text-[11px] text-emerald-400 font-mono">
                    ${cartFundSplit} goes directly to the author's verified Stripe Connect account.
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Your Full Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                  />
                  <input
                    type="email"
                    placeholder="Your Email for Delivery"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                  />
                </div>

                {/* Checkout Trigger */}
                <button
                  onClick={handleSimulateCheckout}
                  disabled={isCheckingOut}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs tracking-wide shadow-xl flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  {isCheckingOut ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Stripe Connect Checkout...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay with Stripe Connect (${cartTotal.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT PRODUCT MODAL */}
      {/* ========================================================================= */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <span className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center space-x-2">
                <Package className="w-4 h-4" />
                <span>{editingProduct ? "Edit Store Product" : "Add Product to Author Store"}</span>
              </span>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Product Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Subtitle / Edition</label>
                  <input
                    type="text"
                    value={formSubtitle}
                    onChange={(e) => setFormSubtitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200"
                  >
                    <option value="books_physical">Signed Books (Hardcover/Paperback)</option>
                    <option value="books_digital">Digital eBook / PDF Bundle</option>
                    <option value="audiobooks">Audiobook Master Pack</option>
                    <option value="apparel">Apparel & Hoodies</option>
                    <option value="drinkware">Ceramic Mugs</option>
                    <option value="art_prints">Archival World Maps & Art</option>
                    <option value="accessories">Enamel Pins & Bookmarks</option>
                    <option value="collector_boxes">Collector Swag Boxes</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Price ($ USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-stone-300 font-medium">Original Price (Strikeout)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formOriginalPrice || ""}
                    onChange={(e) => setFormOriginalPrice(e.target.value ? Number(e.target.value) : undefined)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-300 font-medium">Product Image URL</label>
                <input
                  type="text"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-stone-300 font-medium">Detailed Description</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Highlights list */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-stone-300 font-medium">Key Highlights & Features</label>
                  <button
                    type="button"
                    onClick={() => setFormHighlights([...formHighlights, ""])}
                    className="text-[11px] text-amber-400 hover:text-amber-300"
                  >
                    + Add Feature
                  </button>
                </div>
                {formHighlights.map((hl, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={hl}
                      placeholder={`Feature ${idx + 1}`}
                      onChange={(e) => {
                        const copy = [...formHighlights];
                        copy[idx] = e.target.value;
                        setFormHighlights(copy);
                      }}
                      className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-3 py-1.5 text-xs text-stone-200"
                    />
                    {formHighlights.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFormHighlights(formHighlights.filter((_, i) => i !== idx))}
                        className="p-1 text-stone-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Digital vs Physical toggle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <label className="flex items-center space-x-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsFeatured}
                    onChange={(e) => setFormIsFeatured(e.target.checked)}
                    className="rounded bg-stone-950 border-stone-800 text-amber-500"
                  />
                  <span>Feature on Storefront Homepage</span>
                </label>

                <label className="flex items-center space-x-2 text-xs text-stone-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDigital}
                    onChange={(e) => setFormIsDigital(e.target.checked)}
                    className="rounded bg-stone-950 border-stone-800 text-amber-500"
                  />
                  <span>Digital Download Item (eBook/Audio/PDF)</span>
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-stone-800">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-lg"
                >
                  Save Product to Catalog
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
