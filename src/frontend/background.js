import { loadConfig } from "../../config/configLoader.js";

loadConfig().then(config => {
    const crawlEndpoint = config.crawlEndPoint;
    const summarizerEndPoint = config.summarizerEndPoint;

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'fetchAndSummarise') {
            const sourceUrl = msg.url;
            console.log('[Background] Fetching TnC for', sourceUrl);

            fetch(`${crawlEndpoint}?url=${encodeURIComponent(sourceUrl)}`)
                .then(res => {
                    if (!res.ok) throw new Error(`Parser returned ${res.status}`);
                    return res.json();
                })
                .then(json => {
                    const text = json.text || '';
                    if (!text) throw new Error('No text extracted from page');

                    return fetch(summarizerEndPoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text }),
                    });
                })
                .then(res => {
                    if (!res.ok) throw new Error(`Summarizer returned ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    chrome.storage.local.set({
                        tncSummary: {
                            url: sourceUrl,
                            summary: data.summary,
                            timestamp: new Date().toISOString(),
                        }
                    }, () => {
                        chrome.runtime.sendMessage({
                            action: 'summaryUpdated',
                            data: { url: sourceUrl, summary: data.summary }
                        }).catch(() => {});
                    });
                })
                .catch(error => {
                    console.error('[Background] Error:', error);
                    chrome.storage.local.set({
                        tncSummary: {
                            url: sourceUrl,
                            error: true,
                            message: error.message || 'Backend unreachable',
                            timestamp: new Date().toISOString(),
                        }
                    });
                });
        }

        return true;
    });
});
