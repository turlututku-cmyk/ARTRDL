# Demon List Template: Step-by-Step Guide

Do the steps in order. After each step, refresh the page and check that it worked.
Tip: every place in the code that you are meant to change is marked with the word
`EDIT:`. Use "Search in all files" for `EDIT:` in your editor to jump between them.

Layout by TheShittyList (https://tsl.pages.dev). Keep the credit line on the main
page, it is required.

---

## What is where

| Folder / file            | What it controls                                              |
| ------------------------ | ------------------------------------------------------------- |
| `index.html`             | Site name, logo text, tab icon, top menu, Discord/Submit links |
| `data/`                  | ALL your content (levels, order, editors, packs). No coding.  |
| `data/_list.json`        | The main list: which levels exist and their ORDER (= rank)    |
| `data/_packs.json`       | Level packs                                                   |
| `data/_editors.json`     | The "List Editors" box                                        |
| `data/example-level.json`| One level file (a sample to copy)                             |
| `data/_level-template.json` | A blank level file to copy for every new level             |
| `js/config.js`           | How many levels are Main / Extended / Legacy                  |
| `js/util.js`             | Difficulty faces and their default ranks                      |
| `js/pages/List.js`       | Welcome text and the rules shown on the main list page        |
| `assets/difficulty/`     | The demon face pictures                                       |

---

## Step 0: Run it on your computer

The site must be opened through a small local server (double-clicking `index.html`
will NOT work).

Windows, nothing to install:

```
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Then open http://localhost:5174

Any other server works too, as long as the site is served from the ROOT
(`http://localhost:PORT/`, not `http://localhost:PORT/some-folder/`). For example:
`npx serve .` or `python -m http.server 5174`.

Check: you see "My Demon List" with one Example Level.

---

## Step 1: Name, logo and icon (`index.html`)

Open `index.html` and change the four spots marked `EDIT:` near the top:

1. `<title>My Demon List</title>` is the browser tab name.
2. `<h2>MyList</h2>` is the short name at the top left. `<p>v1.0.0</p>` is the version next to it.
3. Tab icon: replace the file `list_icon.png` with your own square image
   (keep the same file name), or change `href="/list_icon.png"` to your file.

Check: refresh, the tab title and top-left name changed.

---

## Step 2: Discord and Submit links (`index.html`)

Lower in the same file, find the two links that currently say `href="#"`:

- The Discord icon: put your invite link, e.g. `href="https://discord.gg/yourcode"`.
  To remove the icon, delete that whole `<a class="nav__icon" ...> ... </a>` block.
- The "Submit Record" button opens the built-in form (`#/submit`). Submissions go to the
  Worker in `worker/`, and only you can see them, on the owner page `#/review`. Deploy the
  Worker, then put its address in `SUBMISSION_API` in `js/config.js`. Setup steps are in
  `worker/README.md`.

Check: click both, they open your links.

---

## Step 3: List editors (`data/_editors.json`)

This is the "List Editors" box on the right of the main page.

```json
[
    { "role": "owner",  "name": "YourName",   "link": "https://www.youtube.com/@YourChannel" },
    { "role": "admin",  "name": "SomeoneElse" },
    { "role": "helper", "name": "AnotherOne", "link": "https://twitter.com/them" }
]
```

- `role` decides the little icon: `owner`, `admin`, `helper`, `dev`, `trial`.
- `link` is optional. Without it the name is plain text.
- Put a comma after every entry except the last one.

---

## Step 4: Welcome text and rules (`js/pages/List.js`)

Search the file for `EDIT:`. You will find:

1. The welcome sentence. Change "My Demon List!" to your list name.
   Do NOT remove "(Website layout made by TheShittyList)".
2. "Level Requirements": one `<p> ... </p>` per rule. Add or delete `<p>` blocks freely.
3. "Submission Requirements" (below it): these are common default rules. Edit them the
   same way.

Check: the right side of the main page shows your text.

---

## Step 5: Your first level

Each level is ONE file in `data/`, and the file NAME is what the list uses to refer
to it.

1. Copy `data/_level-template.json` and rename the copy, for example `my-level.json`.
   Use only letters, numbers, `-` and `_`. No spaces (spaces work but cause trouble),
   and remember capitals matter on most web hosts.
2. Fill it in:

```json
{
    "id": 12345678,
    "name": "My Level",
    "author": "Publisher",
    "creators": ["Publisher", "Friend who helped build"],
    "verifier": "TheVerifier",
    "verification": "https://www.youtube.com/watch?v=abcdefghijk",
    "percentToQualify": "100",
    "device": "pc",
    "records": [
    ]
}
```

| Field              | Meaning                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `id`               | The in-game level ID (a number, or text like `"Not Released"`)          |
| `name`             | Name shown on the site                                                  |
| `author`           | The publisher                                                           |
| `creators`         | Everyone who built it. Each name in its own quotes                      |
| `verifier`         | Who verified it. Use `"None"` if nobody has beaten it                   |
| `verification`     | YouTube link of the verification (must be a YouTube link)               |
| `percentToQualify` | Lowest percentage that counts as a record. Keep it in quotes: `"100"`   |
| `device`           | `"pc"`, `"mobile"` or `"console"`. Shows a small icon                   |
| `records`          | The list of records (Step 6). `[ ]` is fine when empty                  |

Optional fields: `"password": "1234"` (otherwise it says "Free to Copy"),
`"featured": true` (gold name), `"epic": true` (purple name) and
`"difficulty"` (Step 9).

3. Add it to the list. Open `data/_list.json` and add the file name WITHOUT `.json`:

```json
[
    "my-level",
    "example-level"
]
```

The ORDER of this file is the ranking: first line = #1. To move a level, cut its line
and paste it somewhere else. Delete the `"example-level"` line (and the file
`data/example-level.json`) when you are done with the sample.

Check: your level appears as #1. If a level is missing or shows a red error, the
file name in `_list.json` does not match the file, or there is a missing comma or
quote in the JSON.

---

## Step 6: Records

Inside a level file, each record goes between the `[ ]` after `"records"`:

```json
"records": [
    {
        "user": "PlayerOne",
        "link": "https://www.youtube.com/watch?v=abcdefghijk",
        "percent": 100,
        "hz": 240,
        "device": "pc"
    },
    {
        "user": "PlayerTwo",
        "link": "https://www.youtube.com/watch?v=lmnopqrstuv",
        "percent": 67,
        "hz": 60,
        "device": "mobile"
    }
]
```

- `percent` is a plain number (no quotes, no % sign).
- Put a comma between records, but not after the last one.
- Records are sorted by percent automatically, and points are added to the
  Leaderboard automatically.

---

## Step 7: List size: Main, Extended, Legacy (`js/config.js`)

```js
export const MAIN_LIST_END = 50;
export const EXTENDED_LIST_END = 75;
```

- Ranks 1 to 50: Main list. Points for any percentage above `percentToQualify`.
- Ranks 51 to 75: Extended list. Only 100% completions give points.
- Rank 76 and beyond: Legacy. Sidebar shows "Legacy", no points.

Change the two numbers to fit your list (for a small list, try `10` and `20`).
This also controls the Roulette page.

The score formula itself lives in `js/score.js` (the line with `-24.9975`). Leave it
alone unless you know what you are doing.

---

## Step 8: Removing a page you don't want (Roulette, Packs, Leaderboard)

The top menu has List, Leaderboard, Roulette and Packs. To remove one, for example Packs:

1. `index.html`: delete the whole `<router-link class="nav__tab" to="/packs"> ... </router-link>`.
2. `js/routes.js`: delete the line `{ path: '/packs', component: Packs },` and the
   `import Packs ...` line at the top.
3. You may also delete the page file (`js/pages/Packs.js`) and its data file
   (`data/_packs.json`).

Do the same for Roulette (`/roulette`, `Roulette.js`) or Leaderboard (`/leaderboard`,
`Leaderboard.js`). Keep the List page, it is the main page.

---

## Step 9: Difficulty faces

Every level shows a demon face in the sidebar, and a "Tier" box on its page.

**Automatic:** if a level has no `"difficulty"` field, its face comes from its rank.
The rules are the `DEFAULT_TIERS` table in `js/util.js`:

```js
const DEFAULT_TIERS = [
    { upToRank: 1, face: 'extreme-low' },
    { upToRank: 25, face: 'insane-mid' },
    { upToRank: 40, face: 'hard-mid' },
    { upToRank: 55, face: 'medium-mid' },
    { upToRank: Infinity, face: 'easy-hard' },
];
```

Read it top to bottom: rank 1 gets `extreme-low`, ranks 2 to 25 get `insane-mid`, and so on.
Change the numbers and faces to match your list.

**By hand:** add a `"difficulty"` line to a level file, right after `"device"`
(open `data/example-level.json` to see it in place):

```json
"device": "pc",
"difficulty": "insane-high",
```

Valid values (each is a picture in `assets/difficulty/`):

```
easy-low     easy-mid     easy-hard(=high)
medium-low   medium-mid   medium-high
hard-low     hard-mid     hard-high
insane-low   insane-mid   insane-high
extreme-low  extreme-mid  extreme-high
not-humanly-possible      free-demon
```

The label is built from the name: `insane-high` shows "High Insane Demon".
You can also write just `"easy"`, `"medium"`, `"hard"`, `"insane"` or `"extreme"`.

**Your own faces:** replace a PNG in `assets/difficulty/` with your own image using
the same file name. Roughly 128 pixels wide with a transparent background looks best.

---

## Step 10: Packs (`data/_packs.json`)

A pack is a named group of levels. Levels are referenced by file name, same as
`_list.json`. A level must ALSO be in `_list.json` to show up in a pack.

```json
[
    {
        "name": "Beginner Pack",
        "color": "#009dff",
        "levels": ["my-level", "another-level"]
    }
]
```

Leave the file as `[ ]` if you do not want packs.

---

## Step 11: Colors

Open `css/main.css`. The first two blocks (`:root` and `main.dark`) hold the theme
colors. `--color-primary` is the blue top bar and highlight color. Change the hex
codes (e.g. `#67bed9`) to restyle the site.

---

## Step 12: Put it online

The site is only static files, so any free static host works:

- **Cloudflare Pages** or **Netlify**: create a project from your GitHub repo (or drag
  and drop the folder). Build command: none. Output folder: the repo root.
- **GitHub Pages**: works only for a user site (a repo named `yourname.github.io`),
  because this site needs to live at the root of its address. A normal project repo
  (`yourname.github.io/my-repo/`) will show a blank page.

To update the live site later: edit the files, commit, push. The host redeploys.

---

## Troubleshooting

| Problem                                   | Likely cause                                                        |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Blank page                                | Not served from a local server, or a JSON typo. Press F12, Console  |
| "Failed to load level (xyz.json)"         | `_list.json` says `xyz` but `data/xyz.json` doesn't exist / typo    |
| Whole list will not load                  | A comma error in `_list.json` (comma after every line but the last) |
| Level shows as an error line              | Broken JSON inside that level's file. Paste it into jsonlint.com    |
| Changes not showing                       | Hard refresh with Ctrl+F5                                           |
| Face is missing                           | `"difficulty"` misspelled, or the picture isn't in `assets/difficulty/` |

JSON rules to remember: text in `"double quotes"`, commas between items, NO comma
after the last item, and numbers in quotes only where the guide shows quotes.
