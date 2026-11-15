import React, { useState, useRef, useMemo, useEffect } from "react";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Link2,
  Trash2,
  Check,
  X,
  Search,
  Filter,
  Edit3,
  Download,
  HardDrive,
  Maximize2,
  FolderOpen,
  BookOpen,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Layers,
  Copy,
} from "lucide-react";
import { Book, ChapterIllustration } from "../types";
import { apiService } from "../services/api";
import {
  downloadSingleArtworkFile,
  uploadBlobToGoogleDrive,
  convertUrlToBlob,
} from "../services/googleDrive";
import { processUploadedImageFile, formatMediaBytes } from "../utils/mediaProcessor";

interface IllustrationManagerProps {
  book: Book;
  onUpdateBook: (updatedBook: Book) => void;
  initialFilterChapterId?: string;
}

interface ManagedMediaItem {
  key: string; // unique composite key
  location: "chapter" | "vault";
  chapterId?: string;
  chapterNumber?: number;
  chapterTitle?: string;
  indexInContainer: number;
  totalInContainer: number;
  illustration: ChapterIllustration;
}

export const IllustrationManager: React.FC<IllustrationManagerProps> = ({
  book,
  onUpdateBook,
  initialFilterChapterId = "all",
}) => {
  // Ingest / Add Mode Tabs
  const [ingestMode, setIngestMode] = useState<"upload" | "ai" | "url">("upload");

  // Upload Destination & Defaults
  const [uploadDestination, setUploadDestination] = useState<string>(
    book.chapters[0]?.id || "vault"
  );
  const [defaultPlacement, setDefaultPlacement] = useState<ChapterIllustration["placement"]>("header");
  const [batchCaption, setBatchCaption] = useState("");
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState("");

  // Add by URL State
  const [externalUrl, setExternalUrl] = useState("");
  const [externalTitle, setExternalTitle] = useState("");
  const [externalCaption, setExternalCaption] = useState("");
  const [externalRatio, setExternalRatio] = useState<ChapterIllustration["aspectRatio"]>("16:9");

  // AI Scene Plate Generator State
  const [scenePrompt, setScenePrompt] = useState("");
  const [sceneTitle, setSceneTitle] = useState("");
  const [sceneStyle, setSceneStyle] = useState("cinematic_digital");
  const [sceneRatio, setSceneRatio] = useState<ChapterIllustration["aspectRatio"]>("16:9");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Filter, Search & Selection State
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | "chapters" | "vault" | "uploaded" | "ai" | "diagrams"
  >("all");
  const [chapterFilterId, setChapterFilterId] = useState<string>(initialFilterChapterId);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkMoveTarget, setBulkMoveTarget] = useState<string>(book.chapters[0]?.id || "vault");
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // Per-card Editing, Deletion, Replace & Lightbox State
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCaption, setEditCaption] = useState("");
  const [editPlacement, setEditPlacement] = useState<ChapterIllustration["placement"]>("header");
  const [confirmDeleteKey, setConfirmDeleteKey] = useState<string | null>(null);
  const [lightboxItem, setLightboxItem] = useState<ManagedMediaItem | null>(null);
  const [uploadingDriveId, setUploadingDriveId] = useState<string | null>(null);
  const [replaceTargetItem, setReplaceTargetItem] = useState<ManagedMediaItem | null>(null);

  // Feedback Notices
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const notifySuccess = (msg: string) => {
    setSuccessNotice(msg);
    setErrorNotice(null);
    setTimeout(() => {
      setSuccessNotice((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Keep upload and bulk-move chapter targets synced when switching books or chapters
  useEffect(() => {
    if (
      uploadDestination !== "vault" &&
      uploadDestination !== "cover" &&
      !book.chapters.some((c) => c.id === uploadDestination)
    ) {
      setUploadDestination(book.chapters[0]?.id || "vault");
    }
    if (
      bulkMoveTarget !== "vault" &&
      !book.chapters.some((c) => c.id === bulkMoveTarget)
    ) {
      setBulkMoveTarget(book.chapters[0]?.id || "vault");
    }
  }, [book.id, book.chapters, uploadDestination, bulkMoveTarget]);

  // Flatten all chapter illustrations + vault illustrations into a unified list
  const allMediaItems: ManagedMediaItem[] = useMemo(() => {
    const items: ManagedMediaItem[] = [];

    (book.chapters || []).forEach((ch) => {
      const list = ch.illustrations || [];
      list.forEach((ill, idx) => {
        items.push({
          key: `ch:${ch.id}:${ill.id}`,
          location: "chapter",
          chapterId: ch.id,
          chapterNumber: ch.number,
          chapterTitle: ch.title,
          indexInContainer: idx,
          totalInContainer: list.length,
          illustration: ill,
        });
      });
    });

    const vaultList = book.mediaLibrary || [];
    vaultList.forEach((ill, idx) => {
      items.push({
        key: `vault:${ill.id}`,
        location: "vault",
        indexInContainer: idx,
        totalInContainer: vaultList.length,
        illustration: ill,
      });
    });

    return items;
  }, [book.chapters, book.mediaLibrary]);

  const inferSourceKind = (ill: ChapterIllustration): "uploaded" | "ai" | "url" | "diagram" => {
    if (
      ill.sourceType === "diagram_plate" ||
      ill.plateType === "workflow_chart" ||
      ill.style === "workflow_chart" ||
      ill.style === "comparison_matrix" ||
      Boolean(ill.diagramData)
    ) {
      return "diagram";
    }
    if (ill.sourceType === "uploaded_file" || Boolean(ill.fileName)) {
      return "uploaded";
    }
    if (
      ill.sourceType === "external_url" ||
      ((ill.imageUrl || "").startsWith("http") && !ill.enhancedPrompt)
    ) {
      return "url";
    }
    return "ai";
  };

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allMediaItems.filter((item) => {
      const kind = inferSourceKind(item.illustration);
      if (categoryFilter === "chapters" && item.location !== "chapter") return false;
      if (categoryFilter === "vault" && item.location !== "vault") return false;
      if (categoryFilter === "uploaded" && kind !== "uploaded" && kind !== "url") return false;
      if (categoryFilter === "ai" && kind !== "ai") return false;
      if (categoryFilter === "diagrams" && kind !== "diagram") return false;

      if (chapterFilterId !== "all") {
        if (chapterFilterId === "vault") {
          if (item.location !== "vault") return false;
        } else if (item.chapterId !== chapterFilterId) {
          return false;
        }
      }

      if (q) {
        const hay = [
          item.illustration.title,
          item.illustration.caption,
          item.illustration.prompt,
          item.illustration.fileName,
          item.chapterTitle,
          item.chapterNumber ? `chapter ${item.chapterNumber}` : "vault",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [allMediaItems, categoryFilter, chapterFilterId, searchQuery]);

  const chapterPlatesCount = allMediaItems.filter((i) => i.location === "chapter").length;
  const vaultPlatesCount = allMediaItems.filter((i) => i.location === "vault").length;
  const uploadedCount = allMediaItems.filter((i) => {
    const k = inferSourceKind(i.illustration);
    return k === "uploaded" || k === "url";
  }).length;

  // Insert one or more new illustrations into target destination ("vault", "cover", or chapterId)
  const commitNewIllustrations = (
    newIllustrations: ChapterIllustration[],
    destination: string
  ) => {
    if (newIllustrations.length === 0) return;

    if (destination === "cover") {
      const primary = newIllustrations[0];
      const remaining = newIllustrations.slice(1);
      onUpdateBook({
        ...book,
        coverImageUrl: primary.imageUrl,
        mediaLibrary:
          remaining.length > 0
            ? [...(book.mediaLibrary || []), ...remaining]
            : book.mediaLibrary || [],
        updatedAt: new Date().toISOString(),
      });
      notifySuccess(
        remaining.length > 0
          ? `Applied "${primary.title}" as Book Cover and stored ${remaining.length} additional asset(s) in Media Vault.`
          : `Applied "${primary.title}" as Book Front Cover!`
      );
      return;
    }

    if (destination === "vault" || book.chapters.length === 0) {
      onUpdateBook({
        ...book,
        mediaLibrary: [...(book.mediaLibrary || []), ...newIllustrations],
        updatedAt: new Date().toISOString(),
      });
      notifySuccess(
        `Added ${newIllustrations.length} illustration${newIllustrations.length > 1 ? "s" : ""} to the Media Vault.`
      );
      return;
    }

    const targetChapter = book.chapters.find((c) => c.id === destination);
    if (!targetChapter) {
      onUpdateBook({
        ...book,
        mediaLibrary: [...(book.mediaLibrary || []), ...newIllustrations],
        updatedAt: new Date().toISOString(),
      });
      notifySuccess(`Added ${newIllustrations.length} illustration(s) to Media Vault.`);
      return;
    }

    const updatedChapters = book.chapters.map((ch) =>
      ch.id === destination
        ? { ...ch, illustrations: [...(ch.illustrations || []), ...newIllustrations] }
        : ch
    );

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: new Date().toISOString(),
    });
    notifySuccess(
      `Added ${newIllustrations.length} illustration${newIllustrations.length > 1 ? "s" : ""} to Chapter ${targetChapter.number}: ${targetChapter.title}.`
    );
  };

  // Multi-file upload handler
  const handleFilesUpload = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsProcessingUpload(true);
    setErrorNotice(null);

    const created: ChapterIllustration[] = [];
    const errors: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadStatusText(`Processing ${i + 1} of ${files.length}: ${file.name}...`);
      try {
        const processed = await processUploadedImageFile(file);
        created.push({
          id: `ill-up-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          title: processed.cleanTitle,
          prompt: batchCaption.trim() || `Uploaded artwork (${processed.fileName})`,
          style: "uploaded_artwork",
          aspectRatio: processed.aspectRatio,
          imageUrl: processed.dataUrl,
          caption: batchCaption.trim() || processed.cleanTitle,
          placement: defaultPlacement,
          plateType: "illustration",
          sourceType: "uploaded_file",
          fileName: processed.fileName,
          fileSizeBytes: processed.fileSizeBytes,
          mimeType: processed.mimeType,
          width: processed.width,
          height: processed.height,
          createdAt: new Date().toISOString(),
        });
      } catch (err: any) {
        errors.push(err?.message || `Failed to process ${file.name}`);
      }
    }

    setIsProcessingUpload(false);
    setUploadStatusText("");

    if (created.length > 0) {
      commitNewIllustrations(created, uploadDestination);
      setBatchCaption("");
    }
    if (errors.length > 0) {
      setErrorNotice(errors.join(" • "));
    }
  };

  const handleDropZoneDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesUpload(e.dataTransfer.files);
    }
  };

  // Replace existing illustration image file
  const handleReplaceFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !replaceTargetItem) return;

    const target = replaceTargetItem;
    setReplaceTargetItem(null);
    setIsProcessingUpload(true);
    setUploadStatusText(`Replacing artwork with "${file.name}"...`);

    try {
      const processed = await processUploadedImageFile(file);
      const updatedIll: ChapterIllustration = {
        ...target.illustration,
        imageUrl: processed.dataUrl,
        aspectRatio: processed.aspectRatio,
        sourceType: "uploaded_file",
        fileName: processed.fileName,
        fileSizeBytes: processed.fileSizeBytes,
        mimeType: processed.mimeType,
        width: processed.width,
        height: processed.height,
      };

      if (target.location === "vault") {
        const updatedVault = (book.mediaLibrary || []).map((ill) =>
          ill.id === target.illustration.id ? updatedIll : ill
        );
        onUpdateBook({
          ...book,
          mediaLibrary: updatedVault,
          updatedAt: new Date().toISOString(),
        });
      } else if (target.chapterId) {
        const updatedChapters = book.chapters.map((ch) =>
          ch.id === target.chapterId
            ? {
                ...ch,
                illustrations: (ch.illustrations || []).map((ill) =>
                  ill.id === target.illustration.id ? updatedIll : ill
                ),
              }
            : ch
        );
        onUpdateBook({
          ...book,
          chapters: updatedChapters,
          updatedAt: new Date().toISOString(),
        });
      }

      notifySuccess(`Replaced image for "${target.illustration.title}" with "${file.name}".`);
    } catch (err: any) {
      setErrorNotice(err?.message || "Failed to replace image file.");
    } finally {
      setIsProcessingUpload(false);
      setUploadStatusText("");
    }
  };

  // Add Illustration via External URL
  const handleAddExternalUrl = () => {
    const cleanUrl = externalUrl.trim();
    if (!cleanUrl) return;
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://") && !cleanUrl.startsWith("data:image/")) {
      setErrorNotice("Please enter a valid http://, https://, or data:image/ URL.");
      return;
    }

    const title = externalTitle.trim() || "External Artwork Plate";
    const newIll: ChapterIllustration = {
      id: `ill-url-${Date.now()}`,
      title,
      prompt: externalCaption.trim() || `External media URL: ${title}`,
      style: "external_media",
      aspectRatio: externalRatio,
      imageUrl: cleanUrl,
      caption: externalCaption.trim() || title,
      placement: defaultPlacement,
      plateType: "illustration",
      sourceType: "external_url",
      createdAt: new Date().toISOString(),
    };

    commitNewIllustrations([newIll], uploadDestination);
    setExternalUrl("");
    setExternalTitle("");
    setExternalCaption("");
  };

  // Generate AI Scene Illustration
  const handleGenerateAiPlate = async () => {
    if (!scenePrompt.trim()) return;
    setIsGeneratingAi(true);
    setErrorNotice(null);

    try {
      const targetCh = book.chapters.find((c) => c.id === uploadDestination);
      const contextLabel = targetCh
        ? `Chapter ${targetCh.number}: ${targetCh.title} in "${book.title}"`
        : `Manuscript Illustration for "${book.title}" (${book.genre})`;

      const res = await apiService.generateIllustration({
        prompt: scenePrompt.trim(),
        style: sceneStyle,
        aspectRatio: sceneRatio,
        sceneContext: contextLabel,
      });

      if (!res.imageUrl) {
        setErrorNotice(
          "No scene image was returned. Confirm a billing-enabled Gemini API key is active in Settings > Secrets."
        );
        return;
      }

      const finalTitle = sceneTitle.trim() || scenePrompt.trim().slice(0, 42);
      const newIll: ChapterIllustration = {
        id: `ill-ai-${Date.now()}`,
        title: finalTitle,
        prompt: scenePrompt.trim(),
        enhancedPrompt: res.enhancedPrompt,
        style: sceneStyle,
        aspectRatio: sceneRatio,
        imageUrl: res.imageUrl,
        caption: batchCaption.trim() || finalTitle,
        placement: defaultPlacement,
        plateType:
          sceneStyle === "workflow_chart" || sceneStyle === "comparison_matrix"
            ? "workflow_chart"
            : "illustration",
        sourceType: "ai_generated",
        createdAt: new Date().toISOString(),
      };

      commitNewIllustrations([newIll], uploadDestination);
      setScenePrompt("");
      setSceneTitle("");
      setBatchCaption("");
    } catch (err: any) {
      setErrorNotice(err?.message || "AI illustration generation failed.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Delete single illustration
  const handleDeleteSingle = (item: ManagedMediaItem) => {
    if (item.location === "vault") {
      onUpdateBook({
        ...book,
        mediaLibrary: (book.mediaLibrary || []).filter((i) => i.id !== item.illustration.id),
        updatedAt: new Date().toISOString(),
      });
    } else if (item.chapterId) {
      onUpdateBook({
        ...book,
        chapters: book.chapters.map((ch) =>
          ch.id === item.chapterId
            ? {
                ...ch,
                illustrations: (ch.illustrations || []).filter(
                  (i) => i.id !== item.illustration.id
                ),
              }
            : ch
        ),
        updatedAt: new Date().toISOString(),
      });
    }

    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.delete(item.key);
      return next;
    });
    setConfirmDeleteKey(null);
    if (lightboxItem?.key === item.key) setLightboxItem(null);
    notifySuccess(`Deleted "${item.illustration.title}".`);
  };

  // Bulk delete selected illustrations
  const handleBulkDelete = () => {
    if (selectedKeys.size === 0) return;
    const count = selectedKeys.size;

    const updatedChapters = book.chapters.map((ch) => ({
      ...ch,
      illustrations: (ch.illustrations || []).filter(
        (ill) => !selectedKeys.has(`ch:${ch.id}:${ill.id}`)
      ),
    }));

    const updatedVault = (book.mediaLibrary || []).filter(
      (ill) => !selectedKeys.has(`vault:${ill.id}`)
    );

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      mediaLibrary: updatedVault,
      updatedAt: new Date().toISOString(),
    });

    setSelectedKeys(new Set());
    setConfirmBulkDelete(false);
    notifySuccess(`Deleted ${count} selected illustration${count > 1 ? "s" : ""}.`);
  };

  // Move single illustration to another chapter or vault
  const handleMoveItem = (item: ManagedMediaItem, targetDestination: string) => {
    const currentDest = item.location === "vault" ? "vault" : item.chapterId;
    if (!targetDestination || targetDestination === currentDest) return;

    const movingIll: ChapterIllustration = {
      ...item.illustration,
      id: item.illustration.id,
    };

    // 1. Remove from source
    let nextVault = [...(book.mediaLibrary || [])];
    let nextChapters = book.chapters.map((ch) => ({
      ...ch,
      illustrations: [...(ch.illustrations || [])],
    }));

    if (item.location === "vault") {
      nextVault = nextVault.filter((i) => i.id !== item.illustration.id);
    } else if (item.chapterId) {
      nextChapters = nextChapters.map((ch) =>
        ch.id === item.chapterId
          ? { ...ch, illustrations: ch.illustrations.filter((i) => i.id !== item.illustration.id) }
          : ch
      );
    }

    // 2. Add to destination
    if (targetDestination === "vault") {
      nextVault.push(movingIll);
      onUpdateBook({
        ...book,
        chapters: nextChapters,
        mediaLibrary: nextVault,
        updatedAt: new Date().toISOString(),
      });
      notifySuccess(`Moved "${movingIll.title}" to Media Vault.`);
    } else {
      const destChapter = nextChapters.find((c) => c.id === targetDestination);
      nextChapters = nextChapters.map((ch) =>
        ch.id === targetDestination
          ? { ...ch, illustrations: [...ch.illustrations, movingIll] }
          : ch
      );
      onUpdateBook({
        ...book,
        chapters: nextChapters,
        mediaLibrary: nextVault,
        updatedAt: new Date().toISOString(),
      });
      notifySuccess(
        `Assigned "${movingIll.title}" to Chapter ${destChapter?.number || ""}: ${destChapter?.title || ""}.`
      );
    }
  };

  // Duplicate illustration into another chapter or vault
  const handleDuplicateItem = (item: ManagedMediaItem) => {
    const copy: ChapterIllustration = {
      ...item.illustration,
      id: `ill-copy-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      title: `${item.illustration.title} (Copy)`,
      createdAt: new Date().toISOString(),
    };

    if (item.location === "vault") {
      onUpdateBook({
        ...book,
        mediaLibrary: [...(book.mediaLibrary || []), copy],
        updatedAt: new Date().toISOString(),
      });
    } else if (item.chapterId) {
      onUpdateBook({
        ...book,
        chapters: book.chapters.map((ch) =>
          ch.id === item.chapterId
            ? { ...ch, illustrations: [...(ch.illustrations || []), copy] }
            : ch
        ),
        updatedAt: new Date().toISOString(),
      });
    }
    notifySuccess(`Duplicated "${item.illustration.title}".`);
  };

  // Bulk Move Selected Items
  const handleBulkMove = () => {
    if (selectedKeys.size === 0 || !bulkMoveTarget) return;
    const movingIllustrations: ChapterIllustration[] = [];

    allMediaItems.forEach((item) => {
      if (selectedKeys.has(item.key)) {
        movingIllustrations.push({ ...item.illustration });
      }
    });

    if (movingIllustrations.length === 0) return;

    let nextChapters = book.chapters.map((ch) => ({
      ...ch,
      illustrations: (ch.illustrations || []).filter(
        (ill) => !selectedKeys.has(`ch:${ch.id}:${ill.id}`)
      ),
    }));

    let nextVault = (book.mediaLibrary || []).filter(
      (ill) => !selectedKeys.has(`vault:${ill.id}`)
    );

    if (bulkMoveTarget === "vault") {
      nextVault = [...nextVault, ...movingIllustrations];
      onUpdateBook({
        ...book,
        chapters: nextChapters,
        mediaLibrary: nextVault,
        updatedAt: new Date().toISOString(),
      });
      notifySuccess(`Moved ${movingIllustrations.length} item(s) to Media Vault.`);
    } else {
      const targetCh = nextChapters.find((c) => c.id === bulkMoveTarget);
      nextChapters = nextChapters.map((ch) =>
        ch.id === bulkMoveTarget
          ? { ...ch, illustrations: [...ch.illustrations, ...movingIllustrations] }
          : ch
      );
      onUpdateBook({
        ...book,
        chapters: nextChapters,
        mediaLibrary: nextVault,
        updatedAt: new Date().toISOString(),
      });
      notifySuccess(
        `Assigned ${movingIllustrations.length} item(s) to Chapter ${targetCh?.number || ""}: ${targetCh?.title || ""}.`
      );
    }

    setSelectedKeys(new Set());
  };

  // Reorder illustration up/down within its container
  const handleReorder = (item: ManagedMediaItem, direction: "up" | "down") => {
    const delta = direction === "up" ? -1 : 1;
    const targetIdx = item.indexInContainer + delta;
    if (targetIdx < 0 || targetIdx >= item.totalInContainer) return;

    if (item.location === "vault") {
      const list = [...(book.mediaLibrary || [])];
      const [moved] = list.splice(item.indexInContainer, 1);
      list.splice(targetIdx, 0, moved);
      onUpdateBook({
        ...book,
        mediaLibrary: list,
        updatedAt: new Date().toISOString(),
      });
    } else if (item.chapterId) {
      const updatedChapters = book.chapters.map((ch) => {
        if (ch.id !== item.chapterId) return ch;
        const list = [...(ch.illustrations || [])];
        const [moved] = list.splice(item.indexInContainer, 1);
        list.splice(targetIdx, 0, moved);
        return { ...ch, illustrations: list };
      });
      onUpdateBook({
        ...book,
        chapters: updatedChapters,
        updatedAt: new Date().toISOString(),
      });
    }
  };

  // Begin inline editing
  const startEditing = (item: ManagedMediaItem) => {
    setEditingKey(item.key);
    setEditTitle(item.illustration.title || "");
    setEditCaption(item.illustration.caption || "");
    setEditPlacement(item.illustration.placement || "header");
  };

  const saveEditing = (item: ManagedMediaItem) => {
    const updatedIll: ChapterIllustration = {
      ...item.illustration,
      title: editTitle.trim() || "Untitled Plate",
      caption: editCaption.trim() || undefined,
      placement: editPlacement,
    };

    if (item.location === "vault") {
      onUpdateBook({
        ...book,
        mediaLibrary: (book.mediaLibrary || []).map((i) =>
          i.id === item.illustration.id ? updatedIll : i
        ),
        updatedAt: new Date().toISOString(),
      });
    } else if (item.chapterId) {
      onUpdateBook({
        ...book,
        chapters: book.chapters.map((ch) =>
          ch.id === item.chapterId
            ? {
                ...ch,
                illustrations: (ch.illustrations || []).map((i) =>
                  i.id === item.illustration.id ? updatedIll : i
                ),
              }
            : ch
        ),
        updatedAt: new Date().toISOString(),
      });
    }

    setEditingKey(null);
    notifySuccess(`Updated metadata for "${updatedIll.title}".`);
  };

  const handleSetAsBookCover = (ill: ChapterIllustration) => {
    onUpdateBook({
      ...book,
      coverImageUrl: ill.imageUrl,
      updatedAt: new Date().toISOString(),
    });
    notifySuccess(`Applied "${ill.title}" as Book Front Cover artwork!`);
  };

  const handleDownloadPlate = async (item: ManagedMediaItem) => {
    try {
      const prefix = item.chapterNumber ? `CH_${item.chapterNumber}` : "VAULT";
      const safeName = (item.illustration.title || "Illustration").replace(/[^a-zA-Z0-9_-]/g, "_");
      await downloadSingleArtworkFile(item.illustration.imageUrl, `${prefix}_${safeName}.png`);
      notifySuccess(`Downloaded "${item.illustration.title}".`);
    } catch (err: any) {
      setErrorNotice("Download failed: " + (err?.message || "Unknown error"));
    }
  };

  const handleSaveToDrive = async (item: ManagedMediaItem) => {
    setUploadingDriveId(item.illustration.id);
    setErrorNotice(null);
    try {
      const prefix = item.chapterNumber ? `CH_${item.chapterNumber}` : "VAULT";
      const { blob, mimeType, extension } = await convertUrlToBlob(
        item.illustration.imageUrl,
        item.illustration.title || prefix
      );
      const filename = `${prefix}_${(item.illustration.title || "Illustration").replace(/[^a-zA-Z0-9_-]/g, "_")}.${extension}`;
      await uploadBlobToGoogleDrive({
        name: filename,
        blob,
        mimeType,
        description: `TomeCrafter Media Asset for "${book.title}": ${item.illustration.title}`,
      });
      notifySuccess(`Uploaded "${filename}" to Google Drive!`);
    } catch (err: any) {
      setErrorNotice("Google Drive upload failed: " + (err?.message || "Unknown error"));
    } finally {
      setUploadingDriveId(null);
    }
  };

  const toggleSelectKey = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (filteredItems.length === 0) return;
    const allVisibleSelected = filteredItems.every((i) => selectedKeys.has(i.key));
    if (allVisibleSelected) {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((i) => next.delete(i.key));
        return next;
      });
    } else {
      setSelectedKeys((prev) => {
        const next = new Set(prev);
        filteredItems.forEach((i) => next.add(i.key));
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg"
        multiple
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesUpload(e.target.files);
            e.target.value = "";
          }
        }}
        className="hidden"
      />
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg"
        onChange={handleReplaceFileChange}
        className="hidden"
      />

      {/* Inline Notices */}
      {errorNotice && (
        <div className="p-3.5 rounded-2xl bg-amber-950/90 border border-amber-500/50 text-amber-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-amber-300 hover:text-white font-mono text-[11px] shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 rounded-2xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-300 hover:text-white font-mono text-[11px] shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-stone-400">Total Illustrations</div>
            <div className="text-2xl font-serif font-bold text-stone-100">{allMediaItems.length}</div>
          </div>
          <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Layers className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-stone-400">Bound to Chapters</div>
            <div className="text-2xl font-serif font-bold text-amber-400">{chapterPlatesCount}</div>
          </div>
          <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <BookOpen className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-stone-400">Media Vault Pool</div>
            <div className="text-2xl font-serif font-bold text-sky-400">{vaultPlatesCount}</div>
          </div>
          <span className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <FolderOpen className="w-5 h-5" />
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase text-stone-400">Uploaded Assets</div>
            <div className="text-2xl font-serif font-bold text-emerald-400">{uploadedCount}</div>
          </div>
          <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Upload className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Add / Upload / Generate Media Hub */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-stone-800 pb-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-100 flex items-center space-x-2">
              <ImageIcon className="w-5 h-5 text-purple-400" />
              <span>Illustration & Media Manager</span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Upload illustrations from your device, link external media, or generate AI chapter plates — then assign, reorder, replace, or delete anytime.
            </p>
          </div>

          {/* 3-Mode Ingest Switcher */}
          <div className="flex items-center space-x-1 bg-stone-950 p-1 rounded-xl border border-stone-800 self-start">
            <button
              type="button"
              onClick={() => setIngestMode("upload")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                ingestMode === "upload"
                  ? "bg-emerald-600 text-stone-950 shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Files</span>
            </button>
            <button
              type="button"
              onClick={() => setIngestMode("ai")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                ingestMode === "ai"
                  ? "bg-purple-600 text-stone-100 shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Generate Plate</span>
            </button>
            <button
              type="button"
              onClick={() => setIngestMode("url")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                ingestMode === "url"
                  ? "bg-sky-600 text-stone-100 shadow"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Add Image URL</span>
            </button>
          </div>
        </div>

        {/* Shared Target Destination & Placement Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-stone-950/70 p-3.5 rounded-xl border border-stone-800/80">
          <div>
            <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px] mb-1">
              Target Destination
            </label>
            <select
              value={uploadDestination}
              onChange={(e) => setUploadDestination(e.target.value)}
              className="w-full rounded-xl bg-stone-900 border border-stone-700 text-stone-100 p-2 focus:border-purple-500 focus:outline-none"
            >
              <option value="vault">Media Vault (Unassigned Library Pool)</option>
              <option value="cover">Book Front Cover Artwork</option>
              {book.chapters.length > 0 && (
                <optgroup label="Assign Directly to Chapter">
                  {book.chapters.map((ch) => (
                    <option key={ch.id} value={ch.id}>
                      CH {ch.number}: {ch.title}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div>
            <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px] mb-1">
              Chapter Page Placement
            </label>
            <select
              value={defaultPlacement}
              onChange={(e) => setDefaultPlacement(e.target.value as ChapterIllustration["placement"])}
              disabled={uploadDestination === "cover"}
              className="w-full rounded-xl bg-stone-900 border border-stone-700 text-stone-100 p-2 focus:border-purple-500 focus:outline-none disabled:opacity-40"
            >
              <option value="header">Chapter Top Header</option>
              <option value="inline">Mid-Scene Inline Plate</option>
              <option value="fullpage">Full-Page Print Plate</option>
              <option value="tail">Chapter Tail Vignette</option>
            </select>
          </div>

          <div>
            <label className="block text-stone-400 font-semibold uppercase tracking-wider text-[10px] mb-1">
              Optional Caption / Credit Note
            </label>
            <input
              type="text"
              value={batchCaption}
              onChange={(e) => setBatchCaption(e.target.value)}
              placeholder="e.g. Fig 1.2 — The Astral Observatory..."
              className="w-full rounded-xl bg-stone-900 border border-stone-700 text-stone-100 p-2 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Mode 1: Multi-File Drag-and-Drop Upload */}
        {ingestMode === "upload" && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDraggingOver(true);
            }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={handleDropZoneDrop}
            onClick={() => !isProcessingUpload && fileInputRef.current?.click()}
            className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all cursor-pointer ${
              isDraggingOver
                ? "border-emerald-400 bg-emerald-950/30"
                : "border-stone-700 hover:border-emerald-500/60 bg-stone-950/50 hover:bg-stone-950"
            }`}
          >
            {isProcessingUpload ? (
              <div className="space-y-2 py-2">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
                <div className="text-sm font-semibold text-stone-200">{uploadStatusText}</div>
                <div className="text-xs text-stone-400">
                  Optimizing dimensions & WebP encoding for instant manuscript rendering...
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="text-sm font-serif font-bold text-stone-100">
                  Drop illustrations here, or <span className="text-emerald-400 underline">browse files from your computer</span>
                </div>
                <p className="text-xs text-stone-400 max-w-lg mx-auto">
                  Supports multi-file upload (<span className="font-mono text-stone-300">PNG, JPG, WebP, GIF, SVG</span> up to 25 MB per file). Automatically detects aspect ratio and optimizes plates for print & cloud sync.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mode 2: AI Scene Plate Generator */}
        {ingestMode === "ai" && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-stone-300 font-semibold uppercase mb-1">
                  Scene Illustration Prompt
                </label>
                <textarea
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  rows={2}
                  placeholder="Describe the scene composition, lighting, atmosphere, and key visual details..."
                  className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2.5">
                <div>
                  <label className="block text-stone-300 font-semibold uppercase mb-1">
                    Plate Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={sceneTitle}
                    onChange={(e) => setSceneTitle(e.target.value)}
                    placeholder="Auto-titled from prompt if blank"
                    className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-stone-400 font-semibold uppercase text-[10px] mb-1">
                      Style
                    </label>
                    <select
                      value={sceneStyle}
                      onChange={(e) => setSceneStyle(e.target.value)}
                      className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-purple-500 focus:outline-none"
                    >
                      <optgroup label="Artistic Styles">
                        <option value="cinematic_digital">Cinematic Digital</option>
                        <option value="epic_oil_painting">Epic Oil Painting</option>
                        <option value="gothic_woodcut">Woodcut Engraving</option>
                        <option value="storybook_watercolor">Watercolor</option>
                        <option value="cyberpunk_concept">Cyberpunk Concept</option>
                        <option value="dark_charcoal">Dark Charcoal</option>
                      </optgroup>
                      <optgroup label="Diagrams & Schematics">
                        <option value="workflow_chart">Workflow Chart</option>
                        <option value="comparison_matrix">Comparison Matrix</option>
                        <option value="system_architecture">System Architecture</option>
                        <option value="technical_schematic">Technical Schematic</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-400 font-semibold uppercase text-[10px] mb-1">
                      Aspect Ratio
                    </label>
                    <select
                      value={sceneRatio}
                      onChange={(e) => setSceneRatio(e.target.value as ChapterIllustration["aspectRatio"])}
                      className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2 focus:border-purple-500 focus:outline-none"
                    >
                      <option value="16:9">16:9 Landscape</option>
                      <option value="3:4">3:4 Book Portrait</option>
                      <option value="4:3">4:3 Classic Plate</option>
                      <option value="1:1">1:1 Square</option>
                      <option value="9:16">9:16 Vertical</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleGenerateAiPlate}
                disabled={isGeneratingAi || !scenePrompt.trim()}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-stone-100 font-bold text-xs transition-all shadow-lg shadow-purple-950/40 disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering AI Illustration...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate & Add Illustration</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mode 3: Add by External URL */}
        {ingestMode === "url" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
            <div className="md:col-span-5">
              <label className="block text-stone-300 font-semibold uppercase mb-1">
                Image URL (HTTPS or Data URI)
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.com/illustration.png"
                className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-stone-300 font-semibold uppercase mb-1">
                Illustration Title
              </label>
              <input
                type="text"
                value={externalTitle}
                onChange={(e) => setExternalTitle(e.target.value)}
                placeholder="e.g. Map of the Northern Reach"
                className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-100 p-2.5 focus:border-sky-500 focus:outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-stone-300 font-semibold uppercase mb-1">
                Aspect Ratio
              </label>
              <select
                value={externalRatio}
                onChange={(e) => setExternalRatio(e.target.value as ChapterIllustration["aspectRatio"])}
                className="w-full rounded-xl bg-stone-950 border border-stone-800 text-stone-200 p-2.5 focus:border-sky-500 focus:outline-none"
              >
                <option value="16:9">16:9</option>
                <option value="3:4">3:4</option>
                <option value="4:3">4:3</option>
                <option value="1:1">1:1</option>
                <option value="9:16">9:16</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleAddExternalUrl}
                disabled={!externalUrl.trim()}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-all disabled:opacity-40"
              >
                Add Media
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter, Search & Bulk Operations Bar */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {(
              [
                { id: "all", label: `All (${allMediaItems.length})` },
                { id: "chapters", label: `Chapter Plates (${chapterPlatesCount})` },
                { id: "vault", label: `Media Vault (${vaultPlatesCount})` },
                { id: "uploaded", label: `Uploaded (${uploadedCount})` },
                { id: "ai", label: "AI Generated" },
                { id: "diagrams", label: "Diagrams" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                  categoryFilter === tab.id
                    ? "bg-purple-600 text-stone-100 shadow"
                    : "bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Chapter Filter + Search */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center space-x-1.5 bg-stone-950 border border-stone-800 rounded-xl px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-stone-500" />
              <select
                value={chapterFilterId}
                onChange={(e) => setChapterFilterId(e.target.value)}
                className="bg-transparent text-stone-200 focus:outline-none"
              >
                <option value="all" className="bg-stone-900">All Locations</option>
                <option value="vault" className="bg-stone-900">Unassigned Media Vault</option>
                {book.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id} className="bg-stone-900">
                    CH {ch.number}: {ch.title} ({ch.illustrations?.length || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search title, caption, file..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-200 focus:border-purple-500 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {filteredItems.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAllVisible}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-800 text-stone-300 transition-colors"
              >
                {filteredItems.every((i) => selectedKeys.has(i.key)) ? (
                  <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <Square className="w-3.5 h-3.5 text-stone-500" />
                )}
                <span>Select All</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Bulk Selection Action Bar */}
        {selectedKeys.size > 0 && (
          <div className="pt-3 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-200 font-mono font-bold">
                {selectedKeys.size} Selected
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedKeys(new Set());
                  setConfirmBulkDelete(false);
                }}
                className="text-stone-400 hover:text-stone-200 underline"
              >
                Clear
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={bulkMoveTarget}
                onChange={(e) => setBulkMoveTarget(e.target.value)}
                className="rounded-xl bg-stone-950 border border-stone-700 text-stone-200 px-2.5 py-1.5 focus:border-purple-500 focus:outline-none"
              >
                <option value="vault">Move to Media Vault</option>
                {book.chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    Assign to CH {ch.number}: {ch.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleBulkMove}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-colors"
              >
                Apply Move
              </button>

              {confirmBulkDelete ? (
                <div className="flex items-center space-x-1.5 bg-rose-950/80 border border-rose-500/50 px-2.5 py-1 rounded-xl">
                  <span className="text-rose-200 font-semibold">Delete {selectedKeys.size} item(s)?</span>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                  >
                    Confirm
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmBulkDelete(false)}
                    className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmBulkDelete(true)}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 border border-rose-500/40 text-rose-200 font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Media Cards Grid */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => {
            const { illustration: ill } = item;
            const isSelected = selectedKeys.has(item.key);
            const isEditing = editingKey === item.key;
            const isConfirmingDelete = confirmDeleteKey === item.key;
            const sourceKind = inferSourceKind(ill);

            return (
              <div
                key={item.key}
                className={`bg-stone-900 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between transition-all border ${
                  isSelected
                    ? "border-purple-500 ring-2 ring-purple-500/30"
                    : "border-stone-800 hover:border-stone-700"
                }`}
              >
                <div>
                  {/* Image Preview Header */}
                  <div className="relative aspect-video overflow-hidden bg-stone-950 group">
                    <img
                      src={ill.imageUrl}
                      alt={ill.title}
                      onClick={() => setLightboxItem(item)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                      referrerPolicy="no-referrer"
                    />

                    {/* Top Left: Select Checkbox + Location Badge */}
                    <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSelectKey(item.key)}
                        className={`p-1 rounded-lg backdrop-blur-md border transition-colors ${
                          isSelected
                            ? "bg-purple-600 border-purple-400 text-white"
                            : "bg-black/65 border-white/20 text-stone-200 hover:bg-black/85"
                        }`}
                        title="Select for bulk actions"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5" />
                        ) : (
                          <Square className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {item.location === "chapter" ? (
                        <span className="px-2 py-0.5 rounded-md bg-black/75 border border-amber-500/40 backdrop-blur-sm text-[10px] font-mono font-bold text-amber-300">
                          CH {item.chapterNumber}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-sky-950/85 border border-sky-500/40 backdrop-blur-sm text-[10px] font-mono font-bold text-sky-300">
                          MEDIA VAULT
                        </span>
                      )}
                    </div>

                    {/* Top Right: Source Kind + Fullscreen Button */}
                    <div className="absolute top-2.5 right-2.5 flex items-center space-x-1.5">
                      <span
                        className={`px-2 py-0.5 rounded-md backdrop-blur-sm text-[10px] font-mono uppercase font-semibold border ${
                          sourceKind === "uploaded"
                            ? "bg-emerald-950/85 border-emerald-500/40 text-emerald-300"
                            : sourceKind === "diagram"
                            ? "bg-cyan-950/85 border-cyan-500/40 text-cyan-300"
                            : sourceKind === "url"
                            ? "bg-sky-950/85 border-sky-500/40 text-sky-300"
                            : "bg-purple-950/85 border-purple-500/40 text-purple-300"
                        }`}
                      >
                        {sourceKind === "uploaded"
                          ? "Uploaded"
                          : sourceKind === "diagram"
                          ? "Diagram"
                          : sourceKind === "url"
                          ? "URL"
                          : "AI Plate"}
                      </span>

                      <button
                        type="button"
                        onClick={() => setLightboxItem(item)}
                        className="p-1 rounded-lg bg-black/65 hover:bg-black/90 border border-white/15 text-stone-200 transition-colors"
                        title="Inspect Full Size"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Bottom Right: Aspect Ratio & Dimensions */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-stone-300">
                      {ill.width && ill.height ? `${ill.width}×${ill.height} • ` : ""}
                      {ill.aspectRatio}
                      {ill.fileSizeBytes ? ` • ${formatMediaBytes(ill.fileSizeBytes)}` : ""}
                    </div>
                  </div>

                  {/* Card Body: Inline Edit Mode vs Display Mode */}
                  <div className="p-4 space-y-3 text-xs">
                    {isEditing ? (
                      <div className="space-y-2.5 bg-stone-950 p-3 rounded-xl border border-purple-500/40">
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-stone-400 mb-0.5">
                            Title
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full rounded-lg bg-stone-900 border border-stone-700 text-stone-100 px-2.5 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-stone-400 mb-0.5">
                            Caption
                          </label>
                          <input
                            type="text"
                            value={editCaption}
                            onChange={(e) => setEditCaption(e.target.value)}
                            placeholder="Printed caption beneath plate..."
                            className="w-full rounded-lg bg-stone-900 border border-stone-700 text-stone-100 px-2.5 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono uppercase text-stone-400 mb-0.5">
                            Placement in Chapter
                          </label>
                          <select
                            value={editPlacement}
                            onChange={(e) =>
                              setEditPlacement(e.target.value as ChapterIllustration["placement"])
                            }
                            className="w-full rounded-lg bg-stone-900 border border-stone-700 text-stone-200 px-2.5 py-1.5 text-xs focus:border-purple-500 focus:outline-none"
                          >
                            <option value="header">Chapter Top Header</option>
                            <option value="inline">Mid-Scene Inline Plate</option>
                            <option value="fullpage">Full-Page Print Plate</option>
                            <option value="tail">Chapter Tail Vignette</option>
                          </select>
                        </div>
                        <div className="flex items-center justify-end space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingKey(null)}
                            className="px-2.5 py-1 rounded-lg bg-stone-800 text-stone-300 hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => saveEditing(item)}
                            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold"
                          >
                            <Check className="w-3 h-3" />
                            <span>Save</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="font-serif font-bold text-sm text-stone-100 truncate">
                              {ill.title || "Untitled Illustration"}
                            </h4>
                            {item.location === "chapter" && (
                              <div className="text-[11px] text-amber-400/90 truncate">
                                Chapter {item.chapterNumber}: {item.chapterTitle}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => startEditing(item)}
                            className="p-1.5 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 shrink-0 transition-colors"
                            title="Edit Title, Caption & Placement"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-stone-400 text-[11px] line-clamp-2">
                          {ill.caption || ill.prompt || "No caption specified."}
                        </p>

                        {/* Assignment / Move Selector + Order Controls */}
                        <div className="pt-2 border-t border-stone-800 flex items-center justify-between gap-2">
                          <select
                            value={item.location === "vault" ? "vault" : item.chapterId || "vault"}
                            onChange={(e) => handleMoveItem(item, e.target.value)}
                            className="flex-1 min-w-0 rounded-lg bg-stone-950 border border-stone-800 text-stone-300 px-2 py-1 text-[11px] focus:border-purple-500 focus:outline-none"
                            title="Move or assign illustration to a chapter or Media Vault"
                          >
                            <option value="vault">Media Vault (Unassigned)</option>
                            {book.chapters.map((ch) => (
                              <option key={ch.id} value={ch.id}>
                                CH {ch.number}: {ch.title}
                              </option>
                            ))}
                          </select>

                          <span className="px-2 py-0.5 rounded bg-stone-950 border border-stone-800 text-[10px] font-mono text-purple-300 capitalize shrink-0">
                            {ill.placement}
                          </span>

                          {item.totalInContainer > 1 && (
                            <div className="flex items-center space-x-0.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleReorder(item, "up")}
                                disabled={item.indexInContainer === 0}
                                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30"
                                title="Move Earlier"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReorder(item, "down")}
                                disabled={item.indexInContainer === item.totalInContainer - 1}
                                className="p-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 disabled:opacity-30"
                                title="Move Later"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-3 py-2.5 bg-stone-950/90 border-t border-stone-800/90 flex flex-wrap items-center justify-between gap-1.5 text-[11px]">
                  {isConfirmingDelete ? (
                    <div className="w-full flex items-center justify-between bg-rose-950/70 border border-rose-500/40 rounded-lg px-2.5 py-1">
                      <span className="text-rose-200 font-semibold">Remove this illustration?</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleDeleteSingle(item)}
                          className="px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey(null)}
                          className="px-2 py-0.5 rounded bg-stone-800 text-stone-300 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setReplaceTargetItem(item);
                            replaceFileInputRef.current?.click();
                          }}
                          className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                          title="Upload a new image file to replace this artwork"
                        >
                          <RefreshCw className="w-3 h-3 text-emerald-400" />
                          <span>Replace</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSetAsBookCover(ill)}
                          className="px-2 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                          title="Use this artwork as Book Front Cover"
                        >
                          Set Cover
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDuplicateItem(item)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                          title="Duplicate illustration"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleDownloadPlate(item)}
                          className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 transition-colors"
                          title="Download image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSaveToDrive(item)}
                          disabled={uploadingDriveId === ill.id}
                          className="p-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/30 text-sky-300 transition-colors disabled:opacity-40"
                          title="Save to Google Drive"
                        >
                          {uploadingDriveId === ill.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <HardDrive className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirmDeleteKey(item.key)}
                          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/70 border border-rose-500/30 text-rose-300 transition-colors"
                          title="Delete illustration"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 px-4 rounded-2xl border-2 border-dashed border-stone-800 bg-stone-900/40 space-y-3">
          <ImageIcon className="w-12 h-12 text-stone-600 mx-auto" />
          <h3 className="text-lg font-serif font-bold text-stone-300">
            {allMediaItems.length === 0
              ? "No Illustrations in Manager Yet"
              : "No Illustrations Match Current Filter"}
          </h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            {allMediaItems.length === 0
              ? "Drop PNG, JPG, WebP, or SVG files into the upload zone above, paste an image link, or generate a new AI scene plate."
              : "Clear your search query or switch location filters to view all manuscript media."}
          </p>
          {allMediaItems.length === 0 ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-bold text-xs transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Your First Illustration</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setChapterFilterId("all");
                setSearchQuery("");
              }}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium"
            >
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      )}

      {/* Full-Screen Lightbox Inspector Modal */}
      {lightboxItem && (
        <div
          onClick={() => setLightboxItem(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-700 rounded-2xl max-w-5xl w-full overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            <div className="px-5 py-3.5 border-b border-stone-800 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-serif font-bold text-base text-stone-100 truncate">
                  {lightboxItem.illustration.title}
                </h3>
                <div className="text-xs text-stone-400 flex flex-wrap items-center gap-2">
                  <span>
                    {lightboxItem.location === "chapter"
                      ? `Chapter ${lightboxItem.chapterNumber}: ${lightboxItem.chapterTitle}`
                      : "Unassigned Media Vault"}
                  </span>
                  <span>•</span>
                  <span className="font-mono capitalize">
                    Placement: {lightboxItem.illustration.placement}
                  </span>
                  {lightboxItem.illustration.fileName && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-emerald-400">
                        {lightboxItem.illustration.fileName}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLightboxItem(null)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 bg-stone-950 flex items-center justify-center p-4 overflow-auto">
              <img
                src={lightboxItem.illustration.imageUrl}
                alt={lightboxItem.illustration.title}
                className="max-h-[65vh] w-auto object-contain rounded-lg shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="px-5 py-3.5 bg-stone-900 border-t border-stone-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <p className="text-stone-300 italic max-w-2xl truncate">
                {lightboxItem.illustration.caption || lightboxItem.illustration.prompt}
              </p>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPlate(lightboxItem)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteSingle(lightboxItem)}
                  className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Illustration</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
