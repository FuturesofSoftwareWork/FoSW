A bit over a year ago, I was working with computer science students and had a growing sense that something big was changing in software engineering. To understand it better, we wrote a project plan and applied for funding to explore what software work could be in the 2030s and how firms should adapt to the forthcoming changes.

Since then, the pace of change has been… unreal. It’s hard to overstate what’s happening: we’re living through the most radical transformation in history, how knowledge work gets done, and software work sits right at the center of it.

Software work—coding, testing, reviewing, planning, product management—has become one of the most common well‑paid professions in today’s economy. The cliché that “every business is a software business” exists for a reason: software has reshaped entire industries.

Yet the day‑to‑day craft of building software changed more slowly. For years, productivity gains were stubbornly incremental—so in many orgs, a sustained 1–2% improvement was considered a major win.
That baseline expectation is now breaking.

### The measurement problem: science is behind the curve

Robert Solow, a Nobel Prize–winning economist, coined what became known as the **Solow Paradox** in 1987: “You can see the computer age everywhere but in the productivity statistics.”

AI in software work is starting to feel like a modern replay. Read the scientific literature on AI and developer productivity and you’ll often find modest gains—and in some contexts even negative effects (1). A big reason is timing: papers appearing today typically analyze workflows and model capabilities from roughly a year ago. In a field that can change materially in weeks, that lag is decisive.

What these studies do make clear is that outcomes depend heavily on context (2). Greenfield tasks and well‑scoped projects often improve substantially, while complex brownfield systems—with tight constraints, legacy patterns, and hidden coupling—can get slower.

So the right mental model isn’t “AI automatically raises productivity.” It’s “AI shifts the frontier, but only if the work is structured and the constraints are made explicit.”

### The inflection point: models crossed a practical threshold

Toward the end of 2025, the vibe shifted. In blogs and social media, many developers and teams started describing a _before_ and _after_ moment—particularly after releases like Claude Opus 4.5 and Codex 5.1.

What changed wasn’t just “a bit better autocomplete.” The stories started sounding qualitatively different:

- “Our teams have increased productivity by 200%.”
- “We are not writing code by hand anymore—AI writes 100% of it.”
- “Our time has shifted from coding to reading plans, reviewing, and steering.”
- “What used to take weeks is done in hours; what took months is done in days.”

To be clear: these are _signals_, not settled science. But the convergence of reports across independent practitioners is hard to ignore. It increasingly seems evident that software development is going through an extreme, profession‑defining change—not just in speed, but in the _type_ of work we do.

We’re watching the developer role shift from “write code” toward “specify, steer, verify, and integrate.” That changes workflows, team shapes, incentives, and ultimately identity: what it _means_ to be a software developer.

And yet that gap between visible capability and measured outcomes is **Productivity Paradox 2.0**: we can feel the incredible acceleration in day‑to‑day work, but it still doesn’t reliably show up in aggregate productivity statistics—at least not yet.

### Why it suddenly feels different: capability + context discipline

Two drivers seem to be compounding.

#### 1) Underlying model capability improved (especially for agentic coding)

Recent frontier models are not just “smarter”; they’re better at following multi‑step plans, maintaining internal consistency, and operating in longer workflows. This is the difference between “help me write a function” and “take this repo and implement the whole change safely.”

#### 2) Teams learned to fight “context rot”

A big limiter in long, real‑world tasks is that model performance can degrade as context gets longer and messier—missing key details, over‑weighting recent tokens, or failing to reconcile constraints. This phenomenon has increasingly been described as **context rot**.

So teams adapted. Instead of dumping everything into the prompt, they built lightweight “context hygiene” practices:

- **Keep prompts small and structured**: goal, constraints, acceptance criteria, relevant files only
- **Externalize memory**: short design notes, decision logs, “project brief” docs that get refreshed
- **Chunk work deliberately**: small PRs, explicit intermediate checkpoints, test‑first loops
- **Use AI to maintain its own context**: ask it to summarize what it learned, track assumptions, and produce a running “working spec”

### So what does “AI productivity” actually look like now?

In teams leaning into this shift, “productivity” is changing shape:

- **Output isn’t just more code**—it’s faster iteration cycles
- **Work shifts left** into clearer specs, better tests, tighter interfaces
- **Engineering time reallocates** from typing → reviewing, designing, validating, and shipping

In other words, the unit of progress becomes “validated change in production” (or created customer value), not “lines written.”

### A pragmatic playbook: how to ride the curve without getting wrecked

If you want the upside without the chaos, aim for a workflow where AI is powerful but bounded:

1. **Treat AI like a junior‑but‑fast engineer**\
   It can move quickly and miss landmines. Your job is to set constraints and verify.

2. **Make review the bottleneck on purpose**\
   Put senior judgment into architecture, interfaces, and PR review—not raw code production.

3. **Invest in test leverage**\
   The stronger your test harness, the safer it is to let an agent generate more code.

4. **Build “context artifacts”**\
   Maintain a living project brief, API contracts, invariants, and non‑negotiables. Keep them current. One of the fastest ways to get bad output from the agent is to feed it with outdated design docs.

5. **Start with prototyping, then harden**\
   The biggest wins tend to appear first in greenfield/prototyping. Brownfield gains are more challenging and require better practices and more discipline.

### What we’re working on right now

Traditional productivity metrics—velocity, lines of code, PR throughput—don’t work in AI‑assisted development. They miss the trade‑offs that matter: AI can accelerate coding while shifting effort into review, verification, and coordination, and it can improve short‑term correctness while quietly increasing maintainability risk. The speed of AI also creates new challenges: reviewer cognitive load can rise quickly, and it becomes genuinely hard to keep up with the volume of AI‑generated change.

So we need a **holistic** picture of productivity, not a single speed metric. We also need to measure productivity over months—not just in short, test-like comparisons where two groups build the same feature with/without AI. In short tasks, cognitive load and coordination costs don’t accumulate, and long-term maintainability signals don’t have time to surface.

That’s why we’re building an **AI Productivity Triangle** (using lightweight telemetry + SPACE‑style pulse surveys):

- **Efficiency**: speed and flow
- **Effectiveness**: quality and maintainability
- **Sustainability**: developer experience, cognitive load, and trust

We’re currently running a pilot with one of the companies in the project—stay tuned for results.

### Where this is headed

**If the signals we’ve been seeing repeatedly are true, we are entering a world where writing code is no longer the scarce activity. The scarce activity becomes:**

- defining the right problem,
- specifying it clearly,
- validating solutions,
- and integrating changes responsibly into real systems.

That’s not “the end of software engineering.” It’s a rebalancing of what engineering _is_.

And yes—what an amazing time to be alive.

(1) Becker et al. 2025, *Measuring the Impact of Early‑2025 AI on Experienced Open‑Source Developer Productivit*y [https://arxiv.org/abs/2507.09089](https://arxiv.org/abs/2507.09089)

Denisov-Blanch (2025) *Does AI actually boost developer productivity?* [https://www.youtube.com/watch?v=tbDDYKRFjhk](https://www.youtube.com/watch?v=tbDDYKRFjhk)
