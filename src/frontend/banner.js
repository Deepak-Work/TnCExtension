const HOST_ID = 'tnc-ext-banner-host';

const GOOD_ICON = `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#E8F5EC"/><path d="M5 8.2l2 2 4-4.4" stroke="#1B7A4A" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const RISK_ICON = `<svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill="#FBEAEA"/><path d="M8 5v4" stroke="#B3261E" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11" r="0.9" fill="#B3261E"/></svg>`;

const STYLES = `
    :host { all: initial; }
    .card {
        position: fixed;
        top: 24px;
        right: 24px;
        width: 340px;
        max-height: 30vh;
        overflow-y: auto;
        z-index: 2147483647;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        background: #ffffff;
        color: #1c1d2b;
        border: 1px solid #e4e4ee;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(28, 29, 43, 0.16);
        box-sizing: border-box;
        animation: tnc-slide-in 0.2s ease-out;
    }
    * { box-sizing: border-box; }
    @keyframes tnc-slide-in {
        from { transform: translateY(-8px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
    .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        padding: 12px 14px 10px;
    }
    .title {
        font-family: 'Source Serif 4', ui-serif, Georgia, 'Times New Roman', serif;
        font-size: 14.5px;
        font-weight: 600;
        line-height: 1.3;
        margin: 0;
    }
    .dismiss {
        border: none;
        background: transparent;
        color: #6b6d80;
        font-size: 18px;
        line-height: 1;
        cursor: pointer;
        padding: 0 2px;
        flex-shrink: 0;
    }
    .dismiss:hover { color: #1c1d2b; }
    .body { padding: 0 14px 12px; display: flex; flex-direction: column; gap: 12px; }
    .eyebrow {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 10.5px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.07em;
        margin-bottom: 8px;
    }
    .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .eyebrow-good { color: #1b7a4a; }
    .eyebrow-good .eyebrow-dot { background: #1b7a4a; }
    .eyebrow-risk { color: #b3261e; }
    .eyebrow-risk .eyebrow-dot { background: #b3261e; }
    .eyebrow-sentiment { color: #8a6a1f; }
    .eyebrow-sentiment .eyebrow-dot { background: #8a6a1f; }
    ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
    .item { display: flex; gap: 8px; font-size: 12.5px; line-height: 1.45; }
    .item-icon { flex-shrink: 0; width: 15px; height: 15px; margin-top: 1px; }
    .item-icon svg { width: 100%; height: 100%; }
    .item-empty { font-size: 12px; color: #6b6d80; font-style: italic; }
    .sentiment-item { font-size: 12px; line-height: 1.5; }
    .sentiment-item a { color: #8a6a1f; text-decoration: none; font-weight: 600; }
    .sentiment-item a:hover { text-decoration: underline; }
    hr { border: none; border-top: 1px solid #e4e4ee; margin: 0; }
    .footer {
        font-size: 10px;
        color: #6b6d80;
        padding: 8px 14px;
        border-top: 1px solid #e4e4ee;
    }
`;

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function itemList(items, icon, emptyLabel) {
    if (!items || items.length === 0) {
        return `<ul><li class="item-empty">${emptyLabel}</li></ul>`;
    }
    return `<ul>${items.map(i => `
        <li class="item">
            <span class="item-icon">${icon}</span>
            <span>${escapeHtml(i)}</span>
        </li>
    `).join('')}</ul>`;
}

function sentimentList(items) {
    if (!items || items.length === 0) {
        return `<ul><li class="item-empty">No web sentiment found yet.</li></ul>`;
    }
    return `<ul>${items.slice(0, 3).map(s => `
        <li class="sentiment-item">
            "${escapeHtml(s.text)}" — <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener noreferrer">source ↗</a>
        </li>
    `).join('')}</ul>`;
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
            <p class="title">${escapeHtml(analysis.subject || analysis.title || 'Terms Analysis')}</p>
            <button class="dismiss" aria-label="Dismiss">&times;</button>
        </div>
        <div class="body">
            <div>
                <div class="eyebrow eyebrow-good"><span class="eyebrow-dot"></span> Key Benefits</div>
                ${itemList(analysis.good, GOOD_ICON, 'No notable upsides found.')}
            </div>
            <hr>
            <div>
                <div class="eyebrow eyebrow-risk"><span class="eyebrow-dot"></span> Risk Factors</div>
                ${itemList(analysis.bad, RISK_ICON, 'No red flags found.')}
            </div>
            <hr>
            <div>
                <div class="eyebrow eyebrow-sentiment"><span class="eyebrow-dot"></span> Public Sentiment</div>
                ${sentimentList(analysis.sentiment)}
            </div>
        </div>
        <div class="footer">${analysis.source === 'cache' ? 'From cache' : 'Freshly analyzed'} · click the extension icon for full details</div>
    `;
    shadow.appendChild(card);

    card.querySelector('.dismiss').addEventListener('click', () => host.remove());
}
