chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'tnc_detected') {
        const {text, sourceUrl} = msg;

        fetch('http://localhost:8000/summarize', {
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