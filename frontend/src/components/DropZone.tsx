"use client";

import { useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, AlertCircle, Download } from "lucide-react";
import { uploadFile, UploadResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  onUploaded: (res: UploadResponse) => void;
}

const ACCEPTED = [".csv", ".tsv", ".txt"];
const FORMAT_LABELS: Record<string, string> = {
  deseq2: "DESeq2",
  edger: "edgeR",
  limma: "limma",
  generic: "Generic",
};

export const DropZone = ({ onUploaded }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const res = await uploadFile(file);
      onUploaded(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }, [onUploaded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full gap-6">
      <motion.button
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        disabled={loading}
        className={cn(
          "relative w-full max-w-xl h-64 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center gap-4 outline-none",
          dragging
            ? "border-primary bg-primary/10 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-primary/5",
          loading && "opacity-50 cursor-not-allowed"
        )}
        whileTap={{ scale: 0.99 }}
      >
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent"
              />
              <p className="text-sm text-muted-foreground">Parsing file…</p>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-3"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                <UploadCloud className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-medium text-foreground">Drop your file here</p>
                <p className="text-sm text-muted-foreground mt-1">
                  CSV, TSV · DESeq2 · edgeR · limma
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-2 text-destructive text-sm"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-xl flex flex-col gap-3">
        <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-1">Required columns</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono">
            <span><span className="text-primary">gene</span> — gene symbol or Ensembl ID</span>
            <span><span className="text-primary">log2FoldChange</span> — or logFC</span>
            <span><span className="text-primary">padj</span> — or adj.P.Val / FDR</span>
            <span><span className="text-muted-foreground/60">baseMean</span> — optional</span>
          </div>
          <p className="mt-1.5 text-muted-foreground/70">
            Supported: DESeq2 · edgeR · limma · generic CSV/TSV
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {ACCEPTED.map((ext) => (
              <span
                key={ext}
                className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground font-mono"
              >
                {ext}
              </span>
            ))}
          </div>
          <a
            href="/sample_rnaseq.csv"
            download="sample_rnaseq.csv"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Download className="w-3 h-3" />
            Download sample CSV
          </a>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
};
