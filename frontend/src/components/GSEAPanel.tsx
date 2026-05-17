"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, ChevronDown, ChevronUp, BookOpen, ExternalLink } from "lucide-react";
import { EnrichmentRow, PathwayRefs } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Props {
  table: EnrichmentRow[];
  pubmedRefs?: PathwayRefs[] | null;
}

const PREVIEW_ROWS = 8;

const fdrBadge = (padj: number) => {
  if (padj < 0.01) return { label: "***", cls: "bg-emerald-500/15 text-emerald-400" };
  if (padj < 0.05) return { label: "**",  cls: "bg-emerald-500/10 text-emerald-500" };
  if (padj < 0.25) return { label: "*",   cls: "bg-yellow-500/10 text-yellow-500"  };
  return               { label: "ns",  cls: "bg-muted text-muted-foreground"     };
};

const formatName = (pathway: string) => {
  let s = pathway
    .replace(/^HALLMARK_|^KEGG_|^GOBP_|^GOCC_|^GOMF_|^REACTOME_|^WP_/, "")
    .replace(/_V\d+$/, "")
    .replace(/_/g, " ")
    .toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const PubmedPapers = ({ pathway, refs }: { pathway: string; refs: PathwayRefs[] }) => {
  const match = refs.find(r => r.pathway === pathway);
  if (!match || match.papers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-1.5 flex flex-col gap-1 pl-2 border-l border-primary/20"
    >
      {match.papers.map(p => (
        <a
          key={p.pmid}
          href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex flex-col gap-0.5 hover:bg-primary/5 rounded p-1 transition-colors"
        >
          <span className="text-[10px] text-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
            {p.title}
          </span>
          <span className="text-[9px] text-muted-foreground flex items-center gap-1">
            {p.authors} · <em>{p.journal}</em> {p.year && `(${p.year})`}
            <ExternalLink className="w-2.5 h-2.5 opacity-50 group-hover:opacity-100" />
          </span>
        </a>
      ))}
    </motion.div>
  );
};

export const GSEAPanel = ({ table, pubmedRefs }: Props) => {
  const [expanded,        setExpanded]        = useState(false);
  const [openedPathway,   setOpenedPathway]   = useState<string | null>(null);

  const rows    = expanded ? table : table.slice(0, PREVIEW_ROWS);
  const hasMore = table.length > PREVIEW_ROWS;
  const hasPubs = !!pubmedRefs && pubmedRefs.length > 0;

  const togglePathway = (pathway: string) =>
    setOpenedPathway(prev => (prev === pathway ? null : pathway));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Enrichment (ORA)
        </p>
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          <FlaskConical className="w-2.5 h-2.5" />
          MSigDB
        </span>
      </div>

      <div className="flex flex-col gap-1">
        {rows.map((row, i) => {
          const badge   = fdrBadge(row.padj);
          const hasRefs = hasPubs && pubmedRefs!.some(r => r.pathway === row.pathway);
          const isOpen  = openedPathway === row.pathway;

          return (
            <motion.div
              key={row.pathway}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-lg bg-card border border-border overflow-hidden"
            >
              <div
                className={cn(
                  "flex items-center gap-2 px-2.5 py-2",
                  hasRefs && "cursor-pointer hover:bg-muted/40 transition-colors"
                )}
                onClick={() => hasRefs && togglePathway(row.pathway)}
                title={`${row.n_overlap} / ${row.n_genes_set} genes · padj = ${row.padj.toExponential(2)}`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-foreground leading-tight truncate">
                    {formatName(row.pathway)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {row.n_overlap}/{row.n_genes_set} genes
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", badge.cls)}>
                    {badge.label}
                  </span>
                  {hasRefs && (
                    <BookOpen className={cn("w-3 h-3 transition-colors", isOpen ? "text-primary" : "text-muted-foreground")} />
                  )}
                </div>
              </div>

              {hasRefs && (
                <AnimatePresence>
                  {isOpen && (
                    <div className="px-2.5 pb-2">
                      <PubmedPapers pathway={row.pathway} refs={pubmedRefs!} />
                    </div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {expanded
            ? <><ChevronUp className="w-3 h-3" /> Show less</>
            : <><ChevronDown className="w-3 h-3" /> Show all {table.length} pathways</>
          }
        </button>
      )}

      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Fisher exact test · BH-FDR · MSigDB · Click pathway to view literature
      </p>
    </motion.div>
  );
};
