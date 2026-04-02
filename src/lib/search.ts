import type { WhereClause } from "@rootcx/sdk";

/** Combine deux WhereClause avec un $and. Retourne undefined si les deux sont vides. */
export function mergeWhere(a: WhereClause | undefined, b: WhereClause | undefined): WhereClause | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  return { $and: [a, b] };
}

/** Construit un $or $ilike sur plusieurs champs à partir d'un terme de recherche. */
export function buildSearchClause(term: string, fields: string[]): WhereClause | undefined {
  if (!term.trim()) return undefined;
  const t = `%${term.trim()}%`;
  const clauses = fields.map(f => ({ [f]: { $ilike: t } }));
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}
