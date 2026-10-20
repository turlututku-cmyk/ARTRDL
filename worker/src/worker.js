/**
 * Submission API for the list (Cloudflare Worker).
 *
 * Accounts
 *   POST /api/users/register              body {"username", "password"}; returns a session token
 *   POST /api/users/login                 body {"username", "password"}; returns a session token
 *   GET  /api/users/me                    needs "Authorization: Bearer <session token>"
 *   POST /api/users/logout                ends the session
 *
 * Logged in (needs "Authorization: Bearer <session token>")
 *   POST /api/submissions                 the Submit Record form; the player name is the account's
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
const NEW_LEVEL = '__new__';

export default {
    async fetch(request, env) {
        const headers = corsHeaders(request, env);
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers });
        }

        try {
            const url = new URL(request.url);

            if (url.pathname.startsWith('/api/users/')) {
                return await handleUsers(request, env, url.pathname, headers);
            }

            if (request.method === 'POST' && url.pathname === '/api/submissions') {
                return await createSubmission(request, env, headers);
            }

            if (url.pathname === '/api/admin/submissions') {
                if (!(await isOwner(request, env))) return json({ error: 'Not allowed.' }, 401, headers);
                if (request.method === 'GET') return await listSubmissions(env, headers);
            }

            const match = url.pathname.match(/^\/api\/admin\/submissions\/(.+)$/);
            if (match && request.method === 'POST') {
                if (!(await isOwner(request, env))) return json({ error: 'Not allowed.' }, 401, headers);
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

    const session = await getSession(request, env);
    if (!session) return json({ error: 'Log in to submit records.' }, 401, headers);

    const result = await validate(body, env, session.username);
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

// The player name comes from the logged-in account, never from the form
async function validate(body, env, player) {
    // A level that isn't on the list yet: the owner reviews it, then adds the level file
    const isNew = body.level === NEW_LEVEL;
    let level = 'new';
    let levelName = '';
    let newLevel = null;
    if (isNew) {
        const details = body.newLevel || {};
        levelName = typeof details.name === 'string' ? details.name.trim() : '';
        if (levelName.length < 1 || levelName.length > 60) {
            return { error: 'New level name must be 1 to 60 characters.' };
        }
        const id = Number(details.id);
        if (!Number.isInteger(id) || id < 1) {
            return { error: 'New level needs its Geometry Dash level ID (a whole number).' };
        }
        const creator = typeof details.creator === 'string' ? details.creator.trim() : '';
        if (creator.length < 1 || creator.length > 32) {
            return { error: 'New level needs a creator name (1 to 32 characters).' };
        }
        newLevel = { id, creator };
    } else {
        level = typeof body.level === 'string' ? body.level : '';
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
        levelName = (await levelFile.json()).name;
    }

    const link = typeof body.link === 'string' ? body.link.trim() : '';
    if (!YOUTUBE_LINK.test(link)) {
        return { error: 'The video must be a YouTube link.' };
    }

    const percent = Number(body.percent);
    if (!Number.isInteger(percent) || percent < 1 || percent > 100) {
        return { error: 'Percent must be a whole number from 1 to 100.' };
    }

    const hz = Number(body.hz);
    if (!Number.isInteger(hz) || hz < 1 || hz > 1000) {
        return { error: 'Refresh rate must be a whole number from 1 to 1000.' };
    }

    if (!DEVICES.includes(body.device)) {
        return { error: 'Choose PC, mobile or console.' };
    }

    return {
        record: {
            player,
            level,
            levelName,
            link,
            percent,
            hz,
            device: body.device,
            ...(newLevel ? { isNew: true, levelId: newLevel.id, creator: newLevel.creator } : {}),
        },
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

// The owner token is checked against a SHA-256 hash stored in wrangler.toml (ADMIN_TOKEN_HASH),
// so the token itself is never kept in the repo.
async function isOwner(request, env) {
    if (!env.ADMIN_TOKEN_HASH) return false;
    const header = request.headers.get('Authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    return constantTimeEqual(await sha256Hex(token), env.ADMIN_TOKEN_HASH);
}

async function sha256Hex(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function constantTimeEqual(a, b) {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
}

const PASSWORD_ITERATIONS = 100000;
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const USERNAME = /^[A-Za-z0-9_.-]{2,32}$/;

async function handleUsers(request, env, pathname, headers) {
    if (pathname === '/api/users/register' && request.method === 'POST') {
        return await register(request, env, headers);
    }
    if (pathname === '/api/users/login' && request.method === 'POST') {
        return await login(request, env, headers);
    }
    if (pathname === '/api/users/me' && request.method === 'GET') {
        const session = await getSession(request, env);
        if (!session) return json({ error: 'Not logged in.' }, 401, headers);
        return json({ username: session.username }, 200, headers);
    }
    if (pathname === '/api/users/logout' && request.method === 'POST') {
        const token = bearerToken(request);
        if (token) await env.SUBMISSIONS.delete(`session:${await sha256Hex(token)}`);
        return json({ ok: true }, 200, headers);
    }
    return json({ error: 'Not found.' }, 404, headers);
}

async function register(request, env, headers) {
    const body = await readJson(request);
    if (!body) return json({ error: 'Invalid request.' }, 400, headers);

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (!USERNAME.test(username)) {
        return json({ error: 'Username must be 2 to 32 letters, numbers, dots, dashes or underscores.' }, 400, headers);
    }
    if (password.length < 8 || password.length > 128) {
        return json({ error: 'Password must be 8 to 128 characters.' }, 400, headers);
    }

    const key = `user:${username.toLowerCase()}`;
    if (await env.SUBMISSIONS.get(key)) {
        return json({ error: 'That username is taken.' }, 409, headers);
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await pbkdf2(password, salt, PASSWORD_ITERATIONS);
    await env.SUBMISSIONS.put(key, JSON.stringify({
        username,
        salt: toBase64(salt),
        hash: toBase64(hash),
        iterations: PASSWORD_ITERATIONS,
        createdAt: new Date().toISOString(),
    }));
    return await startSession(username, env, headers, 201);
}

async function login(request, env, headers) {
    const body = await readJson(request);
    if (!body) return json({ error: 'Invalid request.' }, 400, headers);

    const username = typeof body.username === 'string' ? body.username.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const account = await env.SUBMISSIONS.get(`user:${username.toLowerCase()}`, 'json');
    // Same message whether the username or the password is wrong
    if (!account) return json({ error: 'Wrong username or password.' }, 401, headers);

    const hash = await pbkdf2(password, fromBase64(account.salt), account.iterations);
    if (!constantTimeEqual(toBase64(hash), account.hash)) {
        return json({ error: 'Wrong username or password.' }, 401, headers);
    }
    return await startSession(account.username, env, headers, 200);
}

async function startSession(username, env, headers, status) {
    const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
    await env.SUBMISSIONS.put(
        `session:${await sha256Hex(token)}`,
        JSON.stringify({ username }),
        { expirationTtl: SESSION_SECONDS },
    );
    return json({ username, token }, status, headers);
}

// Only the hash of a session token is stored, so a copy of the storage can't be used to log in
async function getSession(request, env) {
    const token = bearerToken(request);
    if (!token) return null;
    return await env.SUBMISSIONS.get(`session:${await sha256Hex(token)}`, 'json');
}

function bearerToken(request) {
    const header = request.headers.get('Authorization') || '';
    return header.startsWith('Bearer ') ? header.slice(7) : '';
}

async function readJson(request) {
    try {
        return await request.json();
    } catch {
        return null;
    }
}

async function pbkdf2(password, salt, iterations) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, key, 256);
    return new Uint8Array(bits);
}

function toBase64(bytes) {
    return btoa(String.fromCharCode(...bytes));
}

function fromBase64(text) {
    return Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
}

function toBase64Url(bytes) {
    return toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
