# Submission Worker setup

The Submit Record form sends submissions here. Only you can read them, on the owner page
`#/review` of your site, using a token only you know.

Run these commands in the `worker` folder. You need a Cloudflare account and Node.js.

1. Log in:

```bash
npx wrangler login
```

2. Create the storage for submissions, then paste the `id` it prints into `wrangler.toml`
   (replace `REPLACE_WITH_KV_NAMESPACE_ID`):

```bash
npx wrangler kv namespace create SUBMISSIONS
```

3. Choose a long random owner token and save it somewhere safe. You type it into
   `#/review` to see submissions:

```bash
npx wrangler secret put ADMIN_TOKEN
```

4. In `wrangler.toml`, set `ALLOWED_ORIGINS` and `SITE_URL` to your live site address,
   for example `https://your-list.pages.dev`. Keep `http://localhost:5174` for testing.

5. Deploy:

```bash
npx wrangler deploy
```

6. Copy the address it prints (for example `https://artrdl-submissions.yourname.workers.dev`)
   into `SUBMISSION_API` in `js/config.js`, then redeploy the site.

After a level is accepted on `#/review`, copy its record and paste it into that level's
`records` list in `data/<level>.json`.
