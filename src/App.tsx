import React, { useState, useEffect, useRef } from "react";
import { Navbar, ActiveTab } from "./components/Navbar";
import { ChapterBuilder } from "./components/ChapterBuilder";
import { ManuscriptEditor } from "./components/ManuscriptEditor";
import { ManualDictationTab } from "./components/ManualDictationTab";
import { AudiobookStudioTab } from "./components/AudiobookStudioTab";
import { TypographyCustomizerTab } from "./components/TypographyCustomizerTab";
import { RealmCouncil } from "./components/RealmCouncil";
import { LoreCodex } from "./components/LoreCodex";
import { ArtStudio } from "./components/ArtStudio";
import { AutoTypesetting } from "./components/AutoTypesetting";
import { PublishingSuite } from "./components/PublishingSuite";
import { SocialMediaStudio } from "./components/SocialMediaStudio";
import { AuthorWebsiteStudio } from "./components/AuthorWebsiteStudio";
import { AuthorStoreBuilder } from "./components/AuthorStoreBuilder";
import { SubscriptionManagerTab } from "./components/SubscriptionManagerTab";
import { TesterConsole } from "./components/TesterConsole";
import { StudioSettingsTab } from "./components/StudioSettingsTab";
import { ExportModal } from "./components/ExportModal";
import { GoogleDriveSyncModal } from "./components/GoogleDriveSyncModal";
import { LandingPage } from "./components/LandingPage";
import { ProjectHubModal } from "./components/ProjectHubModal";
import { AuthModal } from "./components/AuthModal";
import { AutoSaveIndicator, SaveStatus } from "./components/AutoSaveIndicator";
import { Book } from "./types";
import { SAMPLE_BOOKS } from "./data/sampleBooks";
import {
  Plus,
  BookOpen,
  Sparkles,
  X,
  Layers,
  Wand2,
  Trash2,
  AlertTriangle,
  Cloud,
  FolderOpen,
  CheckCircle2,
} from "lucide-react";
import { apiService } from "./services/api";
import {
  validateFirestoreConnection,
  onAuthUserChanged,
  syncUserProfileToFirestore,
} from "./services/firebase";
import {
  saveBookToFirestore,
  subscribeToUserBooks,
  deleteBookFromFirestore,
  syncAllLocalBooksToCloud,
  clearKnownCloudBooks,
} from "./services/bookCloudSync";
import { User as FirebaseUser } from "firebase/auth";

const STORAGE_KEY = "tomecrafter_books_v1";

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [cloudSyncedIds, setCloudSyncedIds] = useState<Set<string>>(new Set());
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const hasMigratedInitialLocalRef = useRef<string | null>(null);
  const booksRef = useRef<Book[]>([]);

  // Auto-Save Tracking State
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(() => {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  });

  // Load books from localStorage or fallback to sample books with safe normalization
  const [books, setBooks] = useState<Book[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((b: any) => {
            let title = b.title;
            let subtitle = b.subtitle;
            if (b.id === "human-initiative" || (title && title.includes("H.U.M.A.N."))) {
              title = "The Sovereign Author";
              subtitle = "A Manifesto for the Creative Renaissance";
            }
            return {
              ...b,
              title,
              subtitle,
              chapters: Array.isArray(b.chapters) ? b.chapters : [],
              loreEntries: Array.isArray(b.loreEntries) ? b.loreEntries : [],
              originalityReport: b.originalityReport
                ? {
                    ...b.originalityReport,
                    humanSocietyFundActive: false,
                    showHumanLogoOnBackCover: false,
                    taggedAuthors: Array.isArray(b.originalityReport?.taggedAuthors)
                      ? b.originalityReport.taggedAuthors
                      : [],
                    recentTransactions: Array.isArray(b.originalityReport?.recentTransactions)
                      ? b.originalityReport.recentTransactions
                      : [],
                  }
                : undefined,
              formattingSettings: b.formattingSettings
                ? {
                    ...b.formattingSettings,
                    showHumanLogoOnBackCover: false,
                    humanFundPledgeActive: false,
                  }
                : undefined,
              publishingKit: b.publishingKit
                ? {
                    ...b.publishingKit,
                    commercialTitle: title,
                    amazonKeywords: Array.isArray(b.publishingKit?.amazonKeywords)
                      ? b.publishingKit.amazonKeywords
                      : [],
                    bisacCategories: Array.isArray(b.publishingKit?.bisacCategories)
                      ? b.publishingKit.bisacCategories
                      : [],
                    compTitles: Array.isArray(b.publishingKit?.compTitles)
                      ? b.publishingKit.compTitles
                      : [],
                  }
                : undefined,
            };
          });
        }
      }
    } catch (e) {
      console.error("Failed to load books from localStorage", e);
    }
    return SAMPLE_BOOKS;
  });

  const [activeBookId, setActiveBookId] = useState<string>(
    books[0] ? books[0].id : SAMPLE_BOOKS[0].id
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("outline");
  const [activeChapterIdForEditor, setActiveChapterIdForEditor] = useState<string | undefined>(
    undefined
  );

  // Modals & Navigation Views (Landing Page defaults to true on initial load)
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState<"create" | "library">("create");
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingDeleteBook, setPendingDeleteBook] = useState<Book | null>(null);
  const [uiNotice, setUiNotice] = useState<string | null>(null);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  const showTemporaryNotice = (message: string) => {
    setUiNotice(message);
    setTimeout(() => {
      setUiNotice((prev) => (prev === message ? null : prev));
    }, 3500);
  };

  // Test Firestore Connection on Boot
  useEffect(() => {
    validateFirestoreConnection().then((connected) => {
      if (connected) {
        console.log("Firestore database connection verified.");
      }
    });
  }, []);

  // Listen to Auth State Changes & Sync Profile with Firestore
  useEffect(() => {
    const unsubscribe = onAuthUserChanged(async (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);

      if (user) {
        try {
          await syncUserProfileToFirestore(user);
        } catch (err) {
          console.warn("Could not sync user profile to Firestore:", err);
        }
      } else {
        clearKnownCloudBooks();
        setCloudSyncedIds(new Set());
        hasMigratedInitialLocalRef.current = null;
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-Time Firestore Subscription for User Books (Only when auth is ready and signed in)
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;

    const uid = currentUser.uid;
    const unsubscribe = subscribeToUserBooks(
      uid,
      async (cloudBooks) => {
        const cloudIds = new Set(cloudBooks.map((b) => b.id));
        setCloudSyncedIds(cloudIds);

        // One-time initial merge of local unsaved books into Firestore upon sign-in
        if (hasMigratedInitialLocalRef.current !== uid) {
          hasMigratedInitialLocalRef.current = uid;
          const localBooks = booksRef.current;
          const localOnlyBooks = localBooks.filter((lb) => !cloudIds.has(lb.id));

          if (cloudBooks.length === 0 && localBooks.length > 0) {
            setIsSyncingCloud(true);
            try {
              await syncAllLocalBooksToCloud(localBooks, uid);
            } finally {
              setIsSyncingCloud(false);
            }
            return;
          }

          if (localOnlyBooks.length > 0) {
            // Merge cloud books with any custom local drafts created before sign-in
            const nonSampleLocal = localOnlyBooks.filter(
              (lb) => !SAMPLE_BOOKS.some((sb) => sb.id === lb.id)
            );
            if (nonSampleLocal.length > 0) {
              setIsSyncingCloud(true);
              try {
                await syncAllLocalBooksToCloud(nonSampleLocal, uid);
              } finally {
                setIsSyncingCloud(false);
              }
            }
          }
        }

        if (cloudBooks.length > 0) {
          setBooks((prevLocal) => {
            const mergedMap = new Map<string, Book>();
            for (const cb of cloudBooks) {
              mergedMap.set(cb.id, cb);
            }
            for (const lb of prevLocal) {
              const existingCloud = mergedMap.get(lb.id);
              if (existingCloud) {
                const localTime = new Date(lb.updatedAt || 0).getTime();
                const cloudTime = new Date(existingCloud.updatedAt || 0).getTime();
                if (localTime > cloudTime) {
                  mergedMap.set(lb.id, lb);
                }
              }
            }
            return Array.from(mergedMap.values()).sort(
              (a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
            );
          });
        }
      },
      (err) => {
        console.warn("Firestore book subscription error:", err);
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, currentUser]);

  // Continuous Auto-Save to localStorage on every change with debounced smooth transition
  useEffect(() => {
    setSaveStatus("saving");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch (e) {
      console.error("Failed to save books to localStorage", e);
      setSaveStatus("error");
      return;
    }

    const timer = setTimeout(() => {
      const formattedTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setLastSavedTime(formattedTime);
      if (!currentUser) {
        setSaveStatus("saved");
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [books, currentUser]);

  // Debounced Sync of active book to Firestore when signed in
  useEffect(() => {
    if (!isAuthReady || !currentUser) return;
    const active = books.find((b) => b.id === activeBookId);
    if (!active) return;

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      const res = await saveBookToFirestore(active, currentUser.uid);
      if (res.success) {
        setCloudSyncedIds((prev) => {
          const next = new Set(prev);
          next.add(active.id);
          return next;
        });
        setLastSavedTime(
          new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
        );
        setSaveStatus("saved");
      } else {
        setSaveStatus("error");
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [books, activeBookId, currentUser, isAuthReady]);

  const handleManualSyncAllToCloud = async () => {
    if (!currentUser) return;
    setIsSyncingCloud(true);
    try {
      const result = await syncAllLocalBooksToCloud(books, currentUser.uid);
      showTemporaryNotice(`Synced ${result.syncedCount} manuscript(s) to Firebase Cloud.`);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const activeBook = books.find((b) => b.id === activeBookId) || books[0] || SAMPLE_BOOKS[0];

  // Update book handler with instant auto-save feedback
  const handleUpdateBook = (updatedBook: Book) => {
    setSaveStatus("saving");
    const timestampedBook = {
      ...updatedBook,
      updatedAt: new Date().toISOString(),
    };
    setBooks((prev) => prev.map((b) => (b.id === timestampedBook.id ? timestampedBook : b)));
  };

  const handleSelectBook = (bookId: string) => {
    setActiveBookId(bookId);
    setActiveChapterIdForEditor(undefined);
  };

  const handleNavigateToEditor = (chapterId?: string) => {
    if (chapterId) {
      setActiveChapterIdForEditor(chapterId);
    }
    setActiveTab("editor");
  };

  // Open Project Hub in specific mode
  const handleOpenProjectHub = (tab: "create" | "library" = "create") => {
    setProjectModalTab(tab);
    setShowProjectModal(true);
  };

  // Create New Book from Hub Modal
  const handleCreateBook = (newBookData: Partial<Book>) => {
    const title = newBookData.title?.trim() || "Untitled Masterpiece";
    const author = newBookData.author?.trim() || (currentUser?.displayName || "Anonymous Author");
    const genre = newBookData.genre || "Epic Fantasy";
    const tone = newBookData.tone || "atmospheric, immersive, cinematic";
    const targetWords = newBookData.targetWordCount || 60000;
    const premise = newBookData.premise?.trim() || "An untold epic awaiting author craftsmanship.";

    const newBook: Book = {
      id: `book-${Date.now()}`,
      title,
      subtitle: newBookData.subtitle?.trim() || "",
      author,
      genre,
      tone,
      premise,
      targetWordCount: targetWords,
      currentWordCount: 0,
      targetAudience: newBookData.targetAudience || "Adult Commercial Fiction",
      coverTitleFont: "Cinzel",
      coverAccentColor: "#d97706",
      chapters: [
        {
          id: `ch-${Date.now()}-1`,
          number: 1,
          act: "Act I",
          title: "The Threshold",
          summary: "Opening chapter introducing key tension, character goal, and inciting disturbance.",
          goal: "Establish normal world and initial inciting disturbance.",
          conflict: "Internal doubt meets external obstacle.",
          cliffhanger: "A discovery that shifts all expectations.",
          pov: author,
          setting: "Opening Scene",
          targetWords: 3000,
          wordCount: 0,
          content: "",
          status: "draft",
          illustrations: [],
          footnotes: [],
        },
      ],
      loreEntries: [],
      publishingKit: {
        commercialTitle: title,
        catchySubtitle: newBookData.subtitle?.trim() || "",
        salesBlurb: {
          hook: `In a world poised on the precipice of change, ${title} unfolds...`,
          body: premise,
          callToAction: "Step into the journey.",
        },
        amazonKeywords: [genre, "Epic", "Sovereign Fiction", "Adventure"],
        bisacCategories: ["FICTION / Fantasy / Epic", "FICTION / Action & Adventure"],
        compTitles: [`For Readers of ${genre}`, "Bestseller Speculative Fiction"],
        targetAudience: "Adult Fiction Readers",
        pricingRecommendations: {
          ebook: 4.99,
          paperback: 14.99,
          hardcover: 24.99,
        },
      },
      formattingSettings: {
        trimSize: "6x9",
        fontPreset: "garamond",
        googleFontFamily: "EB Garamond",
        fontColor: "#111827",
        fontSize: "11pt",
        fontSizePx: 16,
        lineSpacing: "1.5",
        lineHeightValue: 1.6,
        letterSpacingEm: 0,
        paragraphIndentEm: 1.5,
        paragraphSpacingEm: 0,
        textAlign: "justify",
        chapterHeadingCase: "title",
        chapterWordBudget: 3000,
        dropCaps: true,
        sceneBreakSymbol: "* * *",
        showPageNumbers: true,
        runningHeaders: true,
        includeFrontMatter: true,
        includeBackMatter: true,
        dedicationText: "",
        copyrightText: `© ${new Date().getFullYear()} ${author}. All rights reserved.`,
        authorBio: "",
        newsletterLink: "",
        acknowledgments: "",
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBooks((prev) => [newBook, ...prev]);
    setActiveBookId(newBook.id);
    setActiveTab("outline");
    setShowLandingPage(false);
    setShowProjectModal(false);
  };

  // Duplicate a book as a reference template
  const handleDuplicateBook = (bookId: string) => {
    const sourceBook = books.find((b) => b.id === bookId);
    if (!sourceBook) return;

    const duplicatedBook: Book = {
      ...sourceBook,
      id: `book-${Date.now()}`,
      title: `${sourceBook.title} (Reference Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setBooks((prev) => [duplicatedBook, ...prev]);
    setActiveBookId(duplicatedBook.id);
  };

  const handleDeleteBook = (bookId: string) => {
    if (books.length <= 1) {
      showTemporaryNotice("You must keep at least one book in your studio library.");
      return;
    }
    const targetBook = books.find((b) => b.id === bookId);
    if (targetBook) {
      setPendingDeleteBook(targetBook);
    }
  };

  const confirmDeleteBook = async () => {
    if (!pendingDeleteBook) return;
    const targetId = pendingDeleteBook.id;
    const remaining = books.filter((b) => b.id !== targetId);
    if (remaining.length === 0) {
      setPendingDeleteBook(null);
      return;
    }

    setBooks(remaining);
    if (activeBookId === targetId) {
      setActiveBookId(remaining[0].id);
    }
    setPendingDeleteBook(null);

    if (currentUser && cloudSyncedIds.has(targetId)) {
      try {
        await deleteBookFromFirestore(targetId);
        setCloudSyncedIds((prev) => {
          const next = new Set(prev);
          next.delete(targetId);
          return next;
        });
        showTemporaryNotice(`Deleted "${pendingDeleteBook.title}" from studio and cloud.`);
      } catch (err) {
        console.warn("Could not delete book from Firestore:", err);
      }
    }
  };

  if (showLandingPage) {
    return (
      <>
        <LandingPage
          currentUser={currentUser}
          onEnterStudio={() => setShowLandingPage(false)}
          onOpenProjectModal={handleOpenProjectHub}
          onOpenAuthModal={() => setShowAuthModal(true)}
          booksCount={books.length}
        />

        {/* Project Hub Modal on Landing Page */}
        <ProjectHubModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          books={books}
          activeBookId={activeBookId}
          onSelectBook={(bookId) => {
            handleSelectBook(bookId);
            setShowLandingPage(false);
          }}
          onCreateBook={handleCreateBook}
          onDuplicateBook={handleDuplicateBook}
          onDeleteBook={handleDeleteBook}
          initialTab={projectModalTab}
          authorDefaultName={currentUser?.displayName || "Anonymous Author"}
        />

        {/* User-Friendly Auth & Cloud Sync Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          currentUser={currentUser}
          booksCount={books.length}
          cloudSyncedCount={cloudSyncedIds.size}
          isSyncingCloud={isSyncingCloud}
          onSyncAllToCloud={handleManualSyncAllToCloud}
          onOpenGoogleDriveModal={() => {
            setShowLandingPage(false);
            setShowGoogleDriveModal(true);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navbar */}
      <Navbar
        books={books}
        activeBook={activeBook}
        activeTab={activeTab}
        onSelectBook={handleSelectBook}
        onSelectTab={setActiveTab}
        onOpenNewBookModal={() => handleOpenProjectHub("create")}
        onOpenProjectHub={() => handleOpenProjectHub("library")}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenGoogleDriveModal={() => setShowGoogleDriveModal(true)}
        onOpenLandingPage={() => setShowLandingPage(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        saveStatus={saveStatus}
        lastSavedTime={lastSavedTime}
        isCloudSynced={!!currentUser}
        cloudSyncedCount={cloudSyncedIds.size}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "outline" && (
          <ChapterBuilder
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            onNavigateToEditor={handleNavigateToEditor}
          />
        )}

        {activeTab === "editor" && (
          <ManuscriptEditor
            book={activeBook}
            activeChapterId={activeChapterIdForEditor}
            onUpdateBook={handleUpdateBook}
            onNavigateToTab={setActiveTab}
          />
        )}

        {activeTab === "dictation" && (
          <ManualDictationTab
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            onNavigateToEditor={handleNavigateToEditor}
            isCloudSynced={!!currentUser}
          />
        )}

        {activeTab === "audiobook" && (
          <AudiobookStudioTab
            book={activeBook}
            onUpdateBook={handleUpdateBook}
          />
        )}

        {activeTab === "typography" && (
          <TypographyCustomizerTab
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}

        {activeTab === "council" && (
          <RealmCouncil
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            onNavigateToEditor={handleNavigateToEditor}
            onNavigateToTab={setActiveTab}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}

        {activeTab === "codex" && (
          <LoreCodex book={activeBook} onUpdateBook={handleUpdateBook} />
        )}

        {activeTab === "art" && (
          <ArtStudio
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}

        {activeTab === "typesetting" && (
          <AutoTypesetting
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}

        {activeTab === "publishing" && (
          <PublishingSuite
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}

        {activeTab === "social" && (
          <SocialMediaStudio book={activeBook} />
        )}

        {activeTab === "website" && (
          <AuthorWebsiteStudio book={activeBook} />
        )}

        {activeTab === "store" && (
          <AuthorStoreBuilder
            activeBook={activeBook}
            onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
          />
        )}

        {activeTab === "subscription" && (
          <SubscriptionManagerTab
            onNavigateTab={(tab) => setActiveTab(tab as ActiveTab)}
          />
        )}

        {activeTab === "testers" && (
          <TesterConsole />
        )}

        {activeTab === "settings" && (
          <StudioSettingsTab
            book={activeBook}
            currentUser={currentUser}
            onUpdateBook={handleUpdateBook}
            onSelectTab={setActiveTab}
          />
        )}
      </main>

      {/* Footer info bar with Real-time Word Count Progress Bar & Auto-Save Tracker */}
      <footer className="border-t border-stone-800/80 bg-stone-950/90 py-3.5 px-4 sm:px-6 text-xs text-stone-400 flex flex-col lg:flex-row items-center justify-between gap-4 sticky bottom-0 z-30 backdrop-blur-md">
        {/* Left Section: Brand & Project Reference */}
        <div className="flex items-center space-x-3 w-full lg:w-auto justify-between lg:justify-start">
          <div
            onClick={() => handleOpenProjectHub("library")}
            className="flex items-center space-x-2 shrink-0 cursor-pointer hover:text-amber-300 transition-colors"
            title="Click to reference or switch projects"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-serif font-medium text-stone-200">
              {activeBook.title}
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-800 text-stone-400 border border-stone-700">
              {activeBook.genre}
            </span>
          </div>
        </div>

        {/* Center Section: Real-Time Word Count Progress Bar */}
        {(() => {
          const currentWords = (activeBook.chapters || []).reduce(
            (acc, ch) => acc + (ch.content ? ch.content.trim().split(/\s+/).filter(Boolean).length : 0),
            0
          );
          const targetWords = activeBook.targetWordCount || 60000;
          const percentage = Math.min(100, Math.round((currentWords / targetWords) * 100));
          const estPages = Math.max(1, Math.round(currentWords / 250));
          const remainingWords = Math.max(0, targetWords - currentWords);

          return (
            <div className="w-full lg:max-w-md xl:max-w-lg bg-stone-900/90 border border-stone-800/90 rounded-xl px-3.5 py-2 flex flex-col space-y-1.5 shadow-inner">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-1.5 font-medium">
                  <span className="text-amber-400 font-mono font-bold">
                    {currentWords.toLocaleString()}
                  </span>
                  <span className="text-stone-500">/</span>
                  <span className="text-stone-400 font-mono">
                    {targetWords.toLocaleString()} words
                  </span>
                  <span className="text-[10px] text-stone-500 font-sans hidden sm:inline">
                    (~{estPages} pages)
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {remainingWords > 0 ? (
                    <span className="text-[10px] text-stone-500 hidden sm:inline">
                      {remainingWords.toLocaleString()} to goal
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-400 font-bold hidden sm:inline">
                      Goal Reached!
                    </span>
                  )}
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full border ${
                    percentage >= 100
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : percentage >= 50
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : "bg-stone-800 text-stone-300 border-stone-700"
                  }`}>
                    {percentage}%
                  </span>
                </div>
              </div>

              {/* Visual Progress Bar Track & Fill */}
              <div className="relative w-full h-2 rounded-full bg-stone-800 overflow-hidden border border-stone-700/50">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    percentage >= 100
                      ? "bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50"
                      : "bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400"
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* Right Section: Continuous Auto-Save Status & Actions */}
        <div className="flex items-center space-x-3 text-stone-400 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
          {/* Live Auto-Save Indicator */}
          <AutoSaveIndicator
            status={saveStatus}
            lastSavedTime={lastSavedTime}
            isCloudSynced={!!currentUser}
          />

          <button
            onClick={() => handleOpenProjectHub("library")}
            className="flex items-center space-x-1 text-stone-400 hover:text-amber-300 transition-colors text-[11px]"
            title="Browse all projects"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Projects ({books.length})</span>
          </button>

          <span className="hidden sm:inline text-stone-700">•</span>

          <button
            onClick={() => handleDeleteBook(activeBook.id)}
            className="text-stone-500 hover:text-rose-400 flex items-center space-x-1 transition-colors text-[11px]"
            title="Delete active book"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </footer>

      {/* Export Modal */}
      {showExportModal && (
        <ExportModal
          book={activeBook}
          onClose={() => setShowExportModal(false)}
          onUpdateBook={handleUpdateBook}
        />
      )}

      {/* Google Drive Sync Modal */}
      {showGoogleDriveModal && (
        <GoogleDriveSyncModal
          book={activeBook}
          onClose={() => setShowGoogleDriveModal(false)}
          onRestoreBook={(restoredBook) => {
            setBooks((prev) => {
              const existingIndex = prev.findIndex((b) => b.id === restoredBook.id);
              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = restoredBook;
                return next;
              }
              return [restoredBook, ...prev];
            });
            setActiveBookId(restoredBook.id);
          }}
        />
      )}

      {/* Project Creation & Reference Hub Modal */}
      <ProjectHubModal
        isOpen={showProjectModal}
        onClose={() => setShowProjectModal(false)}
        books={books}
        activeBookId={activeBookId}
        onSelectBook={handleSelectBook}
        onCreateBook={handleCreateBook}
        onDuplicateBook={handleDuplicateBook}
        onDeleteBook={handleDeleteBook}
        initialTab={projectModalTab}
        authorDefaultName={currentUser?.displayName || "Anonymous Author"}
      />

      {/* User-Friendly Auth & Cloud Sync Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        booksCount={books.length}
        cloudSyncedCount={cloudSyncedIds.size}
        isSyncingCloud={isSyncingCloud}
        onSyncAllToCloud={handleManualSyncAllToCloud}
        onOpenGoogleDriveModal={() => setShowGoogleDriveModal(true)}
      />

      {/* Custom Delete Confirmation Modal (No window.confirm) */}
      {pendingDeleteBook && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-stone-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-stone-100">Delete Manuscript?</h3>
                <p className="text-xs text-stone-400 leading-relaxed">
                  Are you sure you want to permanently delete{" "}
                  <span className="text-stone-200 font-medium">"{pendingDeleteBook.title}"</span>?
                  {currentUser && cloudSyncedIds.has(pendingDeleteBook.id)
                    ? " This will also remove it from your Firebase cloud library."
                    : " This action cannot be undone."}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setPendingDeleteBook(null)}
                className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteBook}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-blocking UI Toast Notice */}
      {uiNotice && (
        <div className="fixed bottom-20 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-900 border border-amber-500/40 text-stone-100 text-xs shadow-xl">
          <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{uiNotice}</span>
        </div>
      )}
    </div>
  );
}
