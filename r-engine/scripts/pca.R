suppressPackageStartupMessages({
  library(optparse)
  library(ggplot2)
  library(dplyr)
})

script_dir <- dirname(normalizePath(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)[1])))
source(file.path(script_dir, "utils.R"))

option_list <- list(
  make_option("--input",      type = "character"),
  make_option("--output",     type = "character"),
  make_option("--top_var",    type = "integer",   default = 500),
  make_option("--title",      type = "character", default = "PCA — Sample clustering"),
  make_option("--style",      type = "character", default = "default"),
  make_option("--out_format", type = "character", default = "png"),
  make_option("--width",      type = "integer",   default = 9),
  make_option("--height",     type = "integer",   default = 8),
  make_option("--dpi",        type = "integer",   default = 150)
)

opt <- parse_args(OptionParser(option_list = option_list))

df_raw <- read.csv(opt$input, stringsAsFactors = FALSE)

is_de_result <- any(c("log2FoldChange", "logFC", "padj", "FDR", "adj.P.Val") %in% names(df_raw))

if (is_de_result) {
  if (!"gene" %in% names(df_raw))              df_raw$gene <- as.character(seq_len(nrow(df_raw)))
  if (!"log2FoldChange" %in% names(df_raw) && "logFC" %in% names(df_raw))   df_raw$log2FoldChange <- df_raw$logFC
  if (!"padj" %in% names(df_raw) && "adj.P.Val" %in% names(df_raw))         df_raw$padj <- df_raw$adj.P.Val
  if (!"padj" %in% names(df_raw) && "FDR" %in% names(df_raw))               df_raw$padj <- df_raw$FDR

  num_cols   <- names(df_raw)[sapply(df_raw, is.numeric)]
  mat        <- df_raw %>% filter(complete.cases(across(all_of(num_cols)))) %>% select(gene, all_of(num_cols))
  gene_names <- mat$gene
  mat_num    <- as.matrix(mat[, num_cols])

  row_vars   <- apply(mat_num, 1, var)
  top_idx    <- order(row_vars, decreasing = TRUE)[seq_len(min(opt$top_var, nrow(mat_num)))]
  genes_sub  <- gene_names[top_idx]

  pca_res  <- prcomp(mat_num[top_idx, ], scale. = TRUE)
  pca_df   <- as.data.frame(pca_res$x[, 1:2])
  pca_df$gene  <- genes_sub
  var_exp  <- round(summary(pca_res)$importance[2, 1:2] * 100, 1)

  padj_vals    <- df_raw$padj[match(genes_sub, gene_names)]
  pca_df$group <- ifelse(!is.na(padj_vals) & padj_vals < 0.05, "Significant", "Not significant")

  colors <- if (opt$style == "dark") {
    c("Significant" = "#FF6B6B", "Not significant" = "#444466")
  } else {
    c("Significant" = "#E05C5C", "Not significant" = "#AAAAAA")
  }

  p <- ggplot(pca_df, aes(x = PC1, y = PC2, color = group)) +
    geom_point(alpha = 0.65, size = 2) +
    scale_color_manual(values = colors, name = NULL) +
    labs(
      title    = opt$title,
      subtitle = "PCA on gene statistics — each point is a gene",
      x = paste0("PC1 (", var_exp[1], "% variance)"),
      y = paste0("PC2 (", var_exp[2], "% variance)")
    )

} else {
  first_col_char <- !is.numeric(df_raw[[1]])
  if (first_col_char) {
    gene_names  <- df_raw[[1]]
    mat_numeric <- as.matrix(df_raw[, -1])
  } else {
    gene_names  <- as.character(seq_len(nrow(df_raw)))
    mat_numeric <- as.matrix(df_raw)
  }
  mode(mat_numeric) <- "numeric"

  if (ncol(mat_numeric) < 2)
    stop("Expression matrix must have at least 2 sample columns")

  row_vars <- apply(mat_numeric, 1, var)
  top_idx  <- order(row_vars, decreasing = TRUE)[seq_len(min(opt$top_var, nrow(mat_numeric)))]

  pca_res    <- prcomp(t(mat_numeric[top_idx, ]), scale. = TRUE)
  pca_df     <- as.data.frame(pca_res$x[, 1:2])
  pca_df$sample <- rownames(pca_df)
  var_exp    <- round(summary(pca_res)$importance[2, 1:2] * 100, 1)
  pca_df$group <- sub("_[^_]+$", "", pca_df$sample)

  p <- ggplot(pca_df, aes(x = PC1, y = PC2, color = group, label = sample)) +
    geom_point(size = 4, alpha = 0.85) +
    ggrepel::geom_text_repel(size = 3.5, segment.size = 0.3, max.overlaps = 20,
      color = if (opt$style == "dark") "#CCCCCC" else "#333333") +
    labs(
      title = opt$title,
      x = paste0("PC1 (", var_exp[1], "% variance)"),
      y = paste0("PC2 (", var_exp[2], "% variance)")
    )
}

p <- p + get_theme(opt$style)

ggsave(opt$output, plot = p, width = opt$width, height = opt$height,
       dpi = opt$dpi,
       device = if (opt$out_format == "svg") svglite::svglite else opt$out_format, bg = get_bg(opt$style))
cat("OK:", opt$output, "\n")
