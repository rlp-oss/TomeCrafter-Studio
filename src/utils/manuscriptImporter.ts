import JSZip from "jszip";
import { Book, Chapter, FormattingSettings } from "../types";

export type BookTrimSize = FormattingSettings["trimSize"];

export interface BookSizeProfile {
  id: BookTrimSize;
  label: string;
  dimensions: string;
  subtitle: string;
  wordsPerPage: number;
  chapterWordBudget: number;
  fontSize: string;
  fontSizePx: number;
  lineSpacing: string;
  lineHeightValue: number;
  paragraphIndentEm: number;
  paragraphSpacingEm: number;
  dropCaps: boolean;
  recommendedTrimLabel: string;
  margins: {
    insideGutter: string;
    outside: string;
    top: string;
    bottom: string;
  };
}

export const BOOK_SIZE_PROFILES: Record<BookTrimSize, BookSizeProfile> = {
  pocket: {
    id: "pocket",
    label: "Pocket Paperback",
    dimensions: '4.25" × 6.87"',
    subtitle: "Compact mass-market & fast-paced genre fiction",
    wordsPerPage: 210,
    chapterWordBudget: 1800,
    fontSize: "10pt",
    fontSizePx: 14,
    lineSpacing: "1.4",
    lineHeightValue: 1.45,
    paragraphIndentEm: 1.2,
    paragraphSpacingEm: 0,
    dropCaps: false,
    recommendedTrimLabel: "4.25 x 6.87 inches (Pocket Paperback)",
    margins: {
      insideGutter: "0.625 in",
      outside: "0.5 in",
      top: "0.625 in",
      bottom: "0.625 in",
    },
  },
  "5.5x8.5": {
    id: "5.5x8.5",
    label: "Digest Novel",
    dimensions: '5.5" × 8.5"',
    subtitle: "Classic literary & indie paperback proportions",
    wordsPerPage: 235,
    chapterWordBudget: 2500,
    fontSize: "10.5pt",
    fontSizePx: 15,
    lineSpacing: "1.5",
    lineHeightValue: 1.55,
    paragraphIndentEm: 1.4,
    paragraphSpacingEm: 0,
    dropCaps: true,
    recommendedTrimLabel: "5.5 x 8.5 inches (Digest Novel)",
    margins: {
      insideGutter: "0.75 in",
      outside: "0.625 in",
      top: "0.75 in",
      bottom: "0.75 in",
    },
  },
  "6x9": {
    id: "6x9",
    label: "Trade Paperback",
    dimensions: '6" × 9"',
    subtitle: "Industry-standard KDP & bookstore flagship size",
    wordsPerPage: 260,
    chapterWordBudget: 3000,
    fontSize: "11pt",
    fontSizePx: 16,
    lineSpacing: "1.5",
    lineHeightValue: 1.6,
    paragraphIndentEm: 1.5,
    paragraphSpacingEm: 0,
    dropCaps: true,
    recommendedTrimLabel: "6 x 9 inches (Trade Paperback)",
    margins: {
      insideGutter: "0.875 in",
      outside: "0.75 in",
      top: "0.85 in",
      bottom: "0.85 in",
    },
  },
  "8x10": {
    id: "8x10",
    label: "Large Format",
    dimensions: '8" × 10"',
    subtitle: "Illustrated editions, guides, & executive non-fiction",
    wordsPerPage: 310,
    chapterWordBudget: 3800,
    fontSize: "12pt",
    fontSizePx: 18,
    lineSpacing: "1.6",
    lineHeightValue: 1.7,
    paragraphIndentEm: 1.75,
    paragraphSpacingEm: 0.25,
    dropCaps: true,
    recommendedTrimLabel: "8 x 10 inches (Large Format)",
    margins: {
      insideGutter: "0.95 in",
      outside: "0.85 in",
      top: "0.95 in",
      bottom: "0.95 in",
    },
  },
};

export interface ParsedManuscriptSection {
  title: string;
  content: string;
  wordCount: number;
}

export interface ManuscriptImportOptions {
  trimSize: BookTrimSize;
  autoFormatTypography: boolean;
  rebalanceToFitSize: boolean;
  replaceExistingChapters: boolean;
  fitBookTargetToManuscript: boolean;
}

export interface ManuscriptImportPreview {
  sourceName: string;
  rawWordCount: number;
  estimatedPages: number;
  detectedChapterCount: number;
  chapters: Chapter[];
  appliedFormatting: FormattingSettings;
  suggestedTargetWords: number;
}

/**
 * Normalizes and applies smart literary typography formatting to chapter text.
 */
export function autoFormatProseForPrint(rawText: string, applySmartPunctuation = true): string {
  if (!rawText) return "";

  let text = rawText
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\f/g, "\n\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (applySmartPunctuation) {
    text = text
      .replace(/(\W|^)"(\S)/g, "$1“$2")
      .replace(/(\S)"(\W|$)/g, "$1”$2")
      .replace(/"/g, "”")
      .replace(/(\W|^)'(\S)/g, "$1‘$2")
      .replace(/(\S)'(\W|$)/g, "$1’$2")
      .replace(/'/g, "’")
      .replace(/\s*--\s*/g, "—")
      .replace(/ — /g, "—")
      .replace(/\.\.\./g, "…")
      .replace(/[ \t]{2,}/g, " ");
  }

  return text;
}

/**
 * Extracts plain structured text from supported manuscript files.
 */
export async function extractTextFromManuscriptFile(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".docx")) {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const docXmlFile = zip.file("word/document.xml");
    if (!docXmlFile) {
      throw new Error("Could not locate word/document.xml inside this .docx file.");
    }
    const xmlStr = await docXmlFile.async("string");
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlStr, "application/xml");
    const paragraphs = Array.from(xmlDoc.getElementsByTagName("w:p"));

    const lines: string[] = [];
    for (const p of paragraphs) {
      const textNodes = Array.from(p.getElementsByTagName("w:t"));
      const paraText = textNodes.map((n) => n.textContent || "").join("").trim();
      if (!paraText) continue;
      lines.push(paraText);
    }
    return lines.join("\n\n");
  }

  if (lowerName.endsWith(".epub")) {
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const htmlEntries = Object.keys(zip.files)
      .filter((name) => /\.(xhtml|html|htm)$/i.test(name) && !/toc|nav|cover/i.test(name))
      .sort();

    if (htmlEntries.length === 0) {
      throw new Error("No readable chapter content files were found inside this EPUB archive.");
    }

    const parts: string[] = [];
    for (const entryPath of htmlEntries) {
      const rawHtml = await zip.files[entryPath].async("string");
      const text = extractTextFromHtml(rawHtml);
      if (text.trim()) {
        parts.push(text.trim());
      }
    }
    return parts.join("\n\n");
  }

  if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
    const htmlStr = await file.text();
    return extractTextFromHtml(htmlStr);
  }

  if (lowerName.endsWith(".rtf")) {
    const rtfStr = await file.text();
    return extractTextFromRtf(rtfStr);
  }

  // .txt, .md, .markdown, or fallback plain text
  return await file.text();
}

function extractTextFromHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, nav").forEach((el) => el.remove());

  const blocks: string[] = [];
  const elements = doc.body?.querySelectorAll("h1, h2, h3, p, blockquote, li");
  if (elements && elements.length > 0) {
    elements.forEach((el) => {
      const text = (el.textContent || "").replace(/\s+/g, " ").trim();
      if (!text) return;
      blocks.push(text);
    });
    return blocks.join("\n\n");
  }

  return (doc.body?.textContent || "").trim();
}

function extractTextFromRtf(rtf: string): string {
  return rtf
    .replace(/\{\\(?:fonttbl|colortbl|stylesheet|info|pict|object)[^}]*\}/gi, "")
    .replace(/\\par[d]?/gi, "\n\n")
    .replace(/\\line/gi, "\n")
    .replace(/\\tab/gi, "\t")
    .replace(/\\'([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u(-?\d+)\??/g, (_, code) => {
      const num = parseInt(code, 10);
      return String.fromCharCode(num < 0 ? 65536 + num : num);
    })
    .replace(/\\[a-zA-Z]+-?\d*\s?/g, "")
    .replace(/[{}]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const NUMBER_WORDS_PATTERN =
  "(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|Eleven|Twelve|Thirteen|Fourteen|Fifteen|Sixteen|Seventeen|Eighteen|Nineteen|Twenty(?:[-\\s](?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine))?|Thirty(?:[-\\s](?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine))?|Forty(?:[-\\s](?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine))?|Fifty(?:[-\\s](?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine))?)";

const EXPLICIT_CHAPTER_REGEX = new RegExp(
  `^(?:Chapter)\\s+(?:\\d{1,3}|[IVXLCDM]{1,7}|${NUMBER_WORDS_PATTERN})(?:\\s*[:.\\-—–]\\s*(.*)|\\s+(.*))?$`,
  "i"
);

const IGNORE_BREAK_REGEX =
  /^(?:[-=*✦❦♦·•_\s]{2,}|(?:page|chapter|section|scene)\s+break(?:\s*[-—–:.]*)?)$/i;

const TOC_ENTRY_REGEX = /(?:\.{3,}|\t|\s{3,})\d+\s*$/;

function isChapterHeadingLine(line: string, prevBlank: boolean, nextBlank: boolean): string | null {
  // Strip optional markdown heading prefix (#) and bold/italic asterisks/underscores
  const rawTrimmed = line.trim();
  if (!rawTrimmed || rawTrimmed.length > 110) return null;

  const cleaned = rawTrimmed
    .replace(/^#{1,6}\s+/, "")
    .replace(/^[*_]{1,3}|[*_]{1,3}$/g, "")
    .trim();

  if (!cleaned || IGNORE_BREAK_REGEX.test(cleaned) || TOC_ENTRY_REGEX.test(cleaned)) {
    return null;
  }

  const match = cleaned.match(EXPLICIT_CHAPTER_REGEX);
  if (!match) {
    return null;
  }

  const sepTitle = match[1]?.trim();
  const spaceTitle = match[2]?.trim();

  // If there was a punctuation separator like "Chapter 1: Title" or "Chapter 1 - Title"
  if (sepTitle) {
    if (IGNORE_BREAK_REGEX.test(sepTitle)) return null;
    return sepTitle;
  }

  // If there is trailing text without a colon/dash (e.g. "Chapter 1 The Spark" vs a prose sentence "Chapter 1 was...")
  if (spaceTitle) {
    if (IGNORE_BREAK_REGEX.test(spaceTitle)) return null;
    // Reject full prose sentences starting with "Chapter N ..."
    if (/[.!?]$/.test(spaceTitle) || spaceTitle.split(/\s+/).length > 8) {
      return null;
    }
    if (!prevBlank && !nextBlank && !rawTrimmed.startsWith("#")) {
      return null;
    }
    return spaceTitle;
  }

  // Plain "Chapter 1" .. "Chapter 19"
  if (!prevBlank && !nextBlank && !rawTrimmed.startsWith("#")) {
    return null;
  }
  return cleaned;
}

/**
 * Splits raw manuscript text strictly on explicit Chapter headings (ignoring page breaks,
 * chapter breaks, scene dividers, and subheadings), only splitting by word budget when requested.
 */
export function splitManuscriptIntoSections(
  rawText: string,
  chapterWordBudget: number,
  rebalanceLongChapters: boolean
): ParsedManuscriptSection[] {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\f/g, "\n\n");
  const lines = normalized.split("\n");

  const detected: { title: string; bodyLines: string[]; isPreamble: boolean }[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevBlank = i === 0 || lines[i - 1].trim() === "";
    const nextBlank = i === lines.length - 1 || lines[i + 1].trim() === "";
    const heading = isChapterHeadingLine(line, prevBlank, nextBlank);

    if (heading) {
      if (currentTitle !== null) {
        detected.push({
          title: currentTitle,
          bodyLines: currentLines,
          isPreamble: false,
        });
      } else if (currentLines.join("\n").trim().length > 0) {
        detected.push({
          title: "Opening",
          bodyLines: currentLines,
          isPreamble: true,
        });
      }
      currentTitle = heading;
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }

  if (currentTitle !== null) {
    detected.push({
      title: currentTitle,
      bodyLines: currentLines,
      isPreamble: false,
    });
  } else if (currentLines.join("\n").trim().length > 0) {
    detected.push({
      title: "Chapter 1",
      bodyLines: currentLines,
      isPreamble: false,
    });
  }

  const hasExplicitChapters = detected.some((d) => !d.isPreamble);

  // If explicit Chapter headings were found, ignore short front-matter preambles (< 250 words)
  // before Chapter 1 (title page, dedication, copyright, TOC) so Chapters 1..N match cleanly.
  let sections: ParsedManuscriptSection[] = detected
    .map((sec, idx) => {
      const content = sec.bodyLines.join("\n").trim();
      const wordCount = content ? content.split(/\s+/).filter(Boolean).length : 0;
      return {
        title: sec.title || `Chapter ${idx + 1}`,
        content,
        wordCount,
        isPreamble: sec.isPreamble,
      };
    })
    .filter((s) => {
      if (s.content.length === 0) return false;
      if (hasExplicitChapters && s.isPreamble && s.wordCount < 250) return false;
      return true;
    })
    .map(({ title, content, wordCount }) => ({ title, content, wordCount }));

  if (sections.length === 0 && normalized.trim().length > 0) {
    const clean = normalized.trim();
    sections = [
      {
        title: "Chapter 1",
        content: clean,
        wordCount: clean.split(/\s+/).filter(Boolean).length,
      },
    ];
  }

  // Rebalance oversized sections or unsplit manuscripts to fit the chosen trim size's chapter word budget
  const shouldAutoSplitSingleWall =
    sections.length === 1 && sections[0].wordCount > chapterWordBudget * 1.25;

  if (rebalanceLongChapters || shouldAutoSplitSingleWall) {
    const rebalanced: ParsedManuscriptSection[] = [];
    const maxWordsPerPart = Math.max(800, chapterWordBudget);

    for (const sec of sections) {
      if (sec.wordCount <= maxWordsPerPart * 1.35) {
        rebalanced.push(sec);
        continue;
      }

      const paragraphs = sec.content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
      let chunkParas: string[] = [];
      let chunkWords = 0;
      let partIndex = 1;

      for (const para of paragraphs) {
        const pWords = para.trim().split(/\s+/).filter(Boolean).length;
        if (chunkWords > 0 && chunkWords + pWords > maxWordsPerPart) {
          const text = chunkParas.join("\n\n");
          rebalanced.push({
            title:
              sections.length === 1
                ? `Chapter ${rebalanced.length + 1}`
                : partIndex === 1
                ? sec.title
                : `${sec.title} (Part ${partIndex})`,
            content: text,
            wordCount: chunkWords,
          });
          chunkParas = [para.trim()];
          chunkWords = pWords;
          partIndex++;
        } else {
          chunkParas.push(para.trim());
          chunkWords += pWords;
        }
      }

      if (chunkParas.length > 0) {
        const text = chunkParas.join("\n\n");
        rebalanced.push({
          title:
            sections.length === 1
              ? `Chapter ${rebalanced.length + 1}`
              : partIndex === 1
              ? sec.title
              : `${sec.title} (Part ${partIndex})`,
          content: text,
          wordCount: text.split(/\s+/).filter(Boolean).length,
        });
      }
    }

    sections = rebalanced;
  }

  return sections;
}

/**
 * Generates an import preview + fully formatted Chapter[] and FormattingSettings fitted to the selected book size.
 */
export function buildManuscriptImportPreview(
  rawText: string,
  sourceName: string,
  book: Book,
  options: ManuscriptImportOptions
): ManuscriptImportPreview {
  const profile = BOOK_SIZE_PROFILES[options.trimSize] || BOOK_SIZE_PROFILES["6x9"];
  const sections = splitManuscriptIntoSections(
    rawText,
    profile.chapterWordBudget,
    options.rebalanceToFitSize
  );

  const startingNumber = options.replaceExistingChapters ? 1 : book.chapters.length + 1;
  const totalNewChapters = sections.length;

  const chapters: Chapter[] = sections.map((sec, idx) => {
    const chNum = startingNumber + idx;
    const formattedContent = autoFormatProseForPrint(sec.content, options.autoFormatTypography);
    const wordCount = formattedContent ? formattedContent.split(/\s+/).filter(Boolean).length : 0;

    // Assign Act I / II / III smoothly across the narrative
    const progress = totalNewChapters > 1 ? idx / totalNewChapters : 0;
    const act = progress < 0.28 ? "Act I" : progress < 0.74 ? "Act II" : "Act III";

    // Build concise summary from opening prose
    const firstParagraph = formattedContent.split(/\n\n/)[0] || "";
    const summarySnippet =
      firstParagraph.length > 150 ? `${firstParagraph.slice(0, 147).trim()}…` : firstParagraph;

    return {
      id: `ch-${Date.now()}-${idx + 1}`,
      number: chNum,
      act,
      title: sec.title || `Chapter ${chNum}`,
      summary: summarySnippet || `Imported from ${sourceName}`,
      goal: "Refine narrative arc and scene pacing",
      conflict: "Core dramatic tension",
      cliffhanger: "",
      pov: book.author || "Narrator",
      setting: "Manuscript Scene",
      targetWords: profile.chapterWordBudget,
      wordCount,
      content: formattedContent,
      status: "draft",
      illustrations: [],
      footnotes: [],
    };
  });

  const rawWordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const existingWords = options.replaceExistingChapters
    ? 0
    : book.chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const combinedWordCount = rawWordCount + existingWords;
  const estimatedPages = Math.max(12, Math.ceil(combinedWordCount / profile.wordsPerPage) + 8);

  const prevFormatting = book.formattingSettings;
  const appliedFormatting: FormattingSettings = {
    trimSize: profile.id,
    fontPreset: prevFormatting?.fontPreset || "garamond",
    googleFontFamily: prevFormatting?.googleFontFamily || "EB Garamond",
    fontColor: prevFormatting?.fontColor || "#111827",
    fontSize: profile.fontSize,
    fontSizePx: profile.fontSizePx,
    lineSpacing: profile.lineSpacing,
    lineHeightValue: profile.lineHeightValue,
    letterSpacingEm: prevFormatting?.letterSpacingEm ?? 0,
    paragraphIndentEm: profile.paragraphIndentEm,
    paragraphSpacingEm: profile.paragraphSpacingEm,
    textAlign: prevFormatting?.textAlign || "justify",
    chapterHeadingCase: prevFormatting?.chapterHeadingCase || "title",
    chapterWordBudget: profile.chapterWordBudget,
    dropCaps: profile.dropCaps,
    dropCapSize: prevFormatting?.dropCapSize || 3,
    sceneBreakSymbol: prevFormatting?.sceneBreakSymbol || "* * *",
    showPageNumbers: prevFormatting?.showPageNumbers ?? true,
    runningHeaders: prevFormatting?.runningHeaders ?? true,
    includeFrontMatter: prevFormatting?.includeFrontMatter ?? true,
    includeBackMatter: prevFormatting?.includeBackMatter ?? true,
    dedicationText: prevFormatting?.dedicationText || "",
    copyrightText:
      prevFormatting?.copyrightText ||
      `© ${new Date().getFullYear()} ${book.author || "Author"}. All rights reserved.`,
    authorBio: prevFormatting?.authorBio || "",
    newsletterLink: prevFormatting?.newsletterLink || "",
    acknowledgments: prevFormatting?.acknowledgments || "",
  };

  const suggestedTargetWords = options.fitBookTargetToManuscript
    ? Math.max(combinedWordCount, Math.ceil(combinedWordCount / 5000) * 5000 || book.targetWordCount)
    : book.targetWordCount;

  return {
    sourceName,
    rawWordCount,
    estimatedPages,
    detectedChapterCount: chapters.length,
    chapters,
    appliedFormatting,
    suggestedTargetWords,
  };
}
