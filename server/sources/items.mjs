// Items: each piece of work with its track, question or ask, report and facts. For now the mock's fixtures.
import { ITEMS, BUILD, FROM_MOCK, NOW } from '../fixtures.mjs';

export async function getItems() { return structuredClone(ITEMS); }
export async function getTracks() { return { build: [...BUILD], fromMock: [...FROM_MOCK] }; }
export async function getNow() { return { ...NOW }; }
