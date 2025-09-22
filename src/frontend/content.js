(async () => {
    const { loadConfig } = await import(chrome.runtime.getURL("config/configLoader.js"));
    const config = await loadConfig();
    const crawlEndpoint = config.crawlEndPoint;

    async function fetchParsedTerms(url) {
        try{
            console.log(`${crawlEndpoint}?url=${encodeURIComponent(url)}`)
            const res = await fetch(`${crawlEndpoint}?url=${encodeURIComponent(url)}`);
            const json = await res.json();
            return json || "";
        } catch (error) {
            console.error("Crawl4AI Fetch Failed: ", error);
        }
    }

    function initialize() {
        currentUrl = window.location.href;
        fetchParsedTerms(currentUrl).then((text) => {
            if (text){
                chrome.runtime.sendMessage({action: 'tncTextExtracted', text: text, sourceUrl: currentUrl});
            } else {
                console.warn("No TnC text extracted!");
            }
        });
    }
    initialize();
})();

