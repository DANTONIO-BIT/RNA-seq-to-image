"use client";

import { motion } from "framer-motion";
import { FileText, ChevronRight } from "lucide-react";
import { UploadResponse } from "@/lib/api";

const FORMAT_COLORS: Record<string, string> = {
  deseq2: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
  edger:  "bg-blue-500/15 text-blue-400 border-blue-500/20",
  limma:  "bg-purple-500/15 text-purple-400 border-purple-500/20",
  generic: "bg-muted text-muted-foreground",
};

interface Props {
  data: UploadResponse;
  onReset: () => void;
}

export const FileInfo = ({ data, onReset }: Props) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-card border border-border"
  >
    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
      <FileText className="w-4 h-4 text-primary" />
    </div>

    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium truncate">{data.filename}</p>
      <p className="text-xs text-muted-foreground">
        {data.rows.toLocaleString()} genes · {data.columns.length} columns
      </p>
    </div>

    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${FORMAT_COLORS[data.detected_format] ?? FORMAT_COLORS.generic}`}>
      {data.detected_format.toUpperCase()}
    </span>

    <button
      onClick={onReset}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-1 flex-shrink-0"
    >
      Change
    </button>
  </motion.div>
);
