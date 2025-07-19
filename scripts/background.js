// in scripts/background.js

// --- Main message listener ---
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "ANALYZE_PAGE") {
        analyzePageContent(message.text, sender.tab.id);
        // Return true to indicate we will send a response asynchronously
        return true; 
    }
});

// --- Analysis function ---
async function analyzePageContent(text, tabId) {
    console.log("BACKGROUND: Analysis started. Setting loading badge.");
    // Use browser.browserAction for Firefox
    browser.browserAction.setBadgeText({ text: "...", tabId: tabId });
    browser.browserAction.setBadgeBackgroundColor({ color: "#F1C40F", tabId: tabId });

    try {
        const serverUrl = 'https://backend-privacy-pal.onrender.com/analyze';
        console.log("BACKGROUND: Sending request to server:", serverUrl);

        const response = await fetch(serverUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: text })
        });

        console.log("BACKGROUND: Received response from server. Status:", response.status);

        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }

        const analysis = await response.json();
        console.log("BACKGROUND: Successfully parsed JSON analysis.");
        
        // Save the result to storage
        browser.storage.local.set({ [tabId]: { analysis, timestamp: Date.now() } });

        // Update the badge based on risk score
        const riskScore = analysis.riskScore || 5;
        if (riskScore <= 3) {
            browser.browserAction.setBadgeText({ text: "OK", tabId: tabId });
            browser.browserAction.setBadgeBackgroundColor({ color: "#2ECC71", tabId: tabId });
        } else if (riskScore <= 7) {
            browser.browserAction.setBadgeText({ text: "WARN", tabId: tabId });
            browser.browserAction.setBadgeBackgroundColor({ color: "#F1C40F", tabId: tabId });
        } else {
            browser.browserAction.setBadgeText({ text: "RISK", tabId: tabId });
            browser.browserAction.setBadgeBackgroundColor({ color: "#E74C3C", tabId: tabId });
        }

        // Send highlights to the content script
        if (analysis.highlights && analysis.highlights.length > 0) {
            browser.tabs.sendMessage(tabId, {
                type: "HIGHLIGHT_TEXT",
                highlights: analysis.highlights
            });
        }

    } catch (error) {
        console.error("BACKGROUND: CRITICAL ERROR during analysis:", error);
        browser.storage.local.set({ [tabId]: { error: "Analysis failed. See background logs." } });
        browser.browserAction.setBadgeText({ text: "ERR", tabId: tabId });
        browser.browserAction.setBadgeBackgroundColor({ color: "#555", tabId: tabId });
    }
}