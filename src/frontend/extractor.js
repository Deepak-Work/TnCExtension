const LEGAL_KEYWORDS = [
    'terms of service', 'terms and conditions', 'terms of use', 'privacy policy',
    'you agree', 'arbitration', 'class action', 'liability', 'indemnif',
    'governing law', 'disclaimer', 'warrant', 'termination', 'user agreement',
    'data collection', 'third party', 'binding', 'waive', 'jurisdiction',
];

const MIN_CANDIDATE_LENGTH = 300;
const MIN_KEYWORD_HITS = 3;

// Walks the full DOM subtree (including CSS-hidden nodes) so tab/accordion
// style dialogs - where every "page" already exists in the DOM - are captured
// without needing to click anything.
export function extractAllText(root) {
    const parts = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parentTag = node.parentElement?.tagName;
            if (!parentTag || parentTag === 'SCRIPT' || parentTag === 'STYLE' || parentTag === 'NOSCRIPT') {
                return NodeFilter.FILTER_REJECT;
            }
            return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        },
    });

    let node;
    while ((node = walker.nextNode())) {
        parts.push(node.textContent.trim());
    }
    return normalizeText(parts.join(' '));
}

export function scoreTncLikelihood(text) {
    if (!text || text.length < MIN_CANDIDATE_LENGTH) return 0;
    const low = text.toLowerCase();
    let hits = 0;
    for (const kw of LEGAL_KEYWORDS) {
        if (low.includes(kw)) hits++;
    }
    return hits;
}

export function isTncCandidate(text) {
    return scoreTncLikelihood(text) >= MIN_KEYWORD_HITS;
}

export function normalizeText(text) {
    return text.replace(/\s+/g, ' ').trim();
}

export function normalizeUrl(url) {
    try {
        const u = new URL(url);
        u.hash = '';
        return u.toString();
    } catch {
        return url.split('#')[0];
    }
}

export async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// Standalone pages are keyed by URL alone. In-page dialogs get a stable suffix
// derived from the dialog's own tag/id/class, so multiple dialogs on the same
// host page don't collide, and the same dialog maps to the same key on revisit.
export async function computeDocumentKey(url, dialogRoot) {
    const normalized = normalizeUrl(url);
    if (!dialogRoot || dialogRoot === document.body || dialogRoot === document.documentElement) {
        return normalized;
    }
    const signature = `${dialogRoot.tagName}:${dialogRoot.id}:${dialogRoot.className}`;
    const sigHash = await sha256Hex(signature);
    return `${normalized}#dialog:${sigHash.slice(0, 12)}`;
}

// Merges distinct text snapshots seen over time (e.g. as a user pages through
// a wizard) purely by observing what actually renders - never by simulating clicks.
export class PassiveAccumulator {
    constructor() {
        this.seenHashes = new Set();
        this.snapshots = [];
    }

    async addSnapshot(text) {
        const normalized = normalizeText(text);
        if (!normalized) return false;
        const hash = await sha256Hex(normalized);
        if (this.seenHashes.has(hash)) return false;
        this.seenHashes.add(hash);
        this.snapshots.push(normalized);
        return true;
    }

    getAccumulatedText() {
        return this.snapshots.join('\n\n');
    }
}
