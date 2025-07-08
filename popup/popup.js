// popup/popup.js

document.addEventListener('DOMContentLoaded', async () => {
    const contentDiv = document.getElementById('content');
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Function to render the analysis results
    function renderAnalysis(data) {
        const contentDiv = document.getElementById('content');

    // Handle errors or no data
    if (!data || !data.analysis) {
        const message = (data && data.error) ? data.error : 'Click the "Analyze Terms" button on a page to start.';
        contentDiv.innerHTML = `<p class="default-message">${message}</p>`;
        return;
    }

    const { riskScore, verdict, categorizedPoints } = data.analysis;

    // --- Determine colors for verdict and risk bar ---
    let riskColor = '#F1C40F'; // Default Yellow
    let verdictClass = 'verdict-warn';
    if (riskScore <= 3) {
        riskColor = '#2ECC71'; // Green
        verdictClass = 'verdict-good';
    } else if (riskScore > 7) {
        riskColor = '#E74C3C'; // Red
        verdictClass = 'verdict-bad';
    }
    
    // --- Map categories to icons ---
    const categoryIcons = {
        "Data Collection": "📊",
        "Data Sharing": "🤝",
        "Content Rights": "©️",
        "User Liability": "🛡️",
        "Policy Changes": "🔄"
    };

    // --- Build the new HTML ---
    let html = `
        <div class="verdict-card ${verdictClass}">
            <h3>The Verdict</h3>
            <p>${verdict}</p>
        </div>

        <h3>Risk Level</h3>
        <div class="risk-score" style="--risk-color: ${riskColor}; --risk-width: ${riskScore * 10}%;"><span>${riskScore}/10</span></div>
        </div>
        
        <h3>Key Points</h3>
        <div class="category-list">
            ${categorizedPoints.map(item => `
                <div class="category-card">
                    <span class="category-icon">${categoryIcons[item.category] || '🔹'}</span>
                    <p>${item.point}</p>
                </div>
            `).join('')}
        </div>
    `;

    contentDiv.innerHTML = html;
    }
    
    // Get the stored analysis for the current tab
    const result = await chrome.storage.local.get([`${tab.id}`]);
    renderAnalysis(result[tab.id]);

    // Listen for storage changes to update the popup in real-time
    chrome.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes[tab.id]) {
            renderAnalysis(changes[tab.id].newValue);
        }
    });
});