# V2 Ideas — Hopkins Street Data Story

*Speculative ideas for future development. None of this is planned or committed.
V1 ships first. These are notes so good ideas don't get lost.*

-----

## Public comment scraping and analysis

### The idea

Scrape public comments submitted to Berkeley City Council and Transportation
Commission meetings on the Hopkins corridor project, then analyze them for
topic prevalence and how the debate evolved over time.

### Why it's interesting

The Hopkins fight ran from 2020 to 2023 across at least a dozen public meetings.
Tracking which arguments appeared when — parking, safety, accessibility, equity,
emergency access, business impact — could show how the debate was framed and
how organized each side was at different moments. That's a useful historical
record that doesn't exist anywhere in structured form.

### What's technically feasible

**Written comments (easier):**

- Berkeley posts agenda packets at cityofberkeley.info — written public comments
  submitted ahead of meetings are sometimes included as PDF attachments
- Key meetings to target: Oct 2020 (Workshop 1), Mar 2021 (Workshop 2),
  Oct 2021 (Workshop 3), Mar 2022 (final webinars), May 10 2022 (Council vote),
  Oct 11 2022 (reconsideration), Apr 2023 (postponement)
- Berkeley may use an eComment system with a public-facing archive — worth checking
  if comments are exposed without authentication

**Spoken comments (harder):**

- Berkeley posts meeting videos to YouTube and/or granicus
- Would need transcription (Whisper API or similar) before any text analysis
- Transcription quality on public comment audio is variable — accents, crosstalk,
  audio quality all introduce errors that need disclosure

**Workshop feedback (richest but most locked up):**

- The Social Pinpoint platform collected 700+ comments in 2021
- Those are almost certainly behind a login — would need city cooperation to access
- Workshop summary PDFs are public and contain synthesized themes, not raw comments

### What the analysis could defensibly show

- Topic frequency over time: which arguments appeared in which meetings
- Relative prevalence: did parking dominate early? Did safety framing grow?
- Organized vs. organic: form letter signatures vs. unique comments
  (form letters should be counted as one voice, not N voices)

### What it cannot defensibly show without careful methodology

- Overall "sentiment" for/against the project — too coarse, self-selected sample
- That one side "won" the comment record — organized campaigns skew counts
- Anything about the general public's views — commenters are not representative

### Risks to flag

- Opposition submitted organized form letters; so did advocates
  Raw counts without this context would mislead
- Misclassified sentiment could become an attack surface
  ("you said 60% of comments were pro-bike-lane but you coded X as Y")
- Adds methodological complexity to a project whose credibility rests on
  clean, simple, defensible data

### Framing if built

This would fit best in "The Record" section as a supplementary historical layer —
not in the primary data story. Present it as "how the public debate unfolded"
not as "what the public thinks." Be explicit about the self-selected sample,
the organized campaign dynamics, and what the data can and cannot show.

### What would be needed to build it

- [ ] Check Berkeley's eComment archive for public access
- [ ] Inventory agenda PDFs for meetings listed above — which have comment attachments?
- [ ] Decide: written comments only (v2a) or include transcribed spoken comments (v2b)
- [ ] Build scraper for agenda PDFs → extract comment text
- [ ] Topic modeling: probably a simple keyword/phrase classifier is more
  defensible than LLM-based sentiment for this use case
  (explicit categories: parking, safety, cycling infrastructure, pedestrians,
  accessibility/disability, equity/west Berkeley, emergency access,
  business impact, environment/climate)
- [ ] Design: timeline visualization showing topic prevalence by meeting date

-----
test
*Added March 2026. Revisit after v1 ships.*
