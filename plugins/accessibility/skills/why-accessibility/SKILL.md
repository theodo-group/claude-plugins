---
name: why-accessibility
description: A skill that helps developers and teams understand and justify the importance of accessibility to stakeholders, providing ethical, legal, and business arguments tailored to their context.
---

# Understand the context

Before making the case, ask the user for context if not already provided:

- Who is the audience? (themselves, engineering manager, product manager, C-suite, client, investors)
- What type of app is it? (consumer, enterprise, government, health, finance)
- What country or market is the app targeting?
- Is there a specific objection to address? (cost, priority, timeline)

Tailor the arguments below to the audience and context.

# Arguments for accessibility

## 1. Legal and compliance risk

Accessibility is a legal requirement in many jurisdictions, not an optional feature.

- **USA**: The Americans with Disabilities Act (ADA) has been interpreted to cover mobile apps and websites. Lawsuits against companies for inaccessible digital products have grown significantly — over 4,000 ADA digital accessibility lawsuits were filed in 2023 alone.
- **EU / France**: The European Accessibility Act (EAA) mandates that apps in key sectors (e-commerce, banking, transport, media) must be accessible by June 2025 — this covers nearly all types of clients. In France, failure to comply may result in a total penalty of up to **€75,000** from the ARCOM, renewable every 6 months.
- **UK**: The Equality Act 2010 requires reasonable adjustments to avoid discrimination against disabled users.
- **Canada**: The Accessible Canada Act (ACA) and provincial laws apply to federally regulated organizations.
- **Australia**: The Disability Discrimination Act (DDA) covers digital services.
- **Government / public sector**: WCAG 2.1 AA compliance is mandatory in most countries for public sector digital services.
- **Internal apps are not exempt**: Enterprise apps used by employees are subject to the same legal obligations — disability is common in the workplace and often invisible. It even more important to make internal tools accessible, as it can leads to hiring discrimination.

### Precisions for EU and France

The European Accessibility Act (EAA) applies to products and services in the following sectors:

- Your app/website provides one of these **services**: **electronic communication** services (messaging, email, etc.), **audiovisual media** services (television, radio, streaming, etc.), **transportation** services, **banking** services, or **online commerce** services are affected.
- Your client is a **Large Company**, i.e. with an annual revenue of over €250 million in France
- Your client is part of the **Public Service**: a company that performs **public service missions**, or a **public body** directly.

### French penalties in detail

| Who                               | Violation                                                                    | Max penalty  |
| --------------------------------- | ---------------------------------------------------------------------------- | ------------ |
| Large Companies & Public Services | Breach of transparency obligations (missing accessibility declaration, etc.) | **€25,000**  |
| Public Services only              | Non-compliance (100% accessibility not reached)                              | **+€50,000** |
| Service applications              | 5th class fine                                                               | **€7,500**   |

The ARCOM can impose up to **€75,000** in total (€25,000 + €50,000 for public services), renewable every 6 months.

Key message: _"Not investing in accessibility now creates legal liability that will cost far more to fix under pressure — or in court."_

## 2. Market size and revenue opportunity

Disability is not a minority edge case.

- **1.3 billion people** worldwide live with some form of disability (WHO, 2023) — about 16% of the global population.
- **Situational disabilities** multiply this number: a parent holding a baby, someone in bright sunlight, a user with a broken arm — all benefit from accessible design.
- Older users (a growing demographic) often experience age-related accessibility needs (vision, hearing, motor).
- **Many disabilities are invisible** — they are not always obvious at a glance, which means the real affected population is larger than it appears.

Source: https://www.who.int/health-topics/disability#tab=tab_1

### France-specific statistics

When targeting the French market, these numbers make the case concrete:

| Disability            | People affected |
| --------------------- | --------------- |
| Visual impairment     | 2 million       |
| Hearing impairment    | 5.4 million     |
| Color blindness       | 3.3 million     |
| Dyslexia              | 6.6 million     |
| Motor disability      | 2.3 million     |
| Intellectual / mental | 5–6 million     |

**1 in 3 people in France has some form of disability** — it affects every sector and every profession.

Key message: _"We are voluntarily excluding a market segment the size of China's population."_

## 3. Improved experience for all users (curb-cut effect)

Accessibility is broader than disability — it is part of the overall quality of a product and affects all users.

- **Font scaling not supported** → problems for older users, or jobs where the phone is held at arm's length (e.g. delivery cyclists).
- **No captions on a video** → impossible to follow in a public space (metro, train) without headphones.
- **Low contrast** → text is harder to read in general, and impossible outdoors in direct sunlight.
- Keyboard navigation speeds up power users.
- Clear labels and readable fonts reduce cognitive load for everyone.
- Screen reader support also improves SEO (semantic structure, alt text, labels).

Key message: _"Every accessibility fix makes the product better for all users."_

## 4. Code quality and testability

Accessible apps are easier to test — and this is a concrete engineering benefit.

- The semantic properties used by screen readers (labels, roles, states) are the **same properties used by testing frameworks** (Espresso, XCTest, Flutter's `find.bySemanticsLabel`, React Native Testing Library, Maestro from integration tests).
- Writing accessible code enforces clear, meaningful component structure — which is easier to maintain, review, and onboard new developers into.
- Catching accessibility issues early is cheaper than fixing them in QA or after release.

Key message: _"Accessible code is better code. The same investment that helps screen reader users also improves your test coverage."_

## 6. Cost of fixing it later

Accessibility is significantly cheaper when built in from the start.

- Retrofitting accessibility into an existing product costs **10x more** than building it in from the beginning (referenced in WebAIM and Deque studies).
- The longer inaccessible code accumulates, the more components need to be refactored.
- User complaints, negative reviews, and viral posts about exclusion create reputational damage that is hard to quantify but very real.

Key message: _"The question is not whether we pay for accessibility — it's whether we pay now or later, with interest."_

## 7. Ethical responsibility and brand reputation

- Companies that publicly commit to inclusion attract talent, customers, and investors who share those values.
- Inaccessible products send a message: _"We didn't think about you."_ For users with disabilities, that message lands hard.
- High-profile accessibility failures have led to public backlash and costly litigation. Notable cases: Domino's Pizza was sued for an inaccessible app and settled after 6 years ([Robles v. Domino's, 2022](https://www.adatitleiii.com/2022/06/robles-v-dominos-settles-after-six-years-of-litigation/)); in France, ARCOM issued a formal notice against the Ministère de l'Action et des Comptes Publics for failing to meet its accessibility obligations ([ARCOM, June 2026](https://www.arcom.fr/se-documenter/espace-juridique/decisions/decision-du-24-juin-2026-mettant-en-demeure-le-ministere-de-laction-et-des-comptes-publics)); and Carrefour was condemned over the inaccessibility of its online grocery service to visually impaired users ([Le Monde, June 2026](https://www.lemonde.fr/societe/article/2026/06/10/carrefour-condamne-pour-l-inaccessibilite-des-courses-en-ligne-aux-malvoyants_6700509_3224.html)) — proof that EAA enforcement is no longer theoretical, even against public bodies.
- Accessibility is increasingly part of ESG (Environmental, Social, Governance) criteria used by investors.
  — [W3C Business Case](https://www.w3.org/WAI/business-case/))

Key message: _"Accessibility is a reflection of who we are as a company. It signals whether we build for people or just for the median user."_

## 8. Competitive differentiation

- Many competitors neglect accessibility. Being the most accessible option in a market is a genuine differentiator, especially in enterprise sales where procurement teams evaluate compliance.
- Enterprises and governments require VPAT (Voluntary Product Accessibility Template / Accessibility Conformance Report) documentation from vendors — without it, the procurement may not proceed. In the US, Section 508 explicitly states: _"it is not voluntary to complete an ACR if you wish the government to consider purchasing your product."_ ([Section508.gov](https://www.section508.gov/sell/acr-vpat-faq/))

Key message: _"In B2B, lack of accessibility disqualifies us from procurement. In B2C, it's a differentiator almost no competitor has invested in."_

# Common misconceptions to address

- **"Accessibility only matters for severe disabilities (blind, paralyzed...)"** — In reality, 1 in 3 people is affected in some way. Dyslexia, color blindness, motor difficulty, age-related vision loss — these are all accessibility concerns.
- **"Accessibility only concerns people with disabilities"** — Situational and temporary impairments (broken arm, noisy environment, bright sunlight) affect everyone. Accessibility is a quality concern for all users.
- **"Our app is internal, so it doesn't apply to us"** — Employees have disabilities too, often invisible ones. Internal apps are legally subject to the same requirements.
- **"We'll add it later"** — Retrofitting costs 10x more. Accessibility needs to be in design from day one.

# How to present the case

- **To yourself**: Give an overview of all arguments and ask if they need more details on any.
- **To engineers**: Frame it as technical debt with compounding interest. The longer it waits, the harder the refactor.
- **To product managers**: Lead with user impact, then market size. Frame accessibility tickets as revenue protection and feature flags for a new user segment.
- **To executives / investors**: Lead with legal risk and market size. Quantify the addressable market and reference recent litigation in the company's industry.
- **To clients**: Reference legal obligations in their market and the reputational risk. Offer to include a WCAG audit as part of the deliverable.

# Useful references to share

- WHO Disability Report: https://www.who.int/teams/noncommunicable-diseases/sensory-functions-disability-and-rehabilitation/world-report-on-disability
- WebAIM Million (annual accessibility audit of the top 1M websites): https://webaim.org/projects/million/
- European Accessibility Act: https://ec.europa.eu/social/main.jsp?catId=1202
- ADA digital lawsuits tracker: https://www.adatitleiii.com/
- Deque: The Business Case for Accessibility: https://www.deque.com/blog/the-business-case-for-accessibility/
- Microsoft Inclusive Design Guide: https://inclusive.microsoft.design/tools-and-activities/Inclusive101Guidebook.pdf
