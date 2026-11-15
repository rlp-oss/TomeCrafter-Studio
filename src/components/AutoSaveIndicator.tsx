import React from "react";
import { CheckCircle2, RefreshCw, Cloud, Database, HardDrive, Save, AlertCircle } from "lucide-react";

export type SaveStatus = "saved" | "saving" | "unsaved" | "idle" | "error";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSavedTime: string | null;
  isCloudSynced?: boolean;
  isDriveOffloaded?: boolean;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: () => void;
  onManualSave?: () => void;
  compact?: boolean;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSavedTime,
  isCloudSynced = false,
  isDriveOffloaded = false,
  autoSaveEnabled = false,
  onToggleAutoSave,
  onManualSave,
  compact = false,
}) => {
  const isUnsaved = status === "unsaved";

  return (
    <div className="inline-flex items-center space-x-1.5">
      {/* Save Action & Status Pill */}
      <button
        type="button"
        onClick={onManualSave}
        disabled={status === "saving"}
        title={
          isDriveOffloaded
            ? "Large manuscript (>1MB) offloaded to Google Drive. Click to save now."
            : autoSaveEnabled
            ? "Auto-Save is ON. Click to save immediately (Ctrl/Cmd+S)."
            : "Auto-Save is OFF (Manual Save mode). Click to save changes (Ctrl/Cmd+S)."
        }
        className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none disabled:cursor-wait ${
          status === "saving"
            ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
            : status === "error"
            ? "bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20"
            : isUnsaved
            ? "bg-amber-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-500/30"
            : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
        }`}
      >
        {/* Icon */}
        {status === "saving" ? (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
        ) : status === "error" ? (
          <Database className="w-3.5 h-3.5 text-rose-400" />
        ) : isUnsaved ? (
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
        ) : isDriveOffloaded ? (
          <HardDrive className="w-3.5 h-3.5 text-sky-400" />
        ) : (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        )}

        {/* Label */}
        <div className="flex items-center space-x-1.5 text-[11px] font-mono">
          <span className="font-semibold flex items-center space-x-1">
            {status === "saving" ? (
              <span>Saving...</span>
            ) : status === "error" ? (
              <span>Save Error</span>
            ) : isUnsaved ? (
              <>
                <Save className="w-3 h-3 text-amber-300" />
                <span>{compact ? "Save" : "Unsaved • Save"}</span>
              </>
            ) : compact ? (
              <span>Saved</span>
            ) : isDriveOffloaded ? (
              <span>Saved to Drive</span>
            ) : (
              <span>Saved</span>
            )}
          </span>

          {lastSavedTime && status !== "saving" && !isUnsaved && (
            <span className="text-[10px] text-stone-400 font-sans hidden sm:inline">
              • {lastSavedTime}
            </span>
          )}

          {isDriveOffloaded ? (
            <span
              className="flex items-center space-x-0.5 text-[9px] font-mono px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 hidden sm:inline-flex"
              title="Offloaded to Google Drive (>1MB)"
            >
              <HardDrive className="w-2.5 h-2.5 mr-0.5" />
              Drive Archive
            </span>
          ) : isCloudSynced ? (
            <span title="Firebase Cloud Synced" className="ml-0.5 hidden sm:inline-flex items-center">
              <Cloud className="w-3 h-3 text-cyan-400" />
            </span>
          ) : null}
        </div>
      </button>

      {/* Auto-Save Toggle Chip */}
      {onToggleAutoSave && (
        <button
          type="button"
          onClick={onToggleAutoSave}
          title={
            autoSaveEnabled
              ? "Auto-Save is currently ON. Click to turn Auto-Save OFF."
              : "Auto-Save is currently OFF. Click to turn Auto-Save ON."
          }
          className={`px-2 py-1 rounded-full border text-[10px] font-mono transition-colors cursor-pointer select-none ${
            autoSaveEnabled
              ? "bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25"
              : "bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-600"
          }`}
        >
          Auto: {autoSaveEnabled ? "ON" : "OFF"}
        </button>
      )}
    </div>
  );
};
