# Fine Print - Privacy Policy

_Last updated: [DATE]_

Fine Print ("the extension") helps you understand Terms & Conditions and Privacy Policy documents before you agree to them. This page explains what data the extension collects, why, and what we do with it.

## What we collect

When you visit a page the extension identifies as likely containing Terms & Conditions, Privacy Policy, or similar legal content, the extension reads the visible (and hidden-but-rendered, e.g. collapsed tabs) text of that specific content and sends it to our backend for analysis. We do **not** monitor or collect your general browsing activity - only the text of pages that pass this detection check, and only when that check passes.

We do not require an account, login, or any personal identifier to use the extension.

## What we do with it

1. The extracted text is sent to a third-party LLM provider (currently Google's Gemini API) to generate a plain-language summary (benefits, risks) of the document.
2. A short, non-identifying subject/company name derived from that summary is used to run a web search (via DuckDuckGo) to gather public sentiment about the document, with citations.
3. The resulting analysis - the summary, sentiment points, the page's URL/title, and a hash of the page content (not the raw text itself) - is cached on our server so that the next person who visits the *same, unchanged* page gets an instant result instead of triggering a new analysis. This cache is keyed by page content, not by user - we don't build a profile of what any individual person has visited.
4. Our server may temporarily use your IP address to enforce a rate limit that prevents abuse of the shared service. This is not stored in our database or associated with any of your analysis results.

## What we don't do

- We don't sell or share your data with advertisers.
- We don't intentionally collect personal information. If a page's own text happens to contain personal information (e.g. a signed-in username shown at the top of the page's DOM), it may incidentally pass through as part of the extracted text - we don't attempt to identify or extract personal information from it, and it is not used for anything beyond generating that one summary.
- We don't track you across sites or build a browsing profile.

## Local data

The extension stores your current tab's most recent analysis result and the toolbar badge state locally on your device via Chrome's extension storage APIs. This data stays on your device and is not part of our server-side database.

## Bringing your own API key (optional feature)

If you choose to provide your own Gemini API key (an optional, opt-in feature for unlimited use), that key is stored only in your browser's local extension storage and is used to call Gemini directly from your browser. It is never transmitted to or stored on our servers.

## Third-party services

- **Google Gemini API** - processes the extracted document text to generate the summary. See [Google's Privacy Policy](https://policies.google.com/privacy).
- **DuckDuckGo** - used to search for public sentiment/discussion about the document. See [DuckDuckGo's Privacy Policy](https://duckduckgo.com/privacy).

## Data retention

Cached analyses are retained until the source page's content changes (detected via a content hash) or until they age out, whichever the extension's caching logic determines first. There is currently no self-service deletion tool; if you'd like a specific cached entry removed, contact us using the details below.

## Children's privacy

This extension is not directed at children and we do not knowingly collect data from children.

## Changes to this policy

We may update this policy as the extension changes. Material changes will be reflected here with an updated "Last updated" date.

## Contact

Questions or data removal requests: [CONTACT EMAIL OR GITHUB ISSUES LINK]
