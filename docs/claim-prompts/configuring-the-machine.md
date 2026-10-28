# Claim run — configuring the machine

**Before anything else, read `docs/claim-prompts/claim-prompt-instructions.md`
in full.** It carries the role, the construct test, the input files, the
deduplication rules, the output contract and schema, the retrieval-report format
and the writing guidance — all of which apply to this run unchanged. This file
carries only what is specific to this claim, and adds to those instructions
rather than overriding them.

Claim id: **`configuring-the-machine`**
Phenomenon file: `public/content/phenomena/configuring-the-machine.json`

---

## The claim under test

The claim is the phenomenon's `thesis`, and its current standing is whatever the
phenomenon file says on the day you run — **read both from the file, not from
here.** This file states no ring, no evidence count and no list of cited
signals, because all of those move.

Before you search, write down from the file, in the report's section 1:

- `observedReach` and `contested`
- every `evidence` entry — `signalId`, `stance`, `primary` — and, for each,
  what the signal actually measured and **which kind of environment it varied**
  (procedure, information, authority — see below — or none)
- `evidenceProfile`: in particular `independentContexts` and `counterEvidence`
- which contexts the `supports` items belong to (a vendor writing about its own
  product, an investor's portfolio, a named adopting company), so you know which
  ones a new find would merely thicken

**Why this run exists.** On 2026-10-27 the phenomenon was reframed twice in one
day. It used to claim that capability moves into the *agent harness* — the
control loop, tool schemas and retry logic — and that teams build it. Most teams
do not: they adopt a packaged agent and configure the place it works in. Then a
closer look at the evidence showed that configuration is not one thing. The
studies finding that instruction files change nothing all varied *how the agent
is told to work*; the one test that supplied *what the agent could not otherwise
know* found a large gain. The thesis now claims that split, and that it widens
with every model generation.

The evidence was gathered under the old reading, so this run has three jobs:

1. **Re-audit every current citation against the new construct.** Expect a real
   detachments list. Material about building an agent or its harness — the
   vendor layer — no longer measures this claim, however good it is. Expect
   re-stances too, and handle them under *Mind the sign* below.
2. **Test the information half, on both sides.** This is the run's main target.
   The decay of procedural instruction is well measured; the claim that
   organisation-specific context lasts rests on a single small test. That is the
   part that makes this phenomenon more than "prompting is dead", and it is the
   part most likely to be wrong.
3. **Say which evidence predates the reframe.** The new thesis was written
   looking at the evidence already cited, so that evidence fits it by
   construction. Report it separately from what this run finds, which did not
   shape the wording.

The question this run answers: **when a team configures a packaged coding agent,
which parts of what it puts in change what the agent achieves — and do those
effects hold, shrink or grow as models improve?**

## The construct

The phenomenon's `construct` field is the authority. What follows expands it
into search terms; where the two disagree, the file wins and the disagreement
belongs in the report.

A **packaged coding agent** is one a team adopts with model and harness
included — a vendor's, or an internal platform team's. A team assembling its own
agent from an SDK is building the harness, which is out of scope; the
instruction, access and workflow elements it configures are in.

**"The team" is the adopting organisation**, delivery and platform teams
together. A platform or security team that sets the agent's sandbox, tool subset
and gateway for everyone is doing exactly the work the claim describes; who
inside the organisation does it is a question about ownership, recorded in the
`note`, not a test of the claim.

The environment a team sets up around that agent comes in three kinds. **Every
item you propose must say which kind its source varied or describes**, in the
summary and in the proposal `note`:

| Kind | What it is | What the claim predicts |
| --- | --- | --- |
| **Procedure** | How to work: rules files and style instructions, prescribed workflows (plan → implement → verify), named techniques, skills that encode a method, checks the agent is told to run | Absorbed by model capability. Adds little on current frontier models, and less with each generation. |
| **Information** | What the agent cannot otherwise know: domain, architecture, conventions, design system, ownership, internal interfaces and services, decisions and their reasons | Lasts. Helps on work that depends on it, regardless of model generation. |
| **Authority** | What the agent may touch: tool and MCP access, permissions, sandboxes, network and filesystem limits, approval modes, gateways and policy layers | Lasts, and the need grows as agents act more autonomously. |

Some elements straddle. A context file usually mixes procedure and information;
a skill can encode a method or a body of internal knowledge; tests the agent
runs are feedback that steers it. Classify by what the source **varied**, quote
it, and when a source varied a mixture without separating it, say so — a mixed
result tests neither half cleanly.

**Information means what the agent could not have got from the task and the
codebase.** If the agent succeeds without it, that information was not needed
for that task — which says nothing about information a task did depend on. A
specification that a frontier model reproduces unaided is, for that model,
procedure in effect.

**Two agents, each with and without the same configuration, is a valid
design** — the agent is held fixed within each arm. When the configuration helps
one agent and not the other, the interaction is itself evidence: if the stronger
agent's edge is its own navigation, search or retrieval, it bears on *agents
find it themselves* below; if its edge is the model, it is the within-generation
proxy for decay.

Sources measure the construct when they report things like:

- an A/B or before-and-after comparison where only the environment changed —
  same agent, same model, same tasks — with an outcome measured
- **the same configuration measured on two model generations** — the design that
  tests decay directly, and the most valuable thing this run can find
- information supplied versus withheld on tasks that **depend on it** — internal
  APIs, house conventions, a private design system, an unfamiliar codebase —
  rather than on public repositories the model may already know
- agents retrieving context themselves (from code, tickets, docs) compared with
  curated context handed to them
- an organisation describing the environment it maintains for agents, with who
  owns each kind, how it is reviewed, and what changed when it changed
- survey, telemetry or repository-mining data on what instruction files actually
  contain, how often they change, and whether teams are cutting procedure from
  them
- whether anyone in the adopting organisation sets the agent's authority at all,
  or it is left at vendor defaults

## The three boundaries — neighbouring phenomena own these

This construct borders three other phenomena on the radar. A source on the far
side of a boundary is evidence *there*, not here. It is not `wrong-construct` in
the sense of measuring nothing — it measures something this site cares about —
but it is not evidence for this claim, and is logged under `wrong-construct` with
the neighbour named in the reason.

| Neighbour | It owns | This claim owns | Test |
| --- | --- | --- | --- |
| `same-tool-different-outcomes` | The spread in delivery outcomes **between** teams or companies with the same tooling, and what separates high and low performers | What goes into the agent's environment, and its effect **within** a team when only the environment changes | Does the source compare teams, or compare one team's agent under two environments? If high performers are shown to differ *specifically* in how they configure the agent, it bears on both — propose it here and say so in the report. |
| `evals-become-the-spec` | The executable acceptance suite as the human-authored definition of "done" | Tests and contracts as **feedback the agent works against**, when the source measures their effect on the agent's output | Is the suite there to define done, or to steer the agent? A source can do both; cite it here only for what it shows about the agent's output. |
| `review-shifts-to-verification` | Assuring changes **before merge** — review agents, risk-tiered review, merge gates | Checks **inside the agent's own loop** — hooks, test runs it reacts to, permission limits | Who consumes the check's result? The agent: here. The merge decision: review. |

A signal may legitimately be cited under two phenomena with different stances.
That is not double counting; it is one source bearing on two claims.

## Near neighbours — reject these under `wrong-construct`

Every one of these is real, adjacent, and silent on which parts of a team's
configuration change what the agent achieves. They will dominate your search
results.

| Near neighbour | Why it is not this construct |
| --- | --- |
| **Harness engineering inside the product** — control loops, edit-tool formats, tool schemas, retry and compaction logic, multi-agent orchestration inside a vendor's agent | Measures how an agent is *built*. The claim is about what teams put around one they did not build. Studies showing the same model scores differently under different vendor harnesses are about procurement and agent design, not about a team's configuration work. This is the largest category the old framing attracted. |
| Building an agent from scratch — open-source agent architectures, "how we built our coding agent", SDK-assembled agents | Same reason. The builder is the vendor, even when the vendor is a company's internal tools team shipping an agent product. |
| Model benchmark rankings, model releases, context-window and long-context retrieval benchmarks | Measures the model. The construct holds the model fixed — except across generations, where the *configuration* must be held fixed instead. |
| Agent and framework adoption rates | Measures uptake. Adopting an agent says nothing about what its environment contains. |
| General LLM-application telemetry — how production LLM apps call services, framework usage in non-coding apps | Measures LLM applications in general, not coding agents' working environment. |
| Prompt-engineering tips and one-shot prompt quality | A single prompt is not a maintained environment. A *standing* instruction file is in scope; advice on phrasing a request is not. |
| "Context engineering" and "prompting is dead" think-pieces, maturity frameworks | Measure nothing. A framework becomes evidence only when an adopting organisation reports using it with results. |
| Vendor feature launches — a new rules format, skills support, MCP support | A `tool-shift` that makes configuration possible is not evidence that teams do it or that it works. At most `contextual`, and only if it reports uptake. |
| Token cost and context-window economics | Measures spend. It bears on `compute-becomes-a-budget-line`. |
| Developer productivity and time saved from AI tools | Measures throughput under whatever environment existed. Says nothing about the environment's contribution. |
| Agent security incidents and prompt-injection research | Bears on `agents-become-the-perimeter`. In scope here only when the source reports a team changing the agent's authority in response, and what that did. |

**The most seductive near neighbour is "same model, different harness".**
Several studies in the last year show one model scoring very differently under
different agent harnesses, and they are quantitative, controlled and on topic.
Under the old framing they were the strongest support. Under this one they
measure the vendor's design choices: a team buying an agent does not choose its
edit-tool format. Reject them under `wrong-construct` — **unless** the varied
element is something a user configures (instruction files, context, tool access,
permissions, workflow), in which case they are exactly the construct and among
the best evidence available.

## What would refute the claim

These are search terms, not decoration. Give them their own passes, and give the
first one the most. Start from the phenomenon's `whatWouldChangeThis`, then add
these:

- **Information fails where it should help** — controlled tests that supply
  organisation-specific context (architecture notes, conventions, a design
  system, internal API docs) on work that depends on it, and find no gain over
  procedure or over nothing. This is the claim's weakest point. Search for it
  directly: "context file" or "repository documentation" ablations on private,
  proprietary or unfamiliar codebases; internal-API and enterprise-codebase
  benchmarks; design-system adherence tests.
- **Procedure holds** — the same procedural instructions keeping their measured
  value on a newer model, or a frontier model gaining as much from a prescribed
  workflow as an older or cheaper one
- **Agents find it themselves** — agents that search code, tickets and docs on
  their own matching curated context, so curating it stops paying off
- **Nobody bounds the agent** — organisations leaving tool access, permissions
  and sandboxing at vendor defaults, with no one deciding what agents may touch.
  Central ownership by a platform or security team is not this; see *"The team"*
  above.
- **Nobody maintains any of it** — surveys or repository mining showing agent
  configuration rare, stale or owned by nobody

**Content and upkeep data takes a stance by what the claim predicts** (see
*Stance* in the shared instructions). Files whose procedure shrinks while their
information grows, or procedure cut after a model upgrade, are `supports`.
Procedure that keeps accumulating across model generations without loss of
results is `counter` to the decay half. Data showing files are maintained, with
no split by kind, supports only the practice — that teams build the
environment — and its `note` must say so.

A credible instance of any of these is the most valuable item this run can
return, and belongs in the proposal as an attachment with `stance: "counter"`.

### Mind the sign on the existing counters

The reframe turned the claim's old counter-evidence into its new support: the
instruction-file studies that found procedure changing nothing are now what the
thesis predicts. That is exactly the move the shared instructions warn against —
a claim that survives by redefining its failures — so re-stance only when the
source earns it. The rules run in both directions: a current `supports` gets the
same scrutiny as a current `counter`.

- **Re-stance to `supports` only if the varied element was clearly procedure**,
  and quote the source to show it. A study that varied a mixed context file
  without separating its contents does not qualify.
- **A mixed or information-bearing variation that found no effect stays
  `counter`** — it now counts against the information half. Do not move it to
  `contextual` to keep the profile clean.
- **A current `supports` that varied a mixture** is judged by what the frontier
  arm shows. If the frontier model succeeded without the configuration, the
  information in it was not needed for that task (see *Information means…*
  above), and the gap between models is the decay proxy: `supports`, with the
  `note` saying proxy. If the frontier model failed without it and the
  configuration did not help, that is `counter` to the information half.
- **A null result on one current model is weaker support than it looks.** It is
  consistent with decay but does not show it; only a cross-generation comparison
  does. Say which it is in the `note`.
- **The decay proxy.** No published study may yet run the same configuration on
  two model generations. A cheaper or older model against a frontier one, same
  configuration, same generation or not, is the accepted proxy: cite it
  `supports` or `counter` by whether the gap closes on the stronger model, and
  write "proxy" in the `note`. If the run finds no direct cross-generation test,
  say so in section 7 and as a `suggestions` entry on `thesis`, as the shared
  *Symmetry* section asks.
- **Use `restance:` reasons that name the reframe** — for example
  `restance: framing A (2026-10-27) — varied procedure only (named techniques)` —
  and count every re-stance in the report's section 7. If most of the profile's
  support arrived by re-stance rather than by new finds, say so plainly.

A source that measured something other than a coding agent's configuration —
general LLM-application telemetry, for instance — is not a counter under either
framing. Detach it as `wrong-construct`.

---

## Altitude — this claim's failure mode is the configuration guide

**The test: does the source show an environment change and an outcome, or a team
and its practice — not just a recommendation?**

- **Right altitude:** a controlled comparison of the same agent with and without
  an instruction file, a body of context, a tool set or a workflow step, with an
  outcome measured; the same setup run on two model generations; a named team
  describing what it put in, who owns it, and what changed in results when it
  changed; telemetry or a survey on what agent configuration contains and how it
  evolves; a practitioner account with numbers — "we cut the procedure out of
  our `CLAUDE.md` and kept the architecture notes, and first-pass success went
  from X to Y".
- **Wrong altitude:** "ten tips for a better `AGENTS.md`"; "context is the new
  code" keynotes; vendor documentation; a repository of example rules files; a
  tool launch post; any item whose only evidence is that configuration is
  *possible*.

**A configuration guide is not a practice.** Advice on how to write an
instruction file says nothing about whether anyone does, or whether it works.
Reject under `too-vague` or `illustrative-not-measured`.

**Self-assessment is weak here.** Developers are poor judges of whether their
instruction file helps — one cited test found a full governance file scoring
the same as no guidance, against its author's expectation. A
practitioner account that says "our rules file made a big difference" with no
comparison is a `weak` signal at best; say so in `risksAndCaveats`.

**Name the model, the agent and the date.** The claim is about change across
model generations, so an effect without its model is half a data point. State
the agent and model in the summary — "not stated" where the source omits them —
and record when the measurement was made.

---

## Search window

**Twelve months** — items whose underlying measurement or practice falls in the
last year. This field moves with every model release; an effect measured on a
model two generations old is weak evidence about today.

Older material qualifies only as **baseline** — an earlier measurement of the
same configuration effect that a current one can be compared against. For this
claim a baseline is unusually valuable: paired with a current result on the same
setup, it is the cross-generation comparison the decay half needs.

## Source mix

- **Controlled comparisons are the priority**, from academic, practitioner and
  vendor sources alike. They are the only thing that settles either half.
  Record the agent, the model, the kind varied, the number of runs and the
  outcome measure every time. Academic preprints are allowed up to **3 items**
  here — unlike most claims, this one is being measured actively in
  software-engineering research, and the work is fast enough to fall inside the
  window.
- **Named organisations describing their agent environment** are the priority
  for the practice side — engineering blogs, conference talks, InfoQ-style
  write-ups — when they say what kind of configuration they maintain, who owns
  it and what changed.
- **Surveys and telemetry** on the content and upkeep of agent configuration.
  Rare and valuable. Repository-mining studies that classify what public
  instruction files contain count here.
- **Practitioner accounts** with a before-and-after are first-class. Without a
  comparison they are weak.
- **Vendor content: cap at 2 items, and never as the sole context.** Vendor
  means a company writing about its own product or a customer's use of it — an
  agent vendor, a framework vendor testing its own docs on agents, a design-tool
  vendor reporting a customer's results — not a company writing about how its
  own engineers work, which is a company engineering blog. Agent
  vendors have every reason to say configuration matters (it makes their product
  look capable) and that it doesn't (their defaults are good, and the new model
  needs less). Model release notes that tell users to delete instructions are
  vendor content. Context-registry, rules-marketplace and agent-platform vendors
  sell configuration and are not independent at all. Name the vendor in the
  evidence ledger's "independent of" column.
- **Comment threads** where practitioners compare results with and without a
  configuration are primary sources. Count the voices and quote the numbers.
- **Never** use aggregators, reposts or AI-generated recap blogs as the sole
  source.

## Where to hunt

Unless `config/sources/claim-configuring-the-machine.json` exists, there is no
candidate pool and the venue list is the whole method. Work through these
deliberately rather than issuing one broad search:

- **arXiv (cs.SE)** — studies of `AGENTS.md` and context files, tool-access
  ablations, repository-mining work on agent configuration, and benchmarks on
  private or enterprise codebases where the model cannot have seen the code.
  Read the method: was the agent held fixed and only the environment varied, and
  what exactly was in the environment?
- **Practitioner experiment write-ups** — engineers who ran their own
  comparisons: martinfowler.com, personal blogs, DEV Community, Substack. These
  are where the cited instruction-file evidence came from, and where a
  cross-generation re-run is most likely to appear.
- **Company engineering blogs** — teams describing the environment they maintain
  for agents: internal knowledge for agents, skills libraries, MCP gateways,
  permission policies, agent platform teams.
- **Conference talks** — QCon, LeadDev, AI Engineer, platform-engineering
  events. Prefer talks where the speaker's organisation adopted the practice
  over talks where it sells it.
- **Practitioner forums** — Hacker News threads on instruction files and agent
  setups, r/ExperiencedDevs, r/ClaudeAI, r/cursor. Threads where people report
  what happened when they cut or changed their setup after a model upgrade are
  the find.
- **GitHub itself** — public discussions and changelogs in repositories that
  maintain agent configuration, where the history shows what was added and what
  was removed.

---

## Filtering

Output an item only if it bears on what a team puts into the working environment
of a packaged coding agent AND at least one of:

- it measures an outcome under two environments with the agent and model held
  fixed
- it measures the same environment on two model generations
- it describes a named team's maintained agent environment with ownership,
  upkeep or results
- it quantifies what agent configuration contains, how widespread it is, or who
  controls it
- it credibly refutes the claim in any of the ways listed above

Reject items that are:

- any near neighbour from the table above, however well reported
- anything on the far side of one of the three boundaries — name the neighbour
- configuration guides, templates, tip lists and maturity frameworks with no
  adopting organisation
- vendor launches of configuration features with no uptake data
- context-registry or agent-platform vendor content, absent original data on
  customers' results

**Already judged elsewhere.** Earlier generic and arXiv runs declined several
harness studies as `adjacent-already-covered` or `capped-this-run`. Most measured
vendor harness design and are now `wrong-construct` here anyway; check each
under *Exception 2* of the shared instructions, and redraft only one whose varied
element is something a user configures.

## Ranking — prefer in this order

1. Controlled comparisons of **information** on work that depends on it — on
   either side
2. The same configuration measured **across model generations**
3. Other controlled comparisons of a user-configurable element, agent and model
   held fixed
4. Credible refutation of any other kind listed above
5. Named organisations describing their maintained agent environment, with
   ownership and results
6. Content, prevalence and upkeep data — surveys, telemetry, repository mining
7. Practitioner accounts with a before-and-after, where several independent
   voices converge

Aim for **4–8 items per run**. A run that returns two solid tests of the
information half and a careful detachments list is a better result than eight
more items showing that procedure does not help.

---

## Claim notes on the shared instructions

- **Expect `study` and `practitioner-account` to dominate** a healthy run, with
  `field-report` third. A run that is mostly `tool-shift` has drifted into vendor
  launches.
- **Category.** `AI Agents` will usually be the primary `category`, with
  `SDLC Change` or `Quality & Testing` as secondary.
- **The detachments list is expected to be substantial.** Apply the construct
  test to every current citation. In particular, check each `supports` item: did
  the source vary something a user configures, or describe a team maintaining
  its agent's environment — or did it describe a vendor building an agent?
  Material in the second group is `wrong-construct` under the new framing, even
  where it was correctly cited under the old one; say so in the `reason`
  (`wrong-construct: vendor harness design, predates the 2026-10-27 reframe`) so
  the apply report does not read as a correction of earlier reviewers.
- **Classify the survivors by kind.** In section 7's *Resulting evidence*, group
  the evidence that would remain by procedure, information and authority, with
  stance and primary for each. A half with one primary source is a finding, not a
  footnote.
- **Check every cited signal's type fields while you are there.** At least one
  currently cited signal has no `signalType`. You cannot fix a published signal
  from this run; list any you find in the report so a person can.
- **The consequences section matters more than usual.** The ring and `contested`
  were set against the harness construct. Say plainly in the proposal's
  `suggestions` whether `observedReach`, `contested`, `contestedNote` and
  `reachRationale` still read true — but never which ring it should move to. If
  re-stancing leaves the profile with no counter-evidence, say that a clean
  profile after a reframe is untested rather than uncontested, and point at the
  information half as where the test has not yet been run.
- **The already-published check matters.** Signals elsewhere on the site —
  filed under `evals-become-the-spec`, `review-shifts-to-verification`,
  `same-tool-different-outcomes` or `agents-become-the-perimeter`, or uncited —
  may measure this construct too. Search `public/content/ai-signals/index.json`
  and propose them by their existing ids.
