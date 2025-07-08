// scripts/background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_PAGE") {
        console.log("Analysis requested for tab:", sender.tab.id);
        analyzePageContent(message.text, sender.tab.id);
        // Let the sender know we've started the async process
        sendResponse({ status: "Analysis started" }); 
        return true; // Indicates an async response
    }
});

async function analyzePageContent(text, tabId) {
    // 1. Show a "loading" state on the icon
    chrome.action.setBadgeText({ text: "...", tabId: tabId });
    chrome.action.setBadgeBackgroundColor({ color: "#F1C40F", tabId: tabId });

    try {
        // 2. Call your backend server
        const response = await fetch('http://localhost:3000/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const analysis = await response.json();
        if (analysis.highlights && analysis.highlights.length > 0) {
            console.log("BACKGROUND: Sending highlights to content script:", analysis.highlights);
            chrome.tabs.sendMessage(tabId, {
                type: "HIGHLIGHT_TEXT",
                highlights: analysis.highlights
            });
        }
        
        // 3. Save the result to chrome.storage
        chrome.storage.local.set({ [tabId]: { analysis, timestamp: Date.now() } });

        // 4. Update the icon based on risk score
        const riskScore = analysis.riskScore || 5; // Default to 5 if not present
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

    } catch (error) {
        console.error("Analysis failed:", error);
        chrome.storage.local.set({ [tabId]: { error: "Analysis failed. Is the server running?" } });
        chrome.action.setBadgeText({ text: "ERR", tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: "#555", tabId: tabId });
    }
}