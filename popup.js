function parseSections(text) {
    const sections = {
        important: '',
        obligations: '',
        redFlags: '',
        greenFlags: '',
        reviews: ''
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
        } else if (header.includes("what people say")) {
            sections.reviews = content;
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
            document.getElementById("important").innerHTML = "No important points found.";
            showLoading(false);
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            const currentTab = tabs[0];
            if (currentTab.url === container.url) {
                document.getElementById("url").innerText = container.url;
                const parsed = parseSections(container.summary);

                // Use innerHTML instead of innerText for formatted content
                document.getElementById("important").innerHTML = `<ul>${formatMarkdown(parsed.important)}</ul>` || "No important points found.";
                document.getElementById("obligations").innerHTML = `<ul>${formatMarkdown(parsed.obligations)}</ul>` || "No obligations found.";
                document.getElementById("redFlags").innerHTML = `<ul>${formatMarkdown(parsed.redFlags)}</ul>` || "No red flags found.";
                document.getElementById("greenFlags").innerHTML = `<ul>${formatMarkdown(parsed.greenFlags)}</ul>` || "No green flags found.";
                document.getElementById("reviews").innerHTML = `<ul>${formatMarkdown(parsed.reviews)}</ul>` || "No user reviews found.";
            } else {
                document.getElementById("url").innerText = "Analyzing new page...";
            }
            showLoading(false);
        });
    });
}

function formatMarkdown(text) {
    if (!text) return '';
    
    return text.split('\n')
        .map(line => {
            line = line.trim();
            // Look specifically for hyphen bullet points
            if (line.startsWith('-')) {
                // Remove the hyphen and trim whitespace
                line = line.substring(1).trim();
                // Convert bold text marked with **
                line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return `<li>${line}</li>`;
            }
            return line;
        })
        .filter(line => line) // Remove empty lines
        .join('\n');
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