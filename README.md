# Popup Bagels Lead Manager (MP2)

A front-end-only CRM for tracking outreach to Chicago office buildings as potential
Popup Bagels pop-up locations — vanilla HTML/CSS/JavaScript with localStorage persistence.

**Live site:** [tyler56798.github.io/popup-bagels](https://tyler56798.github.io/popup-bagels/)

## What it does

- Add / edit / remove building leads and move them through a five-stage pipeline
  (Not Contacted → Reached Out → Followed Up → Booked → Declined)
- Dashboard summary with per-stage counts, recomputed on every change
- Follow-up queue of leads that have gone quiet
- Filter the lead list by stage
- Ships with the real (masked) 88-building research dataset

See [PROPOSAL.md](PROPOSAL.md) for the original project proposal.

## Where it went next

For MP3 this grew into a full-stack CRM (Next.js + Supabase + live weather data):
[Tyler56798/popup-bagels-crm](https://github.com/Tyler56798/popup-bagels-crm) ·
[popup-bagels.vercel.app](https://popup-bagels.vercel.app)
