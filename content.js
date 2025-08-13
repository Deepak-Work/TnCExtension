function extractTermsText() {
    const keywords = ['terms', 'conditions', 'agreement', 'policy', 'contract', 'privacy'];
    const text = document.body.innerText.toLowerCase();

    const matchFound = keywords.some(keyword => text.includes(keyword));

    if (!matchFound) return null;

    const paragraphs = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, div'));
    const likelyTnc = paragraphs
            .filter(p => p.innerText.length > 100)
            .map(p => p.innerText.trim())
            .join('\n\n')
            .slice(0, 20000); // Limit to 20000 characters //TODO: How to handle larger texts?

    return likelyTnc;
}

const tncText = extractTermsText();
if (tncText) {
    chrome.runtime.sendMessage({ 
        action: 'tnc_detected', 
        text: tncText,
        sourceUrl: window.location.href,
     });
    }