function parseSections(text) {
    const sections = {
        important: '',
        obligations: '',
        redFlags: '',
        greenFlags: ''
    };

    const regex = /(\d\.\s*\*\*.*?\*\*):?\s*([\s\S]*?)(?=\n\d\.|\s*$)/g;
    let match;

    while ((match = regex.exec(text)) !== null) {
        const header = match[1].toLowerCase();
        const content = match[2].trim();

        if (header.includes("important")) {
            sections.important = content;
        } else if (header.includes("obligations")) {
            sections.obligations = content;
        } else if (header.includes("red flags")) {
            sections.redFlags = content;
        } else if (header.includes("green flags")) {
            sections.greenFlags = content;
        }
    }

    return sections;
}

function showLoading(show = true) {
    document.getElementById('loading-screen').style.display = show ? 'flex' : 'none';
    document.getElementById('content').style.display = show ? 'none' : 'block';
}

function updatePopupContent() {
    showLoading(true);
    
    chrome.storage.local.get('tncSummary', (data) => {
        const container = data.tncSummary;

        if(!container) {
            document.getElementById("url").innerText = "Analyzing new page...";
            document.getElementById("important").innerText = "No important points found.";
            showLoading(false);
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            if (currentTab.url === container.url) {
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
            if (currentTab.url === message.data.url) {
                updatePopupContent();
            }
        });
    }
});