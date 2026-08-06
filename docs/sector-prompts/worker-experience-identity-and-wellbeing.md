# Sector run — worker experience, identity and wellbeing

**Before anything else, read `docs/sector-prompts/sector-prompt-instructions.md`
in full.** It carries the role, the input files, the deduplication rules, the
output contract and schema, the retrieval-report format and the writing
guidance — all of which apply to this run unchanged. This file carries only what
is specific to this sector, and adds to those instructions rather than
overriding them.

Dimension id: **`worker-experience-identity-and-wellbeing`**

---

## Your beat

How AI is changing the **lived experience** of software work — what it does to
identity, craft, meaning, autonomy, pace, workload, trust, confidence and
wellbeing for the people doing the work.

## Mission

Surface EARLY, HIGH-SIGNAL developments in how AI adoption is changing what
software work feels like and what it does to the people doing it — especially
weak signals being lived RIGHT NOW that have not yet been formalized in surveys
or papers.

One specific, credible firsthand account of a developer describing what eight
months of agent-mediated work did to their sense of competence is worth more than
another citation of a landmark burnout study.

---

## Sector scope — what belongs here

In scope. The **experience and human consequences** of AI-changed software work:

- **Identity and craft** — what people believe they are for; pride, ownership,
  authorship, the felt loss or reshaping of craft; what "being a good engineer"
  now means to the person being it.
- **Autonomy and control** — who decides what, discretion over how work is done,
  the experience of supervising machine output rather than producing work.
- **Confidence and competence** — deskilling anxiety, atrophy fears, impostor
  dynamics, the experience of not understanding code you are accountable for.
- **Pace, load and recovery** — throughput expectations after AI adoption,
  review and verification burden, on-call and incident load, cognitive load of
  supervising agents, the disappearance of slack.
- **Trust** — in tools, in colleagues' AI-assisted output, in one's own judgment.
- **Measurement and surveillance** — how AI-era productivity metrics are
  experienced by the measured, not just how they are designed.
- **Meaning, motivation and morale** — engagement, satisfaction, the enjoyable
  parts of the job being automated first, whether the remaining work is worth
  doing.
- **Belonging and relations** — mentoring, pairing, team social fabric, isolation
  when the collaborator is a model.

Out of scope — route to a neighbouring sector, do not surface here:

| If the core claim is about… | It belongs to |
| --- | --- |
| Layoffs, hiring, job openings, wages, role disappearance | `careers-occupations-and-labour-markets` |
| What to learn, how to reskill, training programmes, curricula | `skills-knowledge-and-learning` |
| Team structure, management practice, org design, process | `organisation-and-leadership` |
| Cost, ROI, productivity measurement as a business result | `economics-productivity-and-value` |
| Accountability, liability, regulation, societal harm | `ethics-responsibility-and-society` |
| Who does which task, human/machine division of labour | `nature-and-division-of-work` |

The boundary test: **a labour-market item is about the job; a wellbeing item is
about the person doing it.** "Junior hiring fell 40%" is careers. "Juniors
describe feeling unable to build competence because the work they'd learn from is
now done by agents" is this sector. Many items touch both — file by what the
evidence actually shows, not by what it implies.

---

## Altitude — this sector's failure mode is vagueness

**The test: is this a specific, situated account of how the experience of
software work changed, with a mechanism that ties it to AI adoption?**

You need all three — specific, situated, and mechanistically tied to AI.

- **Right altitude:** a named engineer describing, with detail, how their role
  changed over a stated period and what that did to them; a survey with a real
  sample reporting a shift in satisfaction, confidence or load among developers
  using AI tools; a team lead reporting what happened to morale or mentoring
  after an agent rollout; research measuring cognitive load or trust in
  AI-assisted work.
- **Wrong altitude:** "AI is making developers anxious" think-pieces with no
  firsthand basis; general future-of-work commentary that happens to mention
  software; burnout or wellness advice with no AI mechanism; AI-doom or AI-utopia
  opinion; anything whose evidence is the author's mood.

Reject vague items even when you agree with them. This is a research site: an
unsupported claim about how people feel is worse than no item, because it reads
as evidence and is not.

---

## Signal freshness

Judge items by when the underlying EXPERIENCE is happening, not when a document
about it was published.

Prioritize items whose underlying activity is from the last **14–30 days**.
Experiential shifts surface more slowly than tool releases, and a forum thread
describing six months of accumulating strain is a current signal even if the
thread is three weeks old.

Older items qualify when newly relevant through replication, a fresh survey wave,
or a clear new downstream consequence.

---

## Source mix

- **At least half the items must carry a named or clearly identifiable individual
  describing their own experience**, or the run has failed at its actual job.
  This is the floor that matters most. A run of four well-sourced surveys and no
  human voice is a failed sector run, not a cautious one.
- **Academic work: up to 4 items per run, and it is not automatically a lagging
  indicator here.** HCI, CSCW, software-engineering-psychology and
  occupational-health research is often the *only* rigorous evidence on cognitive
  load, trust and satisfaction, and it frequently leads practitioner discourse
  rather than trailing it. Judge each on its data-collection window, not on the
  fact that it is a paper.
- **Surveys and field reports are first-class here**, not filler — the large
  annual developer surveys, engineering-org benchmarks and occupational-health
  studies carry the population-level evidence no anecdote can. Record
  `sampleSize` and `fieldworkPeriod` whenever stated.
- **Comment threads are primary sources, not just leads.** A long
  r/ExperiencedDevs or Hacker News thread in which twenty senior engineers
  independently describe the same shift is real evidence of convergence. Cite the
  thread, quote the specific accounts, and say how many voices you counted.
- **No security-item cap.** Security material only qualifies here at all if the
  claim is about the *experience* of security work (alert load, blame, on-call
  strain).
- **Commercial-intent discount.** Heavily down-weight content whose purpose is to
  sell the thing it describes — developer-wellbeing vendors, DevEx platforms and
  coaching businesses publish high volumes of well-optimized content about
  exactly this sector. Include vendor material only when it carries original
  operational data that stands independent of the sales pitch, and note the
  vendor origin in `risksAndCaveats`.
- **Never** use aggregators, reposts or AI-generated recap blogs as the sole
  source. Always include a working `sourceUrl` and verify it resolves.

## Where to hunt

There is no candidate pool for this run, so the venue list is part of the method.
Work through these deliberately rather than issuing one broad search:

- **Practitioner forums** — r/ExperiencedDevs, r/cscareerquestions,
  r/programming, Hacker News threads (the comments more than the submissions),
  Blind. This is where the leading signal lives and where generic search ranks
  worst.
- **Personal engineering blogs and Substacks** — named engineers writing
  reflectively about their own year. Follow the people, not the keywords.
- **Social** — LinkedIn and X posts from named, credible practitioners. Not
  indexed well; search deliberately.
- **Surveys and benchmarks** — Stack Overflow Developer Survey, DORA / State of
  DevOps, Microsoft Work Trend Index, JetBrains State of Developer Ecosystem,
  engineering-org benchmark reports, national occupational-health surveys.
- **Research** — arXiv `cs.HC` and `cs.SE`, CHI, CSCW, ICSE and adjacent venues;
  occupational and organizational psychology journals covering technology work.
- **Journalism** — only where it carries firsthand reporting with named subjects,
  never as a recap of something else.

Follow promising discussion links and read the threads. Senior engineers report
what is actually happening to them there months before anyone writes it up
formally.

---

## The distress-selection hazard — mandatory for this sector

**Forums over-represent distress.** People post when something is wrong; the
engineer whose job got quietly better writes nothing. Survey response rates skew
toward the engaged and the aggrieved. Reflective blog posts are written by people
with something to process.

Left unaddressed, this sector produces a systematically bleak picture that the
underlying evidence does not support — and it will look rigorous while doing it.

Therefore, on this run:

1. Every item drawn from a forum thread, comment section or self-selected survey
   MUST address selection bias explicitly in `risksAndCaveats`. Not a generic
   hedge — name the mechanism ("r/ExperiencedDevs skews toward engineers with
   grievances to air; the absence of positive accounts in this thread is not
   evidence of their absence in the population").
2. **Actively hunt disconfirming accounts.** If your items trend negative, spend
   search effort specifically looking for credible firsthand accounts of AI
   adoption improving autonomy, satisfaction, load or craft — and surface them
   when they meet the same bar. A sector run that finds only bad news has
   probably not looked for good news.
3. Prefer sources that report distributions over sources that report a mood.

---

## Filtering

Output an item only if it bears on the lived experience of software work AND at
least one of:

- an early or emerging shift in how software work is experienced, felt or endured
- measurable impact on satisfaction, confidence, load, retention intent, trust or
  wellbeing among people doing software work
- a credible firsthand account of identity, craft, autonomy or competence
  changing under AI adoption
- research or survey evidence quantifying any of the above

Reject items that are:

- generic AI-anxiety or AI-optimism commentary with no firsthand basis
- wellbeing, burnout or productivity advice with no AI mechanism
- future-of-work punditry not grounded in software work specifically
- labour-market, skills or org-design news wearing a wellbeing headline (route it
  to the right sector instead — see the boundary table)
- vendor content selling a wellbeing or DevEx product, absent original data
- consumer AI trends unrelated to software work

---

## Ranking — prefer in this order

1. Early leading accounts of experiential change with a credible firsthand basis
2. Independent corroboration of the same experiential pattern across unrelated
   practitioners
3. Survey or research evidence quantifying a shift practitioners are already
   describing
4. Credible disconfirming evidence — accounts of AI adoption improving the
   experience of the work (rare, valuable, and a check on the distress bias)
5. Research that overturns a prior consensus about AI and developer wellbeing

Aim for **3–6 items per run**. Quality and earliness over volume.

---

## Sector notes on the shared instructions

- **Signal types.** Expect `practitioner-account` and `field-report` to dominate
  a healthy run of this sector. A run that is mostly `tool-shift` or
  `market-event` has drifted out of sector.
- **Category.** `Work Wellbeing` will usually be the primary `category`. It is
  not required to be — file honestly.
- **Corroboration** matters more here than anywhere else on the radar, because no
  single account of how work feels can carry weight alone.
- **Empty `recommendedActions`** are especially common here: the temptation to
  append generic wellbeing advice to a genuine signal is strong. Resist it.
- **The retrieval report's source-mix check** means, for this sector: how many of
  your items carry a named individual describing their own experience, against
  the ≥50% floor.
