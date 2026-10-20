import { SUBMISSION_API } from "../config.js";

const STORAGE_KEY = 'artrdl-owner-token';

export default {
    data: () => ({
        token: '',
        tokenInput: '',
        submissions: [],
        loading: false,
        error: '',
        rememberMe: true,
        // Details being typed for a new level: { id, name, verifier, position }
        detail: null,
    }),
    async mounted() {
        // Sign straight in if the owner chose to be remembered on this device
        let saved = null;
        try {
            saved = localStorage.getItem(STORAGE_KEY);
        } catch {
            saved = null;
        }
        if (saved) {
            this.token = saved;
            await this.load();
        }
    },
    template: `
        <main class="page-submit">
            <div class="submit-card">
                <h1>Review submissions</h1>
                <form v-if="!token" @submit.prevent="openReview">
                    <label class="field">
                        <span class="type-label-lg">Owner token</span>
                        <input v-model.trim="tokenInput" type="password" autocomplete="off" required>
                    </label>
                    <label class="field remember">
                        <input v-model="rememberMe" type="checkbox">
                        <span class="type-label-md">Stay signed in on this device</span>
                    </label>
                    <p class="submit-error" v-if="error">{{ error }}</p>
                    <button class="submit-button type-label-lg" type="submit" :disabled="loading">Open</button>
                </form>
                <div v-else class="review-list">
                    <div class="review-toolbar">
                        <p class="type-label-md">{{ submissions.length }} submission(s)</p>
                        <div class="review-buttons">
                            <button class="submit-button type-label-lg" @click="load" :disabled="loading">Refresh</button>
                            <button class="submit-button type-label-lg" @click="signOut">Sign out</button>
                        </div>
                    </div>
                    <p class="submit-error" v-if="error">{{ error }}</p>
                    <article v-for="s in submissions" :key="s.id" class="submission" :class="s.status">
                        <h2 class="type-title-sm">{{ s.player }} · {{ s.levelName }} · {{ s.percent }}%</h2>
                        <p class="type-label-md" v-if="s.isNew">New level, not on the list yet: ID {{ s.levelId }}, by {{ s.creator }}.</p>
                        <p class="type-label-md"><a :href="s.link" target="_blank">{{ s.link }}</a></p>
                        <p class="type-label-md">{{ s.device }} · {{ s.hz ? s.hz + 'Hz' : 'no refresh rate given' }} · {{ new Date(s.submittedAt).toLocaleString() }} · {{ s.status }}</p>

                        <div v-if="s.status === 'pending'" class="review-actions">
                            <button class="submit-button type-label-lg" @click="accept(s)">Accept</button>
                            <button class="submit-button type-label-lg" @click="decide(s, 'rejected')">Reject</button>
                        </div>

                        <div v-if="detail && detail.id === s.id" class="review-detail">
                            <p class="type-label-md">{{ s.isNew ? 'Details for the new level. It goes on the list with these.' : '' }}</p>
                            <label class="field">
                                <span class="type-label-lg">Level name</span>
                                <input v-model.trim="detail.name" maxlength="60">
                            </label>
                            <label class="field">
                                <span class="type-label-lg">Verifier</span>
                                <input v-model.trim="detail.verifier" maxlength="32">
                            </label>
                            <label class="field">
                                <span class="type-label-lg">Position on the list</span>
                                <input v-model.number="detail.position" type="number" min="1">
                            </label>
                            <div class="review-actions">
                                <button class="submit-button type-label-lg" @click="confirmDetails(s)">{{ s.status === 'pending' ? 'Accept' : 'Save' }}</button>
                                <button class="submit-button type-label-lg" @click="detail = null">Cancel</button>
                            </div>
                        </div>

                        <div v-if="s.status === 'accepted'" class="review-accepted">
                            <p class="type-label-md" v-if="s.isNew && s.position">Live on the list as #{{ s.position }}, verified by {{ s.verifier }}.</p>
                            <p class="type-label-md" v-else-if="s.isNew">Not on the list yet. Set its verifier and position.</p>
                            <p class="type-label-md" v-else>Live on the list now.</p>
                            <button v-if="s.isNew" class="submit-button type-label-lg" @click="editDetails(s)">Edit details</button>
                        </div>
                    </article>
                    <p class="type-label-md" v-if="!loading && submissions.length === 0">No submissions yet.</p>
                </div>
            </div>
        </main>
    `,
    methods: {
        // Remember the token on this device only if the owner asked for it
        remember(token) {
            try {
                localStorage.setItem(STORAGE_KEY, token);
            } catch {
                // Storage can be blocked (private windows); the owner just signs in again
            }
        },
        forget() {
            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // Nothing stored, nothing to remove
            }
        },
        async openReview() {
            this.token = this.tokenInput;
            await this.load();
            if (this.token && this.rememberMe) {
                this.remember(this.token);
            }
        },
        signOut() {
            this.token = '';
            this.tokenInput = '';
            this.submissions = [];
            this.detail = null;
            this.forget();
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
                    this.forget();
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
        // Accepting a record for a level already on the list is one click; a new level needs its details first
        accept(submission) {
            if (submission.isNew) {
                this.detail = { id: submission.id, name: submission.levelName, verifier: '', position: '' };
                return;
            }
            this.decide(submission, 'accepted');
        },
        editDetails(submission) {
            this.detail = {
                id: submission.id,
                name: submission.levelName,
                verifier: submission.verifier || '',
                position: submission.position || '',
            };
        },
        confirmDetails(submission) {
            const { name, verifier, position } = this.detail;
            if (!verifier || !position) {
                this.error = 'Enter the verifier and the position on the list.';
                return;
            }
            this.decide(submission, 'accepted', { name, verifier, position });
            this.detail = null;
        },
        async decide(submission, status, extra = {}) {
            this.error = '';
            try {
                const response = await this.request(
                    `/api/admin/submissions/${encodeURIComponent(submission.id)}`,
                    { method: 'POST', body: JSON.stringify({ status, ...extra }) },
                );
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    this.error = data.error || 'Could not update that submission.';
                    return;
                }
                Object.assign(submission, await response.json());
            } catch {
                this.error = 'Could not reach the submission server.';
            }
        },
    },
};
