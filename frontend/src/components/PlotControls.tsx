"use client";

import { useState, useEffect } from "react";
import { Loader2, BarChart2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { PlotType, StylePreset, ExportFormat, AIRecommendation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const PLOTS: { type: PlotType; label: string; tip?: string }[] = [
  { type: "volcano", label: "Volcano" },
  { type: "ma",      label: "MA Plot" },
  { type: "pca",     label: "Feature PCA", tip: "PCA on DE statistics (fold-change, p-value). For sample-level PCA you need a raw count matrix." },
  { type: "heatmap", label: "Heatmap" },
  { type: "gsea",    label: "GSEA"    },
];

const STYLES: { value: StylePreset; label: string; dot: string }[] = [
  { value: "default", label: "Default", dot: "bg-primary"     },
  { value: "nature",  label: "Nature",  dot: "bg-emerald-400" },
  { value: "cell",    label: "Cell",    dot: "bg-amber-400"   },
  { value: "dark",    label: "Dark",    dot: "bg-slate-600"   },
];

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG" },
  { value: "pdf", label: "PDF" },
];

interface JournalPreset { label: string; sublabel: string; width: number; height: number; dpi: number }
const JOURNALS: Record<string, JournalPreset> = {
  screen:    { label: "Screen",         sublabel: "150 dpi preview",  width: 10,   height: 8,   dpi: 150 },
  nature_1:  { label: "Nature (1 col)", sublabel: "89 mm · 300 dpi", width: 3.50, height: 3.0, dpi: 300 },
  nature_2:  { label: "Nature (2 col)", sublabel: "183 mm · 300 dpi",width: 7.20, height: 5.5, dpi: 300 },
  cell_2:    { label: "Cell",           sublabel: "170 mm · 300 dpi",width: 6.69, height: 5.5, dpi: 300 },
  science_2: { label: "Science",        sublabel: "120 mm · 300 dpi",width: 4.72, height: 4.0, dpi: 300 },
  plos:      { label: "PLOS ONE",       sublabel: "174 mm · 300 dpi",width: 6.85, height: 5.5, dpi: 300 },
};

interface GeneSetPreset { label: string; sublabel: string; collection: string; subcollection: string }
const GENE_SETS: GeneSetPreset[] = [
  { label: "Hallmarks",       sublabel: "50 curated sets",  collection: "H",  subcollection: ""               },
  { label: "KEGG",            sublabel: "~186 pathways",    collection: "C2", subcollection: "CP:KEGG_LEGACY" },
  { label: "GO: Biol. Proc.", sublabel: "~4700 terms",      collection: "C5", subcollection: "GO:BP"          },
  { label: "Reactome",        sublabel: "~1600 pathways",   collection: "C2", subcollection: "CP:REACTOME"    },
];

// ── Collapsible section ───────────────────────────────────────────────────────

const Section = ({
  label,
  defaultOpen = true,
  children,
}: {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors group"
      >
        {label}
        {open
          ? <ChevronUp  className="w-3 h-3 opacity-60 group-hover:opacity-100" />
          : <ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
        }
      </button>
      {open && children}
    </div>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  onAnalyze: (
    type: PlotType,
    style: StylePreset,
    format: ExportFormat,
    extraParams: Record<string, string | number>
  ) => void;
  loading: boolean;
  recommendations?: AIRecommendation;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const PlotControls = ({ onAnalyze, loading, recommendations }: Props) => {
  const [plotType,    setPlotType]    = useState<PlotType>("volcano");
  const [style,       setStyle]       = useState<StylePreset>("default");
  const [format,      setFormat]      = useState<ExportFormat>("png");
  const [journalKey,  setJournalKey]  = useState<string>("screen");
  const [geneSetIdx,  setGeneSetIdx]  = useState<number>(0);
  const [title,       setTitle]       = useState<string>("");
  const [padjCutoff,  setPadjCutoff]  = useState<number>(0.05);
  const [fcCutoff,    setFcCutoff]    = useState<number>(1.0);

  useEffect(() => {
    if (recommendations) {
      setPlotType(recommendations.plot_type);
      setStyle(recommendations.style);
    }
  }, [recommendations]);

  const THRESHOLD_PLOTS: PlotType[] = ["volcano", "ma", "gsea"];

  const handleGenerate = () => {
    const j  = JOURNALS[journalKey];
    const gs = GENE_SETS[geneSetIdx];
    const extraParams: Record<string, string | number> = {
      width:  j.width,
      height: j.height,
      dpi:    j.dpi,
    };
    if (title.trim()) extraParams.title = title.trim();
    if (THRESHOLD_PLOTS.includes(plotType)) {
      extraParams.pval_threshold = padjCutoff;
      extraParams.fc_threshold   = fcCutoff;
    }
    if (plotType === "gsea") {
      extraParams.collection    = gs.collection;
      extraParams.subcollection = gs.subcollection;
    }
    onAnalyze(plotType, style, format, extraParams);
  };

  return (
    <div className="flex flex-col gap-4">

      {/* AI hint */}
      {recommendations && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/15 text-xs text-muted-foreground">
          <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
          <span className="leading-relaxed">{recommendations.plot_reason}</span>
        </div>
      )}

      {/* Plot type — always open */}
      <Section label="Plot type" defaultOpen>
        <div className="grid grid-cols-2 gap-2">
          {PLOTS.map(({ type, label, tip }) => {
            const isRec = recommendations?.plot_type === type;
            return (
              <button
                key={type}
                onClick={() => setPlotType(type)}
                title={tip}
                className={cn(
                  "relative px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left",
                  plotType === type
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-foreground hover:border-primary/40"
                )}
              >
                {label}
                {isRec && plotType !== type && (
                  <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary/60" />
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Thresholds — only for plots that filter by significance */}
      {["volcano", "ma", "gsea"].includes(plotType) && (
        <Section label="Thresholds" defaultOpen>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">padj cutoff</label>
                <span className="text-xs font-mono text-foreground">{padjCutoff}</span>
              </div>
              <input
                type="range"
                min={0.001} max={0.2} step={0.001}
                value={padjCutoff}
                onChange={e => setPadjCutoff(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>0.001</span><span>0.05</span><span>0.2</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">|log₂FC| cutoff</label>
                <span className="text-xs font-mono text-foreground">{fcCutoff.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0} max={3} step={0.1}
                value={fcCutoff}
                onChange={e => setFcCutoff(parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full accent-primary cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>0</span><span>1.0</span><span>3.0</span>
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* Figure title */}
      <Section label="Figure title" defaultOpen={false}>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Auto-generated from plot type"
          className="w-full px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/40"
        />
        <p className="text-[10px] text-muted-foreground">Leave blank to use the default title</p>
      </Section>

      {/* GSEA: gene set collection */}
      {plotType === "gsea" && (
        <Section label="Gene sets" defaultOpen>
          <div className="flex flex-col gap-1.5">
            {GENE_SETS.map((gs, i) => (
              <button
                key={gs.collection + gs.subcollection}
                onClick={() => setGeneSetIdx(i)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all",
                  geneSetIdx === i
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40"
                )}
              >
                <span className={cn("text-sm font-medium", geneSetIdx === i ? "text-primary" : "text-foreground")}>
                  {gs.label}
                </span>
                <span className="text-[10px] text-muted-foreground">{gs.sublabel}</span>
              </button>
            ))}
          </div>
        </Section>
      )}

      {/* Style — collapsed by default to save space */}
      <Section label="Style" defaultOpen={false}>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map(({ value, label, dot }) => (
            <button
              key={value}
              onClick={() => setStyle(value)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all",
                style === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              )}
            >
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", dot)} />
              {label}
            </button>
          ))}
        </div>
      </Section>

      {/* Format + journal collapsed */}
      <Section label="Export" defaultOpen={false}>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">File format</p>
        <div className="flex gap-2 mb-3">
          {FORMATS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFormat(value)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                format === value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground hover:border-primary/40"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-1">Target journal</p>
        <div className="flex flex-col gap-1.5">
          {Object.entries(JOURNALS).map(([key, j]) => (
            <button
              key={key}
              onClick={() => setJournalKey(key)}
              className={cn(
                "flex items-center justify-between px-3 py-2 rounded-lg border text-left transition-all",
                journalKey === key
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-primary/40"
              )}
            >
              <span className={cn("text-sm font-medium", journalKey === key ? "text-primary" : "text-foreground")}>
                {j.label}
              </span>
              <span className="text-[10px] text-muted-foreground">{j.sublabel}</span>
            </button>
          ))}
        </div>
      </Section>

      <Button onClick={handleGenerate} disabled={loading} className="w-full gap-2">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart2 className="w-4 h-4" />}
        {loading ? "Running analysis…" : "Generate plot"}
      </Button>
    </div>
  );
};
