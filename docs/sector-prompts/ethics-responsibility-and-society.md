# Sector run — ethics, responsibility and society

**Before anything else, read `docs/sector-prompts/sector-prompt-instructions.md`
in full.** It carries the role, the input files, the deduplication rules, the
output contract and schema, the retrieval-report format and the writing
guidance — all of which apply to this run unchanged. This file carries only what
is specific to this sector, and adds to those instructions rather than
overriding them.

Dimension id: **`ethics-responsibility-and-society`**

---

## Your beat

The **norms, values and responsibilities of software engineering** as AI changes it:
what engineers expect of each other's work, who is trusted to do what, what they owe users
and the public, what counts as good practice, who answers when agent-written code fails —
and what it costs engineers when their own values and what the work demands of them pull
apart.

This project studies how software work changes. Ethics is not a subject in itself
here. It qualifies when it shows up in how software is written, reviewed, released,
operated and maintained, and in who is held responsible for it.

One project deciding that a contributor must earn the right to submit AI-written code, with
the thread that argued it, is worth more than ten essays on responsible AI. So is one
engineer's specific account of being asked to ship something they could not stand behind.

---

## The direct-link test — apply this first, to every candidate

**Every item must be directly linked to software engineering. AI in the workplace in
general is too broad.**

Before anything else, write down the engineering activity the item changes: writing,
reviewing, testing, releasing, operating or maintaining software, or who is allowed or
required to do those things. If you cannot name one from what the source says, reject it
as `out-of-sector`, however important it is in other ways.

None of these is a direct link on its own:

- the source mentions developers among those affected, or a job title such as programmer
- the employer is a technology or IT-services company
- the tool is an office or HR system used at such a company
- reasoning from another occupation "would carry over"
- a national AI or employment policy that names no software work
- a contract, ruling or policy about AI at work in general, covering a wide group of staff

**Check the question arises in Europe.** This site's readers are mainly in Europe and
Finland. For an item from elsewhere, ask whether the issue exists there at all, or whether
European law already settles it. AI monitoring of US workers, for example, is not the issue
in Europe or Finland, where the rules on monitoring employees are much stricter. If the
question is already settled in Europe, reject the item.

---

## What to look for

Work through all four. Report what you searched under each, including the ones that
returned nothing. An empty strand is a valid result; do not pad one to balance the others.

### 1. Values and moral conflict

**This is the strand the corpus most lacks, so start here.** Engineers whose own values and
what the work now demands of them pull apart, and what that costs them:

- being required to ship, approve or maintain AI-written code they cannot vouch for
- AI-use targets, quotas or performance-review metrics that conflict with an engineer's
  judgement of quality or safety
- seeing a risk in an AI system they build and having no way to act on it: concerns that
  are never raised, safeguards dropped for a deadline, ethics reduced to a checklist
- being asked to build the automation that replaces colleagues, or to train their own
  replacement
- refusing a tool or a task on principle — over quality, licensing, environmental cost or
  harm to users — and what happened next
- hiding AI use, or hiding non-use, because of what colleagues or managers would think
- moral distress, guilt or a sense of complicity named as such, and engineers leaving a job
  or the profession over it

Two kinds of evidence count. **A named person's specific, firsthand account** of a
situation they faced and what they did — not their position on AI in general. And **a study
or survey with a stated method** that measures or documents these conflicts among software
engineers. An essay arguing what engineers ought to feel is neither.

This includes engineers who build AI systems, not only those who use AI tools: what an
engineer may or may not do about a harmful model is as much a question of software work as
what they do with a coding agent. Say which it is in the draft.

### 2. Trust and the norms of the craft

Shared expectations about AI in engineering work, set by a community, a professional body
or several organisations rather than by one team. **What matters is who is trusted, or
allowed, to do what — not the format of a rule.**

- **Earned trust:** rules that let contributors or engineers use AI only after they have
  shown they can be trusted — a record of merged work, a seniority bar, a probation period,
  an obligation to publish the agent's full transcript. QGIS's proposal to let contributors
  with 100 merged pull requests use AI is the reference case.
- **Contribution rules:** projects or organisations that ban, limit or welcome AI-written
  contributions, when the source shows what changed in who may contribute or how the work is
  checked, and what happens when the rule is enforced.
- **What review now vouches for:** whether a human must read every line, review by risk or
  blast radius, who may merge agent-written changes.
- **Professional codes and bodies:** ACM, IEEE Computer Society, BCS, Gesellschaft für
  Informatik, and in Finland Tietoasiantuntijat and TEK, when they change what they expect
  of practitioners. No change is itself worth noting once, with the date you checked.

**Disclosure formats are minor details.** A tag, a commit trailer or a PR-template checkbox
is not a signal on its own, and neither is adding or dropping one. Report a disclosure rule
only when the source shows it changing trust: who is believed, who is checked harder, who
may contribute at all.

### 3. Responsibility

Who answers for agent-written code, in practice:

- sign-off and accountability rules: who is named as the author, who carries the pager,
  who signs off a release
- incidents and postmortems where agent-written code was involved, and how blame or
  responsibility was assigned
- contracts, warranties and insurance terms that allocate responsibility for generated
  code between client, supplier and individual engineer, **when the source shows the terms
  changing what engineers do or sign**
- disputes or rulings over who is liable for a defect in AI-written code

### 4. Say over coding tools

Lowest priority, and kept narrow. Whether software workers get a say over AI in their
engineering work, such as coding agents or automated review: a works council, union or
co-operation procedure that bargained over, changed or delayed a rollout of an engineering
tool. A rollout of an HR or office tool at a software firm does not count, and neither does
a contract covering AI at work in general. In Finland, check whether the Co-operation Act
(yhteistoimintalaki) has been applied to a change in engineering tools; routine redundancy
talks that cite AI do not count.

The published Blizzard signal (`2026-09-14-06`) is the reference point, but not the bar:
its clause covers AI at work across a wide unit, and a new item needs to be more directly
about engineering work than that.

---

## Regulation and standards — a filter, not a strand

Most news about regulation and standards describes what a law requires of a **software
business**: compliance cost, market access, deadlines, fines, conformity assessment done by
a compliance department. That is not this project's subject, and it is not this sector.

**The practice test: an outside rule counts only when the source shows engineering work
changing because of it.** That means one of:

- a named engineer, team or project describing what they now do differently because of the
  rule: a new review or sign-off step, provenance records they now keep for generated code,
  a disclosure requirement, code an agent may no longer touch, an approval needed before
  release
- the rule's own text placing a duty on individual engineers, or on how code is produced,
  reviewed or released — and you have read that text

Reject, under `low-altitude`:

- law-firm, consultancy and vendor explainers of what a law requires
- deadlines, enforcement dates, fines and timelines on their own
- compliance cost and market-access stories
- a standards body publishing or consulting on a draft, with no adopter
- general AI regulation, including most AI Act coverage, that changes nothing in how
  software is built

The Cyber Resilience Act is the example to keep in mind. It does place duties on software
manufacturers, but almost all coverage of it is the business-level kind above. One
maintainer explaining what it changed in their release process would qualify; a hundred
compliance guides would not.

Use `regulation-standard` as the signal type for a rule that passes, and for a community
or project policy with a stated effective date.

---

## Boundaries with neighbouring sectors

| If the core claim is about… | It belongs to |
| --- | --- |
| One organisation's internal rule, how a team reorganises, what a manager does | `organisation-and-leadership` |
| How the work feels to the person doing it, when no clash of values is involved | `worker-experience-identity-and-wellbeing` |
| Who does which task, people or machines | `nature-and-division-of-work` |
| Hiring, job loss, wages, entry into the profession | `careers-occupations-and-labour-markets` |
| What to learn, curricula, training | `skills-knowledge-and-learning` |
| Cost, ROI, productivity as a business result | `economics-productivity-and-value` |

The boundary test: **an item here is about values — an expectation shared beyond one
organisation, who answers for the work, or a clash between an engineer's values and what
the work demands.** One company's review rule is organisation. The same rule adopted across
a community, cited by others or set by a professional body is a norm. Stress from workload
or pace is wellbeing; stress from being asked to do something the engineer believes is
wrong is moral conflict, and belongs here. Many items touch two of these, so file by what
the evidence actually shows.

**General layoff news is out, here as everywhere on this site.** A layoff item qualifies
only if it shows who was held responsible for agent-written work, or a norm changing; an
account of how AI was used to replace work belongs to the generic run.

---

## Altitude

**The test: can you name the engineering activity, the people affected, and what actually
happened — a rule adopted, enforced or reversed, a conflict faced, a choice made?**

- **Right altitude:** a project's rule on who may submit AI-written code, with its text and
  the thread that argued it; an engineer's account of being told to ship generated code they
  had not been able to check, and what they did; interview research showing engineers see
  risks they cannot act on; a postmortem saying who answered for agent-written code.
- **Wrong altitude:** AI ethics principles and frameworks; responsible-AI statements;
  think-pieces on the future of the profession; general opinion for or against AI; AI safety
  and alignment research; consumer harms such as deepfakes or chatbot safety;
  business-level regulation news (see above); changes to disclosure formats such as tags and
  commit trailers.

**Tool news is excluded**, as in the generic run. A product's governance or disclosure
feature is not a signal unless the source shows a community or organisation adopting it as
a rule. A security incident is not a signal unless the source shows a changed duty or rule
for the people doing the work.

---

## Accuracy — report what the document says

1. **Read the primary document whenever it exists:** the policy, the vote, the thread, the
   postmortem, the code of conduct, the contract clause. If you could not read it, say so in
   `risksAndCaveats`.
2. **Say how binding it is, in ordinary words:** proposed, under discussion, adopted,
   enforced, reversed. A proposal reported as an adopted rule is the error this sector is
   most prone to. A mailing-list thread is a debate, not a decision.
3. **Quote the operative words** where you have them. "Must disclose" is not "should
   disclose", and "the contributor is responsible" is not "the contributor is liable".
4. **Attribute claims.** Maintainers, vendors, unions and law firms all frame things their
   way. Name the origin in `risksAndCaveats`.
5. **Check every "first", "historic" and "landmark"** against earlier cases. Do not repeat
   one you cannot verify.
6. **Mark your translations.** If you translated a quotation yourself, say so.

---

## Writing for the public

Everything in a draft may reach the live site, so write it for a reader who has never seen
this prompt.

- **No pipeline vocabulary in a draft.** Never write "strand", "direct-link test", "practice
  test", "altitude", "this search" or "this run". Say what happened. Do not address the
  reviewer: a note such as "a reviewer may file this elsewhere" belongs in the retrieval report.
- **Research problems go in the retrieval report.** Failed fetches and walled pages belong
  there. A reader needs only what affects trust in the item: "we did not read the policy text".
- **Quote in English.** Give foreign-language quotations in English, marked as our
  translation, with the original in the retrieval report.
- **Keep titles to one plain claim,** about 25 words at most, with no verdict or label at the end.

---

## Signal freshness

The window here is the last **45 days**: community policies are argued over weeks before
they are adopted. An older policy qualifies only through a new development such as
enforcement, amendment or reversal.

---

## Source mix

- **At least half the items must rest on a primary document or a firsthand account:** a
  policy or its text, a vote, a mailing-list or issue thread, a postmortem, or a named
  engineer describing what happened. Secondary reporting may carry the rest, when it is
  independent journalism with named subjects.
- **No more than half the items from open-source projects.** Open-source governance is
  argued in public and company norms mostly are not, so open source is easy to over-sample.
  Say in `risksAndCaveats` that a project's norm does not show what companies do.
- **Academic work:** up to 2 items, judged by when the data was collected.
- **No aggregators as a source.** Use them to find the original, then cite the original.
- **Commercial-intent discount.** Governance vendors and compliance consultancies publish
  heavily here, and their surveys tend to find the gap their product fills.
- **Always include a working `sourceUrl`** and verify it resolves.

## Where to hunt

**Start with the pool.** This sector has a source profile
(`config/sources/ethics-responsibility-and-society.json`). If
`data/_candidates-ethics-responsibility-and-society.json` exists, read it first — it is
already deduped against the ledger. It covers two feeds only, LWN and the Software Freedom
Conservancy blog, so it is a thin floor. The searches below are the method.

- **Project governance:** LWN's coverage of kernel and distribution debates; Debian general
  resolutions and debian-devel; Fedora, Gentoo, NixOS and KDE governance; the Apache Software
  Foundation's and Eclipse Foundation's guidance on generative tools; Python and Rust
  community discussions; bug-bounty and security-report policies on AI-written reports.
- **Company practice made public:** published engineering handbooks and AI-use policies;
  postmortems and incident reviews that mention agent-written code.
- **Professional bodies:** ACM, IEEE Computer Society, BCS, Gesellschaft für Informatik,
  Tietoasiantuntijat, TEK.
- **Research:** arXiv cs.SE and cs.CY; ICSE's Software Engineering in Society track; CHASE;
  FAccT and AIES for studies of the engineers who build AI systems; university press releases,
  which are often the first sign of interview studies like these. Read the paper itself.
- **Practitioner accounts of moral conflict:** personal engineering blogs and Substack;
  "Ask HN" and comment threads on Hacker News; Lobsters; LeadDev; Mastodon instances where
  engineers post, such as hachyderm.io; conference talks. Useful search terms: `moral injury`
  with `software engineer`, `complicit`, `"AI mandate"` with `developer`, `"refuse to use AI"`,
  `"ship code I don't understand"`, `"AI usage" performance review engineers`, `"why I quit"`
  with `AI`.
- **Contracts and insurance:** technology errors-and-omissions insurers and IT-procurement
  bodies, only where terms on generated code have actually changed.

Search in the local language for European material, since much of it is not in English:

- Finnish: `tekoäly ohjelmistokehitys vastuu`, `tekoälyn käyttö koodissa ohjeistus`,
  `ohjelmistokehittäjä eettinen kuormitus tekoäly`
- German: `KI-generierter Code Haftung`, `KI Richtlinie Beiträge Open Source`
- French: `code généré par IA responsabilité développeur`
- Swedish: `AI-genererad kod ansvar utvecklare`

---

## Filtering

Output an item only if it passes the direct-link test AND shows at least one of:

- a conflict between engineers' values and what the work demands of them, in a named
  person's firsthand account or a study with a stated method
- a change in who is trusted or allowed to do what with AI in engineering work: adopted,
  enforced, contested, reversed — or formally proposed, if the proposal itself is new
- a change in who answers for agent-written code, in practice or in a binding document
- measured evidence of how engineers actually follow or break such norms
- an outside rule that passes the practice test
- a firsthand account of any of the above
- software workers getting or using a say over engineering tools

Reject items that are:

- about AI at work in general, with no named engineering activity (`out-of-sector`)
- from outside Europe on a question European law already settles (`out-of-sector`)
- ethics principles, frameworks and position papers with nothing adopted behind them
  (`low-altitude`)
- regulation or standards news that fails the practice test (`low-altitude`)
- one person's opinion of what the norm should be, or of AI in general, with no situation
  they faced and no community acting on it (`too-vague`)
- changes to disclosure formats, tags or commit trailers that change nobody's trust or
  permissions (`low-altitude`)
- model clauses and toolkits with no adopter, and proposals that only restate an existing
  rule (`illustrative-not-measured`)
- vendor governance content with no original data (`commercial-intent`)
- recycled recaps of a policy you could read directly (`aggregator-used-primary-instead`)

---

## Hazards

1. **A policy is not practice.** A rule adopted on paper says nothing about whether anyone
   follows it. Prefer evidence of enforcement, evasion or reversal, and say which you have.
2. **One loud voice is not a norm.** A well-known maintainer's post shows what one person
   thinks. Say how many people or projects the norm actually binds.
3. **Hunt disconfirming cases:** projects that lifted a ban, disclosure rules nobody follows,
   a professional body that declined to act, an incident where nobody was held responsible.
   Rank them with the kind of item they disconfirm, and say in the retrieval report what you
   looked for and what you found.
4. **Panic and boosterism both distort this topic.** "AI slop is destroying open source" and
   "the craft is obsolete" are both framings. Report what was done and measured.
5. **Accounts of moral conflict travel without their source.** A resignation story or
   "I refuse" post is often retold anonymously by recap sites. Trace it to the person's own
   words, and drop it if you cannot. One account shows one person's situation; say so, and
   do not present it as how engineers in general feel.

---

## Ranking — prefer in this order

1. Measured evidence or firsthand accounts of engineers' values clashing with what the
   work demands, and what they did about it
2. A change in who is trusted or allowed to do what, enforced, contested or reversed in
   practice
3. A new shared rule or a genuinely new proposal on trust, from a community, professional
   body or several organisations, with its text read
4. Firsthand accounts of who answered for agent-written code
5. Outside rules that pass the practice test
6. Software workers getting or using a say over engineering tools

Aim for **2–5 items**. Quality over volume. An empty run is valid; report it honestly.

---

## Sector notes on the shared instructions

- **Signal types.** `regulation-standard` for a rule or adopted policy with a stated date;
  `effectiveDate` must be a date the source states, or the date of adoption with that said
  in `risksAndCaveats`. `practitioner-account` for a named person's own account; `study` and
  `field-report` for measured evidence.
- **Category.** `Ethics & Policy` will usually be the primary `category`, often with
  `SDLC Change` or `Quality & Testing`. File honestly.
- **`recommendedActions`** are often `[]` here. Do not give legal advice.
- **This run does not propose phenomena.** It produces signals. Whether they support a
  phenomenon, and which radar sector that phenomenon sits in, is decided later in a separate
  clustering session. Do not shape an item to fill a sector or to support a thesis.
- **The retrieval report's source-mix check** means, for this sector: how many items rest on
  a primary document or firsthand account, how many come from open source, what you searched
  under each of the four strands, and which outside rules you checked against the practice
  test and why each passed or failed.
