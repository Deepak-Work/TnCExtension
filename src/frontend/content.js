(async () => {
    const TNC_KEYWORDS = ['terms', 'privacy', 'policy', 'conditions', 'agreement', 'legal'];

    function isTncPage() {
        const haystack = (window.location.href + ' ' + document.title).toLowerCase();
        return TNC_KEYWORDS.some(kw => haystack.includes(kw));
    }

    async function initialize() {
        const currentUrl = window.location.href;

        if (!isTncPage()) {
            console.log("Not a TnC page, skipping.");
            return;
        }

        // Check cache — skip cache if previous result was an error
        const stored = await new Promise(resolve => chrome.storage.local.get('tncSummary', resolve));
        const cached = stored.tncSummary;
        if (cached && !cached.error && cached.url && cached.url.split('#')[0] === currentUrl.split('#')[0] && cached.timestamp) {
            const age = Date.now() - new Date(cached.timestamp).getTime();
            if (age < 30 * 60 * 1000) {
                console.log("Using cached summary.");
                return;
            }
        }

        // Ask background to fetch & summarize (background is immune to page CSP)
        chrome.runtime.sendMessage({ action: 'fetchAndSummarise', url: currentUrl });
    }

    initialize();
})();
