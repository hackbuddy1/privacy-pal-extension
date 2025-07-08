// scripts/content.js

// Function to check if it's a T&C page (we can make this more robust later)
function isLikelyTermsPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    const bodyText = document.body.innerText.toLowerCase().substring(0, 1000);
    const keywords = ['terms of service', 'terms and conditions', 'privacy policy', 'legal terms'];
    return keywords.some(k => url.includes(k.replace(/ /g, '')) || title.includes(k) || bodyText.includes(k));
}

// Inject a floating button onto the page
function injectAnalysisButton() {
    // Avoid injecting multiple times
    if (document.getElementById('privacy-pal-button')) return;

    const button = document.createElement('div');
    button.id = 'privacy-pal-button';
    button.innerHTML = `<span class="pp-logo-span">PP</span><span>Analyze Terms</span>`;
    document.body.appendChild(button);

    // Add styles for the button
    const style = document.createElement('style');
    style.innerHTML = `
      #privacy-pal-button {
        position: fixed;
        bottom: 25px;
        right: 25px;
        background: linear-gradient(90deg, #00C4FF, #00A3FF);
        color: white;
        padding: 10px 20px 10px 12px;
        border-radius: 50px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 5px 15px rgba(0, 179, 255, 0.4);
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-weight: 600;
        font-size: 15px;
        z-index: 9999;
        transition: all 0.2s ease-in-out;
      }
      #privacy-pal-button:hover {
        transform: translateY(-2px);
        box-shadow: 0 7px 20px rgba(0, 179, 255, 0.5);
      }
      #privacy-pal-button:disabled {
        cursor: not-allowed;
        background: #5A6470;
        box-shadow: none;
        transform: none;
      }
      .pp-logo-span {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-right: 12px;
        background-color: rgba(0, 0, 0, 0.15);
        border-radius: 50%;
        font-weight: 700;
        font-size: 14px;
      }
      .pp-logo-span.checkmark {
        background-color: #2ECC71; /* Green for success */
        font-size: 20px;
      }
      .spinner {
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        border-top: 3px solid #ffffff;
        width: 18px;
        height: 18px;
        animation: spin 1s linear infinite;
        margin-right: 12px;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .privacy-pal-highlight {
        padding: 2px 1px;
        border-radius: 3px;
        color: black !important;
      }
      .privacy-pal-highlight--high { background-color: rgba(231, 76, 60, 0.6); }
      .privacy-pal-highlight--medium { background-color: rgba(241, 196, 15, 0.7); }
      .privacy-pal-highlight--low { background-color: rgba(46, 204, 113, 0.5); }
    `;
    document.head.appendChild(style);

    // in scripts/content.js

    button.addEventListener('click', () => {
    // Disable button and show spinner
    button.disabled = true;
    button.innerHTML = `<div class="spinner"></div><span>Analyzing...</span>`;

    const pageText = document.body.innerText;
    // Just send the message, don't wait for a response here.
    chrome.runtime.sendMessage({ type: "ANALYZE_PAGE", text: pageText });
});
}


if (isLikelyTermsPage()) {
    injectAnalysisButton(

    );
}



// Listen for the message from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "HIGHLIGHT_TEXT") {
        highlightTextOnPage(message.highlights);

        // --- Find the button and reset its state ---
        const button = document.getElementById('privacy-pal-button');
        if (button) {
            button.disabled = false;
            // We use a different logo here to show it's complete
            button.innerHTML = `<span class="pp-logo-span checkmark">✔</span><span>Analysis Complete</span>`;
        }
        
        sendResponse({ status: "Highlighting complete." });
    }
    return true; // Keep the message channel open for async response
});

// This function finds and wraps text in <mark> tags
function highlightTextOnPage(highlights) {
    const body = document.body;
    let content = body.innerHTML;
    let highlightCount = 0;

    highlights.forEach(h => {
        try {
            // Create a regular expression to find the text. 'gi' means Global (find all) and Case-Insensitive.
            const regex = new RegExp(escapeRegex(h.text), 'gi');
            
            // Define the replacement, which is the original text wrapped in a <mark> tag with a CSS class
            const replacement = `<mark class="privacy-pal-highlight privacy-pal-highlight--${h.risk}">$&</mark>`;
            
            if (regex.test(content)) {
                content = content.replace(regex, replacement);
                highlightCount++;
            }
        } catch (e) {
            console.error("Could not highlight text:", h.text, e);
        }
    });

    console.log(`Highlighted ${highlightCount} phrases.`);
    body.innerHTML = content;
}

// Helper function to prevent errors when text contains special characters
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

