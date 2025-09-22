export async function loadConfig() {
    const res = await fetch(chrome.runtime.getURL('config/config.json'));
    return await res.json();
}
