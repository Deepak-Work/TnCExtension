const HOST_ID = 'tnc-ext-banner-host';

const STYLES = `
    :host { all: initial; }
    .card {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 340px;
        max-height: 80vh;
        overflow-y: auto;
        z-index: 2147483647;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: #ffffff;
        color: #1e293b;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        padding: 16px;
        box-sizing: border-box;
        animation: tnc-slide-in 0.2s ease-out;
    }
    @keyframes tnc-slide-in {
        from { transform: translateY(12px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 10px;
    }
    .title {
        font-size: 15px;
        font-weight: 600;
        color: #2563eb;
        margin: 0;
        line-height: 1.3;
    }
    .dismiss {
        border: none;
        background: transparent;
        color: #94a3b8;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 0 2px;
        flex-shrink: 0;
    }
    .dismiss:hover { color: #1e293b; }
    .section { margin-bottom: 10px; }
    .label {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        margin-bottom: 4px;
    }
    .label.good { color: #22c55e; }
    .label.bad { color: #ef4444; }
    .label.sentiment { color: #64748b; }
    ul { margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.5; }
    li { margin-bottom: 4px; }
    .sentiment-item { font-size: 12px; margin-bottom: 6px; }
    .sentiment-item a { color: #2563eb; text-decoration: none; }
    .sentiment-item a:hover { text-decoration: underline; }
    .empty { font-size: 12px; color: #94a3b8; font-style: italic; }
    .footer {
        font-size: 10px;
        color: #94a3b8;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid #e2e8f0;
    }
`;

function bulletList(items, emptyLabel) {
    if (!items || items.length === 0) {
        return `<p class="empty">${emptyLabel}</p>`;
    }
    return `<ul>${items.map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>`;
}

function sentimentList(items) {
    if (!items || items.length === 0) {
        return `<p class="empty">No web sentiment found yet.</p>`;
    }
    return items.slice(0, 3).map(s => `
        <div class="sentiment-item">
            "${escapeHtml(s.text)}" — <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">source</a>
        </div>
    `).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

export function showBanner(analysis) {
    document.getElementById(HOST_ID)?.remove();

    const host = document.createElement('div');
    host.id = HOST_ID;
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
        <div class="header">
            <p class="title">Terms Summary${analysis.title ? ': ' + escapeHtml(analysis.title) : ''}</p>
            <button class="dismiss" aria-label="Dismiss">&times;</button>
        </div>
        <div class="section">
            <div class="label good">Good for you</div>
            ${bulletList(analysis.good, 'No notable upsides found.')}
        </div>
        <div class="section">
            <div class="label bad">Red flags</div>
            ${bulletList(analysis.bad, 'No red flags found.')}
        </div>
        <div class="section">
            <div class="label sentiment">What people are saying</div>
            ${sentimentList(analysis.sentiment)}
        </div>
        <div class="footer">${analysis.source === 'cache' ? 'Loaded from cache' : 'Freshly analyzed'} · click the extension icon for full details</div>
    `;
    shadow.appendChild(card);

    card.querySelector('.dismiss').addEventListener('click', () => host.remove());
}
