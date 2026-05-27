# Trainer Website project

## What this is

An internal staff portal for F45 Crows Nest trainers. Public URL (no auth gate, all content is non-sensitive). The site collects coaching scripts, cleaning procedures, sales playbooks, and pricing references in one place so a new hire can self-serve.

**Live at:** https://f45crowsnest.github.io/trainer-hub/

## Stack

- **Plain HTML + CSS + vanilla JS** (no framework, no build step)
- **GitHub Pages** for hosting (free, public repo `zexinjin-gif/trainer-hub`)
- **YouTube Shorts** for coaching videos (embedded by ID, thumbnails pulled from `i.ytimg.com`)
- Auto-deploys on every push to `main`

## File layout

- `index.html` is the homepage with three tiles: Coaching, Operations, Sales
- Each section has its own root-level page (`coaching.html`, `operations.html`, `sales.html`)
- `scripts/` holds long-form text pages (coaching scripts, philosophy)
- `images/put-away/` holds web-ready JPGs for the Put Things Away gallery
- `videos/` holds local mp4 fallbacks for videos not yet on YouTube
- `files/` holds downloadable PDFs
- `style.css` is the single shared stylesheet

## Conventions

- Trainer's owner is **Jino** (Studio Manager). Owners of the gym are **Armand and Brigid**.
- Casual, manager-to-team tone in any user-facing copy.
- No mention of brand competitors or "72 Training" anywhere.
- Mobile-first design. Trainers mostly view this on phones between classes.
- Dark theme with yellow (`#ffb400`) accent for highlights and badges.
- No em dashes, en dashes, or dashes as punctuation anywhere (use commas, colons, parentheses).

## Media workflow (important)

**iPhone HEIC photos must be converted to JPG before they hit the website.** When the user drops `.HEIC` files into the project (typically in `images/`), do this without being asked:

1. Convert to JPG with `sips -Z 1600 -s format jpeg "INPUT.HEIC" --out "INPUT.jpg"` (resizes to 1600px max width, keeps aspect ratio)
2. Delete the original `.HEIC` files after successful conversion
3. The JPG keeps the same base filename so the user can match them up
4. `.HEIC` and `.heic` are in `.gitignore` already, so iPhone originals never get committed
5. Don't `git add .` blindly when new files are sitting around. Stage only the files you intend to commit, especially in `images/`

**Why:** HEIC is an Apple-only format that doesn't display in most browsers. Raw iPhone photos are also large (3-5MB each) and would bloat the repo and slow page loads. Converted JPGs are typically 5x smaller.

## Connected routine (on-demand WhatsApp draft)

There is a **remote Claude routine** that drafts the trainer-group WhatsApp message announcing what is new on the Trainer Hub. It is **on-demand**: Jino fires it whenever he wants to send a message (no fixed schedule). The old Tuesday-cron routine is gone.

- **ID:** `trig_01CTvJynVGRKdqvLHSQwZxWC`
- **Name:** "Trainer Hub: WhatsApp draft (on-demand)"
- **Schedule:** `enabled: false` with a placeholder yearly cron. Does not auto-fire. Trigger manually with `RemoteTrigger action: run`.
- **Output:** Reads last 7 days of git log, picks the most meaningful user-facing change, drafts a casual manager-to-team message (under 150 words, no dashes as punctuation), prints it between `---DRAFT START---` and `---DRAFT END---` markers, and creates a Google Calendar event titled "Trainer Hub: WhatsApp draft ready" on Jino's primary calendar with the draft in the description (so he can copy from his phone).
- **MCP connectors:** Google Calendar auto-attached at account level (visible in routine config).
- **Goes to the TRAINER group on WhatsApp, not a coaching group.** (Jino confirmed.)
- **The routine fires from Anthropic's cloud, not this local session.**

**Triggering from this Claude session:**

1. `ToolSearch select:RemoteTrigger` (deferred tool, not loaded by default)
2. `RemoteTrigger {action: "run", trigger_id: "trig_01CTvJynVGRKdqvLHSQwZxWC"}`
3. Calendar event appears on Jino's phone in a couple of minutes. Run output is also visible at <https://claude.ai/code/routines/trig_01CTvJynVGRKdqvLHSQwZxWC>.

**Updating the routine prompt:**

Use `RemoteTrigger action: get` first, then `action: update` with the full `job_config`. The routine reads commits itself, so the prompt rarely needs editing. Only update if voice/format guidance needs to change.

## Update workflow with Claude

When changes are made in a Claude session, the user expects Claude to also push the changes:
```
git add <specific files>
git commit -m "..."
git push
```
The user does not run git commands. Just say "push it live" or similar to trigger.

**Never `git add .`** unless you've verified what's in the working tree. The user often drops raw work files (HEICs, source videos, drafts) in subfolders that shouldn't be committed.
