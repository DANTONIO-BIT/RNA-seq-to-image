suppressPackageStartupMessages({
  library(optparse)
  library(ggplot2)
  library(dplyr)
  library(msigdbr)
  library(jsonlite)
})

script_dir <- dirname(normalizePath(sub("--file=", "", grep("--file=", commandArgs(trailingOnly = FALSE), value = TRUE)[1])))
source(file.path(script_dir, "utils.R"))

option_list <- list(
  make_option("--input",          type = "character"),
  make_option("--output",         type = "character"),
  make_option("--pval_threshold", type = "double",    default = 0.05),
  make_option("--fc_threshold",   type = "double",    default = 1.0),
  make_option("--title",          type = "character", default = "Pathway Enrichment"),
  make_option("--style",          type = "character", default = "default"),
  make_option("--out_format",     type = "character", default = "png"),
  make_option("--width",          type = "integer",   default = 10),
  make_option("--height",         type = "integer",   default = 8),
  make_option("--dpi",            type = "integer",   default = 150),
  make_option("--top_n",          type = "integer",   default = 20),
  make_option("--organism",       type = "character", default = "human"),
  make_option("--collection",     type = "character", default = "H"),
  make_option("--subcollection",  type = "character", default = "")
)

opt <- parse_args(OptionParser(option_list = option_list))

df <- read.csv(opt$input, stringsAsFactors = FALSE)

if (!"log2FoldChange" %in% names(df) && "logFC" %in% names(df)) df$log2FoldChange <- df$logFC
if (!"padj" %in% names(df) && "adj.P.Val" %in% names(df))       df$padj <- df$adj.P.Val
if (!"padj" %in% names(df) && "FDR" %in% names(df))             df$padj <- df$FDR
if (!"gene" %in% names(df))                                       df$gene <- as.character(seq_len(nrow(df)))

df <- df %>% filter(!is.na(padj), !is.na(log2FoldChange), gene != "")

# Detect organism from CSV "organism" column or Ensembl ID prefix
detect_organism <- function(df) {
  if ("organism" %in% names(df)) {
    val <- tolower(trimws(as.character(df$organism[1])))
    if (grepl("mouse|mus", val))   return("mouse")
    if (grepl("human|homo", val))  return("human")
  }
  first <- as.character(df$gene[1])
  if (grepl("^ENSMUSG[0-9]+", first)) return("mouse")
  if (grepl("^ENSG[0-9]+",    first)) return("human")
  return(NULL)
}
auto_org <- detect_organism(df)
organism <- if (!is.null(auto_org)) auto_org else opt$organism
cat(sprintf("Organism: %s\n", organism))

# Map Ensembl IDs → gene symbols using the appropriate annotation package
is_ensembl <- grepl("^ENS(MUS)?G[0-9]+", df$gene[1])
if (is_ensembl) {
  pkg <- if (organism == "mouse") "org.Mm.eg.db" else "org.Hs.eg.db"
  cat(sprintf("Ensembl IDs detected — mapping via %s...\n", pkg))
  if (!requireNamespace(pkg, quietly = TRUE)) {
    stop(sprintf(
      "%s is not installed. Run: BiocManager::install('%s')", pkg, pkg
    ))
  }
  suppressPackageStartupMessages(library(pkg, character.only = TRUE))
  suppressPackageStartupMessages(library(AnnotationDbi))
  db          <- get(pkg)
  ensembl_ids <- gsub("\\.[0-9]+$", "", df$gene)
  symbols     <- mapIds(db, keys = ensembl_ids,
                        column = "SYMBOL", keytype = "ENSEMBL", multiVals = "first")
  mapped      <- !is.na(symbols)
  cat(sprintf("Mapped %d / %d Ensembl IDs to gene symbols\n", sum(mapped), length(mapped)))
  df$gene <- ifelse(mapped, symbols, df$gene)
  df      <- df[mapped, ]
}

sig_genes <- df %>%
  filter(padj < opt$pval_threshold, abs(log2FoldChange) >= opt$fc_threshold) %>%
  pull(gene) %>%
  unique()

if (length(sig_genes) < 5) {
  stop(paste0(
    "Only ", length(sig_genes), " significant genes found. ",
    "Try relaxing thresholds (current: padj < ", opt$pval_threshold,
    ", |FC| >= ", opt$fc_threshold, ")."
  ))
}

bg_genes <- unique(df$gene)

if (nchar(trimws(opt$subcollection)) > 0) {
  gene_sets <- msigdbr(species = organism, collection = opt$collection, subcollection = opt$subcollection)
} else {
  gene_sets <- msigdbr(species = organism, collection = opt$collection)
}
gs_list <- split(gene_sets$gene_symbol, gene_sets$gs_name)

run_ora <- function(gs_list, sig_genes, bg_genes) {
  n_sig <- length(sig_genes)
  n_bg  <- length(bg_genes)

  results <- lapply(names(gs_list), function(gs_name) {
    gs_genes <- intersect(gs_list[[gs_name]], bg_genes)
    n_gs <- length(gs_genes)
    if (n_gs < 5 || n_gs > n_bg * 0.9) return(NULL)

    k <- length(intersect(sig_genes, gs_genes))
    if (k == 0) return(NULL)

    # 2x2 contingency: in-set vs out-of-set, sig vs not-sig
    mat <- matrix(c(k, n_sig - k, n_gs - k, n_bg - n_sig - n_gs + k), nrow = 2)
    ft  <- tryCatch(fisher.test(mat, alternative = "greater"), error = function(e) NULL)
    if (is.null(ft)) return(NULL)

    data.frame(
      pathway       = gs_name,
      n_genes_set   = n_gs,
      n_overlap     = k,
      overlap_ratio = round(k / n_gs, 3),
      overlap_genes = paste(sort(intersect(sig_genes, gs_genes)), collapse = "/"),
      p_value       = ft$p.value,
      stringsAsFactors = FALSE
    )
  })

  res <- do.call(rbind, Filter(Negate(is.null), results))
  if (is.null(res) || nrow(res) == 0) stop("No enriched pathways found in this gene set collection.")

  res$padj <- p.adjust(res$p_value, method = "BH")
  res[order(res$padj), ]
}

results <- run_ora(gs_list, sig_genes, bg_genes)

display <- results %>% filter(padj < 0.25)
if (nrow(display) == 0) display <- results[1:min(10, nrow(results)), ]

top_n     <- min(opt$top_n, nrow(display))
clean_label <- function(x) {
  x <- gsub("^HALLMARK_|^KEGG_|^GOBP_|^GOCC_|^GOMF_|^REACTOME_|^WP_|^HP_", "", x)
  x <- gsub("_V[0-9]+$", "", x)
  x <- gsub("_", " ", x)
  tools::toTitleCase(tolower(x))
}

plot_data <- display[1:top_n, ] %>%
  mutate(
    label     = clean_label(pathway),
    neg_log10 = pmin(-log10(padj + 1e-300), 10)
  ) %>%
  arrange(neg_log10) %>%
  mutate(label = factor(label, levels = label))

bar_color <- if (opt$style == "dark") "#74B9FF" else "#3A7FC1"

p <- ggplot(plot_data, aes(x = neg_log10, y = label)) +
  geom_col(fill = bar_color, alpha = 0.85, width = 0.7) +
  geom_text(
    aes(label = paste0(n_overlap, "/", n_genes_set)),
    hjust  = -0.2, size = 2.8,
    color  = if (opt$style == "dark") "#AAAAAA" else "#555555"
  ) +
  geom_vline(
    xintercept = -log10(0.05), linetype = "dashed", linewidth = 0.4,
    color      = if (opt$style == "dark") "#555577" else "#AAAAAA"
  ) +
  scale_x_continuous(expand = expansion(mult = c(0, 0.18))) +
  labs(
    title    = opt$title,
    subtitle = paste0(length(sig_genes), " significant genes · ", length(gs_list), " gene sets tested · ORA (BH-FDR)"),
    x        = expression(-log[10]~"(adjusted p-value)"),
    y        = NULL,
    caption  = "AI-generated interpretation — review before publication"
  ) +
  get_theme(opt$style)

ggsave(
  opt$output, plot = p, width = opt$width, height = opt$height, dpi = opt$dpi,
  device = if (opt$out_format == "svg") svglite::svglite else opt$out_format,
  bg     = get_bg(opt$style)
)

# Write sidecar JSON for the enrichment table
sidecar_path <- sub("\\.[^.]+$", ".enrichment.json", opt$output)
json_data <- results[1:min(50, nrow(results)), c("pathway", "n_genes_set", "n_overlap", "overlap_ratio", "overlap_genes", "p_value", "padj")]
write(toJSON(json_data, auto_unbox = TRUE), file = sidecar_path)

cat("OK:", opt$output, "\n")
