"""
Fetch PubMed references for enriched pathways using NCBI E-utilities (free, no key required).
Only called for GSEA results. Fails silently — a PubMed error never breaks the analysis job.
"""
from __future__ import annotations
import asyncio
import re
from typing import Any

import httpx

_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
_ESUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi"
_TIMEOUT = 6.0
_INTER_REQUEST_DELAY = 0.4  # stay well under NCBI's 3 req/sec limit


def _pathway_to_query(pathway: str) -> str:
    name = pathway
    for prefix in ["HALLMARK_", "KEGG_", "GOBP_", "GOCC_", "GOMF_", "REACTOME_", "WP_", "HP_"]:
        name = name.replace(prefix, "")
    name = re.sub(r"_V\d+$", "", name)
    name = name.replace("_", " ").lower()
    # Broad query — pathway name + biology context, no quotes so partial matches work
    return f'{name} pathway gene expression transcriptomics'


def _fmt_authors(author_list: list[dict]) -> str:
    if not author_list:
        return "Unknown"
    first = author_list[0].get("name", "")
    return f"{first} et al." if len(author_list) > 1 else first


async def _search_pmids(client: httpx.AsyncClient, query: str, max_results: int = 3) -> list[str]:
    r = await client.get(
        _ESEARCH,
        params={"db": "pubmed", "term": query, "retmax": max_results, "retmode": "json", "sort": "relevance"},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    return r.json().get("esearchresult", {}).get("idlist", [])


async def _fetch_summaries(client: httpx.AsyncClient, pmids: list[str]) -> list[dict[str, Any]]:
    if not pmids:
        return []
    r = await client.get(
        _ESUMMARY,
        params={"db": "pubmed", "id": ",".join(pmids), "retmode": "json"},
        timeout=_TIMEOUT,
    )
    r.raise_for_status()
    result = r.json().get("result", {})
    papers = []
    for pmid in pmids:
        doc = result.get(pmid, {})
        if not doc or "error" in doc:
            continue
        papers.append({
            "pmid": pmid,
            "title": doc.get("title", "").rstrip("."),
            "authors": _fmt_authors(doc.get("authors", [])),
            "journal": doc.get("source", ""),
            "year": int(doc.get("pubdate", "0")[:4]) if doc.get("pubdate") else None,
        })
    return papers


async def fetch_refs_for_pathways(
    enrichment_table: list[dict],
    top_n_pathways: int = 8,
    papers_per_pathway: int = 3,
) -> list[dict]:
    """
    Returns list of { pathway, papers: [...] } for the top_n most significant pathways.
    Prioritises FDR < 0.05, falls back to top by rank. Skips any pathway where the fetch fails.
    """
    sig = [r for r in enrichment_table if r.get("padj", 1) < 0.05]
    if not sig:
        sig = [r for r in enrichment_table if r.get("padj", 1) < 0.25]
    candidates = sig[:top_n_pathways] if sig else enrichment_table[:top_n_pathways]

    out: list[dict] = []
    async with httpx.AsyncClient() as client:
        for row in candidates:
            pathway = row.get("pathway", "")
            if not pathway:
                continue
            try:
                await asyncio.sleep(_INTER_REQUEST_DELAY)
                pmids = await _search_pmids(client, _pathway_to_query(pathway), papers_per_pathway)
                if not pmids:
                    continue
                await asyncio.sleep(_INTER_REQUEST_DELAY)
                papers = await _fetch_summaries(client, pmids)
                if papers:
                    out.append({"pathway": pathway, "papers": papers})
            except Exception:
                continue  # fail silently per pathway

    return out
