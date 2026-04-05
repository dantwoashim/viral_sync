# Viral Sync Nepal
## Frontend Masterclass Design System

Last updated: 2026-03-27  
Status: design direction document  
Audience: design, frontend, product, brand

## 1. Design Goal

This product cannot look like generic SaaS.

If it looks like a generic rewards dashboard, it will fail twice:

- consumers will not feel identity or delight
- merchants will not feel trust or differentiation

The frontend must feel:

- unmistakably Nepali in mood without becoming costume
- contemporary without feeling imported
- minimal without feeling empty
- social without becoming noisy
- operational for merchants without becoming dashboard sludge

## 2. Frontend Skill Frame

### Visual thesis

Contemporary Nepali street minimalism: ledger precision, stamp energy, rice-paper softness, signboard confidence, and a few sharp vermilion moments that make the product feel alive in the hand.

### Content plan

- hero surface: the user's current reward or campaign state
- support surface: the next best action
- detail surface: progress, context, or merchant proof
- final surface: share, redeem, create, or upgrade

### Interaction thesis

- stamp-impact motion when a reward is claimed or redeemed
- subtle QR pulse and ink-line reveal on active referral surfaces
- sliding paper-sheet transitions between consumer and merchant subviews

## 3. What We Are Refusing

We explicitly reject:

- gradient-heavy fintech clichés
- glassmorphism
- dashboard card mosaics
- purple-on-black AI startup visuals
- fake 3D coin stacks
- generic wallet UI
- over-labeled stat strips
- undifferentiated settings-page design

The interface should not resemble:

- a crypto wallet
- a template marketplace dashboard
- a Western SaaS admin clone

## 4. Cultural and Material References

The design language should quietly borrow from:

- hand-painted signboards in Kathmandu
- merchant paper ledgers and rubber stamps
- brass and copper found in Nepali material culture
- rice-paper and off-white textured surfaces
- Newar geometric rhythm, especially as divider and framing logic
- modern Nepali cafe interiors that mix warmth, wood, matte plaster, and restraint

This is not a heritage costume.

It is a contemporary product with local material memory.

## 5. Brand System

### 5.1 Product character

The product should feel:

- trusted
- social
- quick
- grounded
- slightly ceremonial when rewards unlock

The brand is not loud. The brand is sharp.

### 5.2 Naming inside the product

Use mode labels people instantly understand:

- Consumer Mode
- Merchant Mode

Use more memorable names inside each mode:

- `Passbook` for consumer reward history
- `Scan Desk` for merchant redemption
- `Pulse` for live campaign activity
- `Routes` for neighborhood or multi-merchant chains
- `Ledger` for merchant performance and billing

## 6. Typography

### 6.1 Type system

Use at most two typefaces:

- Primary UI type: `Anek Devanagari`
- Secondary utility type: `IBM Plex Mono`

Why:

- `Anek Devanagari` supports Nepali and Latin well enough for a single coherent system
- `IBM Plex Mono` gives merchant views a trustworthy, ledger-like utility voice for codes, counts, IDs, timestamps, and reward logic

### 6.2 Hierarchy rules

- the main number or offer is always the loudest element
- headings should be compact and calm
- labels should be quiet and highly legible
- bilingual support must not break hierarchy

### 6.3 Tone rules

Consumer copy can be warm and social.  
Merchant copy must be operational and plain.

## 7. Color System

### 7.1 Master palette

- `Paper` `#F4F0E6`
- `Ink` `#161412`
- `Vermilion` `#C7432B`
- `Copper` `#B07937`
- `Temple Blue` `#20384A`
- `Moss` `#5D6A52`
- `Mist` `#E6E0D4`
- `Line` `#D7CFBF`

### 7.2 Mode accents

#### Consumer Mode

- base: Paper
- text: Ink
- action: Vermilion
- progress and route cues: Temple Blue
- earned or completed moments: Copper

#### Merchant Mode

- base: warmer off-white or pale mist
- text: Ink
- action: Temple Blue
- warnings and live activity: Vermilion
- positive metrics: Moss

### 7.3 Color rules

- one accent color per screen by default
- avoid multiple simultaneous bright signals
- color should indicate mode and state, not decoration

## 8. Layout System

### 8.1 General layout rule

No cards by default.

Use:

- sections
- ruled dividers
- split columns
- list blocks
- sticky headers
- bottom sheets
- full-width action bars

Cards are allowed only when:

- the card itself is the object being collected, shared, or scanned

### 8.2 Spacing scale

Use a clear spacing system:

- 4
- 8
- 12
- 16
- 24
- 32
- 48
- 64

### 8.3 Surfaces

Surface types:

- `Paper surface` for core app background
- `Lifted paper` for overlays and bottom sheets
- `Stamped surface` for claimed or completed items
- `Dark ink surface` only for selective moments such as full-screen scan mode

## 9. Consumer Mode Design

### 9.1 Consumer jobs

The consumer is trying to:

- get a reward fast
- share something interesting
- feel progress
- know what to do next
- avoid complexity

The product should feel like a passbook, not a bank.

### 9.2 Consumer information architecture

Bottom navigation:

- `Home`
- `Passbook`
- `Routes`
- `Invite`
- `Profile`

Primary routes:

- `/`
- `/offer/[slug]`
- `/passbook`
- `/redeem`
- `/routes`
- `/invite`
- `/profile`

### 9.3 Consumer home

The home screen is a poster, not a dashboard.

Top structure:

- current best reward
- one next action
- visible progress
- nearby active route or quest

Core blocks:

- live reward panel
- active streak
- group unlock panel
- neighborhood route teaser
- recent stamp strip

The first screen should answer:

- what do I have?
- what can I do now?
- what happens if I share?

### 9.4 Consumer passbook

This is the emotional anchor of the product.

Design it like a modern ledger:

- chronological entries
- merchant marks
- subtle dividers
- occasional stamped completion moments
- not a wallet balance screen

Each entry should show:

- merchant
- reward unlocked or used
- who brought the referral or whether the user was the referrer
- location
- date
- status

### 9.5 Consumer invite screen

This screen is the viral engine.

It must make sharing feel inevitable.

Content:

- the exact reward your friend gets
- the exact reward you get
- countdown or availability window
- ready-made share targets
- one clean link copy action
- one share card preview

No generic “invite friends” emptiness.

The user must see real stakes.

### 9.6 Consumer route screen

This is where the product becomes bigger than one merchant.

Show:

- district map lite
- route progression
- neighborhood clusters
- chain rewards
- quest completion

This screen should feel like local discovery, not maps software.

### 9.7 Consumer redeem screen

This is the highest-friction moment and must be frictionless.

Structure:

- giant dynamic code or QR
- merchant name
- reward summary
- expiry
- fallback numeric code

When scanned or confirmed:

- stamped success animation
- clear next reward suggestion
- easy share CTA

## 10. Merchant Mode Design

### 10.1 Merchant jobs

Merchants want speed, clarity, and confidence.

They do not want marketing poetry.

Merchant mode should feel:

- calm
- exact
- trustworthy
- low-chrome
- operational

### 10.2 Merchant information architecture

Bottom nav on mobile:

- `Today`
- `Scan`
- `Campaigns`
- `Customers`
- `Ledger`

Desktop nav:

- left rail
- large central working pane
- right-side context pane when needed

Primary routes:

- `/merchant/today`
- `/merchant/scan`
- `/merchant/campaigns`
- `/merchant/customers`
- `/merchant/ledger`
- `/merchant/settings`

### 10.3 Merchant today screen

This is the operational command center.

It should show:

- attributed visits today
- redemptions today
- repeat customer count
- live queue or recent activity
- active campaign status
- anomalies or alerts

No card grid.

Preferred structure:

- big headline metric
- structured table or list beneath
- one sticky action area

### 10.4 Merchant scan desk

This is the heartbeat of the product.

The Scan Desk must be:

- full-screen ready
- thumb-friendly
- fast in low light
- readable from a counter distance

Structure:

- giant scan target
- manual code fallback
- merchant staff confirmation controls
- fast success state
- fraud or duplicate warning state

This screen must be almost impossible to misuse.

### 10.5 Merchant campaigns

This screen should feel like composing offers, not filling enterprise forms.

Use:

- campaign type selector
- reward preview
- active window
- merchant-funded reward cost estimate
- share preview
- route or collective membership

Every campaign form should include:

- what the customer gets
- what the referrer gets
- who qualifies
- when it expires
- how the merchant knows it worked

### 10.6 Merchant customers

This is not a CRM clone.

Start with:

- top referrers
- rising referrers
- repeat visitors
- one-time redeemers
- suspicious accounts

Make it usable in under 30 seconds.

### 10.7 Merchant ledger

This is where trust is earned.

Show:

- campaign costs
- attributed redemptions
- estimated uplift
- plan and billing status
- audit log

The design should feel like a clean cashbook, not finance software theater.

## 11. Shared Components

Allowed card-like objects:

- share cards
- route passes
- reward tickets
- merchant badges
- printable QR blocks

Component families:

- `StampStrip`
- `RewardTicket`
- `ShareCard`
- `PassbookEntry`
- `ScanPanel`
- `QueueRow`
- `MetricLine`
- `QuestRoute`
- `MerchantMark`
- `BottomSheet`
- `InlineAlert`
- `FilterRail`

QR design rules:

- generous paper margin
- merchant mark above or below
- fallback code visible
- expiry visible
- no clutter around the scan area

## 12. Motion System

The app should ship with three signature motions:

### 1. Stamp impact

Used when:

- reward claimed
- reward redeemed
- route completed

### 2. Paper slide

Used for:

- entering details
- switching subviews
- opening bottom sheets

### 3. QR pulse

Used for:

- active scan state
- live claim state

Motion rules:

- motion must be felt in a screen recording
- no ornamental motion in merchant flows
- consumer motion may be warmer but still restrained
- motion must stay smooth on mid-range Android

## 13. Bilingual Copy System

The product should support:

- English-first UI with Nepali-aware typography at launch, or
- bilingual labels in key merchant workflows

Recommended approach:

- keep interface chrome mostly English initially for implementation speed
- localize campaign copy, reward copy, and merchant onboarding packs early

Copy principles:

Consumer copy:

- short
- social
- action-led
- no fintech jargon

Merchant copy:

- plain
- measurable
- utility-first
- no startup fluff

Examples:

- Good consumer: `Bring 3 friends. All 4 unlock chai + momo combo.`
- Good merchant: `12 verified redemptions today. 4 came from repeat referrers.`

## 14. Performance and Device Constraints

The frontend must assume:

- mid-range Android devices
- inconsistent connectivity
- bright daylight usage at counters
- one-handed use
- older browser versions in the wild

Performance rules:

- keep font payloads small
- use system fallback while custom font loads
- route-level code splitting
- low-motion fallback
- image-light product surfaces
- offline shell caching
- compressed printable assets

## 15. Marketing and Landing Experience

If a marketing site is built, it should follow the frontend skill exactly:

- one dominant visual
- product name loudest
- no hero cards
- no logo cloud
- no stat strip soup
- full-bleed first viewport

Hero concept:

A giant live reward ticket floating on a paper field, with one bold invitation headline and one primary CTA.

The first viewport should feel like a poster pasted on a city wall, not a SaaS homepage.

Use one memorable object across all launch materials:

- the reward ticket

That ticket appears in:

- posters
- QR stands
- social share cards
- merchant screen
- consumer claim screen

One object. One memory.

## 16. Screen Priority Order

If engineering time is tight, design these first:

1. Consumer home
2. Consumer invite
3. Consumer redeem
4. Merchant scan desk
5. Merchant today
6. Merchant campaign create
7. Consumer passbook
8. Merchant ledger

## 16.1 Frontend delivery sequence

### Step 1. Design tokens

- typography scale
- color tokens
- spacing rules
- divider and paper surfaces
- motion tokens

### Step 2. Shared primitives

- button system
- input system
- list rows
- section headers
- bottom sheets
- reward ticket
- QR block

### Step 3. Consumer core

- home
- invite
- redeem
- passbook

### Step 4. Merchant core

- today
- scan desk
- campaign create
- ledger

### Step 5. Growth surfaces

- routes
- quests
- district passes
- share cards
- merchant collective pages

## 17. Final Design Judgment

The correct visual direction is not:

- hyper-tech
- hyper-luxury
- hyper-gamified

The correct direction is:

- local
- elegant
- tactile
- legible
- social
- minimal

If the final product feels like:

- a modern paper passbook for consumers, and
- a precise growth ledger for merchants

then the frontend will be right.

## 18. Reference Notes

Context that informed this design direction:

- DataReportal Nepal 2026: <https://datareportal.com/reports/digital-2026-nepal>
- Fonepay official about page: <https://www.fonepay.com/public/about>
- eSewa scale and history note: <https://blog.esewa.com.np/16-years-of-innovation>
- Khalti business solutions: <https://khalti.com/business-solutions/>
- Signboard language in Kathmandu: <https://ecs.com.np/spilled-ink/signboard-language>
- Newar window reference: <https://en.wikipedia.org/wiki/Newar_window>
- Contemporary Kathmandu cafe interiors for material direction:
  - <https://studioneba.com/durbarmarg-restaurant/>
  - <https://studioneba.com/illy-deli/>
  - <https://www.sjkarchitects.com/pop-up-restaurant-at-kathmandu>
