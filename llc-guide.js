/**
 * Script híbrido de migración: MongoDB + HTML
 * Combina datos estructurados de MongoDB con análisis HTML para asegurar contenido completo
 */

const { MongoClient } = require('mongodb');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');

// Cargar variables de entorno
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    const envContent = fs.readFileSync(envPath, 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        line = line.trim();
        if (line && !line.startsWith('#')) {
            const [key, ...valueParts] = line.split('=');
            if (key && valueParts.length > 0) {
                let value = valueParts.join('=').trim();
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                env[key.trim()] = value;
            }
        }
    });
    return env;
}

const env = loadEnv();
const MONGODB_URI = env.MONGODB_URI;
// Paths relativos al directorio desde donde se ejecuta el script (bizee.com)
// Usar process.cwd() para obtener el directorio de trabajo actual
const BASE_PATH = path.join(process.cwd(), 'content', 'collections', 'guides');
const TREE_PATH = path.join(process.cwd(), 'content', 'trees', 'collections', 'guides.yaml');

console.log({BASE_PATH});
console.log({TREE_PATH});
const BASE_URL = 'https://bizee.com';

// Mapeo de tipos de página
const PAGE_TYPE_MAP = {
    'business-names': 'business-names',
    'registered-agent': 'registered-agent',
    'filing-fees-requirements': 'filing-fees-requirements',
    'business-taxes': 'business-taxes',
    'faqs': 'faqs',
};

class LlcGuide {
    constructor(stateSlug, stateNumber) {
        this.stateSlug = stateSlug;
        this.stateName = this.slugToName(stateSlug);
        this.stateNumber = stateNumber;
        this.stateCode = this.getStateCode(stateSlug);
        this.client = null;
        this.collection = null;
        this.mainPageId = null;
        this.childPageIds = {};
    }


    slugToName(slug) {
        return slug.split('-').map(word =>
            word.charAt(0).toUpperCase() + word.slice(1)
        ).join(' ');
    }

    getStateCode(slug) {
        const stateCodes = {
            'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
            'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
            'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
            'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
            'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
            'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
            'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
            'new-hampshire': 'NH', 'new-jersey': 'NJ', 'new-mexico': 'NM', 'new-york': 'NY',
            'north-carolina': 'NC', 'north-dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
            'oregon': 'OR', 'pennsylvania': 'PA', 'rhode-island': 'RI', 'south-carolina': 'SC',
            'south-dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
            'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west-virginia': 'WV',
            'wisconsin': 'WI', 'wyoming': 'WY'
        };
        return stateCodes[slug] || slug.toUpperCase().substring(0, 2);
    }

    async connect() {
        this.client = new MongoClient(MONGODB_URI);
        await this.client.connect();
        const db = this.client.db('test');
        this.collection = db.collection('pages');
    }

    async disconnect() {
        if (this.client) {
            await this.client.close();
        }
    }

    async fetchHTML(url) {
        return new Promise((resolve, reject) => {
            const protocol = url.startsWith('https') ? https : http;

            protocol.get(url, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
                    }
                });
            }).on('error', (err) => {
                reject(err);
            });
        });
    }

    extractContentFromHTML(html) {
        // create a function to get all the sections inside the main tag using the h2 tag as title
        const sections = [];
        const intro = [];
        const metaInfo = {
            seo_custom_meta_title: '',
            seo_custom_meta_description: ''
        };
        const metaTitle = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const metaDescription = html.match(/<meta[^>]*name="description"[^>]*content="([\s\S]*?)"/i);
        metaInfo.seo_custom_meta_title = this.cleanHTML(metaTitle[1]);
        metaInfo.seo_custom_meta_description = this.cleanHTML(metaDescription[1]);
        const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
        const content = mainMatch ? mainMatch[1] : html;
        const htmlSections = content.match(/<section[^>]*>([\s\S]*?)<\/section>/gi);
        const header = html.match(/<header[^>]*>([\s\S]*?)<\/header>/i) ;
        const headerContent = header ? header[1] : '';
        let headerComponents = {title_content: '', description_content: '', cta_components:[]}
        const itemContents = htmlSections.length > 2 ? htmlSections[htmlSections.length - 2] : htmlSections[0];
        let hasIntro = false;

        if(headerContent){
            const tagRegex = /<(h1|p|h2)\b[^>]*>([\s\S]*?)<\/\1>/gis;
            let match;
            let groupedHeaderContent = {
                text: [],
                headers:[]
            };

            while ((match = tagRegex.exec(headerContent)) !== null) {
                if(match[1] === 'h1') {
                    headerComponents.title_content = match[2].replace(/<[^>]*>/gis, '').replace(/\n/gis, '');
                } else if(match[1] === 'p') {
                    groupedHeaderContent.text.push(match[2].replace(/<[^>]*>/gis, '').replace(/\n/gis, ''));
                } else if(match[1] === 'h2') {
                    groupedHeaderContent.headers.push(match[2].replace(/<[^>]*>/gis, '').replace(/\n/gis, ''));
                }
            }


            const getDescriptionStructure = (description) => ([{
                type: "paragraph",
                attrs:{textAlign: 'left'},
                content: this.parseParagraphContent(description)
            }])
            const getTextStructure = (content) => ({
                id: this.generateId(),
                text: [{
                    type: "paragraph",
                    attrs: { textAlign: 'left' },
                    content:this.parseParagraphContent(content)
                }],
                bard_alignment: false,
                secondary_font: false,
                custom_font_size: false,
                type: 'text',
                enabled: true
            })
            const getButtonStructure = () => ({
                id: this.generateId(),
                type: 'simple_button',
                label: 'Form your llc Now',
                link: 'https://orders.bizee.com/form-order-now.php?entityType=LLC&entityState=' + this.stateCode,
                target_blank: false,
                custom_size: false,
                custom_alignment: false,
                capitalized: false,
                custom_icon: false,
                variant: 'primary',
                custom_text_align: false
            })
            headerComponents.description_content = groupedHeaderContent.headers.length > 1 ? groupedHeaderContent.text.length > 2 ? getDescriptionStructure(groupedHeaderContent.text[0]) : '' : groupedHeaderContent.text.length > 1 ? getDescriptionStructure(groupedHeaderContent.text[0]) : '';


            if(groupedHeaderContent.headers.length > 1 && groupedHeaderContent.text.length > 2) {
                headerComponents.cta_components.push(getTextStructure(groupedHeaderContent.headers[0].trim()),getButtonStructure(),getTextStructure(groupedHeaderContent.text[1]))
            } else if (groupedHeaderContent.headers.length > 1 && groupedHeaderContent.text.length === 2) {
                headerComponents.cta_components.push(getTextStructure(groupedHeaderContent.headers[0]),getButtonStructure(),getTextStructure(groupedHeaderContent.headers[1]))
            } else {
                headerComponents.cta_components.push(getTextStructure(groupedHeaderContent.headers[0]),getButtonStructure(),getTextStructure(groupedHeaderContent.text[1]))
            }
        }

        if (htmlSections.length > 2) {
            hasIntro = true;
        }

        const cleanListItems = (liItems)=> {
            return liItems.map(section => section.replace(/<li[^>]*>/gis, '').replace(/<\/li>/gis, '').replace(/<div[^>]*>/gis, '').replace(/<\/div>/gis, ''));
        }
        if(hasIntro) {
            const introItems = htmlSections.slice(0, htmlSections.length - 2);
            const tagRegex = /<(h[1-6]|p|ul|ol)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
            let match;
            while ((match = tagRegex.exec(introItems)) !== null) {
                if(match[1] === 'p') {
                    intro.push({
                        type: 'paragraph',
                        attrs: { textAlign: 'left' },
                        content:this.parseParagraphContent(match[3])});
                } else if(match[1] === 'ul' || match[1] === 'ol') {
                    const listItems = match[3].match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
                    intro.push({
                        type: match[1] === 'ul' ? 'bullet_list' : 'ordered_list',
                        content: cleanListItems(listItems).map(item => ({
                            type: 'list_item',
                            content: this.parseParagraphContent(item)
                        }))
                    });
                } else {
                    const pushElement = {
                        type: 'heading',
                        attrs: {
                            textAlign: 'left',
                            level: Number(match[1].slice(1))
                        },
                        content: [{
                            type: 'text',
                            text: match[3]
                        }]
                    };
                    if(match[1].slice(1) == "3"){
                        pushElement.content.marks = [{type: 'bold'}]
                    }
                    intro.push(pushElement);
                }
            }
        }

        intro.forEach((_element) => {
            if(_element.type === 'paragraph') {
                _element.content.push({type: 'hardBreak'},{
                    type: 'hardBreak'
                })
            }
        })

        const cardClasses = [
            "rounded-6", "border-primary-600", "tablet:flex-row", "tablet:items-stretch",
            "mx-auto", "flex", "w-full", "max-w-[800px]", "flex-col", "items-center",
            "overflow-hidden", "border", "bg-white", "shadow-xl"
        ];

        function hasClasses(attrStr, classes) {
            const classMatch = attrStr.match(/class=["']([^"']+)["']/i);
            if (!classMatch) return false;
            const foundClasses = classMatch[1].split(/\s+/);
            return classes.every(c => foundClasses.includes(c));
        }

        function getClosingIndex(str, startIndex, tagName) {
            let depth = 1;
            const re = new RegExp(`<${tagName}\\b[^>]*>|<\\/${tagName}>`, 'gi');
            re.lastIndex = startIndex;
            let m;
            while ((m = re.exec(str)) !== null) {
                if (m[0].startsWith('</')) {
                    depth--;
                } else {
                    depth++;
                }
                if (depth === 0) return re.lastIndex;
            }
            return -1;
        }

        const tagRegex = /<(h[1-6]|p|div|iframe)\b([^>]*)>/gi;
        let match;
        let currentSection = null;
        let titleTag = null;

        while ((match = tagRegex.exec(itemContents)) !== null) {
            const tagName = match[1].toLowerCase();
            const attrs = match[2];
            const startIndex = match.index + match[0].length;

            if (tagName === 'iframe') {
                const srcMatch = attrs.match(/src=["']([^"']+)["']/i);
                if (srcMatch) {
                    const url = srcMatch[1];
                    if (url.includes('wistia') || url.includes('youtube') || url.includes('vimeo')) {
                        if (currentSection) {
                            currentSection.content.push({
                                type: 'video',
                                url: url
                            });
                        }
                    }
                }
                // Skip to end of iframe tag if it has a closing tag, or just continue if self-closing
                const closeIdx = itemContents.toLowerCase().indexOf('</iframe>', startIndex);
                if (closeIdx !== -1) {
                    tagRegex.lastIndex = closeIdx + 9; // +9 for </iframe>
                }
            } else if (tagName === 'div') {
                const isCard = hasClasses(attrs, cardClasses);
                const isListStyle = /liststyledefaulticon/i.test(attrs);
                const looksLikeLink = /^\s*<a\b/i.test(itemContents.substring(startIndex, startIndex + 200));

                if (isCard || isListStyle || looksLikeLink) {
                    const endIndex = getClosingIndex(itemContents, startIndex, 'div');
                    if (endIndex !== -1) {
                        const innerHtml = itemContents.substring(startIndex, endIndex - 6); // -6 for </div>

                        if (currentSection) {
                            if (isCard) {
                                const aMatch = innerHtml.match(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
                                const href = aMatch ? aMatch[1] : null;
                                const btnLabel = aMatch ? aMatch[2].replace(/<[^>]+>/g, '').trim() : null;
                                const text = innerHtml.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, '').replace(/<[^>]+>/g, ' ').trim();

                                currentSection.content.push({
                                    type: 'card',
                                    text: text,
                                    button_label: btnLabel,
                                    href: href
                                });
                                tagRegex.lastIndex = endIndex;
                            } else if (isListStyle) {
                                const innerRegex = /<(span|p|ul|ol|li)\b[^>]*>([\s\S]*?)<\/\1>/gis;
                                let innerMatch;
                                const extractedParts = [];
                                while ((innerMatch = innerRegex.exec(innerHtml)) !== null) {
                                    extractedParts.push(innerMatch[0]);
                                }
                                if (extractedParts.length > 0) {
                                    currentSection.content.push({
                                        type: 'info_card',
                                        text: extractedParts.join(' ')
                                    });
                                }
                                tagRegex.lastIndex = endIndex;
                            } else if (looksLikeLink) {
                                const linkMatch = innerHtml.match(/^\s*<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
                                if (linkMatch) {
                                    const href = linkMatch[1];
                                    const linkType = href.includes('bizee.com') ? 'own' : 'extern';
                                    currentSection.content.push({
                                        type: 'link',
                                        text: linkMatch[2].replace(/<[^>]+>/g, '').trim(),
                                        href: href,
                                        link_type: linkType
                                    });
                                    tagRegex.lastIndex = endIndex;
                                }
                            }
                        }
                    }
                }
            } else {
                const closeIdx = itemContents.toLowerCase().indexOf(`</${tagName}>`, startIndex);
                if (closeIdx !== -1) {
                    const innerText = itemContents.substring(startIndex, closeIdx).trim();
                    tagRegex.lastIndex = closeIdx + tagName.length + 3;
                        if (!currentSection && /^h[2-6]$/.test(tagName)) {
                            currentSection = { title: null, content: [] };
                        }

                        if (currentSection) {
                            if(tagName === 'ul' || tagName === 'ol'){
                                currentSection.content.push({ type: tagName === 'ul' ? 'bullet_list' : 'ordered_list', text: innerText.trim() });
                            } else if (tagName === 'p') {
                                currentSection.content.push({ type: 'paragraph', text: innerText.trim() });
                            } else {
                                if(!titleTag){
                                    titleTag = tagName;
                                }
                                if (tagName === titleTag) {
                                    if (currentSection) sections.push(currentSection);
                                    currentSection = { title: innerText.replace(/<[^>]+>/g, "").trim(), content: [] };
                                } else {
                                    currentSection.content.push({ type: 'subtitle', text: innerText.replace(/<[^>]+>/g, "").trim(), level: 3 });
                                }
                            }
                        }
                }
            }
        }
        if (currentSection) sections.push(currentSection);
        return {sections, intro, headerComponents, metaInfo};

    }

    cleanHTML(html) {
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
    }

    // Recursively clean all string values in an object using cleanHTML
    cleanObjectStrings(obj) {
        if (typeof obj === 'string') {
            return this.cleanHTML(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.cleanObjectStrings(item));
        }
        if (obj && typeof obj === 'object') {
            const cleaned = {};
            for (const [key, value] of Object.entries(obj)) {
                cleaned[key] = this.cleanObjectStrings(value);
            }
            return cleaned;
        }
        return obj;
    }

    async getHTMLContent(path) {
        const url = `${BASE_URL}/${path}`;
        try {
            const html = await this.fetchHTML(url);
            return this.extractContentFromHTML(html);
        } catch (error) {
            console.log(`  ⚠️  No se pudo obtener HTML: ${error.message}`);
            return null;
        }
    }

    generateId() {
        return 'm' + Math.random().toString(36).substring(2, 15);
    }

    transformBlocks(blocks) {

        if (!blocks || !Array.isArray(blocks)) return [];

        const sections = [];
        let currentSection = null;
        let currentItems = [];


        blocks.forEach((block, idx) => {
            currentSection = {
                id: this.generateId()
            };


            if (currentSection) {
                const items = this.transformBlockToItems(block);
                currentItems.push(...items);
            }
        });

        if (currentItems.length > 0 && currentSection) {
            sections.push({
                id: currentSection.id,
                items: currentItems,
                type: 'section',
                enabled: true
            });
        }

        return sections;
    }

    parseParagraphContent(text) {
        if (!text) return [];

        // Split by links, breaks, and lists (ul/ol)
        const parts = text.split(/(<a\b[^>]*>[\s\S]*?<\/a>|<br\s*\/?>|<ul\b[^>]*>[\s\S]*?<\/ul>|<ol\b[^>]*>[\s\S]*?<\/ol>)/gis);

        return parts.map((part, index) => {
            if (!part) return null;

            if (/^<br\s*\/?>$/gis.test(part)) {
                return [{ type: 'hardBreak' }, { type: 'hardBreak' }];
            }

            // Handle Lists
            if (/^<(ul|ol)\b[^>]*>/gis.test(part)) {

                const isOrdered = /^<ol/gis.test(part);
                const listType = isOrdered ? 'orderedList' : 'bulletList';

                const itemRegex = /<li\b[^>]*>([\s\S]*?)<\/li>/gis;
                const listItems = [];
                let match;
                while ((match = itemRegex.exec(part)) !== null) {
                    const liContent = this.parseParagraphContent(match[1]);

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
                    text: `${textContent} ${parts[index + 1] ? ' ' : ''}`,
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
                if (!textContent) return null;

                // Check if next element is a link
                const nextPart = parts[index + 1];
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

    transformBlockToItems(block) {
        const items = [];
        if(block.title){
            items.push({
                id: this.generateId(),
                title: [{
                    type: 'heading',
                    attrs: { textAlign: 'left', level: 2 },
                    content: [{
                        type: 'text',
                        text: block.title
                    }]
                }],
                type: 'title',
                enabled: true
            });
        }

        if(block.content){
            const mergedContent = [];
            block.content.forEach((contentItem, index) => {
                const lastItem = mergedContent[mergedContent.length - 1];
                const mergeableTypes = ['paragraph'];

                const hasListTags = (text) => /<(ul|ol|li)\b[^>]*>/gis.test(text);

                if (lastItem &&
                    lastItem.type === contentItem.type &&
                    mergeableTypes.includes(contentItem.type) &&
                    contentItem.text &&
                    lastItem.text &&
                    !hasListTags(contentItem.text) &&
                    !hasListTags(lastItem.text)) {
                    lastItem.text += '<br>' + contentItem.text;
                } else {
                    mergedContent.push({ ...contentItem });
                }
            });

            mergedContent.forEach((contentItem) => {
                const rules_by_element = {
                    video: {
                        id: this.generateId(),
                        video_url: contentItem.url,
                        type: 'video',
                        enabled: true
                    },
                    subtitle: {
                        id: this.generateId(),
                        type: 'subtitle',
                        enabled: true,
                        subtitle: [{
                            type: 'heading',
                            attrs: {
                                level: contentItem.level,
                                textAlign: 'left'
                            },
                            content: [{
                                type: 'text',
                                text: this.cleanHTML(contentItem.text)
                            }]
                        }]
                    },
                    paragraph: {
                        id: this.generateId(),
                        type: 'paragraph',
                        enabled: true,
                        paragraph: [{
                            type: 'paragraph',
                            attrs: { textAlign: 'left' },
                            content: this.parseParagraphContent(contentItem.text)
                        }]
                    },
                    link:{
                        id: this.generateId(),
                        type: 'link',
                        enabled: true,
                        link_type: contentItem?.link_type?.toString() ?? '',
                        url: contentItem?.href?.toString() ?? '',
                        label: this.cleanHTML(contentItem?.text?.toString() ?? '')
                    },
                    info_card: {
                        id: this.generateId(),
                        type: 'info_card',
                        card_components:[{
                            id: this.generateId(),
                            type: 'paragraph',
                            enabled: true,
                            paragraph: [{
                                type: 'paragraph',
                                attrs: { textAlign: 'left' },
                                content: this.parseParagraphContent(contentItem.text)
                            }]
                        }],
                        enabled: true,
                    },
                    card:{
                        id: this.generateId(),
                        type: 'card',
                        enabled: true,
                        text: [{
                            type: 'paragraph',
                            attrs: { textAlign: 'left' },
                            content: [{
                                type: 'text',
                                marks: [{ type: 'bold' }],
                                text: this.cleanHTML(contentItem?.text?.toString() ?? '')
                            }]
                        }],
                        label: this.cleanHTML(contentItem?.button_label?.toString() ?? ''),
                        link: contentItem?.href?.toString() ?? '',
                        target_blank: false,
                        custom_size: false,
                        custom_alignment: false,
                        capitalized: false,
                        custom_icon: false,
                        variant: "primary",
                        custom_text_align: false,
                        bard_alignment: false,
                        secondary_font: false,
                        custom_font_size: false
                    }
                }[contentItem.type]

                items.push(rules_by_element)
            })
        }

        return items;
    }

    async getMongoDocuments() {
        const slugs = [
            `${this.stateSlug}-llc`,
            `${this.stateSlug}-llc/${this.stateSlug}-business-names`,
            `${this.stateSlug}-llc/registered-agents-${this.stateSlug}-llc`,
            `${this.stateSlug}-llc/fees-filing-requirements`,
            `${this.stateSlug}-llc/business-taxes`,
            `${this.stateSlug}-llc/faq`
        ];

        const documents = {};
        for (const slug of slugs) {
            const doc = await this.collection.findOne({ slug });
            if (doc) {
                documents[slug] = doc;
                console.log(`✅ MongoDB: ${slug}`);
            } else {
                console.log(`❌ MongoDB: No encontrado ${slug}`);
            }
        }

        return documents;
    }

    async getHTMLContents() {
        const paths = [
            `${this.stateSlug}-llc`,
            `${this.stateSlug}-llc/${this.stateSlug}-business-names`,
            `${this.stateSlug}-llc/registered-agents-${this.stateSlug}-llc`,
            `${this.stateSlug}-llc/fees-filing-requirements`,
            `${this.stateSlug}-llc/business-taxes`,
            `${this.stateSlug}-llc/faq`
        ];

        const htmlContents = {};
        for (const pagePath of paths) {
            const content = await this.getHTMLContent(pagePath);
            if (content) {
                htmlContents[pagePath] = content;
            }
            // Pausa para no sobrecargar
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        return htmlContents;
    }

    async generateMainPage(htmlContent) {
        // Enriquecer bloques con contenido HTML si está disponible
        const intro = htmlContent.intro || [];
        const blocks = htmlContent.sections || [];
        const headerComponents = htmlContent.headerComponents || [];
        const metaInfo = htmlContent.metaInfo || {};
        const hero = headerComponents ?? {};

        const sections = this.transformBlocks(blocks);

        const mainFilePath = path.join(BASE_PATH, `${this.stateSlug}.md`);
        let existingId = null;
        if (fs.existsSync(mainFilePath)) {
            const existingContent = fs.readFileSync(mainFilePath, 'utf8');
            const idMatch = existingContent.match(/^id:\s*(.+)$/m);
            if (idMatch) {
                existingId = idMatch[1].trim();
            }
        }

        this.mainPageId = existingId || uuidv4();

        const frontmatter = {
            id: this.mainPageId,
            blueprint: 'guide',
            title: this.stateName,
            include_initial_cta: true,
            no_index: false,
            hide_breadcrumbs: false,
            hide_footer: false,
            hide_on_production: false,
            enabled_scripts: ['fullstory', 'ahrefs'],
            seo_title: 'custom',
            seo_meta_description: 'custom',
            seo_canonical: 'none',
            seo_og_description: 'general',
            seo_og_title: 'title',
            seo_tw_title: 'title',
            seo_tw_description: 'general',
            ...metaInfo,
            ...hero,
            intro,
            sections
        };

        return frontmatter;
    }

    async generateChildPage(mongoDoc, pageType, htmlContent) {
        // Enriquecer bloques con contenido HTML
        const blocks = htmlContent.sections || [];
        const headerComponents = htmlContent.headerComponents || [];
        const metaInfo = htmlContent.metaInfo || {};
        const hero = headerComponents ?? {};
        const sections = this.transformBlocks(blocks);
        const intro = htmlContent.intro || [];

        const genericTitles = {
            'business-names': 'Business Names',
            'registered-agent': 'Registered Agent',
            'filing-fees-requirements': 'Filing Fees & Requirements',
            'business-taxes': 'Business Taxes',
            'faqs': 'FAQs'
        };

        const filename = `${PAGE_TYPE_MAP[pageType]}.${this.stateSlug}.md`;
        const childFilePath = path.join(BASE_PATH, filename);
        let existingId = null;
        if (fs.existsSync(childFilePath)) {
            const existingContent = fs.readFileSync(childFilePath, 'utf8');
            const idMatch = existingContent.match(/^id:\s*(.+)$/m);
            if (idMatch) {
                existingId = idMatch[1].trim();
            }
        }

        const childId = existingId || uuidv4();
        this.childPageIds[pageType] = childId;

        const frontmatter = {
            id: childId,
            blueprint: 'guide',
            intro,
            title: genericTitles[pageType] ?? pageType ?? '',
            include_initial_cta: true,
            no_index: false,
            hide_breadcrumbs: false,
            hide_footer: false,
            hide_on_production: false,
            enabled_scripts: ['fullstory', 'ahrefs'],
            seo_title: 'custom',
            seo_meta_description: 'custom',
            seo_canonical: 'none',
            seo_og_description: 'general',
            seo_og_title: 'title',
            seo_tw_title: 'title',
            seo_tw_description: 'general',
            ...metaInfo,
            ...hero,
            sections
        };

        return frontmatter;
    }

    saveStatamicFile(frontmatter, filename) {
        const filePath = path.join(BASE_PATH, filename);
        const cleaned = this.cleanObjectStrings(frontmatter);
        const yamlContent = yaml.dump(cleaned, {
            lineWidth: -1,
            noRefs: true,
            sortKeys: false,
            quotingType: '"',
            forceQuotes: false
        });
        const content = `---\n${yamlContent}---\n`;
        fs.writeFileSync(filePath, content);
        console.log(`✅ Archivo creado: ${filename}`);
    }

    updateTreeFile() {
        const treeContent = fs.readFileSync(TREE_PATH, 'utf8');
        const treeData = yaml.load(treeContent);

        const mainTree = treeData.tree.find(t => t.entry === '267d09b7-82a4-48b1-bfa1-e1967ebcddd2');

        if (mainTree && this.mainPageId) {
            const existingEntryIndex = mainTree.children.findIndex(
                child => child.entry === this.mainPageId
            );

            // Generar la entrada en formato YAML con guiones
            const childrenEntries = Object.values(this.childPageIds).map(id =>
                `          -\n            entry: ${id}`
            ).join('\n');

            const newEntryYaml = `      -\n        entry: ${this.mainPageId}\n        children:\n${childrenEntries}`;

            if (existingEntryIndex >= 0) {
                // Reemplazar entrada existente manteniendo formato
                const lines = treeContent.split('\n');
                let startLine = -1;
                let endLine = -1;
                let indentLevel = 0;

                // Buscar la entrada existente
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes(`entry: ${this.mainPageId}`) && startLine === -1) {
                        startLine = i;
                        // Contar espacios de indentación
                        indentLevel = lines[i].match(/^(\s*)/)[1].length;
                        continue;
                    }
                    if (startLine !== -1) {
                        const currentIndent = lines[i].match(/^(\s*)/)[1].length;
                        // Si encontramos otra entrada al mismo nivel o superior, terminamos
                        if (lines[i].trim().startsWith('-') && currentIndent <= indentLevel && i > startLine) {
                            endLine = i;
                            break;
                        }
                    }
                }

                if (startLine !== -1 && endLine !== -1) {
                    // Reemplazar solo la sección de Maine
                    const before = lines.slice(0, startLine - 1).join('\n');
                    const after = lines.slice(endLine).join('\n');
                    const updated = `${before}\n${newEntryYaml}\n${after}`;
                    fs.writeFileSync(TREE_PATH, updated);
                    console.log(`✅ Árbol actualizado: ${this.stateName} (entrada existente actualizada)`);
                }
            } else {
                // Agregar nueva entrada antes del último elemento del árbol
                const lines = treeContent.split('\n');
                // Buscar la línea antes del último elemento (e12f30bb...)
                const lastEntryIndex = lines.findIndex(line => line.includes('entry: e12f30bb-70fe-41e6-9c6e-6a0feb550a69'));

                if (lastEntryIndex !== -1) {
                    const before = lines.slice(0, lastEntryIndex - 1).join('\n');
                    const after = lines.slice(lastEntryIndex - 1).join('\n');
                    const updated = `${before}\n${newEntryYaml}\n${after}`;
                    fs.writeFileSync(TREE_PATH, updated);
                    console.log(`✅ Árbol actualizado: ${this.stateName} (nueva entrada agregada)`);
                }
            }
        }
    }

    async migrate() {
        await this.connect();

        console.log(`\n🚀 Iniciando migración híbrida de ${this.stateName} (${this.stateSlug})...\n`);
        console.log(`📊 Número asignado: ${this.stateNumber}\n`);

        // Obtener documentos de MongoDB
        console.log('📦 Obteniendo documentos de MongoDB...\n');
        const mongoDocuments = await this.getMongoDocuments();

        // Obtener contenido HTML
        console.log('\n🌐 Obteniendo contenido HTML de producción...\n');
        const htmlContents = await this.getHTMLContents();

        // Migrar página principal
        if (mongoDocuments[`${this.stateSlug}-llc`]) {
            const mainHtml = htmlContents[`${this.stateSlug}-llc`];
            const frontmatter = await this.generateMainPage(mainHtml);
            this.saveStatamicFile(frontmatter, `${this.stateSlug}.md`);
        }

        // Migrar páginas hijas
        const childPages = [
            { slug: `${this.stateSlug}-llc/${this.stateSlug}-business-names`, htmlPath: `${this.stateSlug}-llc/${this.stateSlug}-business-names`, type: 'business-names' },
            { slug: `${this.stateSlug}-llc/registered-agents-${this.stateSlug}-llc`, htmlPath: `${this.stateSlug}-llc/registered-agents-${this.stateSlug}-llc`, type: 'registered-agent' },
            { slug: `${this.stateSlug}-llc/fees-filing-requirements`, htmlPath: `${this.stateSlug}-llc/fees-filing-requirements`, type: 'filing-fees-requirements' },
            { slug: `${this.stateSlug}-llc/business-taxes`, htmlPath: `${this.stateSlug}-llc/business-taxes`, type: 'business-taxes' },
            { slug: `${this.stateSlug}-llc/faq`, htmlPath: `${this.stateSlug}-llc/faq`, type: 'faqs' }
        ];

        for (const page of childPages) {
            if (mongoDocuments[page.slug]) {
                const childDoc = mongoDocuments[page.slug];
                const childHtml = htmlContents[page.htmlPath];
                const frontmatter = await this.generateChildPage(childDoc, page.type, childHtml);
                const filename = `${PAGE_TYPE_MAP[page.type]}.${this.stateSlug}.md`;
                this.saveStatamicFile(frontmatter, filename);
            }
        }

        // Actualizar árbol
        this.updateTreeFile();

        await this.disconnect();
        console.log(`\n✅ Migración híbrida de ${this.stateName} finalizada!\n`);
    }
}

// Ejecutar migración
async function main() {
    const stateSlug = process.argv[2] || 'maine';
    const stateNumber = parseInt(process.argv[3]) || 20;

    const migrator = new LlcGuide(stateSlug, stateNumber);

    try {
        await migrator.migrate();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { LlcGuide };
