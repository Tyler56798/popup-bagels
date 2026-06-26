# MP2 Proposal — Popup Bagels Lead Manager

## What I'm building
A front-end-only web tool that tracks outreach to tall office buildings as potential Popup Bagels pop-up locations — which buildings we've contacted, where each one is in the pipeline, who to follow up with, and a running summary of how the outreach is going.

## Who it's for / why
This is for the Popup Bagels franchise group my dad and I invested in. They just launched in Chicago and asked me to put together a lead list of tall office buildings they could run pop-ups in. I have the list, but a list in a spreadsheet doesn't tell them what to *do* next — who's been contacted, who went quiet and needs a follow-up, how many buildings are actually booked versus still cold. Right now that status lives in someone's head or scattered notes. This tool turns the raw lead list into a simple pipeline they can actually work: add a building, move it through stages as outreach happens, and see at a glance what needs attention and how many deals are in each stage. The real users are the people doing the outreach for the group.

## The state it tracks
The core state is an **array of "building" objects**, each holding everything the tool needs to remember about one lead:

- **name** — the building's name
- **address** — where it is
- **floors** — number of floors (a rough proxy for size / foot traffic)
- **contact** — contact name and/or notes about who we're talking to
- **status** — where it is in the pipeline (see below)
- **lastContacted** — the date we last reached out

The pipeline **status** moves through: Not Contacted → Reached Out → Followed Up → Booked → Declined.

Beyond the array, the tool recomputes **derived output** rather than storing it: total leads, a count of how many buildings are in each status, and a "follow-up queue" of buildings that were reached out to but haven't been touched in a while.

## Core features
1. **Add / edit / remove a building** — a form to enter a lead with its details; buildings render as cards or rows you can update or delete.
2. **Move a building through the pipeline** — change a building's status (e.g. from "Reached Out" to "Booked"), and everything recalculates.
3. **Pipeline summary** — a dashboard showing total leads and how many are in each status, recomputed every time something changes.
4. **Follow-up queue** — a derived list of buildings that are "Reached Out" but haven't been contacted in X days, so the team knows who to chase.
5. **Filter the list by status** — show only "Booked," only "Reached Out," etc.
6. **Reset / start over** — clear the list (with an "are you sure?" confirmation) without refreshing the page.

*(Ambitious: localStorage so the lead list survives a refresh — planned for this build.)*

## What I don't know yet
- **Deriving output from state.** I want one function that takes the buildings array and returns the counts and the follow-up queue, so the dashboard and the list read from the same logic instead of duplicating it.
- **Date math in JavaScript.** The follow-up queue depends on "how many days since last contacted," so I need to work with the `Date` object without off-by-one errors.
- **Re-rendering a list cleanly.** How to wipe and rebuild the cards and the summary from the array each time the data changes, without leaving stale items on screen.
- **localStorage.** How to save the array to storage and read it back on load, including the date fields.
- **Handling bad input** — empty name or address, a non-number for floors — so the tool doesn't break or show junk.