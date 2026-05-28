import { describe, it, expect } from 'vitest';
import { computeBump } from './semverBump';

const baseYaml = `
version: 1.2.3
schema:
  - name: orders
    properties:
      - name: order
        fields:
          - name: id
            type: string
            required: true
            description: Order id
          - name: total
            type: number
            required: true
            description: Order total
`;

describe('computeBump', () => {
  it('treats null old as initial minor', () => {
    const r = computeBump(null, baseYaml);
    expect(r.bump).toBe('minor');
    expect(r.suggestedVersion).toBe('1.2.3');
  });

  it('added optional field is minor', () => {
    const next = baseYaml.replace(
      '            description: Order total',
      `            description: Order total
          - name: currency
            type: string
            required: false
            description: ISO currency`,
    );
    const r = computeBump(baseYaml, next);
    expect(r.bump).toBe('minor');
    expect(r.suggestedVersion).toBe('1.3.0');
  });

  it('removed required field is major', () => {
    const next = `
version: 1.2.3
schema:
  - name: orders
    properties:
      - name: order
        fields:
          - name: id
            type: string
            required: true
            description: Order id
`;
    const r = computeBump(baseYaml, next);
    expect(r.bump).toBe('major');
    expect(r.suggestedVersion).toBe('2.0.0');
  });

  it('type change is major', () => {
    const next = baseYaml.replace('type: number', 'type: string');
    const r = computeBump(baseYaml, next);
    expect(r.bump).toBe('major');
    expect(r.suggestedVersion).toBe('2.0.0');
  });

  it('description-only change is patch', () => {
    const next = baseYaml.replace('Order total', 'Order grand total');
    const r = computeBump(baseYaml, next);
    expect(r.bump).toBe('patch');
    expect(r.suggestedVersion).toBe('1.2.4');
  });
});
