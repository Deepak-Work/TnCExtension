from crawl4ai import (
    AsyncWebCrawler,
    BrowserConfig,
    CrawlerRunConfig,
    DefaultMarkdownGenerator,
    PruningContentFilter,
    CrawlResult
)

from bs4 import BeautifulSoup


# ---------------- Crawl4AI entrypoint ----------------
async def extract_terms_text(url: str) -> dict:
    config = CrawlerRunConfig(
            markdown_generator=DefaultMarkdownGenerator(
                content_filter=PruningContentFilter()
            ),
            word_count_threshold=2,
        )

    async with AsyncWebCrawler() as crawler:
        result = await crawler.arun(url=url, config=config)
        if not result.success:
            raise RuntimeError(f"Failed to crawl {url}: {result.error_message}")

        # Get main text (with markdown tables included if parsed)
        all_text = extract_relevant_text(result.markdown)

        # Fallback: explicitly capture <table> HTML if Crawl4AI skipped them
        tables_data = []

        if result.tables:
            for table in result.tables:
                tables_data.append({
                    "caption": table.get("caption"),
                    "headers": table.get("headers"),
                    "rows": table.get("rows"),
                })
        elif result.cleaned_html:
            soup = BeautifulSoup(result.cleaned_html, "html.parser")
            for tbl in soup.find_all("table"):
                rows = []
                for tr in tbl.find_all("tr"):
                    cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
                    if cells:
                        rows.append(cells)
                if rows:
                    tables_data.append({
                        "caption": None,
                        "headers": rows[0],
                        "rows": rows[1:]
                    })

        return {
            "text": all_text,
            "tables": tables_data
        }

# ---------------- Filtering ----------------
def extract_relevant_text(text: str) -> str:
    """
    Works directly on crawl4ai's extracted text (markdown/plain).
    Keeps both paragraphs and tables with ToS/Policy/Agreement keywords.
    """
    boilerplate_keywords = ["menu", "sidebar", "footer", "header", "nav", "breadcrumb", "cookie", "advert", "social"]
    keywords = ['terms', 'conditions', 'policy', 'agreement', 'service', 'use', 'legal', 'privacy']

    blocks = [b.strip() for b in text.split("\n\n") if b.strip()]
    candidates = []

    for block in blocks:
        low = block.lower()
        is_table = block.startswith("|") and "\n|" in block  # detect markdown table

        if any(kw in low for kw in keywords) and not any(bkw in low for bkw in boilerplate_keywords):
            # keep tables always, keep text if not too tiny
            if is_table or len(block) > 0:
                candidates.append(block)

    return "\n\n".join(candidates) if candidates else text.strip()

