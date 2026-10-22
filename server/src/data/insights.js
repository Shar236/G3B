// Keep crawler-rendered metadata and body copy identical to the React source.
// The monorepo deploys the client and server together, so one canonical dataset
// prevents stale SEO fallbacks when editorial copy changes.
export { insights as default, insights } from '../../../client/src/data/insights.js';
