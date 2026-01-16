
const htmlSnippet = `
<ul class="BuBcvhzl"><li tabindex="0" class="fwL5CiqS"><div aria-hidden="true" class="icon2137 icon2137Mask __1lARgodS" style="--iconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#icon); --colorIconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#accent); --primaryIconColor: #737373; --secondaryIconColor: #ff4a00;"></div><div class="GJ3miDZF">How Your LLC Will Be Taxed</div></li><li tabindex="0" class="fwL5CiqS noHEEFfO"><div aria-hidden="true" class="icon2137 icon2137Mask __1lARgodS" style="--iconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#icon); --colorIconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#accent); --primaryIconColor: #ff4a00; --secondaryIconColor: #ff4a00;"></div><div class="GJ3miDZF">State Taxes for LLCs</div></li><li tabindex="0" class="fwL5CiqS"><div aria-hidden="true" class="icon2137 icon2137Mask __1lARgodS" style="--iconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#icon); --colorIconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#accent); --primaryIconColor: #737373; --secondaryIconColor: #ff4a00;"></div><div class="GJ3miDZF">Federal Taxes for LLCs</div></li><li tabindex="0" class="fwL5CiqS"><div aria-hidden="true" class="icon2137 icon2137Mask __1lARgodS" style="--iconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#icon); --colorIconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#accent); --primaryIconColor: #737373; --secondaryIconColor: #ff4a00;"></div><div class="GJ3miDZF">Employee and Employer Taxes</div></li><li tabindex="0" class="fwL5CiqS"><div aria-hidden="true" class="icon2137 icon2137Mask __1lARgodS" style="--iconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#icon); --colorIconLink: url(https://s3.us-east-2.amazonaws.com/bizee-website-assets/chevron-right-line.svg#accent); --primaryIconColor: #737373; --secondaryIconColor: #ff4a00;"></div><div class="GJ3miDZF">FAQs on Montana Business Taxes</div></li></ul>
`;

function removeIconDiv(html) {
    return html.replace(/<div\b[^>]*class=["'][^"']*icon2137[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
}

function cleanHTML(html) {
    return html
        .replace(/<(?!br\s*\/?)[^>]+>/gi, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function searchHeader(html) {
    const regexli = /<li\b[^>]*>([\s\S]*?)<\/li>/gis;
    let matchesLi;
    const results = [];

    while ((matchesLi = regexli.exec(html)) !== null) {
        // Check if the LI content itself contains the icon div
        // matchesLi[1] is the inner HTML of the li (since we removed the attribute capture group in this script)
        if (matchesLi[1].includes('icon2137')) {
            const cleanedContent = removeIconDiv(matchesLi[1]);
            const text = cleanHTML(cleanedContent);
            console.log('Found text:', text);
            results.push(text);
        }
    }
    return results;
}

console.log('Running searchHeader...');
searchHeader(htmlSnippet);
