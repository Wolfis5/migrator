
const htmlContent = `
<main>
    <h2>Title with &nbsp; non-breaking space</h2>
    <p>Some content here.</p>
    <div>
        <p>Title with   non-breaking space</p>
    </div>
    <div>
        <p>Title with&nbsp;non-breaking space</p>
    </div>
    <div>
        <p>Title with
        newline</p>
    </div>
    <h2>Title with newline</h2>
</main>
`;

const mainMatch = htmlContent.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
const content = mainMatch ? mainMatch[1] : htmlContent;

function cleanHTML(html) {
    return html
        .replace(/<(?!br\s*\/?)[^>]+>/gi, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&#x27;/g, '’')
        .replace(/&#39;/g, '’')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/\s+/g, ' ')
        .trim();
}

function testSearch(tagName, innerText) {
    console.log(`Testing search for tag <${tagName}> with text: "${innerText}"`);

    // Logic from migrate-state-hybrid.js (modified as per plan)
    const cleanText = cleanHTML(innerText);

    if (cleanText) {
        // Split by whitespace to handle multi-line or variable spacing in HTML
        const words = cleanText.split(/\s+/);

        // Escape each word and join with a pattern that matches any whitespace (including newlines and &nbsp;)
        const escapedWords = words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        // Improved regex pattern to handle &nbsp; and other whitespace
        // Using (?:\\s|&nbsp;|\\n|\\r)+ to match standard whitespace, non-breaking space entity, newlines
        const regexPattern = escapedWords.join('(?:\\s|&nbsp;|\\n|\\r)+');

        // Search for the text within any tag content: >...TEXT...<
        // Case-sensitive (no 'i' flag)
        const pattern = new RegExp(`>([^<]*?${regexPattern}[^<]*?)<`, 'g');

        const matches = [];
        let m;
        while ((m = pattern.exec(content)) !== null) {
            console.log('Match found:', m[1].trim());
            matches.push(m[1]);
        }
        console.log(`Total matches: ${matches.length}`);
        return matches.length;
    }
    return 0;
}

// Test cases
console.log('--- Test Case 1: &nbsp; handling ---');
testSearch('h2', 'Title with &nbsp; non-breaking space');

console.log('\n--- Test Case 2: Newline handling ---');
testSearch('h2', 'Title with newline');
