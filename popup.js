function parseSections(text) {
    const sections = {
        important: '',
        obligations: '',
        redFlags: '',
        greenFlags: ''
    };

    const lines = text.split('\n');
    let current = null;

    for (let line of lines) {
        line = line.trim();

        if (line.toLowerCase().startsWith('1.')) {
            current = 'important';
            continue
        }
        else if (line.toLowerCase().startsWith('2.')) {
            current = 'obligations';
            continue
        }
        else if (line.toLowerCase().startsWith('3.')) {
            current = 'redFlags';
            continue
        }
        else if (line.toLowerCase().startsWith('4.')) {
            current = 'greenFlags';
            continue
        }
        
        if (current && line) {
            sections[current] += line + '\n';
        }
    }
        return sections;
}


chrome.storage.local.get('tncSummary', (data) => {
    const container = data.tncSummary;

    if(!container) {
        document.getElementById("important").innerText = "No important points found.";
        return;
    }

    document.getElementById("url").innerText = container.url;

    const parsed = parseSections(container.summary);

    document.getElementById("important").innerText = parsed.important || "No important points found.";
    document.getElementById("obligations").innerText = parsed.obligations || "No obligations found.";
    document.getElementById("redFlags").innerText = parsed.redFlags || "No red flags found.";
    document.getElementById("greenFlags").innerText = parsed.greenFlags || "No green flags found.";
});