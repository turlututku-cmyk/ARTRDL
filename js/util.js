// https://stackoverflow.com/questions/3452546/how-do-i-get-the-youtube-video-id-from-a-url
export function getYoutubeIdFromUrl(url) {
    return url.match(
        /.*(?:youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=)([^#\&\?]*).*/,
    )?.[1] ?? '';
}

export function embed(video) {
    return `https://www.youtube.com/embed/${getYoutubeIdFromUrl(video)}`;
}

export function localize(num) {
    return num.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function getThumbnailFromId(id) {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
}

export function deviceIcon(device, dark) {
    const icon = device === 'console'
        ? 'game-controller'
        : device === 'mobile'
            ? 'phone-landscape'
            : 'computer';
    return `/assets/${icon}${dark ? '-dark' : ''}.svg`;
}

const difficultyFiles = {
    easy: 'easy-hard',
    medium: 'medium-mid',
    hard: 'hard-mid',
    insane: 'insane-mid',
    extreme: 'extreme-low',
};

const tierFiles = [
    'easy-low', 'easy-mid', 'easy-hard',
    'medium-low', 'medium-mid', 'medium-high',
    'hard-low', 'hard-mid', 'hard-high',
    'insane-low', 'insane-mid', 'insane-high',
    'extreme-low', 'extreme-mid', 'extreme-high',
    'not-humanly-possible', 'free-demon',
];

const tierWords = { low: 'Low', mid: 'Mid', high: 'High', hard: 'High' };

const cap = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

/**
 * Face shown for a level that has NO "difficulty" field in its json.
 * Read top to bottom: the first row where rank <= upToRank wins.
 * Edit the numbers to fit your list, or set "difficulty" on a level to override.
 * Valid faces: see the list `tierFiles` above (file names in assets/difficulty/).
 */
const DEFAULT_TIERS = [
    { upToRank: 1, face: 'extreme-low' },
    { upToRank: 25, face: 'insane-mid' },
    { upToRank: 40, face: 'hard-mid' },
    { upToRank: 55, face: 'medium-mid' },
    { upToRank: Infinity, face: 'easy-hard' },
];

export function difficultyOf(level, rank) {
    const set = level?.difficulty;
    if (tierFiles.includes(set)) return set;
    if (set in difficultyFiles) return difficultyFiles[set];
    const row = DEFAULT_TIERS.find((t) => rank === undefined || rank <= t.upToRank);
    return row.face;
}

export function difficultyIcon(level, rank) {
    return `/assets/difficulty/${difficultyOf(level, rank)}.png`;
}

export function difficultyLabel(level, rank) {
    const file = difficultyOf(level, rank);
    if (file === 'not-humanly-possible') return 'Not Humanly Possible';
    if (file === 'free-demon') return 'Free Demon';
    const [base, part] = file.split('-');
    return `${tierWords[part]} ${cap(base)} Demon`;
}

/**
 * Difficulty band for a GDDL tier. A tier on a boundary goes to the higher band.
 * Edit the numbers to change where each band starts.
 */
export function tierBand(tier) {
    if (tier >= 20) return 'extreme';
    if (tier >= 15) return 'insane';
    if (tier >= 10) return 'hard';
    if (tier >= 5) return 'medium';
    return 'easy';
}

export function tierBandLabel(band) {
    const names = { easy: 'Easy', medium: 'Medium', hard: 'Hard', insane: 'Insane', extreme: 'Extreme' };
    return `${names[band]} Demon`;
}

export function deviceLabel(device) {
    if (device === 'console') return 'Console';
    if (device === 'mobile') return 'Mobile';
    return 'PC';
}

// https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
export function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex],
            array[currentIndex],
        ];
    }

    return array;
}
