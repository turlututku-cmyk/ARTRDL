import { fetchEditors, fetchLeaderboard, fetchList, fetchPacks } from "../content.js";
import { localize } from "../util.js";
import { store } from "../main.js";

import Spinner from "../components/Spinner.js";

const roleNames = { owner: 'Owner', admin: 'Admin', helper: 'Helper', dev: 'Dev', trial: 'Trial' };

export default {
    components: { Spinner },
    data: () => ({
        store,
        loading: true,
        leaderboard: [],
        editors: [],
        levels: [],
        packs: [],
        tab: 'completed',
        search: '',
        copied: false,
    }),
    template: `
        <main class="page-player">
            <Spinner v-if="loading"></Spinner>
            <div v-else-if="!entry" class="player-page">
                <router-link class="back-button" to="/leaderboard">&larr; Back</router-link>
                <p class="type-label-lg">No player named "{{ name }}" is on the leaderboard.</p>
            </div>
            <div v-else class="player-page">
                <router-link class="back-button" to="/leaderboard">&larr; Back</router-link>

                <header class="player-hero">
                    <div>
                        <h1>{{ entry.user }}</h1>
                        <span class="role-badge">{{ role }}</span>
                    </div>
                    <button class="copy-button" @click="copyLink">{{ copied ? 'Copied' : 'Copy link' }}</button>
                </header>

                <div class="player-stats">
                    <div>
                        <p class="type-title-sm">Score</p>
                        <strong>{{ localize(entry.total) }}</strong>
                    </div>
                    <div>
                        <p class="type-title-sm">Created</p>
                        <strong>{{ created.length }}</strong>
                    </div>
                    <div>
                        <p class="type-title-sm">Global rank</p>
                        <strong>#{{ index + 1 }}</strong>
                    </div>
                    <div>
                        <p class="type-title-sm">Hardest completion</p>
                        <strong>{{ hardest }}</strong>
                    </div>
                </div>

                <div class="player-body">
                    <aside class="player-side">
                        <section class="panel">
                            <h3>Details</h3>
                            <dl>
                                <div><dt>Account</dt><dd>{{ entry.user }}</dd></div>
                                <div><dt>Role</dt><dd>{{ role }}</dd></div>
                            </dl>
                        </section>
                        <section class="panel">
                            <h3>Activity</h3>
                            <div class="activity-grid">
                                <div><strong>{{ entry.completed.length }}</strong><span>Completions</span></div>
                                <div><strong>{{ entry.verified.length }}</strong><span>Verifications</span></div>
                                <div><strong>{{ created.length }}</strong><span>Created</span></div>
                                <div><strong>{{ beatenPacks.length }}</strong><span>Packs</span></div>
                            </div>
                        </section>
                    </aside>

                    <section class="player-main">
                        <div class="tabs">
                            <button
                                v-for="t in tabs"
                                :key="t.key"
                                :class="{ active: tab === t.key }"
                                @click="tab = t.key"
                            >{{ t.label }} {{ t.count }}</button>
                        </div>

                        <input class="player-search" v-if="tab !== 'packs'" v-model="search" placeholder="Search levels...">

                        <div class="panel-list" v-if="tab !== 'packs'">
                            <p class="empty" v-if="rows.length === 0">Nothing here yet.</p>
                            <div class="list-row" v-for="row in rows" :key="row.key">
                                <span class="row-rank">#{{ row.rank }}</span>
                                <span class="row-name">{{ row.name }}</span>
                                <span class="row-extra">{{ row.extra }}</span>
                                <a v-if="row.link" class="video-button" :href="row.link" target="_blank">Video</a>
                            </div>
                        </div>

                        <div class="panel-list" v-else>
                            <p class="empty" v-if="beatenPacks.length === 0">No packs completed yet.</p>
                            <span
                                class="pack-chip"
                                v-for="pack in beatenPacks"
                                :key="pack.name"
                                :style="{ '--pack-color': pack.color || 'var(--list-red)' }"
                            >{{ pack.name }}</span>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    `,
    computed: {
        name() {
            return this.$route.params.name || '';
        },
        index() {
            return this.leaderboard.findIndex((entry) => entry.user.toLowerCase() === this.name.toLowerCase());
        },
        entry() {
            return this.index >= 0 ? this.leaderboard[this.index] : null;
        },
        role() {
            const editor = this.editors.find((e) => e.name.toLowerCase() === this.name.toLowerCase());
            if (!editor) return 'Member';
            return roleNames[editor.role] || editor.role;
        },
        created() {
            return this.levels
                .map(([level], i) => ({ level, rank: i + 1 }))
                .filter(({ level }) => level && (level.creators || []).some((c) => c.toLowerCase() === this.name.toLowerCase()))
                .map(({ level, rank }) => ({ rank, name: level.name, link: level.verification }));
        },
        hardest() {
            if (!this.entry) return '—';
            const beaten = [...this.entry.verified, ...this.entry.completed];
            if (beaten.length === 0) return '—';
            const best = beaten.reduce((a, b) => (b.rank < a.rank ? b : a));
            return `#${best.rank} ${best.level}`;
        },
        beatenPacks() {
            if (!this.entry) return [];
            const done = new Set([...this.entry.verified, ...this.entry.completed].map((s) => s.path));
            return this.packs.filter((pack) => pack.levels.every((path) => done.has(path)));
        },
        tabs() {
            if (!this.entry) return [];
            return [
                { key: 'completed', label: 'Completed', count: this.entry.completed.length },
                { key: 'verified', label: 'Verified', count: this.entry.verified.length },
                { key: 'created', label: 'Created', count: this.created.length },
                { key: 'progressed', label: 'Progressed', count: this.entry.progressed.length },
                { key: 'packs', label: 'Packs', count: this.beatenPacks.length },
            ];
        },
        rows() {
            if (!this.entry) return [];
            const scored = (s) => ({ key: `${s.rank}-${s.level}`, rank: s.rank, name: s.level, link: s.link, extra: `+${localize(s.score)}` });
            let items;
            switch (this.tab) {
                case 'verified':
                    items = this.entry.verified.map(scored);
                    break;
                case 'created':
                    items = this.created.map((c) => ({ key: `${c.rank}-${c.name}`, rank: c.rank, name: c.name, link: c.link, extra: '' }));
                    break;
                case 'progressed':
                    items = this.entry.progressed.map((s) => ({ ...scored(s), extra: `${s.percent}%` }));
                    break;
                default:
                    items = this.entry.completed.map(scored);
            }
            const query = this.search.trim().toLowerCase();
            return items.filter((row) => !query || row.name.toLowerCase().includes(query));
        },
    },
    async mounted() {
        const [[leaderboard], editors, levels, packs] = await Promise.all([
            fetchLeaderboard(),
            fetchEditors(),
            fetchList(),
            fetchPacks(),
        ]);
        this.leaderboard = leaderboard || [];
        this.editors = editors || [];
        this.levels = levels || [];
        this.packs = packs || [];
        this.loading = false;
        // Open on Verified when the player has no completions, so the page isn't empty
        if (this.entry && this.entry.completed.length === 0 && this.entry.verified.length > 0) {
            this.tab = 'verified';
        }
    },
    methods: {
        localize,
        async copyLink() {
            await navigator.clipboard.writeText(window.location.href);
            this.copied = true;
        },
    },
};
