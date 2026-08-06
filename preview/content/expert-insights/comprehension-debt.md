A new idea is entering software leadership discussions. Perhaps code should no longer be written by humans, and perhaps it should no longer be reviewed by humans either[^1].

This may sound extreme, but it reflects a real shift. In agentic software development, teams increasingly move from writing code to designing specifications, scenarios, validation environments, and feedback loops. AI agents produce the code, test it, modify it, and continue until the system appears to satisfy the intended behaviour.

This can be a major productivity leap.

But it also changes one of the most important mechanisms of software work. It changes how people build understanding.

If the human role shifts from maker to approver, and from approver to supervisor of automated validation, software organizations need a way to recognize the risk that follows. This risk can be called **comprehension debt**, the widening gap between what the codebase does and what the organization still understands.

## Understanding does not scale with code

Agentic software development can produce more code in less time. But understanding does not scale in the same way.

In software development, much of the valuable work lies in reading, interpreting, and modifying existing code, not only in writing new code. Already before the agentic coding era, program comprehension research suggested that developers spend most of their time trying to understand code, and only a small share directly editing it[^2].

This is why the key risk with AI agents is not only faulty code, but comprehension debt. In simple terms, a situation in which the codebase grows and changes faster than the team’s collective understanding of it[^3].

Comprehension debt resembles technical debt, but its primary object is not the code. Drawing on classical automation studies, we can understand it as a socio-technical risk to the organization’s distributed cognition[^4]. That is, the shared ability to make sense of a system through people, tools, documentation, tests, routines, and increasingly AI agents.

In software work, this risk becomes visible when the codebase grows or changes faster than people can understand it. The system may still work, the tests may still pass, and releases may continue as planned. But the organization’s understanding becomes thinner: fewer people know why the system behaves as it does, where its fragile points are, and what might happen when something breaks in an exceptional situation.

This does not mean that AI inevitably weakens competence. The problem is not AI as such, but how it is used. Is it support for thinking, or a substitute for thinking? If AI is used to offload the cognitive effort involved in tasks that are critical for learning and comprehension, the chain through which competence is formed may become thinner. If, instead, it is used to build explanations, generate follow-up questions, compare alternatives, and formulate testable assumptions, it can also strengthen understanding[^5].

## The lesson from automation

The phenomenon is not new. A defining feature of automation has been a recurring pattern. What can be automated is automated, and the remaining work is left to humans. This pattern has often been guided by the long-standing vision of “lights-out” factories, production environments that can operate with little or no human presence on-site.

Automation history has repeatedly shown that when work shifts from doing to monitoring and evaluation, people’s situation awareness and deep understanding of the system may weaken unless they are deliberately supported[^6].

In process industries, automation shifted work from direct action to interpreting abstract representations on screens. When work is learned mainly through displays, understanding can become a set of situation-specific rules of thumb. I know what to do, but not why.

There is a clear analogy to software work. Previously, the developer wrote, read, debugged, and was, in a sense, inside the codebase. Understanding emerged through steps, experiments, errors, and fixes.

Now AI, if given permission, can carry out large parts of the workflow autonomously. It can generate code, create tests, run tests, review code, and fix bugs. This can happen in a loop until requirements are met. The developer may see the end state, the diff, the test result, and the agent’s explanation, but not necessarily the reasoning and experimentation through which the result was produced.

In this way of working, approval heuristics can easily emerge. Under time pressure, and with growing volumes of agent-generated changes, “this looks plausible” may become an everyday basis for acceptance. The risk is amplified when teams increasingly rely on AI-generated explanations, because such explanations can make human reasoning feel less necessary.

Software work has, of course, gone through abstraction shifts before: from machine code to high-level languages, libraries, frameworks, cloud platforms, and low-code tools. But AI changes the character of abstraction. It does not only hide lower-level complexity behind better tools; it can generate alternatives, interpret results, run checks, and increasingly participate in deciding what should be accepted.

That is the important shift. Agentic development is not only about producing code faster. It changes where interpretation, judgment, and responsibility sit in the work system.

## The problem appears in exceptional situations

In normal situations, automation may seem sufficient. The agent writes the code, the tests pass, the review looks clean, and the release moves forward. But in exceptional situations, the organization needs people with situation awareness.

Understanding the codebase is needed when an unusual error appears in production, a security vulnerability must be located quickly, a customer’s critical process stops, or an AI agent suggests a fix that looks plausible but breaks a hidden assumption.

From the history of automation, we know that competence usually does not disappear suddenly in crises. It disappears gradually in everyday work. Crises only reveal what has no longer been practiced.

This is connected to the classic paradox of automation. The more reliable a system is in normal situations, the less often a human needs to intervene. And the less often a human intervenes, the less prepared they are for the rare situations in which automation behaves unexpectedly[^6].

In software work, this risk may appear in both approval-based and auto-mode workflows. In the first, agents may produce so many changes, checks, alerts, and approval requests that review becomes routine confirmation: press enter, accept, move on. Recent industry survey data already points to serious incidents linked to AI-generated code and to developers bypassing or delaying security checks due to alert fatigue[^7] [^8].

In the second, even that acceptance moment disappears, as the agent is given autonomy to approve changes, bypass checks, or decide that a warning does not require human attention. In that case, automation does not only produce work for humans to evaluate. It also starts to participate in the gatekeeping of evaluation and approval.

This may be efficient in clearly bounded situations. But at critical points it moves comprehension debt to a new level. _Who understands the basis for the decision if both the proposal and its approval are automated?_

## What software can learn from other automated domains

Nuclear power, aviation, and process industries have all faced versions of the same problem.

In nuclear power plants, automation has not made human understanding unnecessary. It has defined it differently. The human task is to understand the system as a whole, especially in situations where automated functions are not enough or behave unexpectedly. That is why exceptional situations are practiced in advance through simulators and shared operating models[^9] [^10].

In aviation, the autopilot has made flying safer and more efficient, but overreliance on automation can erode manual flying skills and situation awareness. Applied to software work, the question is simple: when everything goes smoothly, the agent can be an excellent autopilot. But who flies manually when something happens in production that the agent does not recognize?

In remote monitoring in process industries, the operator does not continuously control a single valve or regulator. Instead, they maintain an overall picture, sometimes across several processes at the same time, identify abnormal developments, and intervene at the right moment.

This increasingly resembles agentic software work. The developer may no longer be only the maker of individual lines of code, but the orchestrator of agents, the interpreter of their suggestions, and the evaluator of the overall state of the system.

This is not a lighter role. It is a different form of expertise, one that emphasizes conceptual understanding, situation awareness, prioritization, and the ability to act when automation reaches its limits.

## What needs to change in practice?

Comprehension debt is not only a competence gap of an individual developer. It is an organizational resilience risk. It therefore cannot be solved only by appealing to individuals. New work practices, management practices, and structures for maintaining competence are needed.

Seen this way, comprehension debt is not only a coding risk. It is a work-system risk.

Five shifts stand out.

1. **From approval to explanation**. Critical changes should not be approved unless someone can explain what they do, why they matter, and what they might break.

2. **From invisible to visible competence**. Organizations need to know where understanding resides in the codebase. Who understands what? Which tools and documents support that understanding? Where it depends too heavily on a single person, outdated documentation, or AI?

3. **From delegation to learning**. AI should not only be used to produce outputs. It should also surface assumptions, alternatives, dependencies, and failure modes. The agent should not only answer. It should help the team ask better questions.

4. **From rare crises to practiced situations**. Exceptional situations should be simulated and rehearsed, not left to real incidents. Teams need practice in debugging agent-generated code, challenging plausible explanations, and responding when automated checks are incomplete or misleading.

5. **From full automation to retained manual understanding**. Teams need ways of working where the developer, not the agent, forms the initial interpretation of a problem. In critical areas, some parts of the work should remain deliberately human-led, not because AI cannot help, but because competence must be maintained through use.

Finally, **metrics** also need to be updated. If we measure only how fast code is produced and shipped, comprehension debt remains invisible. Organizations should also ask who understands this change, who can fix it, who can assess its effects on other parts of the system, and what happens if the agent is unavailable or its suggestion is wrong.

## A new management question

AI agents are not the problem. The problem emerges if their adoption is seen only as a productivity leap, and not also as a change in the organization’s competence system.

Highly automated industries teach us that human competence cannot be left to chance. It must be practiced, measured, and maintained as part of a wider system of shared understanding.

Codebase comprehension debt is not an entirely new phenomenon. It is the contemporary software-work version of a problem that automation research has long identified: how to preserve human situation awareness and professional conceptual understanding when machines handle an ever larger share of normal work.

For software companies, this means a new management question:

**How do we ensure that, even as agents take greater responsibility for the software development lifecycle, humans retain the ability to understand, question, and, when needed, take control?**

In the future of software work, it is not enough to ask how much faster agents can produce code. We must also ask how well humans still understand the systems on which business, safety, and customer value depend.

[^1]: Kahana, E. (2026) Built by Agents, Tested by Agents, Trusted by Whom? https://law.stanford.edu/2026/02/08/built-by-agents-tested-by-agents-trusted-by-whom/

[^2]: Feitelson, D. G. (2023), From Code Complexity Metrics to Program Comprehension https://cacm.acm.org/research/from-code-complexity-metrics-to-program-comprehension/

[^3]: Ahmad, M. O. (2026), Comprehension Debt in GenAI-Assisted Software Engineering Projects https://arxiv.org/abs/2604.13277

[^4]: Hutchins, E. (1995), Cognition in the Wild https://mitpress.mit.edu/9780262082310/cognition-in-the-wild/

[^5]: Anthropic (2026), How AI assistance impacts the formation of coding skills https://www.anthropic.com/research/AI-assistance-coding-skills For a human factors perspective on expertise, orientation and technology-in-use, see also Klemola & Norros (2001), Practice-based criteria for assessing anaesthetists’ habits of action, and Norros (2014), Developing human factors/ergonomics as a design discipline.

[^6]: Bainbridge, L. (1983), Ironies of Automation https://www.sciencedirect.com/science/article/pii/0005109883900468

[^7]:
    Aikido Security (2026), State of AI in Security & Development
    https://www.aikido.dev/state-of-ai-security-development-2026

[^8]:
    DevOps.com (2025), Survey Surfaces Rising Tide of Vulnerabilities in Code Generated by AI
    https://devops.com/survey-surfaces-rising-tide-of-vulnerabilities-in-code-generated-by-ai/

[^9]: International Atomic Energy Agency (2021), Systematic Approach to Training for Nuclear Facility Personnel https://www.iaea.org/publications/13535/systematic-approach-to-training-for-nuclear-facility-personnel-processes-methodology-and-practices

[^10]:
    U.S. Nuclear Regulatory Commission, Licensing Process for Operators
    https://www.nrc.gov/reactors/operator-licensing/licensing-process
