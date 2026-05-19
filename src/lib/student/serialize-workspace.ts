import type { SubjectWorkspace } from './subject-context';

/** Makes workspace safe to pass from Server Components to Client Components. */
export function serializeSubjectWorkspace(ws: SubjectWorkspace): SubjectWorkspace {
  return JSON.parse(JSON.stringify(ws)) as SubjectWorkspace;
}
