import routes from './routes.js';

let session = null;
try {
    session = JSON.parse(localStorage.getItem('session'));
} catch {
    session = null;
}

export const store = Vue.reactive({
    dark: JSON.parse(localStorage.getItem('dark')) || false,
    username: session?.username || '',
    token: session?.token || '',
    toggleDark() {
        this.dark = !this.dark;
        localStorage.setItem('dark', JSON.stringify(this.dark));
    },
    setSession(username, token) {
        this.username = username;
        this.token = token;
        localStorage.setItem('session', JSON.stringify({ username, token }));
    },
    clearSession() {
        this.username = '';
        this.token = '';
        localStorage.removeItem('session');
    },
});

const app = Vue.createApp({
    data: () => ({ store }),
});
const router = VueRouter.createRouter({
    history: VueRouter.createWebHashHistory(),
    routes,
});

app.use(router);

app.mount('#app');
