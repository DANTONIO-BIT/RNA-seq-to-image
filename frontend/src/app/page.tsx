"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dna } from "lucide-react";
import { DropZone } from "@/components/DropZone";
import { FileInfo } from "@/components/FileInfo";
import { PlotControls } from "@/components/PlotControls";
import { PlotViewer } from "@/components/PlotViewer";
import { SummaryStats } from "@/components/SummaryStats";
import { AIPanel } from "@/components/AIPanel";
import { GSEAPanel } from "@/components/GSEAPanel";
import { runAnalysis, UploadResponse, AnalysisResult, PlotType, StylePreset, ExportFormat } from "@/lib/api";
import { Separator } from "@/components/ui/separator";

const STORAGE_KEY = "rnaseq_upload_v1";

export default function Home() {
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [result, setResult]         = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing]   = useState(false);

  // Restore last upload from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setUploadData(JSON.parse(saved));
    } catch { /* ignore corrupted storage */ }
  }, []);

  // Persist upload state
  useEffect(() => {
    if (uploadData) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadData));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [uploadData]);

  const handleUploaded = useCallback((res: UploadResponse) => {
    setUploadData(res);
    setResult(null);
  }, []);

  const handleAnalyze = useCallback(async (
    type: PlotType,
    style: StylePreset,
    format: ExportFormat,
    extraParams: Record<string, string | number> = {},
  ) => {
    if (!uploadData) return;
    setAnalyzing(true);
    setResult(null);
    try {
      const res = await runAnalysis(uploadData.file_id, type, { style, out_format: format, ...extraParams });
      setResult(res);
    } catch (e) {
      setResult({
        job_id: "",
        status: "failed",
        plot_type: type,
        image_base64: null,
        image_format: format,
        caption: null,
        summary: { format: "", total_genes: 0, significant_up: 0, significant_down: 0, duplicates: 0 },
        enrichment_table: null,
        pubmed_refs: null,
        sig_genes_csv: null,
        script_name: null,
        error: e instanceof Error ? e.message : "Analysis failed",
      });
    } finally {
      setAnalyzing(false);
    }
  }, [uploadData]);

  const hasFile = !!uploadData;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="flex-shrink-0 flex items-center justify-between px-6 h-14 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
            <Dna className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-sm tracking-tight">RNAseq Visualizer</span>
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
            AI
          </span>
        </div>
        <span className="text-xs text-muted-foreground hidden sm:block">
          Powered by Bioconductor · Open source AI
        </span>
      </header>

      <div className="flex-1 overflow-hidden flex">
        <AnimatePresence mode="wait">
          {!hasFile ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 flex flex-col items-center justify-center p-8"
            >
              <div className="w-full max-w-2xl flex flex-col gap-8">
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-tight">
                    Transcriptomic analysis,{" "}
                    <span className="text-primary">automated</span>
                  </h1>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Upload your DESeq2, edgeR, or limma results and get publication-ready figures instantly.
                  </p>
                </div>
                <DropZone onUploaded={handleUploaded} />
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex overflow-hidden"
            >
              {/* Left panel */}
              <aside className="w-72 flex-shrink-0 flex flex-col gap-5 p-5 border-r border-border overflow-y-auto">
                <FileInfo
                  data={uploadData}
                  onReset={() => { setUploadData(null); setResult(null); }}
                />

                <Separator />

                <PlotControls
                  onAnalyze={handleAnalyze}
                  loading={analyzing}
                  recommendations={uploadData.recommendations}
                />

                <AnimatePresence>
                  {result && !result.error && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-5"
                    >
                      <Separator />
                      <SummaryStats result={result} />

                      {result.enrichment_table && result.enrichment_table.length > 0 && (
                        <>
                          <Separator />
                          <GSEAPanel
                            table={result.enrichment_table}
                            pubmedRefs={result.pubmed_refs}
                          />
                        </>
                      )}

                      {result.caption && (
                        <>
                          <Separator />
                          <AIPanel caption={result.caption} />
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </aside>

              {/* Plot area */}
              <main className="flex-1 p-5 overflow-hidden">
                <PlotViewer result={result} loading={analyzing} />
              </main>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
