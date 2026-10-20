import List from './pages/List.js';
import Leaderboard from './pages/Leaderboard.js';
import Roulette from './pages/Roulette.js';
import Packs from './pages/Packs.js';
import Submit from './pages/Submit.js';
import Review from './pages/Review.js';
import Login from './pages/Login.js';

export default [
    { path: '/', component: List },
    { path: '/leaderboard', component: Leaderboard },
    { path: '/roulette', component: Roulette },
    { path: '/packs', component: Packs },
    { path: '/login', component: Login },
    { path: '/submit', component: Submit },
    // Owner only: not linked from the menu, and the API still needs the token
    { path: '/review', component: Review },
];
