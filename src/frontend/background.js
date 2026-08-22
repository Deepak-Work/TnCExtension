import { loadConfig } from "../../config/configLoader.js";

const notificationTabs = new Map();

loadConfig().then(config => {
    const cacheCheckEndpoint = config.cacheCheckEndpoint;
    const analyzeEndpoint = config.analyzeEndpoint;

    async function extractErrorMessage(res, fallback) {
        try {
            const body = await res.json();
            return body.error || fallback;
        } catch {
            return fallback;
        }
    }

    async function fetchAnalysis(payload) {
        const checkRes = await fetch(cacheCheckEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ documentKey: payload.documentKey, contentHash: payload.contentHash }),
        });
        if (!checkRes.ok) {
            throw new Error(await extractErrorMessage(checkRes, `Cache check returned ${checkRes.status}`));
        }
        const checkData = await checkRes.json();
        if (checkData.hit) return checkData.analysis;

        const analyzeRes = await fetch(analyzeEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!analyzeRes.ok) {
            throw new Error(await extractErrorMessage(analyzeRes, `Analyze returned ${analyzeRes.status}`));
        }
        return await analyzeRes.json();
    }

    function setBadge(tabId, ok) {
        chrome.action.setBadgeText({ tabId, text: ok ? '✓' : '!' });
        chrome.action.setBadgeBackgroundColor({ tabId, color: ok ? '#22c55e' : '#ef4444' });
    }

    async function storeForTab(tabId, data) {
        await chrome.storage.local.set({ [`tab:${tabId}`]: data });
        chrome.runtime.sendMessage({ action: 'analysisUpdated', tabId, data }).catch(() => {});
    }

    function notify(tabId, analysis) {
        const notificationId = `tnc-${tabId}-${Date.now()}`;
        notificationTabs.set(notificationId, tabId);
        chrome.notifications.create(notificationId, {
            type: 'basic',
            iconUrl: chrome.runtime.getURL('src/frontend/public/icons/icon.png'),
            title: 'Terms Summary ready',
            message: analysis.title ? `Analysis ready for ${analysis.title}` : 'Analysis ready for this page.',
        });
    }

    chrome.runtime.onMessage.addListener((msg, sender) => {
        if (msg.action !== 'tncDetected') return false;

        const tabId = sender.tab?.id;
        if (tabId === undefined) return false;

        (async () => {
            try {
                const analysis = await fetchAnalysis({
                    documentKey: msg.documentKey,
                    url: msg.url,
                    title: msg.title,
                    text: msg.text,
                    contentHash: msg.contentHash,
                });

                setBadge(tabId, true);
                await storeForTab(tabId, analysis);
                chrome.tabs.sendMessage(tabId, { action: 'showBanner', analysis }).catch(() => {});
                notify(tabId, analysis);
            } catch (error) {
                console.error('[Background] Analysis failed:', error);
                setBadge(tabId, false);
                await storeForTab(tabId, {
                    error: true,
                    message: error.message || 'Backend unreachable',
                    url: msg.url,
                });
            }
        })();

        return false;
    });

    chrome.notifications.onClicked.addListener((notificationId) => {
        const tabId = notificationTabs.get(notificationId);
        notificationTabs.delete(notificationId);
        chrome.notifications.clear(notificationId);
        if (tabId === undefined) return;

        chrome.tabs.update(tabId, { active: true }).catch(() => {});
        chrome.action.openPopup().catch(() => {});
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.status === 'loading' && changeInfo.url) {
        chrome.action.setBadgeText({ tabId, text: '' });
        chrome.storage.local.remove(`tab:${tabId}`);
    }
});
