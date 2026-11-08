// Sessions on boris and their conversations. For now the mock's fixtures; shapes in server/CONTRACT.md.
import { SESSIONS, THREADS } from '../fixtures.mjs';

export async function getSessions() { return structuredClone(SESSIONS); }
export async function getThreads() { return structuredClone(THREADS); }
