from llm_wrapper import get_provider

SENTIMENT_PROMPT = """You are researching public sentiment about a company's Terms of Service / Privacy Policy, based on the web search results below.

Subject: {subject}

Search results:
{sources}

Respond with ONLY valid JSON in exactly this shape:
{{
  "sentiment": [
    {{"text": "...", "url": "..."}}
  ]
}}

Rules:
- At most 5 bullets total. Mix positive and negative sentiment as the evidence supports - do not force balance if the evidence leans one way.
- Each bullet is a concise, plain-language statement of what people are actually saying, grounded only in the search results above.
- Each bullet's "url" must be exactly one of the URLs listed above - the specific source that supports that bullet.
- If the results don't contain enough relevant discussion to support a bullet, omit it rather than inventing one.
"""


def search_web(query: str, max_results: int = 8) -> list:
    from ddgs import DDGS

    results = []
    with DDGS() as ddgs:
        for r in ddgs.text(query, max_results=max_results):
            url = r.get("href") or r.get("url", "")
            if not url:
                continue
            results.append({
                "title": r.get("title", ""),
                "url": url,
                "snippet": r.get("body", ""),
            })
    return results


def synthesize_sentiment(subject: str, search_results: list) -> list:
    if not search_results:
        return []

    provider = get_provider()
    sources_block = "\n".join(
        f"[{i + 1}] {r['title']}\nURL: {r['url']}\nSnippet: {r['snippet']}"
        for i, r in enumerate(search_results)
    )
    prompt = SENTIMENT_PROMPT.format(subject=subject, sources=sources_block)
    result = provider.generate_json(prompt)

    valid_urls = {r["url"] for r in search_results}
    cleaned = []
    for point in result.get("sentiment", [])[:5]:
        text = str(point.get("text", "")).strip()
        url = str(point.get("url", "")).strip()
        if text and url in valid_urls:
            cleaned.append({"text": text, "url": url})
    return cleaned


def get_sentiment(subject: str, max_results: int = 8) -> list:
    if not subject:
        return []
    try:
        results = search_web(f"{subject} terms of service reviews complaints", max_results=max_results)
        return synthesize_sentiment(subject, results)
    except Exception:
        # Sentiment is best-effort - never let a search/LLM hiccup break the whole analysis.
        return []
