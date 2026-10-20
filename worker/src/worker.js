/**
 * Submission API for the list (Cloudflare Worker).
 *
 * Public
 *   POST /api/submissions                 the Submit Record form
 *
 * Owner only (needs "Authorization: Bearer <ADMIN_TOKEN>")
 *   GET  /api/admin/submissions           every submission, newest first
 *   POST /api/admin/submissions/:id       body {"status": "accepted" | "rejected" | "pending"}
 *
 * Settings (see wrangler.toml)
 *   SUBMISSIONS      KV namespace that stores the submissions
 *   ADMIN_TOKEN      secret, set with: npx wrangler secret put ADMIN_TOKEN
 *   ALLOWED_ORIGINS  comma-separated list of site addresses allowed to call this API
 *   SITE_URL         address of the list, used to check that a level is really on it
 */

const MAX_BODY_CHARS = 4096;
const YOUTUBE_LINK = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{6,}/;
const LEVEL_PATH = /^[a-z0-9-]{1,60}$/;
const DEVICES = ['pc', 'mobile', 'console'];

export default {
    async fetch(request, env) {
        const headers = corsHeaders(request, env);
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers });
        }

        try {
            const url = new URL(request.url);

            if (request.method === 'POST' && url.pathname === '/api/submissions') {
                return await createSubmission(request, env, headers);
            }

            if (url.pathname === '/api/admin/submissions') {
                if (!isOwner(request, env)) return json({ error: 'Not allowed.' }, 401, headers);
                if (request.method === 'GET') return await listSubmissions(env, headers);
            }

            const match = url.pathname.match(/^\/api\/admin\/submissions\/(.+)$/);
            if (match && request.method === 'POST') {
                if (!isOwner(request, env)) return json({ error: 'Not allowed.' }, 401, headers);
                return await updateSubmission(decodeURIComponent(match[1]), request, env, headers);
            }

            return json({ error: 'Not found.' }, 404, headers);
        } catch {
            return json({ error: 'Something went wrong on the server.' }, 500, headers);
        }
    },
};

async function createSubmission(request, env, headers) {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARS) {
        return json({ error: 'Submission is too large.' }, 413, headers);
    }

    let body;
    try {
        body = JSON.parse(text);
    } catch {
        return json({ error: 'Invalid submission.' }, 400, headers);
    }

    // Honeypot: people leave this field empty, bots fill it in. Pretend success and drop it.
    if (body.website) return json({ id: 'received' }, 201, headers);

    const result = await validate(body, env);
    if (result.error) return json({ error: result.error }, 400, headers);

    const id = `sub:${String(Date.now()).padStart(15, '0')}:${crypto.randomUUID()}`;
    const submission = {
        id,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        ...result.record,
    };
    await env.SUBMISSIONS.put(id, JSON.stringify(submission));
    return json({ id }, 201, headers);
}

async function validate(body, env) {
    const player = typeof body.player === 'string' ? body.player.trim() : '';
    if (player.length < 1 || player.length > 32) {
        return { error: 'Player name must be 1 to 32 characters.' };
    }

    const level = typeof body.level === 'string' ? body.level : '';
    if (!LEVEL_PATH.test(level)) {
        return { error: 'Choose a level from the list.' };
    }
    const list = await (await fetch(`${env.SITE_URL}/data/_list.json`)).json();
    if (!list.includes(level)) {
        return { error: 'That level is not on the list.' };
    }
    const levelFile = await fetch(`${env.SITE_URL}/data/${level}.json`);
    if (!levelFile.ok) {
        return { error: 'That level is not on the list.' };
    }
    const levelName = (await levelFile.json()).name;

    const link = typeof body.link === 'string' ? body.link.trim() : '';
    if (!YOUTUBE_LINK.test(link)) {
        return { error: 'The video must be a YouTube link.' };
    }

    const percent = Number(body.percent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
        return { error: 'Percent must be a whole number from 1 to 100.' };
    }

    let hz = null;
    if (body.hz !== undefined && body.hz !== null && body.hz !== '') {
        hz = Number(body.hz);
        if (!Number.isInteger(hz) || hz < 1 || hz > 1000) {
            return { error: 'Refresh rate must be a whole number from 1 to 1000.' };
        }
    }

    if (!DEVICES.includes(body.device)) {
        return { error: 'Choose PC, mobile or console.' };
    }

    return {
        record: { player, level, levelName, link, percent, hz, device: body.device },
    };
}

async function listSubmissions(env, headers) {
    const keys = await env.SUBMISSIONS.list({ prefix: 'sub:' });
    const items = await Promise.all(keys.keys.map((key) => env.SUBMISSIONS.get(key.name, 'json')));
    return json(items.filter(Boolean).reverse(), 200, headers);
}

async function updateSubmission(id, request, env, headers) {
    if (!id.startsWith('sub:')) return json({ error: 'Not found.' }, 404, headers);

    const submission = await env.SUBMISSIONS.get(id, 'json');
    if (!submission) return json({ error: 'Not found.' }, 404, headers);

    let body;
    try {
        body = await request.json();
    } catch {
        return json({ error: 'Invalid request.' }, 400, headers);
    }
    if (!['accepted', 'rejected', 'pending'].includes(body.status)) {
        return json({ error: 'Status must be accepted, rejected or pending.' }, 400, headers);
    }

    submission.status = body.status;
    await env.SUBMISSIONS.put(id, JSON.stringify(submission));
    return json(submission, 200, headers);
}

function isOwner(request, env) {
    if (!env.ADMIN_TOKEN) return false;
    const header = request.headers.get('Authorization') || '';
    return constantTimeEqual(header, `Bearer ${env.ADMIN_TOKEN}`);
}

function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

function corsHeaders(request, env) {
    const allowed = env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());
    const origin = request.headers.get('Origin');
    return {
        'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Vary': 'Origin',
    };
}

function json(body, status, headers) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...headers },
    });
}
