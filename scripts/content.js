// scripts/content.js



// --- Function to create the button ---
function injectAnalysisButton() {
    if (document.getElementById('privacy-pal-button')) return;

    const button = document.createElement('div');
    button.id = 'privacy-pal-button';
    button.innerHTML = `<span class="pp-logo-span">PP</span><span>Analyze Terms</span>`;
    document.body.appendChild(button);
    
    // --- Styles for the button and highlights ---
    const style = document.createElement('style');
    style.innerHTML = `
      #privacy-pal-button {
        position: fixed; bottom: 25px; right: 25px; background: linear-gradient(90deg, #00C4FF, #00A3FF); color: white;
        padding: 10px 20px 10px 12px; border-radius: 50px; cursor: pointer; display: flex; align-items: center;
        justify-content: center; box-shadow: 0 5px 15px rgba(0, 179, 255, 0.4); font-family: 'Inter', sans-serif;
        font-weight: 600; font-size: 15px; z-index: 9999; transition: all 0.2s ease-in-out;
      }
      #privacy-pal-button:hover { transform: translateY(-2px); box-shadow: 0 7px 20px rgba(0, 179, 255, 0.5); }
      #privacy-pal-button:disabled { cursor: not-allowed; background: #5A6470; box-shadow: none; transform: none; }
      .pp-logo-span {
        display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; margin-right: 12px;
        background-color: rgba(0, 0, 0, 0.15); border-radius: 50%; font-weight: 700; font-size: 14px;
      }
      .pp-logo-span.checkmark { background-color: #2ECC71; font-size: 20px; }
      .spinner {
        border: 3px solid rgba(255, 255, 255, 0.3); border-radius: 50%; border-top: 3px solid #ffffff;
        width: 18px; height: 18px; animation: spin 1s linear infinite; margin-right: 12px;
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      .privacy-pal-highlight { padding: 2px 1px; border-radius: 3px; color: black !important; }
      .privacy-pal-highlight--high { background-color: rgba(231, 76, 60, 0.6); }
      .privacy-pal-highlight--medium { background-color: rgba(241, 196, 15, 0.7); }
      .privacy-pal-highlight--low { background-color: rgba(46, 204, 113, 0.5); }
    `;
    document.head.appendChild(style);

    // --- Button click listener ---
    button.addEventListener('click', () => {
        button.disabled = true;
        button.innerHTML = `<div class="spinner"></div><span>Analyzing...</span>`;
        const pageText = document.body.innerText;
        // --- THIS IS THE FIX for the "out of scope" error ---
        // We just send the message. We DO NOT expect a response from this call.
        browser.runtime.sendMessage({ type: "ANALYZE_PAGE", text: pageText });
    });
}

// --- Function to highlight text ---
function highlightTextOnPage(highlights) {
    const body = document.body;
    let content = body.innerHTML;
    highlights.forEach(h => {
        try {
            const regex = new RegExp(escapeRegex(h.text), 'gi');
            const replacement = `<mark class="privacy-pal-highlight privacy-pal-highlight--${h.risk}">$&</mark>`;
            if (regex.test(content)) {
                content = content.replace(regex, replacement);
            }
        } catch (e) { console.error("Could not highlight text:", h.text, e); }
    });
    body.innerHTML = content;
}

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// --- Message listener from background script ---
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "HIGHLIGHT_TEXT") {
        highlightTextOnPage(message.highlights);
        const button = document.getElementById('privacy-pal-button');
        if (button) {
            button.disabled = false;
            button.innerHTML = `<span class="pp-logo-span checkmark">✔</span><span>Analysis Complete</span>`;
        }
    }
});


// --- Function to decide if the button should be shown ---
function isLikelyTermsPage() {
    const url = window.location.href.toLowerCase();
    const title = document.title.toLowerCase();
    // Check a larger chunk of text for dynamic pages
    const bodyText = document.body.innerText.toLowerCase().substring(0, 2000);
    const keywords = ['terms of service', 'terms and conditions', 'privacy policy', 'legal terms', 'end-user agreement', 'terms of use'];
    return keywords.some(k => url.includes(k.replace(/ /g, '-')) || title.includes(k) || bodyText.includes(k));
}

// ==========================================================
// ▼▼▼ THIS IS THE FIX for the button not appearing ▼▼▼
// ==========================================================
// Run after a short delay to allow dynamic pages (like Spotify) to load their content.
setTimeout(() => {
    if (isLikelyTermsPage()) {
        injectAnalysisButton();
    }
}, 1500); // Wait 1.5 seconds