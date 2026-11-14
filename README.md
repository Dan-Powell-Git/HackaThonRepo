# ReturnReady Utah

A skills-first return-to-work companion for parents and caregivers, built for Hack for Humanity SLC. Turn your experience into an editable skills profile, explore flexible opportunities, and build a practical return plan.

The original product vision is preserved in [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).

## Run locally

Requires Node.js 22.13+ and npm.

```sh
npm install
cp .env.example .dev.vars
# Set GEMINI_API_KEY in .dev.vars; never commit it.
npm run dev
```

Open the Local URL printed by the server (usually http://127.0.0.1:5173).

The app uses React, TypeScript, Vinext/Vite, and a Cloudflare Worker. Gemini calls run on the server at `/api/coach`; keys never enter the browser bundle. For hosted use, configure `GEMINI_API_KEY` and optionally `GEMINI_MODEL` as Sites runtime secrets. Default model: `gemini-2.5-flash`.

## Current features

- Three-column desktop layout and mobile section tabs.
- Three-step interview with Gemini follow-up questions when configured; guided questions when unavailable.
- Skill extraction with exact evidence quotes, review, renaming, removal, and additions.
- Plain-text resume import (`.txt` or `.md`, up to 100 KB). PDF and Word extraction are deferred.
- Explainable skill match: confirmed required skills / total required skills. No opaque candidate ranking.
- Keyword, industry, work-style, and opportunity-type filters.
- Pass, Save Match, Undo; Left/Right/U shortcuts outside form controls.
- Saved opportunities and editable resume/gap drafts. If Gemini is unavailable, drafts use clearly disclosed local templates.
- Suggested six-week refresher plans with free learning-resource links. The schedule is a suggested pace, not a claim about course duration.
- Side-by-side sample job financial comparisons and a printable return plan.
- English interface with a partial Spanish translation of navigation and core discovery copy. Full Spanish localization is deferred.
- Session-only browser persistence and a clear-session control.

## Data and estimates

All job listings and their pay are **fictional sample listings**. They are not open job offers. The Tech-Moms card links to its [official website](https://www.tech-moms.org/); source checked November 14, 2026, enrollment status unknown. Confirm current tuition, schedules, eligibility, and availability with the provider.

The calculator encodes [Utah DWS Table 4, effective October 1, 2026](https://jobs.utah.gov/occ/provider/table1026.pdf), household sizes 2–8, income groups 1–10. New-application income limit: Group 6. Review income limit: Group 10. Other eligibility conditions are not evaluated.

Monthly job gross = hourly pay × hours/week × 52 / 12. Household gross adds the entered other income. Estimated net monthly gain = job gross × (1 − tax assumption) − estimated child care − commute. The default tax assumption is 20% and can be edited. Co-payment estimates assume the subsidy covers the rest of the entered provider cost. Maximum subsidy rates, provider charges above the subsidy, special-needs rules, work-hour requirements, and household sizes outside 2–8 are not modeled. This is not a benefits decision.

Core logic and the sample catalog are in `lib/returnready.ts`. Gemini does not calculate benefits or generate listing facts.

## Privacy

Stories, confirmed skills, saved cards, and passed cards are stored in this browser's `sessionStorage`. “Clear my session” removes them. The application does not persist stories on its server. Using AI coaching sends story text and confirmed skills to Google Gemini; Google's processing policies apply. Resume import and the fictional demo use local suggestions until you invoke AI coaching. Do not enter sensitive personal information.

## Validation

```sh
node --test tests/core.test.mjs
npx tsc --noEmit
npm run build
```

Tests cover the README's official co-payment examples, entry/review boundaries for all modeled household sizes, source-backed skill suggestions, explainable matching, and API validation. Browser visual QA was unavailable in the authoring session. Gemini integration is implemented, but the supplied key did not pass the live test; a valid replacement key is required for AI coaching.

## Deferred

PDF/Word resume extraction; live job feeds; feedback-driven reranking; full Spanish translation; cross-session saved plans; maximum subsidy rate modeling; verified live Gemini operation with a replacement key. Employer ranking is outside this caregiver-focused MVP.

MIT. Built for Hack for Humanity SLC, November 14, 2026.
