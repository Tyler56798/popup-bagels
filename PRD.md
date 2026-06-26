# PRD — Popup Bagels Lead Manager

**Product:** A front-end-only web tool that turns a list of office-building leads into a workable outreach pipeline for Popup Bagels pop-up locations — tracking each building's stage, surfacing who needs a follow-up, and summarizing the pipeline at a glance.

**Author / user:** Tyler (built for the Popup Bagels franchise group — the people doing outreach in Chicago).
**Type:** Static, front-end-only site (vanilla HTML/CSS/JS), deployed on GitHub Pages. No server, no external API, no frameworks or libraries.

---

## 1. Problem & goal

The Popup Bagels group launched in Chicago and needs to run pop-ups inside tall office buildings. We have a lead list of buildings, but a flat list doesn't tell anyone what to do next: which buildings have been contacted, which went quiet and need a nudge, and how many are actually booked versus still cold. That status currently lives in someone's head or scattered notes.

**Goal:** one screen that holds the lead list as data and recalculates itself as outreach happens — so the team can answer "who do I follow up with," "what stage is each building in," and "how's the pipeline looking overall" without digging.

*Scope note: demo data is a handful of realistic Chicago office buildings so the tool isn't empty during the class demo.*

---

## 2. Layout — a single dashboard

The whole tool is one page, organized top to bottom:

1. **Pipeline summary** — total leads and a count per status (the at-a-glance numbers).
2. **Follow-up queue** — buildings that were reached out to but have gone stale and need a nudge.
3. **Add-a-building form** — to enter a new lead.
4. **The lead list** — every building as a card/row, with controls to change status, edit, or delete, plus a filter to narrow by status.

---

## 3. State

The core state is **an array of building objects**, persisted to `localStorage` so the list survives a refresh. Each building holds:

- **name** — building name
- **address** — location
- **floors** — number of floors (rough size / foot-traffic proxy)
- **contact** — contact name and/or notes
- **status** — pipeline stage (see below)
- **lastContacted** — date of last outreach

**Pipeline statuses:** Not Contacted → Reached Out → Followed Up → Booked → Declined.

The tool also recomputes **derived values** from the array whenever it changes (not stored):

- total number of leads
- count of buildings in each status
- the follow-up queue: buildings with status "Reached Out" whose last-contacted date is more than a set number of days ago

---

## 4. Core features & behavior

### 4.1 Add / edit / remove a building
A form captures **name, address, floors, contact/notes, and starting status.** Validate input: no empty name or address; floors must be a positive number; show an inline error message, never an `alert()` box. Each building renders as a card/row that can be edited or deleted.

### 4.2 Move a building through the pipeline
Each building has a **dropdown to change its status.** Changing it updates the state and triggers a re-render so the summary and follow-up queue recalculate immediately.

### 4.3 Pipeline summary
A dashboard showing **total leads and how many buildings are in each status** (e.g. "3 Booked, 5 Reached Out, 2 Declined"). Recomputed on every change.

### 4.4 Follow-up queue
A **derived list of buildings that need a nudge** — status is "Reached Out" and the last-contacted date is older than a set threshold (e.g. 7 days). This tells the team exactly who to chase.

### 4.5 Filter by status
**Buttons or a dropdown to show only one stage** at a time (e.g. only "Booked"). This is derived output computed from state, not a change to the underlying data.

### 4.6 Reset / start over (no refresh)
A **reset that clears the lead list**, with an **"are you sure?" confirmation** before anything is deleted, and without refreshing the page.

### 4.7 Seed data
On first load (empty localStorage), the tool populates **5–6 realistic example Chicago office buildings** so it demos well and isn't empty.

---

## 5. Input handling / edge cases

- Block empty name or address.
- Floors must be a positive number; reject text or negatives.
- Never render `NaN`, `undefined`, or junk on screen.
- Confirm before the destructive reset.
- Empty-state message when there are no leads (after a reset).

---

## 6. Requirements mapping (MP2 rubric)

- **Semantic HTML** — structured sections: summary, follow-up queue, add form, lead list.
- **Intentional CSS** — clean, readable, mobile-friendly; color-coded status badges.
- **State in JS** — the buildings array; multiple interactions read and change it.
- **Derived output** — status counts, follow-up queue, filtered list — all computed from state, not echoed input.
- **3+ interaction types** — form submit (add a building), dropdown (status change + filter), button clicks (delete, reset, filter).
- **Dynamic DOM updates** — list, summary, and queue re-render from state on every change; no `alert()` boxes.
- **Reset without refresh** — clears the list with confirmation.
- **Static & self-contained** — vanilla JS only, runs as plain files on GitHub Pages.
- **localStorage** — lead list persists between sessions.

---

## 7. Out of scope for MP2

A map view showing buildings relative to each other (and to existing stores) would need a mapping service / API, which a static, no-API project can't include — that belongs to a later project. Reminder notifications are likewise out of scope here.