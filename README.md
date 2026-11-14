# ReturnReady Utah

A skills-first return-to-work companion for parents and caregivers, built for Hack for Humanity SLC. Turn life experience into an editable skills profile, explore flexible opportunities, and build a practical return plan.

**Backend:** Python with Flask. **Frontend:** HTML, JavaScript, and CSS. No Node.js or frontend build step is required.

The original product vision is in [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md).

## Project structure

```text
app.py                         # Flask application and HTTP routes
app_config.py                  # Server configuration and .env loading
functions/
  __init__.py
  func1.py                     # Catalog, skills, matching, child care calculator
  func2.py                     # Server-only Gemini integration
  resume.py                    # In-memory resume text extraction
static/
  html/index.html              # Application shell
  css/style.css                # Responsive styling
  js/app.js                    # Browser interactions and API calls
  js/discovery.js              # Shared filtering, matching, and deck state
  js/intake.js                 # Information collection and review rules
  favicon.svg
data/
  catalog.json                 # Sample opportunities and learning resources
  utah_childcare_table4_oct2026.json
tests/
  test_app.py
  test_discovery.cjs
requirements.txt
.env.example
.gitignore
```

## Run locally

Requires Python 3.10+.

```sh
git clone https://github.com/Dan-Powell-Git/HackaThonRepo.git
cd HackaThonRepo
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
# Set GEMINI_API_KEY in .env; never commit this file.
python app.py
```

On Windows, activate with `.venv\Scripts\activate` and use `copy .env.example .env`.

Open **http://127.0.0.1:5000/**. If port 5000 is busy, run:

```sh
python -m flask --app app run --port 5001
```

`GEMINI_MODEL` defaults to `gemini-2.5-flash`. The app works with guided questions and local skill/draft suggestions when Gemini is unavailable. A valid replacement API key is still needed to verify live Gemini coaching; the previously supplied key failed its earlier live test.

For deployment, use a Python-capable host and a production WSGI server pointing to `app:app`. Set environment variables through the host. Flask's built-in server is for local development. The previous JavaScript Worker/Sites setup has been removed.

## API routes

| Route | Purpose |
|---|---|
| `GET /` | Serve the HTML interface |
| `GET /api/catalog` | Return the catalog, learning resources, and fictional demo story |
| `POST /api/resume` | Extract PDF, DOCX, or text resume and suggest skills |
| `POST /api/skills` | Suggest skills with exact evidence quotes from story text |
| `POST /api/coach` | Gemini conversation, skill extraction, or resume/gap draft |
| `POST /api/calculate` | Deterministic household and sample-job comparison |

## Combined design

Cecilia's **Return & Rise** prototype contributes the focused card deck, program metadata, benefits chips, saved-list clear action, and optional dark green theme. ReturnReady keeps its skills profile, Gemini coaching, and household-aware return plan. Switch between **Cards** and **List** views, or use the header's theme button. On a card, swipe right to save or left to pass; buttons and keyboard shortcuts remain available. Restart restores passed cards while preserving saved matches. Clear saved returns those cards to discovery and removes their save history safely.

The integration reimplements the prototype's interactions in the Flask frontend, correcting its broken JavaScript template strings and keeping all controls compatible with the app's content security policy. Cecilia's original `html_cecilia` file is unchanged locally.

## Information-first flow

1. **Share your information:** choose a resume upload or a guided conversation. The chat only collects background and identifies skills; it does not offer job suggestions or general career advice.
2. **Review skills:** every suggestion includes a quote from the resume or the user's own chat messages. Rename, remove, or add skills, then explicitly confirm the profile.
3. **Explore matches:** the opportunity deck becomes available after profile confirmation. Resume writing remains a separate part of the return planner.

The conversation asks about paid work and tasks, volunteering, caregiving and other unpaid experience, classes/training, education, and tools. It extracts skills as the conversation progresses. Users can skip topics or finish and review at any point. When Gemini is unavailable, clearly labeled guided questions and local skill suggestions keep the flow usable.

Uploads accept PDF, DOCX, TXT, and Markdown (2 MB maximum; 15-page PDF limit; 25,000 extracted characters). Scanned PDFs require a readable text or Word version. Uploads are handled in memory and never saved. Resume skill extraction attempts Gemini and falls back to local suggestions.

## Current features

- Three-column desktop layout and mobile section tabs.
- Information-only profile chat, with one question at a time and evidence-backed skill extraction. Guided fallback is clearly labeled when AI is unavailable.
- Evidence-backed skill extraction with review, renaming, removal, and additions.
- Resume import from PDF, Word (.docx), TXT, and Markdown; review skills before matching.
- Explainable skill match: confirmed required skills / total required skills.
- Keyword, industry, work-style, and opportunity-type filters derived from the catalog.
- One-card discovery with swipe gestures, progress, and Cards/List views.
- Light theme and optional dark green theme; preferences last for the browser session.
- Program duration, career-break requirement, compensation, benefits, and official links.
- Pass, Save Match, Undo; Left/Right/U shortcuts outside form controls.
- Saved opportunities and editable resume/gap drafts. Local drafts are explicitly labeled when Gemini is unavailable.
- Suggested six-week refresher plans with free learning-resource links. The schedule is a suggested pace, not a claim about course duration.
- Side-by-side financial comparisons for sample jobs and a printable return plan.
- English interface with partial Spanish translation of navigation and core discovery copy.
- Browser-session persistence and a clear-session control.

## Data and estimates

The catalog separates fictional sample jobs from real program information. Sample job titles and pay are **fictional**, not open job offers. Real programs have official source links, check dates, and explicit availability notes. No salary or skill requirements are invented for real programs; their financial estimates and skill scores remain unavailable until role-specific data is provided.

Sources checked November 14, 2026:

| Provider | Confirmed information and limits |
|---|---|
| [Tech-Moms](https://www.tech-moms.org/) | Learning program; enrollment and costs must be confirmed. |
| [Goldman Sachs](https://www.goldmansachs.com/careers/programs-for-professionals/returnship) | Paid 12-week full-time returnship; 2+ year break and 3+ years prior experience. Salt Lake City appears among program locations, with division-dependent availability. Application status unconfirmed. |
| [IBM](https://www.ibm.com/careers/blog/return-to-the-workforce-with-the-ibm-tech-re-entry-program) | Paid full-time technical returnship for a 1+ year break. Current openings, duration, work style, and Utah availability must be confirmed. |
| [Deloitte Encore](https://www.deloitte.com/us/en/careers/join-deloitte/return-to-work.html) | Return-to-work program for a 6+ month employment break, with mentoring and coaching. The program page invites applications; confirm individual openings, pay, and location. |
| [Path Forward](https://pathforward.org/returnships/) | Returnship directory, not a specific employer or job offer; requirements and pay vary by employer. |

Unconfirmed Fidelity and Zions program names, HubSpot's proposed US/remote terms, and Amazon's redirected returnship URL from the prototype are not imported as verified opportunities. Confirm current terms with every provider before applying.

The Python calculator encodes [Utah DWS Table 4, effective October 1, 2026](https://jobs.utah.gov/occ/provider/table1026.pdf), household sizes 2–8, income groups 1–10. New-application income limit: Group 6. Review income limit: Group 10. Other eligibility conditions are not evaluated.

Monthly job gross = hourly pay × hours/week × 52 / 12. Household gross adds entered other income. Estimated net monthly gain = job gross × (1 − tax assumption) − estimated child care − commute. The default tax assumption is 20% and can be edited. Co-payment estimates assume the subsidy covers the remaining provider cost. Maximum subsidy rates, provider charges above the subsidy, special-needs rules, work-hour requirements, and household sizes outside 2–8 are not modeled. This is not a benefits decision.

Gemini does not calculate benefits or generate listing facts.

## Privacy and secrets

Stories, skills, saved cards, and passed cards are kept in this browser's `sessionStorage`. “Clear my session” removes local session data. Stories are processed by the Flask backend for skill suggestions and coaching, but the application does not save them to disk or a database. AI coaching sends story text and confirmed skills to Google Gemini; Google's processing policies apply. Local skill suggestions and the demo do not send data to Gemini. Do not enter sensitive personal information.

The server reads the key from `.env` or environment variables. `.env` is ignored by Git; `.env.example` contains only a placeholder. Keys are not sent to the frontend. POST routes validate JSON and request origin, responses include a content security policy, and API responses are marked `no-store`.

## Validation

```sh
python -m unittest discover -s tests -v
# Optional JavaScript syntax check, if Node.js is installed:
node --check static/js/app.js
node --test tests/test_discovery.cjs tests/test_intake.cjs
```

Python tests cover official calculator examples, entry/review boundaries across household sizes, invalid inputs, source-backed skills, monthly gains, static assets, API validation, secret-file exclusion, and mocked Gemini responses. JavaScript tests cover intake gating, exclusion of assistant text from evidence, guided-question progression, and deck progression, filter changes, Undo, restart/clear behavior, and unknown role requirements. Visual browser QA remains unverified because browser access was unavailable in the authoring session. Live Gemini operation requires a valid replacement key.

## Deferred

OCR for scanned resumes; live job feeds; feedback-driven reranking; full Spanish translation; cross-session saved plans; maximum subsidy rate modeling. Employer ranking is outside this caregiver-focused MVP.

MIT. Built for Hack for Humanity SLC, November 14, 2026.

Profile chat uses `action: "chat"`, a `messages` array of `{role: "user" | "assistant", content: "..."}`, and a separate user-provided `story`. It returns `{reply, skills, complete}`. Skills are validated against exact quotes from the story and user messages; assistant replies cannot be evidence. The chat receives no opportunity catalog. Conversation state stays in browser session storage and is sent to Gemini per coaching request. Uploaded resume text is processed on the Flask server and sent to Gemini for skill extraction when available.

The homepage’s **Your information** controls open a background editor with automatic browser-session saving, chat access, skill/saved-item counts, and deletion controls. Chat messages have Edit/Delete actions. Editing returns the revised message to the composer and removes subsequent turns; send it to request a new response. Deleting also removes subsequent turns so stale replies are not reused. Removed background/chat evidence invalidates affected skills and resume drafts.
