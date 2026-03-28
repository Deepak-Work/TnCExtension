function parseSections(text) {
    const sections = { important: '', obligations: '', redFlags: '', greenFlags: '' };
    const order = ['important', 'obligations', 'redFlags', 'greenFlags'];

    // Match "1.  **Any Header**\ncontent" or "1. Any Header\ncontent"
    // Stop at the next numbered section or end of string
    const sectionRegex = /\n?(\d+)\.\s+[^\n]+\n([\s\S]*?)(?=\n\d+\.\s|$)/g;
    let match;

    while ((match = sectionRegex.exec(text)) !== null) {
        const num = parseInt(match[1], 10);
        if (num >= 1 && num <= 4) {
            const content = match[2]
                .replace(/^[ \t]*[-*][ \t]+/gm, '')  // strip markdown bullet markers
                .replace(/\*\*/g, '')                  // strip bold markers
                .trim();
            sections[order[num - 1]] = content;
        }
    }

    return sections;
}

function showLoading(show = true) {
    document.getElementById('loading-screen').style.display = show ? 'flex' : 'none';
    document.getElementById('content').style.display = show ? 'none' : 'block';
}

function normalizeUrl(url) {
    return url ? url.split('#')[0] : url;
}

function updatePopupContent() {
    showLoading(true);

    chrome.storage.local.get('tncSummary', (data) => {
        const container = data.tncSummary;

        if (!container) {
            document.getElementById("url").innerText = "Analyzing new page...";
            document.getElementById("important").innerText = "No important points found.";
            showLoading(false);
            return;
        }

        // Handle backend error state
        if (container.error === true) {
            document.getElementById("url").innerText = container.url || '';
            document.getElementById("error-message").innerText =
                "Could not connect to backend. Make sure the servers are running.";
            document.getElementById("error-message").style.display = 'block';
            document.getElementById("important").innerText = '';
            document.getElementById("obligations").innerText = '';
            document.getElementById("redFlags").innerText = '';
            document.getElementById("greenFlags").innerText = '';
            showLoading(false);
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            if (normalizeUrl(currentTab.url) === normalizeUrl(container.url)) {
                document.getElementById("error-message").style.display = 'none';
                document.getElementById("url").innerText = container.url;
                const parsed = parseSections(container.summary);

                document.getElementById("important").innerText = parsed.important || "No important points found.";
                document.getElementById("obligations").innerText = parsed.obligations || "No obligations found.";
                document.getElementById("redFlags").innerText = parsed.redFlags || "No red flags found.";
                document.getElementById("greenFlags").innerText = parsed.greenFlags || "No green flags found.";
            } else {
                document.getElementById("url").innerText = "Analyzing new page...";
            }
            showLoading(false);
        });
    });
}

// Initial load
document.addEventListener('DOMContentLoaded', updatePopupContent);

// Listen for summary updates from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'summaryUpdated') {
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            if (normalizeUrl(currentTab.url) === normalizeUrl(message.data.url)) {
                updatePopupContent();
            }
        });
    }
});
