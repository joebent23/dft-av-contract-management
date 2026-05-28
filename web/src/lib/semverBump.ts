import semver from 'semver';
import yaml from 'js-yaml';

export type BumpKind = 'major' | 'minor' | 'patch' | 'none';

export interface BumpResult {
  bump: BumpKind;
  reason: string;
  suggestedVersion: string;
}

interface FieldDef {
  type?: string;
  required?: boolean;
  description?: string;
  // Allow arbitrary additional keys without using `any`.
  [k: string]: unknown;
}

interface SchemaProperty {
  name: string;
  type?: string;
  required?: boolean;
  description?: string;
  fields?: FieldDef[];
}

interface SchemaEntry {
  name?: string;
  properties?: SchemaProperty[];
}

interface ContractShape {
  version?: string;
  schema?: SchemaEntry[];
}

function asContract(obj: unknown): ContractShape {
  if (!obj || typeof obj !== 'object') return {};
  return obj as ContractShape;
}

interface FieldKey {
  propName: string;
  fieldName: string;
}

interface FlatField {
  key: string;
  propName: string;
  fieldName: string;
  required: boolean;
  type: string;
  description: string;
}

function flattenFields(c: ContractShape): Map<string, FlatField> {
  const map = new Map<string, FlatField>();
  for (const entry of c.schema ?? []) {
    for (const prop of entry.properties ?? []) {
      for (const field of prop.fields ?? []) {
        const fieldName = String(field.name ?? '');
        if (!fieldName) continue;
        const key = `${prop.name}.${fieldName}`;
        map.set(key, {
          key,
          propName: prop.name,
          fieldName,
          required: Boolean(field.required),
          type: String(field.type ?? 'string'),
          description: String(field.description ?? ''),
        });
      }
    }
  }
  return map;
}

function bumpRank(b: BumpKind): number {
  return b === 'major' ? 3 : b === 'minor' ? 2 : b === 'patch' ? 1 : 0;
}

function maxBump(a: BumpKind, b: BumpKind): BumpKind {
  return bumpRank(a) >= bumpRank(b) ? a : b;
}

function nextVersion(current: string, bump: BumpKind): string {
  const clean = semver.coerce(current)?.version ?? '0.0.0';
  if (bump === 'none') return clean;
  return semver.inc(clean, bump) ?? clean;
}

export function computeBump(
  oldYamlStr: string | null,
  newYamlStr: string,
): BumpResult {
  const newDoc = asContract(yaml.load(newYamlStr));
  const currentVersion = String(newDoc.version ?? '0.1.0');

  if (oldYamlStr === null) {
    return {
      bump: 'minor',
      reason: 'New contract — initial publish.',
      suggestedVersion: currentVersion || '0.1.0',
    };
  }

  const oldDoc = asContract(yaml.load(oldYamlStr));
  const oldFields = flattenFields(oldDoc);
  const newFields = flattenFields(newDoc);

  const reasons: string[] = [];
  let bump: BumpKind = 'none';

  // Removed required fields => major. Removed optional => minor.
  for (const [key, of_] of oldFields) {
    if (!newFields.has(key)) {
      if (of_.required) {
        bump = maxBump(bump, 'major');
        reasons.push(`Removed required field ${key}`);
      } else {
        bump = maxBump(bump, 'minor');
        reasons.push(`Removed optional field ${key}`);
      }
    }
  }

  for (const [key, nf] of newFields) {
    const of_ = oldFields.get(key);
    if (!of_) {
      if (nf.required) {
        bump = maxBump(bump, 'major');
        reasons.push(`Added required field ${key}`);
      } else {
        bump = maxBump(bump, 'minor');
        reasons.push(`Added optional field ${key}`);
      }
      continue;
    }
    if (of_.type !== nf.type) {
      bump = maxBump(bump, 'major');
      reasons.push(`Type changed on ${key} (${of_.type} -> ${nf.type})`);
    }
    if (!of_.required && nf.required) {
      bump = maxBump(bump, 'major');
      reasons.push(`Field ${key} became required`);
    } else if (of_.required && !nf.required) {
      bump = maxBump(bump, 'minor');
      reasons.push(`Field ${key} became optional`);
    }
    if (of_.description !== nf.description) {
      bump = maxBump(bump, 'patch');
      reasons.push(`Description changed on ${key}`);
    }
  }

  if (bump === 'none') {
    // Fall back: any structural difference at all -> patch.
    if (JSON.stringify(oldDoc) !== JSON.stringify(newDoc)) {
      bump = 'patch';
      reasons.push('Non-schema metadata changed.');
    } else {
      reasons.push('No changes detected.');
    }
  }

  return {
    bump,
    reason: reasons.join('; '),
    suggestedVersion: nextVersion(currentVersion, bump),
  };
}

// Convenience export used by callers/tests under earlier name.
export const semverBump = computeBump;

export type FieldKeyT = FieldKey;
