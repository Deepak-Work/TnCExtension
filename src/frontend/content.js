// Content scripts declared in manifest.json run as classic (non-module) scripts,
// so extractor.js/banner.js are loaded via dynamic import() instead of a static
// import - they're exposed as web_accessible_resources for exactly this purpose.
(async () => {
    const {
        extractAllText,
        isTncCandidate,
        sha256Hex,
        computeDocumentKey,
        PassiveAccumulator,
    } = await import(chrome.runtime.getURL('src/frontend/extractor.js'));
    const { showBanner } = await import(chrome.runtime.getURL('src/frontend/banner.js'));

    const TNC_KEYWORDS = ['terms', 'privacy', 'policy', 'conditions', 'agreement', 'legal'];
    const SEARCH_ENGINE_HOSTS = [
        'google.', 'bing.com', 'duckduckgo.com', 'search.yahoo.com',
        'yandex.', 'baidu.com', 'ecosia.org', 'startpage.com',
    ];
    const DIALOG_SELECTOR = [
        '[role="dialog"]', '[aria-modal="true"]', 'dialog',
        '[class*="modal" i]', '[class*="dialog" i]', '[id*="modal" i]', '[id*="dialog" i]',
        '[class*="consent" i]', '[class*="overlay" i]',
    ].join(', ');

    const MIN_NEW_BLOCK_LENGTH = 300;
    const MUTATION_DEBOUNCE_MS = 500;
    const SETTLE_QUIET_MS = 3000;
    const MAX_WAIT_MS = 8000;
    const DIALOG_SCAN_DEBOUNCE_MS = 500;

    const trackedRoots = new WeakSet();
    const accumulators = new WeakMap();
    const lastSentHash = new WeakMap();

    // Only the path is checked (not the query string or <title>) - a search for
    // "terms and conditions" on google.com/search?q=... would otherwise match on
    // the query text alone, even though the page itself has no T&C content.
    function isFastPathTncPage() {
        const path = window.location.pathname.toLowerCase();
        return TNC_KEYWORDS.some(kw => path.includes(kw));
    }

    // Search result pages aggregate snippets from many unrelated documents, which
    // can accidentally contain enough legal-sounding phrases to pass the keyword
    // density check - so they're excluded outright rather than relying on scoring.
    function isSearchResultsPage() {
        const host = window.location.hostname.toLowerCase();
        const path = window.location.pathname.toLowerCase();
        const isSearchHost = SEARCH_ENGINE_HOSTS.some(h => host.includes(h));
        if (!isSearchHost) return false;
        return path.includes('search') || (path === '/' && window.location.search.length > 0);
    }

    function hasTrackedAncestor(node) {
        let el = node.parentElement;
        while (el) {
            if (trackedRoots.has(el)) return true;
            el = el.parentElement;
        }
        return false;
    }

    async function analyzeIfChanged(root) {
        const accumulator = accumulators.get(root);
        if (!accumulator) return;

        const text = accumulator.getAccumulatedText();
        if (!text) return;

        const contentHash = await sha256Hex(text);
        if (lastSentHash.get(root) === contentHash) return;
        lastSentHash.set(root, contentHash);

        const dialogRoot = root === document.body ? null : root;
        const documentKey = await computeDocumentKey(window.location.href, dialogRoot);

        chrome.runtime.sendMessage({
            action: 'tncDetected',
            documentKey,
            url: window.location.href,
            title: document.title,
            text,
            contentHash,
        }).catch(() => {});
    }

    function trackRoot(root) {
        if (trackedRoots.has(root)) return;
        trackedRoots.add(root);
        accumulators.set(root, new PassiveAccumulator());

        let debounceTimer = null;
        let settleTimer = null;
        let maxWaitTimer = null;

        const commit = () => {
            clearTimeout(settleTimer);
            clearTimeout(maxWaitTimer);
            settleTimer = null;
            maxWaitTimer = null;
            analyzeIfChanged(root);
        };

        const onActivity = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(async () => {
                await accumulators.get(root).addSnapshot(extractAllText(root));
                clearTimeout(settleTimer);
                settleTimer = setTimeout(commit, SETTLE_QUIET_MS);
                if (!maxWaitTimer) {
                    maxWaitTimer = setTimeout(commit, MAX_WAIT_MS);
                }
            }, MUTATION_DEBOUNCE_MS);
        };

        new MutationObserver(onActivity).observe(root, {
            childList: true, subtree: true, characterData: true, attributes: true,
        });

        onActivity();
    }

    function scanCandidates(nodes) {
        for (const node of nodes) {
            if (!(node instanceof Element)) continue;
            if (trackedRoots.has(node) || hasTrackedAncestor(node)) continue;

            const text = extractAllText(node);
            if (text.length >= MIN_NEW_BLOCK_LENGTH && isTncCandidate(text)) {
                trackRoot(node);
            }
        }
    }

    function observeForDialogs() {
        let debounceTimer = null;
        const pending = new Set();

        new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) pending.add(node);
            }
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const nodes = Array.from(pending);
                pending.clear();
                scanCandidates(nodes);
            }, DIALOG_SCAN_DEBOUNCE_MS);
        }).observe(document.body, { childList: true, subtree: true });
    }

    function scanExistingDialogs() {
        scanCandidates(Array.from(document.querySelectorAll(DIALOG_SELECTOR)));
    }

    function initialize() {
        if (isSearchResultsPage()) {
            return;
        }

        // Require the URL to look like a T&C page AND the body content to actually
        // score as one - a matching path alone (e.g. a blog post slug) isn't enough.
        if (isFastPathTncPage() && isTncCandidate(extractAllText(document.body))) {
            trackRoot(document.body);
        } else {
            scanExistingDialogs();
        }
        observeForDialogs();
    }

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.action === 'showBanner') {
            showBanner(msg.analysis);
        }
        return false;
    });

    initialize();
})();
