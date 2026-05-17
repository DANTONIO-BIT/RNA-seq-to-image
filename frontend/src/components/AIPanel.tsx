"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Copy, Check } from "lucide-react";

interface Props {
  caption: string;
}

export const AIPanel = ({ caption }: Props) => {
  const [text, setText]     = useState(caption);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Figure caption
        </p>
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
          <Sparkles className="w-2.5 h-2.5" />
          AI
        </span>
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        rows={6}
        className="w-full resize-none rounded-lg border border-border bg-card px-3 py-2.5 text-xs text-foreground leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/40"
      />

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">Editable — review before publication</p>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </motion.div>
  );
};
