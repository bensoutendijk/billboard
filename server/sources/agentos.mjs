// Agent OS: rules, evals, skills, permissions, memories, each part's use, and the rules versions. For now the mock's fixtures.
import { AOS, PART_INFO, VERSIONS } from '../fixtures.mjs';

export async function getAos() { return structuredClone(AOS); }
export async function getPartInfo() { return structuredClone(PART_INFO); }
export async function getVersions() { return structuredClone(VERSIONS); }
