
function removeIconDiv(html) {
    // Regex to match div with class containing icon2137
    // This regex matches <div ... class="...icon2137..." ...> ... </div>
    // It uses a non-greedy match for content, which might fail with nested divs,
    // but for this specific icon case it's likely sufficient.
    // A better approach for nested tags would be a parser or the stack-based approach used elsewhere in the file.

    // However, for a simple utility function requested:
    return html.replace(/<div\b[^>]*class=["'][^"']*icon2137[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
}

const testHtml = `
<li>
    <div class="icon2137">
        <img src="icon.png" />
    </div>
    <div class="text-content">
        Some text here
    </div>
</li>
`;

const cleaned = removeIconDiv(testHtml);
console.log('Original:', testHtml);
console.log('Cleaned:', cleaned);

if (!cleaned.includes('icon2137') && cleaned.includes('Some text here')) {
    console.log('SUCCESS: Icon div removed, content preserved.');
} else {
    console.log('FAILURE');
}
