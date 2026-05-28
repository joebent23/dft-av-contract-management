import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';
// The ODCS schema is vendored separately into src/assets/odcs.schema.json.
// We import as JSON; if the file is missing the build will fail with a clear error.
import schema from '@/assets/odcs.schema.json';

export interface ValidationIssue {
  line: number;
  message: string;
  path: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  parsed?: unknown;
}

let cachedValidator: ValidateFunction | null = null;
function getValidator(): ValidateFunction {
  if (cachedValidator) return cachedValidator;
  const ajv = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(ajv);
  cachedValidator = ajv.compile(schema as object);
  return cachedValidator;
}

interface YamlException extends Error {
  mark?: { line?: number };
}

function formatAjvError(e: ErrorObject): ValidationIssue {
  const path = e.instancePath || '/';
  return {
    line: 1,
    path,
    message: `${path} ${e.message ?? 'invalid'}`,
  };
}

export function validate(yamlString: string): ValidationResult {
  if (!yamlString.trim()) {
    return { valid: false, errors: [{ line: 1, path: '/', message: 'Document is empty.' }] };
  }
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlString);
  } catch (err) {
    const ye = err as YamlException;
    return {
      valid: false,
      errors: [
        {
          line: (ye.mark?.line ?? 0) + 1,
          path: '/',
          message: `YAML parse error: ${ye.message}`,
        },
      ],
    };
  }

  if (parsed === null || typeof parsed !== 'object') {
    return {
      valid: false,
      errors: [{ line: 1, path: '/', message: 'Top-level document must be a mapping.' }],
      parsed,
    };
  }

  const validator = getValidator();
  const ok = validator(parsed);
  if (ok) return { valid: true, errors: [], parsed };
  const errors = (validator.errors ?? []).map(formatAjvError);
  return { valid: false, errors, parsed };
}

export function parseYamlSafe(yamlString: string): unknown {
  try {
    return yaml.load(yamlString);
  } catch {
    return null;
  }
}
