import { fetchLeaderboard, fetchPacks } from '../content.js';
import { localize, deviceIcon, deviceLabel } from '../util.js';
import { store } from '../main.js';

import Spinner from '../components/Spinner.js';

export default {
    components: {
        Spinner,
    },
    data: () => ({
        leaderboard: [],
        packs: [],
        loading: true,
        selected: 0,
        err: [],
        search: '',
    }),
    template: `
        <main v-if="loading">
            <Spinner></Spinner>
        </main>
        <main v-else class="page-leaderboard-container">
            <div class="page-leaderboard">
                <div class="error-container">
                    <p class="error" v-if="err.length > 0">
                        Leaderboard may be incorrect, as the following levels could not be loaded: {{ err.join(', ') }}
                    </p>
                </div>
                <div class="board-container">
                    <div class="board-search">
                        <input
                            type="text"
                            v-model="search"
                            placeholder="Search players..."
                        >
                    </div>
                    <table class="board" v-if="filteredLeaderboard.length > 0">
                        <tr v-for="[ientry, i] in filteredLeaderboard">
                            <td class="rank">
                                <p class="type-label-lg">#{{ i + 1 }}</p>
                            </td>
                            <td class="total">
                                <p class="type-label-lg">{{ localize(ientry.total) }}</p>
                            </td>
                            <td class="user" :class="{ 'active': selected == i }">
                                <button @click="selected = i">
                                    <span class="type-label-lg">{{ ientry.user }}</span>
                                </button>
                            </td>
                        </tr>
                    </table>
                    <p v-else class="board-empty">No players match "{{ search }}".</p>
                    <section class="board-rules">
                        <h3>How points work</h3>
                        <ul>
                            <li>A level's points depend on its place on the list. Higher places are worth more.</li>
                            <li>Harder levels are worth more: Medium 1.5x, Hard 2.5x, Insane 4x, Extreme 5x. Easy is 1x.</li>
                            <li>A verification counts once, as verified. It doesn't add a second completion.</li>
                            <li>Partial records (below 100%) score less than a full completion.</li>
                            <li>Completing a pack adds 10% of its levels' points as a bonus.</li>
                            <li>Levels below the main list only give points at 100%. Legacy levels give no points.</li>
                        </ul>
                    </section>
                </div>
                <div class="player-container">
                    <div class="player">
                        <h1>#{{ selected + 1 }} {{ entry.user }}</h1>
                        <h3>{{ localize(entry.total) }}</h3>
                        <router-link class="type-label-lg" :to="'/player/' + encodeURIComponent(entry.user)">View profile</router-link>
                        <h2 v-if="entry.verified.length > 0">Verified ({{ entry.verified.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.verified">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="device">
                                    <img :src="deviceIcon(score.device)" :alt="deviceLabel(score.device)" :title="deviceLabel(score.device)">
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.completed.length > 0">Completed ({{ entry.completed.length }})</h2>
                        <table class="table">
                            <tr v-for="score in entry.completed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.level }}</a>
                                </td>
                                <td class="device">
                                    <img :src="deviceIcon(score.device)" :alt="deviceLabel(score.device)" :title="deviceLabel(score.device)">
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="entry.progressed.length > 0">Progressed ({{entry.progressed.length}})</h2>
                        <table class="table">
                            <tr v-for="score in entry.progressed">
                                <td class="rank">
                                    <p>#{{ score.rank }}</p>
                                </td>
                                <td class="level">
                                    <a class="type-label-lg" target="_blank" :href="score.link">{{ score.percent }}% {{ score.level }}</a>
                                </td>
                                <td class="device">
                                    <img :src="deviceIcon(score.device)" :alt="deviceLabel(score.device)" :title="deviceLabel(score.device)">
                                </td>
                                <td class="score">
                                    <p>+{{ localize(score.score) }}</p>
                                </td>
                            </tr>
                        </table>
                        <h2 v-if="beatenPacks.length > 0">Packs ({{ beatenPacks.length }})</h2>
                        <div class="player-packs" v-if="beatenPacks.length > 0">
                            <span
                                v-for="pack in beatenPacks"
                                :key="pack.name"
                                class="player-pack-chip type-label-lg"
                                :style="{ '--pack-color': pack.color || 'var(--color-primary)' }"
                            >{{ pack.name }} +{{ localize(pack.bonus) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `,
    computed: {
        filteredLeaderboard() {
            const query = this.search.trim().toLowerCase();
            return this.leaderboard
                .map((ientry, i) => [ientry, i])
                .filter(([ientry]) => !query || ientry.user.toLowerCase().includes(query));
        },
        entry() {
            return this.leaderboard[this.selected];
        },
        beatenPacks() {
            return this.entry ? this.entry.packsBeaten : [];
        },
    },
    async mounted() {
        const [[leaderboard, err], packs] = await Promise.all([
            fetchLeaderboard(),
            fetchPacks(),
        ]);
        this.leaderboard = leaderboard;
        this.err = err;
        this.packs = packs || [];
        // Hide loading spinner
        this.loading = false;
    },
    methods: {
        localize,
        deviceIcon: (device) => deviceIcon(device, store.dark),
        deviceLabel,
    },
};
