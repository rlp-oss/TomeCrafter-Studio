import React from "react";
import { CheckCircle2, RefreshCw, Cloud, Database, HardDrive } from "lucide-react";

export type SaveStatus = "saved" | "saving" | "idle" | "error";

interface AutoSaveIndicatorProps {
  status: SaveStatus;
  lastSavedTime: string | null;
  isCloudSynced?: boolean;
  isDriveOffloaded?: boolean;
  onManualSave?: () => void;
  compact?: boolean;
}

export const AutoSaveIndicator: React.FC<AutoSaveIndicatorProps> = ({
  status,
  lastSavedTime,
  isCloudSynced = false,
  isDriveOffloaded = false,
  onManualSave,
  compact = false,
}) => {
  return (
    <div
      onClick={onManualSave}
      title={
        isDriveOffloaded
          ? "Large manuscript (>1MB) automatically offloaded to Google Drive with Firestore metadata stub syncing."
          : "Continuous auto-save active. Every change, keystroke, chapter, and setting is saved instantly."
      }
      className={`inline-flex items-center space-x-2 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none ${
        status === "saving"
          ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
          : status === "error"
          ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
      }`}
    >
      {/* Icon */}
      {status === "saving" ? (
        <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
      ) : status === "error" ? (
        <Database className="w-3.5 h-3.5 text-rose-400" />
      ) : isDriveOffloaded ? (
        <HardDrive className="w-3.5 h-3.5 text-sky-400" />
      ) : (
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      )}

      {/* Label */}
      <div className="flex items-center space-x-1.5 text-[11px] font-mono">
        <span className="font-semibold">
          {status === "saving"
            ? "Auto-saving..."
            : status === "error"
            ? "Save Error"
            : compact
            ? "Auto-saved"
            : isDriveOffloaded
            ? "Saved to Drive"
            : "All Changes Saved"}
        </span>

        {lastSavedTime && status !== "saving" && (
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
          <span title="Synced with Firestore Cloud" className="ml-1 hidden sm:inline-flex items-center">
            <Cloud className="w-3 h-3 text-cyan-400" />
          </span>
        ) : null}
      </div>
    </div>
  );
};
