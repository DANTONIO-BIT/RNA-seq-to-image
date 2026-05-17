"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Dna, Copy } from "lucide-react";
import { AnalysisResult } from "@/lib/api";

interface Props {
  result: AnalysisResult;
}

export const SummaryStats = ({ result }: Props) => {
  const { summary } = result;

  const stats = [
    {
      label: "Total genes",
      value: summary.total_genes.toLocaleString(),
      icon: <Dna className="w-4 h-4" />,
      color: "text-foreground",
      bg: "bg-muted",
    },
    {
      label: "Upregulated",
      value: summary.significant_up.toLocaleString(),
      icon: <TrendingUp className="w-4 h-4" />,
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      label: "Downregulated",
      value: summary.significant_down.toLocaleString(),
      icon: <TrendingDown className="w-4 h-4" />,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Duplicates",
      value: summary.duplicates.toLocaleString(),
      icon: <Copy className="w-4 h-4" />,
      color: summary.duplicates > 0 ? "text-yellow-400" : "text-muted-foreground",
      bg: summary.duplicates > 0 ? "bg-yellow-500/10" : "bg-muted",
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Summary
      </p>
      <div className="flex flex-col gap-2">
        {stats.map(({ label, value, icon, color, bg }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3 px-3 py-2 rounded-lg bg-card border border-border"
          >
            <div className={`w-7 h-7 rounded-md ${bg} ${color} flex items-center justify-center flex-shrink-0`}>
              {icon}
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-base font-semibold leading-tight ${color}`}>{value}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
        Threshold: |log₂FC| &gt; 1, padj &lt; 0.05
      </p>
    </div>
  );
};
