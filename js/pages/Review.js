import { SUBMISSION_API } from "../config.js";

export default {
    data: () => ({
        token: '',
        tokenInput: '',
        submissions: [],
        loading: false,
        error: '',
        copiedId: '',
    }),
    template: `
        <main class="page-submit">
            <div class="submit-card">
                <h1>Review submissions</h1>
                <form v-if="!token" @submit.prevent="openReview">
                    <label class="field">
                        <span class="type-label-lg">Owner token</span>
                        <input v-model.trim="tokenInput" type="password" autocomplete="off" required>
                    </label>
                    <p class="submit-error" v-if="error">{{ error }}</p>
                    <button class="submit-button type-label-lg" type="submit" :disabled="loading">Open</button>
                </form>
                <div v-else class="review-list">
                    <div class="review-toolbar">
                        <p class="type-label-md">{{ submissions.length }} submission(s)</p>
                        <button class="submit-button type-label-lg" @click="load" :disabled="loading">Refresh</button>
                    </div>
                    <p class="submit-error" v-if="error">{{ error }}</p>
                    <article v-for="s in submissions" :key="s.id" class="submission" :class="s.status">
                        <h2 class="type-title-sm">{{ s.player }} · {{ s.levelName }} · {{ s.percent }}%</h2>
                        <p class="type-label-md"><a :href="s.link" target="_blank">{{ s.link }}</a></p>
                        <p class="type-label-md">{{ s.device }} · {{ s.hz ? s.hz + 'Hz' : 'no refresh rate given' }} · {{ new Date(s.submittedAt).toLocaleString() }} · {{ s.status }}</p>
                        <div v-if="s.status === 'pending'" class="review-actions">
                            <button class="submit-button type-label-lg" @click="decide(s, 'accepted')">Accept</button>
                            <button class="submit-button type-label-lg" @click="decide(s, 'rejected')">Reject</button>
                        </div>
                        <div v-if="s.status === 'accepted'" class="review-accepted">
                            <p class="type-label-md">Add this to the <code>records</code> list in <code>data/{{ s.level }}.json</code>:</p>
                            <pre class="record-snippet">{{ recordSnippet(s) }}</pre>
                            <button class="submit-button type-label-lg" @click="copy(s)">{{ copiedId === s.id ? 'Copied' : 'Copy record' }}</button>
                        </div>
                    </article>
                    <p class="type-label-md" v-if="!loading && submissions.length === 0">No submissions yet.</p>
                </div>
            </div>
        </main>
    `,
    methods: {
        async openReview() {
            this.token = this.tokenInput;
            await this.load();
        },
        request(path, options = {}) {
            return fetch(`${SUBMISSION_API}${path}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${this.token}`,
                },
            });
        },
        async load() {
            this.loading = true;
            this.error = '';
            try {
                const response = await this.request('/api/admin/submissions');
                if (response.status === 401) {
                    this.error = 'Wrong token.';
                    this.token = '';
                    return;
                }
                if (!response.ok) {
                    this.error = 'Could not load submissions.';
                    return;
                }
                this.submissions = await response.json();
            } catch {
                this.error = 'Could not reach the submission server.';
            } finally {
                this.loading = false;
            }
        },
        async decide(submission, status) {
            this.error = '';
            try {
                const response = await this.request(
                    `/api/admin/submissions/${encodeURIComponent(submission.id)}`,
                    { method: 'POST', body: JSON.stringify({ status }) },
                );
                if (!response.ok) {
                    this.error = 'Could not update that submission.';
                    return;
                }
                Object.assign(submission, await response.json());
            } catch {
                this.error = 'Could not reach the submission server.';
            }
        },
        recordSnippet(s) {
            const record = {
                user: s.player,
                link: s.link,
                percent: s.percent,
                ...(s.hz ? { hz: s.hz } : {}),
                device: s.device,
            };
            return JSON.stringify(record, null, 4);
        },
        async copy(s) {
            await navigator.clipboard.writeText(this.recordSnippet(s));
            this.copiedId = s.id;
        },
    },
};
