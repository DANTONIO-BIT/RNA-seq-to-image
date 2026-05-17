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
  make_option("--pval_threshold", type = "double",    default = 0.05),
  make_option("--top_n",          type = "integer",   default = 50),
  make_option("--title",          type = "character", default = "Top DE Genes — Heatmap"),
  make_option("--style",          type = "character", default = "default"),
  make_option("--out_format",     type = "character", default = "png"),
  make_option("--width",          type = "integer",   default = 10),
  make_option("--height",         type = "integer",   default = 11),
  make_option("--dpi",            type = "integer",   default = 150)
)

opt <- parse_args(OptionParser(option_list = option_list))

df <- read.csv(opt$input, stringsAsFactors = FALSE)

if (!"log2FoldChange" %in% names(df) && "logFC" %in% names(df))  df$log2FoldChange <- df$logFC
if (!"padj" %in% names(df) && "adj.P.Val" %in% names(df))        df$padj <- df$adj.P.Val
if (!"padj" %in% names(df) && "FDR" %in% names(df))              df$padj <- df$FDR
if (!"gene" %in% names(df))                                        df$gene <- as.character(seq_len(nrow(df)))

df <- df %>%
  filter(!is.na(padj), !is.na(log2FoldChange)) %>%
  filter(padj < opt$pval_threshold) %>%
  arrange(padj) %>%
  slice_head(n = opt$top_n) %>%
  mutate(
    gene      = factor(gene, levels = rev(gene)),
    fc_capped = pmax(pmin(log2FoldChange, 4), -4)
  )

if (nrow(df) == 0)
  stop("No significant genes at the given threshold. Try increasing pval_threshold.")

grad   <- get_gradient(opt$style)
txt_col <- if (opt$style == "dark") "white" else "white"

p <- ggplot(df, aes(x = 1, y = gene, fill = fc_capped)) +
  geom_tile(color = if (opt$style == "dark") "#12122A" else "white", linewidth = 0.3) +
  geom_text(aes(label = round(log2FoldChange, 2)), size = 2.8, color = txt_col) +
  scale_fill_gradient2(
    low = grad$low, mid = grad$mid, high = grad$high,
    midpoint = 0, limits = c(-4, 4),
    name = expression(log[2]~FC)
  ) +
  scale_x_continuous(breaks = NULL) +
  labs(
    title   = opt$title,
    x       = NULL,
    y       = NULL,
    caption = paste0("Top ", nrow(df), " genes by adj. p-value  |  padj < ", opt$pval_threshold)
  ) +
  get_theme(opt$style) +
  theme(
    axis.text.y = element_text(size = 9, color = if (opt$style == "dark") "#CCCCCC" else "#333333"),
    panel.grid  = element_blank(),
    legend.position = "right"
  )

ggsave(opt$output, plot = p, width = opt$width, height = opt$height,
       dpi = opt$dpi,
       device = if (opt$out_format == "svg") svglite::svglite else opt$out_format, bg = get_bg(opt$style))
cat("OK:", opt$output, "\n")
