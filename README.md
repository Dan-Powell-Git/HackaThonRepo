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
static/
  html/index.html              # Application shell
  css/style.css                # Responsive styling
  js/app.js                    # Browser interactions and API calls
  favicon.svg
data/
  catalog.json                 # Sample opportunities and learning resources
  utah_childcare_table4_oct2026.json
tests/
  test_app.py
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
| `POST /api/skills` | Suggest skills with exact evidence quotes from story text |
| `POST /api/coach` | Gemini interview, skill extraction, or resume/gap draft |
| `POST /api/calculate` | Deterministic household and sample-job comparison |

## Current features

- Three-column desktop layout and mobile section tabs.
- Three-step interview with Gemini follow-up questions when configured; guided questions when unavailable.
- Evidence-backed skill extraction with review, renaming, removal, and additions.
- Plain-text resume import (`.txt` or `.md`, up to 100 KB and 25,000 total story characters).
- Explainable skill match: confirmed required skills / total required skills.
- Keyword, industry, work-style, and opportunity-type filters.
- Pass, Save Match, Undo; Left/Right/U shortcuts outside form controls.
- Saved opportunities and editable resume/gap drafts. Local drafts are explicitly labeled when Gemini is unavailable.
- Suggested six-week refresher plans with free learning-resource links. The schedule is a suggested pace, not a claim about course duration.
- Side-by-side financial comparisons for sample jobs and a printable return plan.
- English interface with partial Spanish translation of navigation and core discovery copy.
- Browser-session persistence and a clear-session control.

## Data and estimates

All job listings and their pay are **fictional samples**, not open job offers. The Tech-Moms card links to its [official website](https://www.tech-moms.org/); source checked November 14, 2026, enrollment status unknown. Confirm current tuition, schedules, eligibility, and availability with the provider.

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
```

The 11 Python tests cover official calculator examples, entry/review boundaries across household sizes, invalid inputs, source-backed skills, monthly gains, static assets, API validation, secret-file exclusion, and mocked Gemini responses. Visual browser QA remains unverified because browser access was unavailable in the authoring session. Live Gemini operation requires a valid replacement key.

## Deferred

PDF/Word resume extraction; live job feeds; feedback-driven reranking; full Spanish translation; cross-session saved plans; maximum subsidy rate modeling. Employer ranking is outside this caregiver-focused MVP.

MIT. Built for Hack for Humanity SLC, November 14, 2026.
