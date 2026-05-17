const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const POLL_INTERVAL_MS = 1500;
const POLL_MAX_ATTEMPTS = 200; // ~5 min max (covers slow GO:BP on large datasets)

export type PlotType = "volcano" | "ma" | "pca" | "heatmap" | "boxplot" | "gsea";
export type FileFormat = "deseq2" | "edger" | "limma" | "generic";
export type JobStatus = "pending" | "running" | "done" | "failed";
export type StylePreset = "default" | "nature" | "cell" | "dark";
export type ExportFormat = "png" | "svg" | "pdf";

export interface AIRecommendation {
  plot_type: PlotType;
  plot_reason: string;
  style: StylePreset;
  style_reason: string;
}

export interface UploadResponse {
  file_id: string;
  filename: string;
  detected_format: FileFormat;
  rows: number;
  columns: string[];
  preview: Record<string, unknown>[];
  recommendations: AIRecommendation;
}

export interface EnrichmentRow {
  pathway: string;
  n_genes_set: number;
  n_overlap: number;
  overlap_ratio: number;
  overlap_genes: string;
  p_value: number;
  padj: number;
}

export interface PubmedPaper {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: number | null;
}

export interface PathwayRefs {
  pathway: string;
  papers: PubmedPaper[];
}

export interface AnalysisResult {
  job_id: string;
  status: JobStatus;
  plot_type: PlotType;
  image_base64: string | null;
  image_format: ExportFormat;
  caption: string | null;
  summary: {
    format: string;
    total_genes: number;
    significant_up: number;
    significant_down: number;
    duplicates: number;
  };
  enrichment_table: EnrichmentRow[] | null;
  pubmed_refs: PathwayRefs[] | null;
  sig_genes_csv: string | null;
  script_name: string | null;
  error: string | null;
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "Unknown error");
  }
  return res.json() as Promise<T>;
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export const uploadFile = (file: File): Promise<UploadResponse> => {
  const form = new FormData();
  form.append("file", file);
  return request<UploadResponse>("/api/upload/", { method: "POST", body: form });
};

export const runAnalysis = async (
  file_id: string,
  plot_type: PlotType,
  params: Record<string, string | number> = {}
): Promise<AnalysisResult> => {
  const { job_id } = await request<{ job_id: string; status: JobStatus }>("/api/analyze/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ file_id, plot_type, params }),
  });

  for (let i = 0; i < POLL_MAX_ATTEMPTS; i++) {
    await sleep(POLL_INTERVAL_MS);
    const job = await request<AnalysisResult>(`/api/jobs/${job_id}`);
    if (job.status === "done") return { ...job, plot_type };
    if (job.status === "failed") throw new Error(job.error ?? "Analysis failed");
  }

  throw new Error("Analysis timed out. Large datasets (GO:BP) can take up to 5 minutes.");
};
