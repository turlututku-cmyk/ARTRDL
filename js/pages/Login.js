import { store } from "../main.js";

export default {
    data: () => ({
        store,
        name: '',
        error: '',
    }),
    template: `
        <main class="page-submit">
            <div class="submit-card">
                <h1>Log in</h1>
                <p class="type-label-md">Pick a username. Records you submit will show this name.</p>
                <form v-if="!store.username" @submit.prevent="logIn">
                    <label class="field">
                        <span class="type-label-lg">Username</span>
                        <input v-model.trim="name" maxlength="32" required>
                    </label>
                    <p class="submit-error" v-if="error">{{ error }}</p>
                    <button class="submit-button type-label-lg" type="submit">Log in</button>
                </form>
                <div v-else class="review-list">
                    <p class="type-label-lg">Logged in as <strong>{{ store.username }}</strong></p>
                    <div class="review-buttons">
                        <router-link class="submit-button type-label-lg" to="/submit">Submit a record</router-link>
                        <button class="submit-button type-label-lg" @click="logOut">Log out</button>
                    </div>
                </div>
            </div>
        </main>
    `,
    methods: {
        logIn() {
            if (this.name.length < 2) {
                this.error = 'Use at least 2 characters.';
                return;
            }
            this.store.setUsername(this.name);
            this.$router.push('/submit');
        },
        logOut() {
            this.store.clearUsername();
            this.name = '';
        },
    },
};
