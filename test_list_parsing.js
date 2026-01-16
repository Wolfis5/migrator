
function parseParagraphContent(text) {
    if (!text) return [];

    // Updated split regex to include lists
    const parts = text.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<br\s*\/?>|<\/?(?:ul|ol)[^>]*>[\s\S]*?<\/(?:ul|ol)>)/gi);

    // Better split strategy: split by top-level tags we care about?
    // The previous split was: text.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<br\s*\/?>)/gi);
    // We need to capture the whole list as one part to process it.

    // Let's try a more robust regex that captures lists.
    // Note: This regex is still simple and assumes no nested same-tag lists for simplicity as agreed.
    const splitRegex = /(<a\b[^>]*>[\s\S]*?<\/a>|<br\s*\/?>|<ul\b[^>]*>[\s\S]*?<\/ul>|<ol\b[^>]*>[\s\S]*?<\/ol>)/gi;

    const rawParts = text.split(splitRegex);

    return rawParts.map((part, index) => {
        if (!part || !part.trim()) return null;

        if (/^<br\s*\/?>$/i.test(part)) {
            return [{ type: 'hardBreak' }, { type: 'hardBreak' }];
        }

        // Handle Lists
        if (/^<(ul|ol)\b[^>]*>/i.test(part)) {
            const isOrdered = /^<ol/i.test(part);
            const listType = isOrdered ? 'orderedList' : 'bulletList';

            // Extract list items
            const itemRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
            const listItems = [];
            let match;
            while ((match = itemRegex.exec(part)) !== null) {
                // Recursively parse the content of the li
                // We need to be careful not to infinite loop if parseParagraphContent is used.
                // But here we want to return 'listItem' nodes.

                // For the content of the LI, we can reuse parseParagraphContent logic
                // but we need to wrap it in a paragraph if it's just text?
                // Usually list items in this schema seem to contain paragraphs or just text.
                // Let's assume they contain "paragraph" nodes based on typical schema,
                // or maybe just content nodes.
                // Let's look at the schema: "listItem" usually contains "paragraph".

                const liContent = parseParagraphContent(match[1]);

                // If the result is just text/links, wrap in paragraph?
                // Or does the schema allow text directly in listItem?
                // Usually: bulletList -> listItem -> paragraph -> text

                listItems.push({
                    type: 'listItem',
                    content: [{
                        type: 'paragraph',
                        attrs: { textAlign: 'left' },
                        content: liContent
                    }]
                });
            }

            if (listItems.length === 0) return null;

            return {
                type: listType,
                content: listItems
            };
        }

        const linkMatch = part.match(/^<a\b[^>]*href=["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>$/i);
        if (linkMatch) {
            const href = linkMatch[1];
            const attrs = linkMatch[2];
            const content = linkMatch[3];

            const targetMatch = attrs.match(/target=["']([^"']+)["']/i);
            const titleMatch = attrs.match(/title=["']([^"']+)["']/i);

            const textContent = content.replace(/<[^>]+>/g, '').toString();
            return {
                type: 'text',
                text: `${textContent} ${rawParts[index + 1] && !/^<[a-z\/]/i.test(rawParts[index+1]) ? ' ' : ''}`, // Simplified space logic for test
                marks: [{
                    type: 'link',
                    attrs: {
                        href: href,
                        rel: null,
                        target: targetMatch ? targetMatch[1] : null,
                        title: titleMatch ? titleMatch[1] : null
                    }
                }]
            };
        } else {
            let textContent = part.replace(/<[^>]+>/g, '').toString();
            if (!textContent.trim()) return null;

            // Check if next element is a link (simplified for test)
            const nextPart = rawParts[index + 1];
            if (nextPart && /^<a\b/i.test(nextPart)) {
                textContent += ' '
            }

            return {
                type: 'text',
                text: textContent
            };
        }
    }).filter(item => item !== null).flat();
}

// Test cases
const test1 = "Some text <ul><li>Item 1</li><li>Item 2</li></ul> more text";
console.log("Test 1:", JSON.stringify(parseParagraphContent(test1), null, 2));

const test2 = "Start <ol><li>First <a href='#'>link</a></li><li>Second</li></ol> End";
console.log("Test 2:", JSON.stringify(parseParagraphContent(test2), null, 2));

const test3 = "Just text";
console.log("Test 3:", JSON.stringify(parseParagraphContent(test3), null, 2));
