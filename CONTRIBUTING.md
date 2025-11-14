# Contributing

Thanks for your interest in making Emergency Map better! This guide explains how to get a development environment running and how to submit changes.

## Prerequisites
- Node.js 20 or newer
- npm 10+

## Setup
1. Fork and clone the repository.
2. Copy `.env.example` to `.env` and provide valid API tokens.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Quality checks
- **Linting:** `npm run lint`
- **Auto-fix basic lint issues:** `npm run lint:fix`

Please keep pull requests focused on a single change set and include context in the description. If your change impacts the map UI or data fetching, mention any manual validation you performed.

## Commit messages
Use clear, present-tense messages (e.g., `Add heartbeat watchdog hook`).

## Code of Conduct
Be respectful and constructive. Report unacceptable behavior through the repository maintainers.
