/**
 * List size settings. Change these two numbers to resize your list.
 *
 * Ranks 1 .. MAIN_LIST_END              = Main list
 *   -> records give points at any percentage above the level's percentToQualify
 * Ranks MAIN_LIST_END+1 .. EXTENDED_LIST_END = Extended list
 *   -> only 100% completions give points
 * Ranks above EXTENDED_LIST_END          = Legacy list
 *   -> no points, and the sidebar shows "Legacy" instead of a number
 */
export const MAIN_LIST_END = 50;
export const EXTENDED_LIST_END = 75;

/**
 * Address of the deployed submission Worker (see worker/wrangler.toml).
 * Submit Record sends to this address. Change it to your own Worker's address.
 */
export const SUBMISSION_API = 'https://artrdl.cdukingproj.workers.dev';
