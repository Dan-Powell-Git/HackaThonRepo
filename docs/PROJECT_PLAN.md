# ReturnReady Utah

**Turn time away into skills employers recognize, find work that fits your family's schedule, and see whether the job will actually pay.**

Built at **Hack for Humanity SLC** (AI Collective × Neumont University, November 14, 2026), for **Track 1: Return-to-Work Assistant for Parents and Caregivers**. Entered for **Best Use of the Google Gemini API**.

| | |
|---|---|
| **Live app** | [ADD judge-accessible URL; test it in a private browser window] |
| **Demo video (≤ 3 min)** | [ADD link] |
| **Source code** | [HackaThonRepo](https://github.com/Dan-Powell-Git/HackaThonRepo) |
| **Team** | [ADD names] |

> **Before publishing:** fill in every `[ADD …]`, update the **Feature status** table to match the submitted build, and delete this note. Don't describe anything as working unless it was tested live.

---

## Project scope

ReturnReady builds on the team's original **Skills-Based Returnship Program** hackathon plan: help parents, caregivers, and other people returning from a career break make their skills visible, match with returnship opportunities, and close skill gaps with a personalized learning plan. Break-time experience can include caregiving, volunteering, freelancing, and courses. The Utah focus adds local opportunities and a proposed child care cost estimate.

This README describes the proposed experience and implementation plan. The repository currently contains planning documentation; feature status, architecture, and run instructions must be confirmed against the app before submission.

## The problem

Utah has one of the highest birth rates in the U.S., and many Utah women and caregivers step out of paid work to raise children or care for aging or disabled family members. Coming back is hard:

- **The resume shows a gap.** Applicant-screening software often filters out non-traditional histories.
- **Real skills go unseen.** Running a PTA fundraiser, managing a household budget, or coordinating a parent's care never shows up as "experience."
- **Jobs don't fit school hours.**
- **Child care can eat the paycheck.** On **October 1, 2026, Utah lowered the income limit for new child care assistance applicants**, so families can't easily tell whether going back to work will leave them better off.

## Planned ReturnReady experience

1. **Tell us what you've done.** A short Gemini-guided chat asks one question at a time about past work, the career break, what you did during it (caregiving, volunteering, PTA, family business, courses), interests, location, and the schedule you need. You can also upload a resume. No account required.
2. **Review your skills.** Gemini turns your answers into transferable skills employers search for, such as *Event Planning, Budgeting, Fundraising, Leadership*. **Each skill is tied to the example you gave**, and you can edit, remove, or add skills before anything else happens.
3. **Browse opportunities that fit.** Cards for Utah returnships, learning programs, and flexible jobs (part-time, remote, hybrid, school-hours). Each card shows the provider, program type, location or remote eligibility, work style, a **match score with "skills you have / skills to build,"** why it fits, and an official source link when one has been verified. You can search by keyword and filter by industry or work style.
4. **Build a shortlist.** Use **Pass**, **Save Match**, and **Undo** on each card. Saved programs collect in their own column.
5. **Get your plan.** For each saved option:
   - A **skills-based resume summary** and a confident, honest **one- to two-sentence explanation of your career break**.
   - A **4–8 week refresher plan**: the shortest course that closes each skill gap, with cost and length.
   - **"Does it pay?"**: whether your family likely qualifies for Utah child care assistance, the estimated monthly co-payment, and whether you'd come out ahead or behind each month, shown side by side for every saved job.
6. **Take it with you.** A printable "My return plan" page.

### Layout and controls

On desktop the screen has three columns: **skills and interests** on the left, **opportunity cards** in the center, and **saved programs** on the right. On phones each section is a tab you can reach by touch. Every action has a visible button, and keyboard shortcuts are there for speed:

| Action | Button | Shortcut (while browsing cards) |
|---|---|---|
| Pass | **Pass** | ← Left Arrow |
| Save to shortlist | **Save Match** | → Right Arrow |
| Undo last card action | **Undo** | U |

Shortcuts turn off while you're typing in a text field.

## Feature status

*Update this table right before submitting. Judges reward honesty.*

| Feature | Status |
|---|---|
| Gemini guided interview | [Working / In progress / Deferred] |
| Resume upload and text extraction | [ ] |
| Skill extraction with evidence quotes, editable | [ ] |
| Opportunity cards with match score | [ ] |
| Keyword search and industry/work-style filters | [ ] |
| Pass / Save Match / Undo and shortcuts | [ ] |
| Feedback that re-ranks later cards | [ ] (don't claim it unless verified live) |
| Resume summary and gap explanation | [ ] |
| Refresher course plan | [ ] |
| "Does it pay?" child care calculator | [ ] |
| English/Español interface toggle | [ ] |
| Printable return plan | [ ] |

## How the Gemini API is used

| Step | What Gemini does |
|---|---|
| Interview | Asks adaptive follow-up questions, one at a time |
| Skill extraction | Returns structured JSON (`skill`, `category`, `evidence`), with each evidence field quoting the user's own words, using O*NET-style skill names |
| Matching | Maps near-synonyms (e.g., "kept our family budget" → *Budgeting*) to catalog skill tags; the score on each card stays explainable |
| Resume summary and gap explanation | Written only from skills the user has confirmed |
| Refresher plan | Picks from our curated course list for each missing skill |

**What Gemini does *not* do:**
- **Child care eligibility math.** It's deterministic code that reads the official state table, so results match state rules exactly. An LLM can misread a table, and that's not acceptable for a benefit estimate.
- **Program facts and links.** These come only from the catalog, never generated by the model.

**Why AI, and what simpler options we considered:** A keyword form can't turn messy, real-life experience ("I coordinated carpools and meals for 12 families while my mom was recovering from surgery") into employer language, and it can't write an honest gap explanation. That translation is the core problem, and it's what language models are good at. Everything that has to be exact stays in code.

## How the "Does it pay?" estimate works

1. **Household monthly gross income** = other household income + this job's gross pay.
2. Look up the household size in **Utah DWS Table 4: Child Care Income Eligibility and Co-Payment, effective October 1, 2026**, and find the Income Group.
3. **New applicants qualify at or below Income Group 6** (the entry limit). Families already receiving assistance stay eligible up to Group 10 at review.
4. **If eligible:** the family pays the monthly co-payment for its group and number of children in care.
   **If not eligible:** the family pays the full child care cost.
5. **Estimated take-home pay** ≈ 80% of gross. This is a labeled assumption, and actual withholding varies.
6. **Net monthly gain** = take-home − family child care cost − commute.

**Test cases** (household of 4, 2 children in care; values from the official table):

| Monthly household income | Income Group | New applicant eligible? | Monthly co-payment |
|---|---|---|---|
| $4,000 | 4 | Yes | $121 |
| $5,100 | 6 | Yes (at entry limit) | $199 |
| $6,000 | 8 | No | Pays full cost |

Every result shows the message *"Estimate only. Utah Department of Workforce Services makes the final decision."* along with a link to [jobs.utah.gov](https://jobs.utah.gov).

## Program catalog and data sources

The catalog starts with Utah and Salt Lake City–area programs, then adds national remote programs open to Utah residents. **Each real entry links to an official source, shows the date it was checked, and says "status unknown" when we couldn't confirm it's open.** Made-up entries carry a **Sample listing** badge.

| Source | Used for | License / status |
|---|---|---|
| Utah DWS Office of Child Care, *Table 4: Child Care Income Eligibility and Co-Payment*, effective October 1, 2026 ([PDF](https://jobs.utah.gov/occ/provider/table1026.pdf)) | Eligibility and co-payment (household sizes 2–8 encoded) | Public government data |
| Tech-Moms ([tech-moms.org](https://www.tech-moms.org/)) | Learning pathway card | Public program information |
| Return Utah, Learn & Work in Utah, ARUP Laboratories returnship, Elavare | Program cards | Public program information. [ADD official URLs, open/closed status, date checked] |
| Leads from team research: Goldman Sachs (SLC), Fidelity Investments (Utah), Zions Bancorporation | Program cards *only if verified* | [ADD verification or remove] |
| O*NET ([onetcenter.org](https://www.onetcenter.org/database.html)) | Skill-name guidance | CC BY 4.0 [CONFIRM whether data was imported or only used for naming] |
| **Synthetic data** | Sample job listings, demo persona, example child care cost, 20% tax assumption | Created by the team for the demo |

The UI design takes inspiration from the card-browsing layout of a Spanish-language scholarship site, [ADD correct URL].

## Try it: demo scenario

Use this **fictional** caregiver:

> "I spent six years at home with my kids and caring for my mom. I organized our school's PTA fundraiser and managed its budget. Before that I was an office coordinator. I live near Salt Lake City, have two kids who'd need child care, and need a hybrid or remote job that fits school hours."

1. Complete the interview. **Check:** each suggested skill cites the example it came from.
2. Edit one skill.
3. Search "Utah" and filter **Remote** or **Hybrid**.
4. **Save Match** one card, **Pass** another, then **Undo** the pass.
5. Open a saved card and review the resume summary, refresher plan, and "Does it pay?" result.

## Hackathon build plan

Prioritize the original MVP: profile and experience input, structured skill extraction, explainable returnship matching, and a skill-gap learning roadmap with free course suggestions over 4–8 weeks. Add the Utah-specific features as time allows.

### Suggested stack

These are options from the original plan, pending the team's implementation choice:

| Layer | Options |
|---|---|
| Frontend | React or Next.js; plain HTML for a smaller prototype |
| Backend | Python with FastAPI, or Node.js |
| AI | Gemini API for skill extraction and plan generation |
| Data | JSON or SQLite with clearly labeled sample returnship listings |

### Suggested 24–48 hour timeline

| Time | Focus |
|---|---|
| Hours 0–3 | Agree on the problem, target user, main programming language, and demo story |
| Hours 3–10 | Build skill extraction and matching |
| Hours 10–18 | Build the interface and learning plan |
| Hours 18–22 | Polish the experience, sample data, and demo flow |
| Remaining time | Prepare a three-minute pitch covering the problem, demo, and impact |

**Pitch angle:** Career breaks can hide valuable skills from a traditional CV. ReturnReady makes those skills visible and connects returners to opportunities and a practical learning path.

**Optional employer view:** The original plan proposed company-posted returnships and ranked candidates. Treat this as a separate future concept outside the current caregiver-focused MVP; it would require its own privacy and fairness review before implementation.

## Run it

**Option A: Google AI Studio (how the app was built).** Open [ADD AI Studio app link]. AI Studio manages the Gemini key in its secrets.

**Option B: Run locally.** [REPLACE with tested steps from the exported build]

```bash
# Requires: [Node.js version]
git clone https://github.com/Dan-Powell-Git/HackaThonRepo.git
cd HackaThonRepo
npm install
cp .env.example .env        # add: GEMINI_API_KEY=your_key_here
npm run dev                 # then open http://localhost:[PORT]
```

The catalog and child care table load from:

```
data/
  utah_childcare_table4_oct2026.json   # official DWS Table 4, household sizes 2–8
  seed_opportunities.json              # verified programs, labeled sample listings, courses
```

> 🔑 Never put the Gemini key in browser code or commit it. `.env` is in `.gitignore`.

## Privacy and responsible AI

- **No accounts.** The shortlist lasts for the browser session only. [CONFIRM against build]
- **What gets sent to Gemini:** interview answers and, if uploaded, resume text, used only to generate the skills profile and plan text. [CONFIRM no server-side storage, and how a user clears their session.]
- **The public demo uses only fictional answers and a sample resume.** No real personal data was used to build or test it.
- **The model is told never to invent experience.** Every skill must trace back to the user's own words, and the user can correct it.
- **Nobody is ranked against other people or screened out.** The tool only helps a person see their own options.

## What this tool can't do

- **It doesn't decide benefits.** Utah DWS makes eligibility decisions, and an eligibility worker determines what income counts. Our estimate may be wrong.
- **Not modeled yet:** DWS maximum subsidy rates (providers may charge more than the state pays), exact taxes, household sizes above 8, special-needs child care limits, and work-hour requirements.
- **The AI can miss or mislabel skills.** That's why every skill shows its source and can be edited.
- **Program status can change.** Always confirm with the provider before applying.
- **It doesn't apply for jobs or contact employers for you.**
- **Need a person?** Dial **2-1-1** (Utah 211) or contact [Utah DWS](https://jobs.utah.gov).

## Accessibility

- Mobile-first layout with a visible button for every action
- Keyboard shortcuts that don't interfere with typing
- High-contrast colors and labeled form fields
- Plain language (about an 8th-grade reading level)
- English/Español interface toggle [CONFIRM]

## Next steps

- Live listings from Utah DWS job data and Return Utah postings, plus verified national remote returnships.
- Feedback that re-ranks future cards (if it isn't in this build).
- Saved plans across visits, with clear consent and a delete option.
- The official DWS maximum subsidy rates and a real paycheck estimate.
- Spanish-first interviews.
- **Adoption partners:** Tech-Moms, Return Utah, Utah DWS.

## License

MIT, so nonprofits and agencies can freely reuse and adapt it.

## Acknowledgments

Hack for Humanity SLC organizers, AI Collective, Neumont University, the Utah Women & Leadership Project for research on the barriers Utah women face in the workforce, and Utah DWS for public data.
