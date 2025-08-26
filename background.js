import  { loadConfig } from "./configLoader.js";


loadConfig().then(config => {
    const summarizerEndPoint = config.summarizerEndPoint;

    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.action === 'tncTextExtracted') {
            console.log('[Background] Received TnC text', msg.text);
            console.log('[Background] Received TnC text', msg.sourceUrl);

            const {text, sourceUrl} = msg;

            fetch(`${summarizerEndPoint}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({text}),
            })
            .then(res => res.json())
            .then(data => {
                chrome.storage.local.set({
                    tncSummary: {
                        url: sourceUrl,
                        summary: data.summary,
                        timestamp: new Date().toISOString(),
                    }
                });
            })
            .catch(error => {
                console.error('Error:', error);
            });
        }
    });
});