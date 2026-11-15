import React, { useState, useEffect, useRef } from "react";
import { Navbar, ActiveTab } from "./components/Navbar";
import { ChapterBuilder } from "./components/ChapterBuilder";
import { ManuscriptEditor } from "./components/ManuscriptEditor";
import { ManualDictationTab } from "./components/ManualDictationTab";
import { AudiobookStudioTab } from "./components/AudiobookStudioTab";
import { TypographyCustomizerTab } from "./components/TypographyCustomizerTab";
import { RealmCouncil } from "./components/RealmCouncil";
import { PublishingStudioHQ } from "./components/PublishingStudioHQ";
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
import {
  FooterWordGoalBar,
  countBookWords,
  getLocalDateKey,
} from "./components/FooterWordGoalBar";
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
  ensureAppCheckReady,
} from "./services/firebase";
import {
  saveBookToFirestore,
  subscribeToUserBooks,
  deleteBookFromFirestore,
  syncAllLocalBooksToCloud,
  clearKnownCloudBooks,
  BatchCloudSyncError,
} from "./services/bookCloudSync";
import { User as FirebaseUser } from "firebase/auth";

const STORAGE_KEY = "tomecrafter_books_v1";
const AUTO_SAVE_STORAGE_KEY = "tomecrafter_autosave_enabled_v1";

function extractReadableSaveError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err || "Unknown error");
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.error === "string" && parsed.error.trim()) {
      return parsed.error.trim();
    }
  } catch {
    // Non-JSON error message
  }
  return raw;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [cloudSyncedIds, setCloudSyncedIds] = useState<Set<string>>(new Set());
  const [isSyncingCloud, setIsSyncingCloud] = useState<boolean>(false);
  const hasMigratedInitialLocalRef = useRef<string | null>(null);
  const booksRef = useRef<Book[]>([]);
  const dirtyBookIdsRef = useRef<Set<string>>(new Set());
  const isManualSavingRef = useRef<boolean>(false);

  // Save & Auto-Save Control State (Auto-Save defaults to OFF)
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_SAVE_STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });
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
            const title = b.title;
            const subtitle = b.subtitle;
            return {
              ...b,
              title,
              subtitle,
              chapters: Array.isArray(b.chapters) ? b.chapters : [],
              mediaLibrary: Array.isArray(b.mediaLibrary) ? b.mediaLibrary : [],
              loreEntries: Array.isArray(b.loreEntries) ? b.loreEntries : [],
              originalityReport: b.originalityReport
                ? (() => {
                    const {
                      humanSocietyFundActive: _hsf,
                      showHumanLogoOnBackCover: _hlb,
                      ...cleanReport
                    } = b.originalityReport;
                    return {
                      ...cleanReport,
                      taggedAuthors: Array.isArray(cleanReport?.taggedAuthors)
                        ? cleanReport.taggedAuthors
                        : [],
                      recentTransactions: Array.isArray(cleanReport?.recentTransactions)
                        ? cleanReport.recentTransactions
                        : [],
                    };
                  })()
                : undefined,
              formattingSettings: b.formattingSettings
                ? (() => {
                    const {
                      showHumanLogoOnBackCover: _fhl,
                      humanFundPledgeActive: _hfp,
                      ...cleanFormatting
                    } = b.formattingSettings;
                    return cleanFormatting;
                  })()
                : undefined,
              publishingKit: b.publishingKit
                ? {
                    ...b.publishingKit,
                    commercialTitle: b.publishingKit.commercialTitle || title,
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
  const [activeTab, setActiveTab] = useState<ActiveTab>("studio");
  const [activeChapterIdForEditor, setActiveChapterIdForEditor] = useState<string | undefined>(
    undefined
  );

  // Modals & Navigation Views (Landing Page defaults to true on initial load)
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [projectModalTab, setProjectModalTab] = useState<"create" | "library">("create");
  const [projectEditBookId, setProjectEditBookId] = useState<string | null>(null);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingDeleteBook, setPendingDeleteBook] = useState<Book | null>(null);
  const [uiNotice, setUiNotice] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  const showTemporaryNotice = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setUiNotice({ message, type });
    setTimeout(() => {
      setUiNotice((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Initialize Firebase App Check (if runtime-configured) & Test Firestore Connection on Boot
  useEffect(() => {
    void ensureAppCheckReady();
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
            } catch (err) {
              console.error("Initial cloud migration failed:", err);
              if (err instanceof BatchCloudSyncError && err.syncedIds.length > 0) {
                setCloudSyncedIds((prev) => {
                  const next = new Set(prev);
                  err.syncedIds.forEach((id) => next.add(id));
                  return next;
                });
              }
              setSaveStatus("error");
              showTemporaryNotice(
                `Cloud migration failed: ${extractReadableSaveError(err)}`,
                "error"
              );
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
              } catch (err) {
                console.error("Local draft cloud sync failed:", err);
                if (err instanceof BatchCloudSyncError && err.syncedIds.length > 0) {
                  setCloudSyncedIds((prev) => {
                    const next = new Set(prev);
                    err.syncedIds.forEach((id) => next.add(id));
                    return next;
                  });
                }
                setSaveStatus("error");
                showTemporaryNotice(
                  `Cloud sync failed for local drafts: ${extractReadableSaveError(err)}`,
                  "error"
                );
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

  const handleManualSave = async () => {
    if (isManualSavingRef.current) return;
    isManualSavingRef.current = true;
    const latestBooks = booksRef.current;
    setSaveStatus("saving");

    try {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(latestBooks));
      } catch (e) {
        console.error("Failed to save books to localStorage", e);
        setSaveStatus("error");
        showTemporaryNotice("Could not save changes to browser storage.", "error");
        return;
      }

      const formattedTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      if (isAuthReady && currentUser) {
        const idsToSave =
          dirtyBookIdsRef.current.size > 0
            ? Array.from(dirtyBookIdsRef.current)
            : [activeBookId];

        const syncErrors: string[] = [];
        for (const id of idsToSave) {
          const target = latestBooks.find((b) => b.id === id);
          if (!target) continue;
          try {
            await saveBookToFirestore(target, currentUser.uid);
            dirtyBookIdsRef.current.delete(id);
            setCloudSyncedIds((prev) => {
              const next = new Set(prev);
              next.add(target.id);
              return next;
            });
          } catch (err) {
            console.error(`Failed saving book "${target.title}" (${id}) to cloud:`, err);
            syncErrors.push(extractReadableSaveError(err));
          }
        }

        if (syncErrors.length > 0) {
          setSaveStatus("error");
          showTemporaryNotice(
            `Saved locally, but cloud sync failed: ${syncErrors[0]}`,
            "error"
          );
          return;
        }

        setLastSavedTime(formattedTime);
        setSaveStatus("saved");
        showTemporaryNotice("Changes saved locally and synced to cloud.", "success");
        return;
      }

      dirtyBookIdsRef.current.clear();
      setLastSavedTime(formattedTime);
      setSaveStatus("saved");
      showTemporaryNotice("Changes saved locally.", "success");
    } finally {
      isManualSavingRef.current = false;
    }
  };

  const handleToggleAutoSave = () => {
    setAutoSaveEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(AUTO_SAVE_STORAGE_KEY, next ? "true" : "false");
      } catch {
        // ignore storage error
      }
      showTemporaryNotice(
        next ? "Auto-Save turned ON." : "Auto-Save turned OFF (Manual Save active)."
      );
      return next;
    });
  };

  // Optional Ctrl+S / Cmd+S shortcut for Manual Save
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void handleManualSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // Optional Auto-Save (only runs when explicitly enabled AND user actually made edits)
  useEffect(() => {
    if (!autoSaveEnabled || dirtyBookIdsRef.current.size === 0) return;

    const timer = setTimeout(async () => {
      setSaveStatus("saving");
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(booksRef.current));
      } catch (e) {
        console.error("Failed to save books to localStorage", e);
        setSaveStatus("error");
        return;
      }

      const formattedTime = new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      if (isAuthReady && currentUser) {
        const active = booksRef.current.find((b) => b.id === activeBookId);
        if (active && dirtyBookIdsRef.current.has(active.id)) {
          try {
            await saveBookToFirestore(active, currentUser.uid);
            dirtyBookIdsRef.current.delete(active.id);
            setCloudSyncedIds((prev) => {
              const next = new Set(prev);
              next.add(active.id);
              return next;
            });
            setLastSavedTime(formattedTime);
            setSaveStatus("saved");
          } catch (err) {
            console.error("Auto-save cloud sync failed:", err);
            setSaveStatus("error");
            showTemporaryNotice(
              `Auto-save cloud sync failed: ${extractReadableSaveError(err)}`,
              "error"
            );
          }
          return;
        }
      }

      dirtyBookIdsRef.current.clear();
      setLastSavedTime(formattedTime);
      setSaveStatus("saved");
    }, 1500);

    return () => clearTimeout(timer);
  }, [books, activeBookId, currentUser, isAuthReady, autoSaveEnabled]);

  const handleManualSyncAllToCloud = async () => {
    if (!currentUser) return;
    setIsSyncingCloud(true);
    try {
      const result = await syncAllLocalBooksToCloud(books, currentUser.uid);
      setCloudSyncedIds((prev) => {
        const next = new Set(prev);
        result.syncedIds.forEach((id) => next.add(id));
        return next;
      });
      dirtyBookIdsRef.current.clear();
      setLastSavedTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setSaveStatus("saved");
      showTemporaryNotice(
        `Synced ${result.syncedCount} manuscript(s) to Firebase Cloud.`,
        "success"
      );
    } catch (err) {
      if (err instanceof BatchCloudSyncError && err.syncedIds.length > 0) {
        setCloudSyncedIds((prev) => {
          const next = new Set(prev);
          err.syncedIds.forEach((id) => next.add(id));
          return next;
        });
      }
      setSaveStatus("error");
      const readableError = extractReadableSaveError(err);
      showTemporaryNotice(`Cloud sync failed: ${readableError}`, "error");
      throw new Error(readableError);
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const activeBook = books.find((b) => b.id === activeBookId) || books[0] || SAMPLE_BOOKS[0];

  // Update book handler (marks dirty; saves immediately only if auto-save is enabled)
  const handleUpdateBook = (updatedBook: Book) => {
    dirtyBookIdsRef.current.add(updatedBook.id);
    setSaveStatus("unsaved");
    const todayKey = getLocalDateKey();
    const nowIso = new Date().toISOString();

    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== updatedBook.id) return b;
        let nextBook: Book = {
          ...updatedBook,
          updatedAt: nowIso,
        };
        if (
          (nextBook.dailyWordCountGoal || nextBook.wordGoalMode === "daily") &&
          nextBook.dailyWordBaselineDate !== todayKey
        ) {
          nextBook = {
            ...nextBook,
            dailyWordBaselineDate: todayKey,
            dailyWordBaselineCount: countBookWords(b),
          };
        }
        return nextBook;
      })
    );
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
    setProjectEditBookId(null);
    setProjectModalTab(tab);
    setShowProjectModal(true);
  };

  const handleOpenEditProject = (bookId: string) => {
    setProjectEditBookId(bookId);
    setProjectModalTab("library");
    setShowProjectModal(true);
  };

  const handleEditBook = async (
    bookId: string,
    updates: {
      title: string;
      subtitle: string;
      author: string;
      genre: Book["genre"];
      tone: string;
      targetWordCount: number;
      premise: string;
      syncPublishingKit?: boolean;
    }
  ) => {
    const existing = booksRef.current.find((b) => b.id === bookId);
    if (!existing) return;

    const cleanTitle = updates.title.trim() || existing.title;
    const cleanSubtitle = updates.subtitle.trim();
    const cleanAuthor = updates.author.trim() || existing.author;
    const cleanTone = updates.tone.trim();
    const cleanPremise = updates.premise.trim();
    const safeTargetWords = Math.max(1000, Math.min(10000000, Math.round(updates.targetWordCount || existing.targetWordCount || 60000)));
    const nowIso = new Date().toISOString();

    const updatedBook: Book = {
      ...existing,
      title: cleanTitle,
      subtitle: cleanSubtitle,
      author: cleanAuthor,
      genre: updates.genre,
      tone: cleanTone,
      targetWordCount: safeTargetWords,
      premise: cleanPremise,
      publishingKit: existing.publishingKit
        ? {
            ...existing.publishingKit,
            commercialTitle:
              updates.syncPublishingKit !== false
                ? cleanTitle
                : existing.publishingKit.commercialTitle,
            catchySubtitle:
              updates.syncPublishingKit !== false
                ? cleanSubtitle
                : existing.publishingKit.catchySubtitle,
          }
        : existing.publishingKit,
      updatedAt: nowIso,
    };

    const nextBooks = booksRef.current.map((b) => (b.id === bookId ? updatedBook : b));
    booksRef.current = nextBooks;
    setBooks(nextBooks);
    dirtyBookIdsRef.current.add(bookId);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextBooks));
    } catch (e) {
      console.error("Failed to save updated project to localStorage", e);
    }

    const formattedTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    if (isAuthReady && currentUser) {
      setSaveStatus("saving");
      try {
        await saveBookToFirestore(updatedBook, currentUser.uid);
        dirtyBookIdsRef.current.delete(bookId);
        setCloudSyncedIds((prev) => {
          const next = new Set(prev);
          next.add(bookId);
          return next;
        });
        setLastSavedTime(formattedTime);
        setSaveStatus("saved");
        showTemporaryNotice(`Updated project "${cleanTitle}" and synced to cloud.`, "success");
      } catch (err) {
        console.error(`Failed syncing edited project "${cleanTitle}" (${bookId}):`, err);
        setSaveStatus("error");
        showTemporaryNotice(
          `Project "${cleanTitle}" updated locally, but cloud sync failed: ${extractReadableSaveError(err)}`,
          "error"
        );
      }
      return;
    }

    setLastSavedTime(formattedTime);
    setSaveStatus("saved");
    showTemporaryNotice(`Updated project "${cleanTitle}".`, "success");
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
          hook: `In a world poised on the precipice of change, ${title} unfolds...`.slice(0, 500),
          body: premise.slice(0, 4000),
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

    setBooks((prev) => {
      const next = [newBook, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
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

    setBooks((prev) => {
      const next = [duplicatedBook, ...prev];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
    } catch {
      // ignore
    }
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
        showTemporaryNotice(`Deleted "${pendingDeleteBook.title}" from studio and cloud.`, "success");
      } catch (err) {
        console.error("Could not delete book from Firestore:", err);
        showTemporaryNotice(
          `Removed locally, but cloud delete failed: ${extractReadableSaveError(err)}`,
          "error"
        );
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
          onClose={() => {
            setShowProjectModal(false);
            setProjectEditBookId(null);
          }}
          books={books}
          activeBookId={activeBookId}
          onSelectBook={(bookId) => {
            handleSelectBook(bookId);
            setShowLandingPage(false);
          }}
          onCreateBook={handleCreateBook}
          onEditBook={handleEditBook}
          onDuplicateBook={handleDuplicateBook}
          onDeleteBook={handleDeleteBook}
          initialTab={projectModalTab}
          initialEditBookId={projectEditBookId}
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
        onEditProject={handleOpenEditProject}
        onOpenExportModal={() => setShowExportModal(true)}
        onOpenGoogleDriveModal={() => setShowGoogleDriveModal(true)}
        onOpenLandingPage={() => setShowLandingPage(true)}
        onOpenAuthModal={() => setShowAuthModal(true)}
        saveStatus={saveStatus}
        lastSavedTime={lastSavedTime}
        isCloudSynced={!!currentUser}
        cloudSyncedCount={cloudSyncedIds.size}
        autoSaveEnabled={autoSaveEnabled}
        onToggleAutoSave={handleToggleAutoSave}
        onManualSave={() => void handleManualSave()}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === "studio" && (
          <PublishingStudioHQ
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            onSelectTab={setActiveTab}
            onNavigateToEditor={handleNavigateToEditor}
            onOpenExportModal={() => setShowExportModal(true)}
          />
        )}

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
            autoSaveEnabled={autoSaveEnabled}
            hasUnsavedChanges={saveStatus === "unsaved"}
            onManualSave={() => void handleManualSave()}
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
          <AuthorWebsiteStudio book={activeBook} onUpdateBook={handleUpdateBook} />
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

        {/* Center Section: Interactive Real-Time Word Count Progress Bar */}
        <FooterWordGoalBar book={activeBook} onUpdateBook={handleUpdateBook} />

        {/* Right Section: Save Status & Actions */}
        <div className="flex items-center space-x-3 text-stone-400 shrink-0 w-full lg:w-auto justify-between lg:justify-end">
          {/* Save & Auto-Save Control */}
          <AutoSaveIndicator
            status={saveStatus}
            lastSavedTime={lastSavedTime}
            isCloudSynced={!!currentUser}
            autoSaveEnabled={autoSaveEnabled}
            onToggleAutoSave={handleToggleAutoSave}
            onManualSave={() => void handleManualSave()}
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
        onClose={() => {
          setShowProjectModal(false);
          setProjectEditBookId(null);
        }}
        books={books}
        activeBookId={activeBookId}
        onSelectBook={handleSelectBook}
        onCreateBook={handleCreateBook}
        onEditBook={handleEditBook}
        onDuplicateBook={handleDuplicateBook}
        onDeleteBook={handleDeleteBook}
        initialTab={projectModalTab}
        initialEditBookId={projectEditBookId}
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
        <div
          className={`fixed bottom-20 right-6 z-50 flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-stone-900 border text-stone-100 text-xs shadow-xl ${
            uiNotice.type === "error"
              ? "border-rose-500/50 text-rose-100"
              : uiNotice.type === "success"
              ? "border-emerald-500/40"
              : "border-amber-500/40"
          }`}
        >
          {uiNotice.type === "error" ? (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <CheckCircle2
              className={`w-4 h-4 shrink-0 ${
                uiNotice.type === "success" ? "text-emerald-400" : "text-amber-400"
              }`}
            />
          )}
          <span>{uiNotice.message}</span>
        </div>
      )}
    </div>
  );
}
