import { fetchList } from "../content.js";
import { SUBMISSION_API } from "../config.js";
import { store } from "../main.js";

export default {
    data: () => ({
        store,
        levels: [],
        form: { player: store.username, level: '', link: '', percent: 100, hz: '', device: 'pc', website: '' },
        sending: false,
        sent: false,
        error: '',
    }),
    template: `
        <main class="page-submit">
            <div class="submit-card">
                <h1>Submit a record</h1>
                <p class="type-label-md">Only the list owner sees submissions. Accepted records are added to the list by hand.</p>
                <p v-if="!store.username && !sent" class="type-label-lg">Log in to submit records. <router-link to="/login">Log in</router-link></p>
                <form v-if="!sent && store.username" @submit.prevent="submit">
                    <label class="field">
                        <span class="type-label-lg">Player name</span>
                        <input v-model.trim="form.player" maxlength="32" readonly>
                    </label>
                    <label class="field">
                        <span class="type-label-lg">Level</span>
                        <select v-model="form.level" required>
                            <option value="" disabled>Choose a level</option>
                            <option v-for="level in levels" :key="level.path" :value="level.path">{{ level.name }}</option>
                        </select>
                    </label>
                    <label class="field">
                        <span class="type-label-lg">Video link (YouTube)</span>
                        <input v-model.trim="form.link" type="url" placeholder="https://www.youtube.com/watch?v=..." required>
                    </label>
                    <label class="field">
                        <span class="type-label-lg">Percent</span>
                        <input v-model.number="form.percent" type="number" min="1" max="100" required>
                    </label>
                    <label class="field">
                        <span class="type-label-lg">Refresh rate (Hz)</span>
                        <input v-model.number="form.hz" type="number" min="1" max="1000" required>
                    </label>
                    <label class="field">
                        <span class="type-label-lg">Device</span>
                        <select v-model="form.device">
                            <option value="pc">PC</option>
                            <option value="mobile">Mobile</option>
                            <option value="console">Console</option>
                        </select>
                    </label>
                    <input class="honeypot" v-model="form.website" tabindex="-1" autocomplete="off" aria-hidden="true">
                    <p class="submit-error" v-if="error">{{ error }}</p>
                    <button class="submit-button type-label-lg" type="submit" :disabled="sending">{{ sending ? 'Sending...' : 'Submit' }}</button>
                </form>
                <p v-else-if="sent" class="submit-thanks type-label-lg">Thanks! Your submission was received.</p>
            </div>
        </main>
    `,
    async mounted() {
        const list = await fetchList();
        this.levels = (list || [])
            .filter(([level]) => level)
            .map(([level]) => ({ path: level.path, name: level.name }));
    },
    methods: {
        async submit() {
            this.sending = true;
            this.error = '';
            try {
                const response = await fetch(`${SUBMISSION_API}/api/submissions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${this.store.token}`,
                    },
                    body: JSON.stringify({
                        ...this.form,
                        hz: this.form.hz === '' ? null : this.form.hz,
                    }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    this.error = data.error || 'Could not send your submission. Try again later.';
                    return;
                }
                this.sent = true;
            } catch {
                this.error = 'Could not reach the submission server. Try again later.';
            } finally {
                this.sending = false;
            }
        },
    },
};
