const GOOD_ICON = `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#E8F5EC"/><path d="M5 8.2l2 2 4-4.4" stroke="#1B7A4A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const RISK_ICON = `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#FBEAEA"/><path d="M8 5v4" stroke="#B3261E" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11" r="0.9" fill="#B3261E"/></svg>`;

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function renderItemList(container, items, icon, emptyLabel) {
    if (!items || items.length === 0) {
        container.innerHTML = `<li class="item-empty">${emptyLabel}</li>`;
        return;
    }
    container.innerHTML = items.map(text => `
        <li class="item">
            <span class="item-icon">${icon}</span>
            <span>${escapeHtml(text)}</span>
        </li>
    `).join('');
}

function renderSentimentList(container, items) {
    if (!items || items.length === 0) {
        container.innerHTML = `<li class="item-empty">No web sentiment found.</li>`;
        return;
    }
    container.innerHTML = items.map(s => `
        <li class="sentiment-item">
            "${escapeHtml(s.text)}" — <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">source ↗</a>
        </li>
    `).join('');
}

function showScreen(name) {
    document.getElementById('loading-screen').style.display = name === 'loading' ? 'flex' : 'none';
    document.getElementById('empty-screen').style.display = name === 'empty' ? 'flex' : 'none';
    document.getElementById('error-screen').style.display = name === 'error' ? 'flex' : 'none';
    document.getElementById('content').style.display = name === 'content' ? 'flex' : 'none';
}

function render(data) {
    if (data.error) {
        showScreen('error');
        return;
    }

    showScreen('content');

    const pill = document.getElementById('source-pill');
    if (data.source === 'cache') {
        pill.textContent = 'From Cache';
        pill.className = 'pill pill-cache';
    } else {
        pill.textContent = 'Freshly Analyzed';
        pill.className = 'pill pill-fresh';
    }

    document.getElementById('subject').innerText = data.subject || data.title || 'Terms & Conditions';
    document.getElementById('url').innerText = data.url || '';

    renderItemList(document.getElementById('good'), data.good, GOOD_ICON, 'No notable upsides found.');
    renderItemList(document.getElementById('bad'), data.bad, RISK_ICON, 'No red flags found.');
    document.getElementById('good-count').innerText = data.good?.length || '';
    document.getElementById('bad-count').innerText = data.bad?.length || '';

    renderSentimentList(document.getElementById('sentiment'), data.sentiment);

    document.getElementById('analyzed-at').innerText = data.analyzedAt
        ? `Analyzed ${new Date(data.analyzedAt).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })}`
        : '';
    document.getElementById('model').innerText = data.model || '';
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
