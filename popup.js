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



chrome.storage.local.get('tncSummary', (data) => {
    const container = data.tncSummary;

    if(!container) {
        document.getElementById("important").innerText = "None important points found.";
        return;
    }

    console.log("Loaded summary from storage:", container);

    document.getElementById("url").innerText = container.url;

    const parsed = parseSections(container.summary);

    console.log("Parsed sections:", parsed);

    document.getElementById("important").innerText = parsed.important || "No important points found.";
    document.getElementById("obligations").innerText = parsed.obligations || "No obligations found.";
    document.getElementById("redFlags").innerText = parsed.redFlags || "No red flags found.";
    document.getElementById("greenFlags").innerText = parsed.greenFlags || "No green flags found.";
});