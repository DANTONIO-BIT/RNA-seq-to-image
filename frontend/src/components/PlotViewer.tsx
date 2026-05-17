"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download, AlertCircle, ImageOff, FileText, TableProperties, Code2 } from "lucide-react";
import { AnalysisResult } from "@/lib/api";
import { Button } from "@/components/ui/button";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface Props {
  result: AnalysisResult | null;
  loading: boolean;
}

const MIME: Record<string, string> = {
  png: "image/png",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

const downloadFile = (base64: string, format: string, name: string) => {
  const a = document.createElement("a");
  a.href = `data:${MIME[format] ?? "image/png"};base64,${base64}`;
  a.download = `${name}.${format}`;
  a.click();
};

const downloadText = (text: string, filename: string, mime = "text/plain") => {
  const blob = new Blob([text], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const downloadRScript = (scriptName: string) => {
  const a = document.createElement("a");
  a.href = `${BASE_URL}/api/export/scripts/${scriptName}`;
  a.download = scriptName;
  a.click();
};

export const PlotViewer = ({ result, loading }: Props) => {
  const fmt = result?.image_format ?? "png";
  const isPdf = fmt === "pdf";
  const mimeType = MIME[fmt] ?? "image/png";

  return (
    <div className="relative flex flex-col h-full">
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10 bg-background/80 backdrop-blur-sm rounded-xl"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
              className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent"
            />
            <p className="text-sm text-muted-foreground">Running R analysis…</p>
          </motion.div>
        )}

        {!loading && !result && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground"
          >
            <ImageOff className="w-10 h-10 opacity-30" />
            <p className="text-sm">Plot will appear here</p>
          </motion.div>
        )}

        {!loading && result?.error && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full gap-3 text-destructive"
          >
            <AlertCircle className="w-10 h-10" />
            <p className="text-sm text-center max-w-xs">{result.error}</p>
          </motion.div>
        )}

        {!loading && result?.image_base64 && !result.error && (
          <motion.div
            key="plot"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="flex flex-col h-full gap-3"
          >
            <div className="flex-1 rounded-xl overflow-hidden border border-border bg-white flex items-center justify-center">
              {isPdf ? (
                <div className="flex flex-col items-center gap-3 text-muted-foreground p-8">
                  <FileText className="w-14 h-14 opacity-40" />
                  <p className="text-sm">PDF ready — click Export to download</p>
                </div>
              ) : (
                <img
                  src={`data:${mimeType};base64,${result.image_base64}`}
                  alt={`${result.plot_type} plot`}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <p className="text-xs text-muted-foreground flex-1 min-w-0">
                AI-generated interpretation — review before publication
              </p>
              {result.sig_genes_csv && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => downloadText(result.sig_genes_csv!, "sig_genes.csv", "text/csv")}
                >
                  <TableProperties className="w-3.5 h-3.5" />
                  Genes CSV
                </Button>
              )}
              {result.script_name && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => downloadRScript(result.script_name!)}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  R Script
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs"
                onClick={() => downloadFile(result.image_base64!, fmt, result.plot_type)}
              >
                <Download className="w-3.5 h-3.5" />
                Export {fmt.toUpperCase()}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
