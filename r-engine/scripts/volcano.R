suppressPackageStartupMessages({
  library(optparse)
  library(ggplot2)
  library(dplyr)
})

script_dir <- dirname(normalizePath(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)[1])))
source(file.path(script_dir, "utils.R"))

option_list <- list(
  make_option("--input",          type = "character"),
  make_option("--output",         type = "character"),
  make_option("--fc_threshold",   type = "double",    default = 1.0),
  make_option("--pval_threshold", type = "double",    default = 0.05),
  make_option("--title",          type = "character", default = "Volcano Plot"),
  make_option("--style",          type = "character", default = "default"),
  make_option("--out_format",     type = "character", default = "png"),
  make_option("--width",          type = "integer",   default = 10),
  make_option("--height",         type = "integer",   default = 8),
  make_option("--dpi",            type = "integer",   default = 150)
)

opt <- parse_args(OptionParser(option_list = option_list))

df <- read.csv(opt$input, stringsAsFactors = FALSE)

if (!"log2FoldChange" %in% names(df) && "logFC" %in% names(df))  df$log2FoldChange <- df$logFC
if (!"padj" %in% names(df) && "adj.P.Val" %in% names(df))        df$padj <- df$adj.P.Val
if (!"padj" %in% names(df) && "FDR" %in% names(df))              df$padj <- df$FDR
if (!"gene" %in% names(df))                                        df$gene <- rownames(df)

df <- df %>%
  filter(!is.na(padj), !is.na(log2FoldChange)) %>%
  mutate(
    neg_log10_padj = -log10(padj),
    significance = case_when(
      padj < opt$pval_threshold & log2FoldChange >  opt$fc_threshold ~ "Up",
      padj < opt$pval_threshold & log2FoldChange < -opt$fc_threshold ~ "Down",
      TRUE ~ "NS"
    )
  )

colors    <- get_sig_colors(opt$style)
top_genes <- df %>% filter(significance != "NS") %>% arrange(padj) %>% slice_head(n = 15)

p <- ggplot(df, aes(x = log2FoldChange, y = neg_log10_padj, color = significance)) +
  geom_point(alpha = 0.6, size = 1.8) +
  scale_color_manual(values = colors, name = NULL) +
  geom_vline(xintercept = c(-opt$fc_threshold, opt$fc_threshold),
             linetype = "dashed", color = if (opt$style == "dark") "#555577" else "#666666", linewidth = 0.4) +
  geom_hline(yintercept = -log10(opt$pval_threshold),
             linetype = "dashed", color = if (opt$style == "dark") "#555577" else "#666666", linewidth = 0.4) +
  ggrepel::geom_text_repel(
    data = top_genes, aes(label = gene),
    size = 3, max.overlaps = 20,
    color = if (opt$style == "dark") "#CCCCCC" else "#333333",
    segment.color = if (opt$style == "dark") "#555577" else "#888888",
    segment.size = 0.3
  ) +
  labs(
    title = opt$title,
    x = expression(log[2]~"Fold Change"),
    y = expression(-log[10]~"(adjusted p-value)")
  ) +
  get_theme(opt$style) +
  annotate("text",
    x     = max(df$log2FoldChange, na.rm = TRUE) * 0.85,
    y     = max(df$neg_log10_padj, na.rm = TRUE) * 0.95,
    label = paste0("Up: ", sum(df$significance == "Up"), "\nDown: ", sum(df$significance == "Down")),
    size  = 3.5, color = if (opt$style == "dark") "#AAAAAA" else "#444444", hjust = 1
  )

ggsave(opt$output, plot = p, width = opt$width, height = opt$height,
       dpi = opt$dpi,
       device = if (opt$out_format == "svg") svglite::svglite else opt$out_format, bg = get_bg(opt$style))
cat("OK:", opt$output, "\n")
