import { round, score, bandMultiplier } from './score.js';
import { tierBand } from './util.js';
import { SUBMISSION_API } from './config.js';

/**
 * Path to directory containing `_list.json` and all levels
 */
const dir = '/data';

/**
 * Records the owner has accepted (served by the submission Worker), keyed by level path.
 * If the Worker can't be reached, the list still loads from the level files alone.
 */
async function fetchAcceptedRecords() {
    try {
        const response = await fetch(`${SUBMISSION_API}/api/public/records`);
        const data = await response.json();
        return { records: data.records || {}, newLevels: data.newLevels || [] };
    } catch {
        return { records: {}, newLevels: [] };
    }
}

/**
 * Accepted new levels go into the list by GDDL rating, and extreme levels by their AREDL spot.
 * A level with no GDDL tier goes to the bottom. A level file with the same ID takes precedence,
 * so no level is shown twice.
 */
function addNewLevels(entries, newLevels = [], tiers = {}) {
    for (const newLevel of newLevels) {
        if (entries.some(([level]) => level && level.id === newLevel.id)) continue;
        const path = `new-${newLevel.id}`;
        const tier = newLevel.tier;
        // Extreme levels (tier 20+) go by their AREDL spot: a lower spot is harder
        const isExtreme = (info) => info?.tier != null && info.tier >= 20;
        let index = -1;
        if (isExtreme({ tier }) && newLevel.aredl != null) {
            index = entries.findIndex(([level]) => level && isExtreme(tiers[level.path]) && tiers[level.path].aredl != null && tiers[level.path].aredl > newLevel.aredl);
        }
        // Everything else (and extremes without an AREDL spot) goes by exact GDDL rating,
        // so 24.03 sorts above 23.98 even though both round to 24
        const rating = newLevel.rating ?? tier;
        const valueOf = (info) => info?.rating ?? info?.tier;
        if (index < 0 && rating != null) {
            index = entries.findIndex(([level]) => level && valueOf(tiers[level.path]) != null && valueOf(tiers[level.path]) < rating);
        }
        if (index < 0) index = entries.length;
        tiers[path] = { tier, rating: newLevel.rating, aredl: newLevel.aredl };
        entries.splice(index, 0, [
            {
                id: newLevel.id,
                name: newLevel.name,
                author: newLevel.creator,
                creators: [newLevel.creator],
                verifier: newLevel.verifier,
                verification: newLevel.verification,
                percentToQualify: '100',
                device: 'pc',
                tier,
                ...(newLevel.aredl !== undefined ? { aredl: newLevel.aredl } : {}),
                path,
                records: mergeRecords(newLevel.records),
            },
            null,
        ]);
    }
}

/**
 * GDDL tier per list level, written by scripts/sync-gddl.ps1
 */
async function fetchGddlTiers() {
    try {
        const result = await fetch(`${dir}/_gddl.json`);
        return await result.json();
    } catch {
        return {};
    }
}

/**
 * Level file records plus accepted records, newest-first by percent, each video counted once
 */
function mergeRecords(fileRecords, acceptedRecords = []) {
    const seen = new Set();
    return [...fileRecords, ...acceptedRecords]
        .filter((record) => {
            if (seen.has(record.link)) return false;
            seen.add(record.link);
            return true;
        })
        .sort((a, b) => b.percent - a.percent);
}

export async function fetchList(file = '_list') {
    const listResult = await fetch(`${dir}/${file}.json`);
    const accepted = await fetchAcceptedRecords();
    const tiers = await fetchGddlTiers();
    try {
        const list = await listResult.json();
        const entries = await Promise.all(
            list.map(async (path, rank) => {
                const levelResult = await fetch(`${dir}/${path}.json`);
                try {
                    const level = await levelResult.json();
                    return [
                        {
                            ...level,
                            path,
                            records: mergeRecords(level.records, accepted.records[path]),
                        },
                        null,
                    ];
                } catch {
                    console.error(`Failed to load level #${rank + 1} ${path}.`);
                    return [null, path];
                }
            }),
        );
        addNewLevels(entries, accepted.newLevels, tiers);
        // A level's difficulty band (from its GDDL tier) sets its points multiplier
        for (const [level] of entries) {
            if (level && tiers[level.path]?.tier != null) level.band = tierBand(tiers[level.path].tier);
        }
        return entries;
    } catch {
        console.error(`Failed to load list.`);
        return null;
    }
}


export async function fetchPacks() {
    try {
        const packsResult = await fetch(`${dir}/_packs.json`);
        return await packsResult.json();
    } catch {
        console.error("Failed to load packs.");
        return null;
    }
}

export async function fetchEditors() {
    try {
        const editorsResults = await fetch(`${dir}/_editors.json`);
        const editors = await editorsResults.json();
        return editors;
    } catch {
        return null;
    }
}

/**
 * Tier and AREDL position per level, written by scripts/sync-gddl.ps1
 */
export async function fetchGddl() {
    try {
        const gddlResult = await fetch(`${dir}/_gddl.json`);
        return await gddlResult.json();
    } catch {
        console.error("Failed to load GDDL tiers.");
        return null;
    }
}

/**
 * A verifier's own 100% video is their verification, so it scores once (as verified), not again as a record
 */
function isOwnVerification(level, record) {
    return record.percent === 100
        && record.link === level.verification
        && record.user.toLowerCase() === level.verifier.toLowerCase();
}

export async function fetchLeaderboard() {
    const list = await fetchList();

    const scoreMap = {};
    const errs = [];
    list.forEach(([level, err], rank) => {
        if (err) {
            errs.push(err);
            return;
        }

        // Verification (a verifier of "None" means nobody has beaten it: no points)
        if (level.verifier.toLowerCase() !== 'none') {
            const verifier = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === level.verifier.toLowerCase(),
            ) || level.verifier;
            scoreMap[verifier] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { verified } = scoreMap[verifier];
            verified.push({
                rank: rank + 1,
                level: level.name,
                path: level.path,
                device: level.device,
                score: score(rank + 1, 100, level.percentToQualify, bandMultiplier(level.band)),
                link: level.verification,
            });
        }

        // Records
        level.records.forEach((record) => {
            if (isOwnVerification(level, record)) return;

            const user = Object.keys(scoreMap).find(
                (u) => u.toLowerCase() === record.user.toLowerCase(),
            ) || record.user;
            scoreMap[user] ??= {
                verified: [],
                completed: [],
                progressed: [],
            };
            const { completed, progressed } = scoreMap[user];
            if (record.percent === 100) {
                completed.push({
                    rank: rank + 1,
                    level: level.name,
                    path: level.path,
                    device: record.device,
                    score: score(rank + 1, 100, level.percentToQualify, bandMultiplier(level.band)),
                    link: record.link,
                });
                return;
            }

            progressed.push({
                rank: rank + 1,
                level: level.name,
                path: level.path,
                device: record.device,
                percent: record.percent,
                score: score(rank + 1, record.percent, level.percentToQualify, bandMultiplier(level.band)),
                link: record.link,
            });
        });
    });

    // Wrap in extra Object containing the user and total score
    const res = Object.entries(scoreMap).map(([user, scores]) => {
        const { verified, completed, progressed } = scores;
        const total = [verified, completed, progressed]
            .flat()
            .reduce((prev, cur) => prev + cur.score, 0);

        return {
            user,
            total: round(total),
            ...scores,
        };
    });

    // Sort by total score
    return [res.sort((a, b) => b.total - a.total), errs];
}
