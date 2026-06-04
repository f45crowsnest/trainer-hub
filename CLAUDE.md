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

## Chatbot (Trainer Hub Assistant)

An AI chatbot floats on every page (an animated mascot, bottom-right). Trainers ask it about coaching, operations, and sales; it answers from the hub content in Jino's casual voice (one useful nugget, then a follow-up question, plain text, no markdown, no dashes).

**Everything lives under `chatbot/`:**

- `chatbot/system-prompt.md` is the bot's BRAIN: what it knows plus how it talks. **Edit this to change the bot's answers or voice.**
- `chatbot/server.js` is a small Node/Express backend that holds the API key and calls Claude (model: `claude-haiku-4-5`).
- `chatbot/public/widget.js` is the front-end widget (the floating mascot plus the chat window). Edit this for size, colours, or behaviour.
- `chatbot/public/live-chatbot.json` is the Lottie animation for the mascot.
- The widget is added to every page with one line before `</body>`: `<script src="https://f45crowsnest.github.io/trainer-hub/chatbot/public/widget.js"></script>`

**Hosting:**

- Frontend (widget + animation): served by GitHub Pages from this repo, same as the site.
- Backend: hosted on **Render** (free tier), service `trainer-hub-chatbot`, URL `https://trainer-hub-chatbot.onrender.com`. Render watches the `chatbot/` folder and auto-redeploys on every push to `main`.
- The Anthropic API key lives in **Render's environment variables** as `ANTHROPIC_API_KEY`, never in the repo (`chatbot/.env` is gitignored).

**To update the bot:** edit the file, then `git push`. Pages redeploys the widget (~1 min); Render redeploys the brain (~2 min). Hard-refresh (Cmd+Shift+R) to see widget changes.

**Note:** the free Render tier sleeps after ~15 min idle, so the first reply after a quiet spell takes ~40s (cold start), then it is fast. A $7/mo Render upgrade removes this.

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
