# State Guide Migrator

A hybrid migration tool that combines MongoDB data with HTML content scraping to migrate state guides from PayloadCMS to Statamic CMS format.

## Overview

This project provides automated migration scripts that:
- Extract structured data from MongoDB (PayloadCMS database)
- Scrape and parse HTML content from production websites
- Transform and enrich content into Statamic-compatible YAML format
- Generate state guide pages with proper hierarchical structure
- Update navigation trees while preserving formatting

## Features

- **Dual-source data enrichment**: Combines MongoDB structured data with live HTML content
- **Smart HTML parsing**: Extracts sections, headers, lists, links, videos, and special components
- **Content transformation**: Converts HTML structures to Statamic's format (Bard editor compatible)
- **ID preservation**: Reuses existing UUIDs when updating files to maintain references
- **Tree management**: Updates navigation trees with proper YAML formatting
- **State code mapping**: Handles all 50 US states with proper slug-to-code conversion
- **Two guide types**: Support for both LLC guides and Corporation guides

## Installation

1. Clone this repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the project root with your MongoDB connection string:
```env
MONGODB_URI=your_mongodb_connection_string_here
```

**Note**: Never commit the `.env` file. It's already included in `.gitignore`.

## Usage

### LLC Guide Migration

```bash
node llc-guide.js {state-slug} {state-number}
```

Example:
```bash
node llc-guide.js maine 20
```

### Corporation Guide Migration

```bash
node migrate-state-hybrid.js {state-slug} {state-number}
```

Example:
```bash
node migrate-state-hybrid.js texas 44
```

### Parameters

- `{state-slug}`: State name in lowercase with hyphens (e.g., `maine`, `new-york`, `california`)
- `{state-number}`: Optional numeric identifier for the state

## How It Works

### 1. Data Collection Phase

**MongoDB Extraction:**
- Connects to PayloadCMS MongoDB database
- Retrieves state guide documents by slug patterns
- Extracts structured metadata and content blocks

**HTML Scraping:**
- Fetches live pages from `https://bizee.com`
- Parses HTML structure using regex patterns
- Identifies sections, headers, content blocks, and components

### 2. Content Transformation

**HTML Parsing:**
- Extracts hero sections with titles, descriptions, and CTAs
- Identifies main content sections by heading tags
- Parses lists (ordered and unordered)
- Extracts embedded videos (YouTube, Vimeo, Wistia)
- Identifies special components (cards, info cards, links)
- Cleans HTML entities and formatting

**Content Enrichment:**
- Merges MongoDB data with HTML content
- Generates unique component IDs
- Structures content for Statamic's Bard editor
- Preserves formatting and hierarchy
- Handles special characters and HTML entities

### 3. File Generation

**Main Page:**
- `{state}.md` - Primary state guide page

**Child Pages:**
- `business-names.{state}.md` - Business naming guidelines
- `registered-agent.{state}.md` - Registered agent information
- `filing-fees-requirements.{state}.md` - Filing fees and requirements
- `business-taxes.{state}.md` - State tax information
- `faqs.{state}.md` - Frequently asked questions (LLC only)

### 4. Tree Structure Update

Updates the navigation tree in `guides.yaml` with:
- Parent-child relationships
- Proper YAML indentation
- Entry IDs for routing
- Preserves existing tree formatting

## Project Structure

```
migrator/
├── llc-guide.js                 # LLC guide migration script
├── migrate-state-hybrid.js      # Corporation guide migration script
├── test_*.js                    # Testing utilities
├── reproduce_search.js          # Search reproduction tool
├── package.json                 # Dependencies
├── .env                         # Environment configuration (create this)
├── .gitignore                   # Git ignore rules
├── QUICK_START.md              # Quick reference guide
├── SETUP.md                     # Setup instructions
└── README.md                    # This file
```

## Output Format

Generated files use Statamic's frontmatter format:

```yaml
---
id: unique-uuid
blueprint: guide
title: State Name
include_initial_cta: true
no_index: false
seo_custom_meta_title: "..."
seo_custom_meta_description: "..."
title_content: "..."
description_content: [...]
cta_components: [...]
intro: [...]
sections:
  - id: section-id
    type: section
    enabled: true
    items:
      - id: item-id
        type: title
        title: [...]
      - id: item-id
        type: paragraph
        paragraph: [...]
---
```

## Content Types Supported

- **Text blocks**: Paragraphs with inline formatting
- **Headings**: H1-H6 with proper hierarchy
- **Lists**: Ordered and unordered lists
- **Links**: Internal and external links
- **Videos**: Embedded videos from multiple platforms
- **Cards**: Call-to-action cards with buttons
- **Info cards**: Highlighted information blocks
- **Subtitles**: Section subheadings

## State Code Mapping

The scripts automatically map state slugs to two-letter state codes:

```javascript
'alabama' → 'AL'
'california' → 'CA'
'new-york' → 'NY'
// ... all 50 states
```

## Requirements

- Node.js (v14 or higher recommended)
- MongoDB access (connection URI required)
- Network access to `https://bizee.com` for HTML fetching

## Dependencies

- `mongodb`: MongoDB driver for data extraction
- `js-yaml`: YAML parsing and generation
- `uuid`: UUID generation for unique identifiers
- Native `https`/`http`: For HTML fetching
- Native `fs`/`path`: For file operations

## Verification

After running a migration, verify the results:

```bash
# Check generated files
ls -la content/collections/guides/{state}*.md
ls -la content/collections/guides/*.{state}.md

# Review tree changes
git diff content/trees/collections/guides.yaml

# Validate YAML syntax
node -e "require('js-yaml').load(require('fs').readFileSync('content/collections/guides/{state}.md', 'utf8'))"
```

## Troubleshooting

### MongoDB Connection Issues
- Verify `MONGODB_URI` in `.env` file
- Check network connectivity
- Ensure IP whitelist in MongoDB Atlas (if applicable)
- Verify database credentials

### Missing HTML Content
- Check that URLs exist at `https://bizee.com/{state-slug}-llc` or `{state-slug}-corporation`
- Verify network connectivity
- Check for rate limiting (script includes 500ms delays between requests)

### File Generation Errors
- Ensure target directories exist
- Check file permissions
- Verify YAML syntax in generated files
- Check for special characters that need escaping

### Module Not Found
```bash
# Reinstall dependencies
npm install mongodb js-yaml uuid
```

## Best Practices

1. **Backup before migration**: Always backup existing files before running migrations
2. **Test with one state**: Verify output with a single state before batch processing
3. **Review diffs**: Check git diffs to ensure changes are correct
4. **Validate YAML**: Ensure generated YAML is valid and properly formatted
5. **Check IDs**: Verify that UUIDs are preserved for existing pages
6. **Environment security**: Never commit `.env` file with credentials

## License

ISC

## Keywords

migration, statamic, mongodb, payloadcms, cms, content-migration, yaml, state-guides
