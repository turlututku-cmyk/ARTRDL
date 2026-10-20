import { SUBMISSION_API } from "../config.js";
import { store } from "../main.js";

export default {
    data: () => ({
        store,
        mode: 'login',
        username: '',
        password: '',
        error: '',
        busy: false,
    }),
    template: `
        <main class="page-submit">
            <div class="submit-card">
                <div v-if="store.username" class="review-list">
                    <h1>Logged in</h1>
                    <p class="type-label-lg">Logged in as <strong>{{ store.username }}</strong></p>
                    <div class="review-buttons">
                        <router-link class="submit-button type-label-lg" to="/submit">Submit a record</router-link>
                        <button class="submit-button type-label-lg" @click="logOut">Log out</button>
                    </div>
                </div>
                <form v-else @submit.prevent="submit">
                    <h1>{{ mode === 'login' ? 'Log in' : 'Create account' }}</h1>
                    <p class="type-label-md">Records you submit are recorded under your username.</p>
                    <label class="field">
                        <span class="type-label-lg">Username</span>
                        <input v-model.trim="username" maxlength="32" autocomplete="username" required>
                    </label>
                    <label class="field">
                        <span class="type-label-lg">Password</span>
                        <input v-model="password" type="password" minlength="8" maxlength="128" :autocomplete="mode === 'login' ? 'current-password' : 'new-password'" required>
                    </label>
                    <p class="submit-error" v-if="error">{{ error }}</p>
                    <button class="submit-button type-label-lg" type="submit" :disabled="busy">{{ busy ? 'Please wait...' : (mode === 'login' ? 'Log in' : 'Create account') }}</button>
                    <button class="switch-mode type-label-md" type="button" @click="switchMode">{{ mode === 'login' ? 'No account? Create one' : 'Already have an account? Log in' }}</button>
                </form>
            </div>
        </main>
    `,
    methods: {
        switchMode() {
            this.mode = this.mode === 'login' ? 'register' : 'login';
            this.error = '';
        },
        async submit() {
            this.busy = true;
            this.error = '';
            try {
                const path = this.mode === 'login' ? '/api/users/login' : '/api/users/register';
                const response = await fetch(`${SUBMISSION_API}${path}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: this.username, password: this.password }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    this.error = data.error || 'Could not log in. Try again later.';
                    return;
                }
                this.store.setSession(data.username, data.token);
                this.password = '';
                this.$router.push('/submit');
            } catch {
                this.error = 'Could not reach the server. Try again later.';
            } finally {
                this.busy = false;
            }
        },
        async logOut() {
            try {
                await fetch(`${SUBMISSION_API}/api/users/logout`, {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${this.store.token}` },
                });
            } catch {
                // Even if the server can't be reached, the session is forgotten on this device
            }
            this.store.clearSession();
            this.username = '';
            this.password = '';
        },
    },
};
