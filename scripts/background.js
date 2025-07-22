
import './browser-polyfill.js';


browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_PAGE") {
        analyzePageContent(message.text, sender.tab.id);
        return true; 
    }
});


async function analyzePageContent(text, tabId) {
    
    chrome.action.setBadgeText({ text: "...", tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#F1C40F", tabId: tabId });

    try {
        const serverUrl = 'https://backend-privacy-pal.onrender.com/analyze';
        const response = await fetch(serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) { throw new Error(`Server responded with status ${response.status}`); }

        const analysis = await response.json();
        browser.storage.local.set({ [tabId]: { analysis, timestamp: Date.now() } });

        const riskScore = analysis.riskScore || 5;
        if (riskScore <= 3) {
            chrome.action.setBadgeText({ text: "OK", tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: "#2ECC71", tabId: tabId });
        } else if (riskScore <= 7) {
            chrome.action.setBadgeText({ text: "WARN", tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: "#F1C40F", tabId: tabId });
        } else {
            chrome.action.setBadgeText({ text: "RISK", tabId: tabId });
            chrome.action.setBadgeBackgroundColor({ color: "#E74C3C", tabId: tabId });
        }

        if (analysis.highlights && analysis.highlights.length > 0) {
            browser.tabs.sendMessage(tabId, {
                type: "HIGHLIGHT_TEXT",
                highlights: analysis.highlights
            });
        }
    } catch (error) {
        console.error("BACKGROUND CRITICAL ERROR:", error);
        browser.storage.local.set({ [tabId]: { error: "Analysis failed." } });
        chrome.action.setBadgeText({ text: "ERR", tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#555", tabId: tabId });
    }
}