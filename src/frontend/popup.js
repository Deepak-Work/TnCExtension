function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function bulletList(items, emptyLabel) {
    if (!items || items.length === 0) {
        return `<em style="color:#94a3b8;">${emptyLabel}</em>`;
    }
    return `<ul style="margin:0; padding-left:18px;">${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

function sentimentList(items) {
    if (!items || items.length === 0) {
        return `<em style="color:#94a3b8;">No web sentiment found.</em>`;
    }
    return items.map(s => `
        <div style="margin-bottom:8px;">
            "${escapeHtml(s.text)}" —
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">source</a>
        </div>
    `).join('');
}

function showScreen(name) {
    document.getElementById('loading-screen').style.display = name === 'loading' ? 'flex' : 'none';
    document.getElementById('empty-screen').style.display = name === 'empty' ? 'flex' : 'none';
    document.getElementById('content').style.display = name === 'content' ? 'block' : 'none';
}

function render(data) {
    if (data.error) {
        showScreen('content');
        document.getElementById('page-title').innerText = 'Terms Summary';
        document.getElementById('url').innerText = data.url || '';
        document.getElementById('error-message').innerText =
            'Could not connect to backend. Make sure the servers are running.';
        document.getElementById('error-message').style.display = 'block';
        document.getElementById('good').innerHTML = '';
        document.getElementById('bad').innerHTML = '';
        document.getElementById('sentiment').innerHTML = '';
        document.getElementById('meta').innerText = '';
        return;
    }

    showScreen('content');
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('page-title').innerText = data.title ? `Terms Summary: ${data.title}` : 'Terms Summary';
    document.getElementById('url').innerText = data.url || '';
    document.getElementById('good').innerHTML = bulletList(data.good, 'No notable upsides found.');
    document.getElementById('bad').innerHTML = bulletList(data.bad, 'No red flags found.');
    document.getElementById('sentiment').innerHTML = sentimentList(data.sentiment);

    const sourceLabel = data.source === 'cache' ? 'Loaded from cache' : 'Freshly analyzed';
    const analyzedAt = data.analyzedAt ? new Date(data.analyzedAt).toLocaleString() : '';
    document.getElementById('meta').innerText = `${sourceLabel}${analyzedAt ? ' · ' + analyzedAt : ''}`;
}

async function updatePopupContent() {
    showScreen('loading');

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
        showScreen('empty');
        return;
    }

    const key = `tab:${tab.id}`;
    const stored = await chrome.storage.local.get(key);
    const data = stored[key];

    if (!data) {
        showScreen('empty');
        return;
    }

    render(data);
}

document.addEventListener('DOMContentLoaded', updatePopupContent);

chrome.runtime.onMessage.addListener((message) => {
    if (message.action !== 'analysisUpdated') return;
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
        if (tab && tab.id === message.tabId) {
            render(message.data);
        }
    });
});
