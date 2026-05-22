import type { GradeCategory } from '@prisma/client';
import type { GradingMode } from '@/lib/teacher/teacher-gradebook';

export type GradeCategoryKind = 'block' | 'component';
export type GradeBlockKey = 'continuous' | 'final';

export type GradeCategoryMeta = {
  kind: GradeCategoryKind;
  blockKey?: GradeBlockKey;
  parentId?: string;
};

export type GradeCategoryRow = {
  id: string;
  name: string;
  weight: number;
  minGrade: number | null;
  sortOrder: number;
  meta: GradeCategoryMeta;
};

export type WeightSummary = {
  total: number;
  remaining: number;
  valid: boolean;
};

export type GradebookStructure = {
  mode: GradingMode;
  scaleMax: number;
  topLevel: WeightSummary;
  single: {
    components: GradeCategoryRow[];
    summary: WeightSummary;
  };
  continuous: {
    blocks: Array<
      GradeCategoryRow & {
        components: GradeCategoryRow[];
        summary: WeightSummary;
      }
    >;
    summary: WeightSummary;
  };
};

export function parseCategoryMeta(rulesJson: unknown): GradeCategoryMeta {
  if (!rulesJson || typeof rulesJson !== 'object') {
    return { kind: 'component' };
  }
  const r = rulesJson as Record<string, unknown>;
  const kind = r.kind === 'block' ? 'block' : 'component';
  const blockKey =
    r.blockKey === 'continuous' || r.blockKey === 'final' ? r.blockKey : undefined;
  const parentId = typeof r.parentId === 'string' ? r.parentId : undefined;
  return { kind, blockKey, parentId };
}

export function toCategoryRow(cat: GradeCategory): GradeCategoryRow {
  return {
    id: cat.id,
    name: cat.name,
    weight: cat.weight,
    minGrade: cat.minGrade,
    sortOrder: cat.sortOrder,
    meta: parseCategoryMeta(cat.rulesJson),
  };
}

export function summarizeWeights(weights: number[], target = 100): WeightSummary {
  const total = Math.round(weights.reduce((a, b) => a + b, 0) * 100) / 100;
  const remaining = Math.round((target - total) * 100) / 100;
  return {
    total,
    remaining,
    valid: Math.abs(total - target) < 0.01,
  };
}

export function buildGradebookStructure(
  categories: GradeCategory[],
  mode: GradingMode,
  scaleMax: number
): GradebookStructure {
  const rows = categories.map(toCategoryRow);
  const blocks = rows.filter((r) => r.meta.kind === 'block');
  const components = rows.filter((r) => r.meta.kind === 'component');

  const singleComponents = components.filter((c) => !c.meta.parentId);
  const singleSummary = summarizeWeights(singleComponents.map((c) => c.weight));

  const continuousBlocks = blocks
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((block) => {
      const blockComponents = components.filter((c) => c.meta.parentId === block.id);
      return {
        ...block,
        components: blockComponents,
        summary: summarizeWeights(
          blockComponents.map((c) => c.weight),
          block.weight
        ),
      };
    });

  const continuousSummary = summarizeWeights(blocks.map((b) => b.weight));

  const topLevel =
    mode === 'single' ? singleSummary : continuousSummary;

  return {
    mode,
    scaleMax,
    topLevel,
    single: { components: singleComponents, summary: singleSummary },
    continuous: { blocks: continuousBlocks, summary: continuousSummary },
  };
}

export function validateNewComponentWeight(
  mode: GradingMode,
  categories: GradeCategory[],
  input: { weight: number; parentId?: string | null }
): { ok: boolean; error?: string } {
  const rows = categories.map(toCategoryRow);

  if (mode === 'single') {
    const existing = rows.filter((r) => r.meta.kind === 'component' && !r.meta.parentId);
    const next = summarizeWeights([...existing.map((c) => c.weight), input.weight]);
    if (next.total > 100.01) {
      return {
        ok: false,
        error: `Cannot exceed 100% (would be ${next.total}%). ${next.remaining}% remaining.`,
      };
    }
    return { ok: true };
  }

  if (!input.parentId) {
    return { ok: false, error: 'Select a block (Continuous or Final Exam) for this component.' };
  }

  const parent = rows.find((r) => r.id === input.parentId && r.meta.kind === 'block');
  if (!parent) return { ok: false, error: 'Parent block not found.' };

  const siblings = rows.filter(
    (r) => r.meta.kind === 'component' && r.meta.parentId === parent.id
  );
  const next = summarizeWeights(
    [...siblings.map((c) => c.weight), input.weight],
    parent.weight
  );
  if (next.total > parent.weight + 0.01) {
    return {
      ok: false,
      error: `Cannot exceed ${parent.name} (${parent.weight}%). Would be ${next.total}%.`,
    };
  }
  return { ok: true };
}

export function validateBlockWeights(
  categories: GradeCategory[],
  input: { id?: string; weight: number }
): { ok: boolean; error?: string } {
  const blocks = categories
    .map(toCategoryRow)
    .filter((r) => r.meta.kind === 'block' && r.id !== input.id);
  const next = summarizeWeights([...blocks.map((b) => b.weight), input.weight]);
  if (next.total > 100.01) {
    return {
      ok: false,
      error: `Continuous + Final cannot exceed 100% (would be ${next.total}%).`,
    };
  }
  return { ok: true };
}

export const BLOCK_LABELS: Record<GradeBlockKey, string> = {
  continuous: 'Continuous Evaluation',
  final: 'Final Exam',
};

/** Level 1 + Level 2 validation — structure ready for Workspace grading. */
export function isGradebookStructureComplete(
  structure: GradebookStructure,
  blocksConfirmed: boolean
): boolean {
  if (structure.mode === 'single') {
    return (
      structure.single.components.length > 0 && structure.single.summary.valid
    );
  }
  if (!blocksConfirmed || !structure.continuous.summary.valid) return false;
  if (structure.continuous.blocks.length < 2) return false;
  return structure.continuous.blocks.every(
    (b) => b.components.length > 0 && b.summary.valid
  );
}

export function canAddComponentsToStructure(
  structure: GradebookStructure,
  blocksConfirmed: boolean
): boolean {
  if (structure.mode === 'single') return true;
  return blocksConfirmed && structure.continuous.summary.valid;
}
