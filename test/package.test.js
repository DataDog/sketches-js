/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2026 Datadog, Inc.
 */

/* eslint-env node */

const { execFileSync } = require('child_process');
const { resolve } = require('path');
const ts = require('typescript');
const { types } = require('../package.json');

const packageDirectory = resolve(__dirname, '..');

beforeAll(() => {
    execFileSync('yarn', ['build'], { cwd: packageDirectory });
});

describe('built package', () => {
    it('provides declarations that typecheck without skipLibCheck', () => {
        const program = ts.createProgram([resolve(packageDirectory, types)], {
            noEmit: true,
            strict: true,
            skipLibCheck: false,
            esModuleInterop: true,
            target: ts.ScriptTarget.ES2015,
            module: ts.ModuleKind.CommonJS,
            types: []
        });
        const errors = ts
            .getPreEmitDiagnostics(program)
            .map(diagnostic =>
                ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')
            );

        expect(errors).toEqual([]);
    });

    it('can serialize and deserialize using the package entry point', () => {
        const { DDSketch } = require(packageDirectory);
        const sketch = new DDSketch();
        [-100, -1, 0, 1, 100].forEach(value => sketch.accept(value));

        const decoded = DDSketch.fromProto(sketch.toProto());

        expect(decoded.count).toEqual(sketch.count);
        [0, 0.5, 0.95, 0.99, 1].forEach(quantile => {
            expect(decoded.getValueAtQuantile(quantile)).toBeCloseTo(
                sketch.getValueAtQuantile(quantile),
                10
            );
        });
    });
});
