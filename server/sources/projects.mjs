// Projects: merges and cost per day, last live, rows designed but not built. For now the mock's fixtures.
import { APPS, DAYS14, DAY_PRS } from '../fixtures.mjs';

export async function getApps() { return structuredClone(APPS); }
export async function getDays14() { return [...DAYS14]; }
export async function getDayPrs() { return structuredClone(DAY_PRS); }
