/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import {
    DDSketch,
    LogCollapsingHighestDenseDDSketch,
    LogCollapsingLowestDenseDDSketch
} from '../src/ddsketch';
import {
    generateDecreasing,
    generateIncreasing,
    generateRandom,
    generateRandomIntegers,
    generateConstant,
    generateConstantNegative,
    generatePositiveAndNegative,
    Counter
} from './datasets';

const datasets = [
    generateIncreasing,
    generateDecreasing,
    generateRandom,
    generateRandomIntegers,
    generateConstant,
    generateConstantNegative,
    generatePositiveAndNegative
];
const testSizes = [3, 5, 10, 100, 1000, 5000];
const testQuantiles = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.999, 1];

const relativeAccuracy = 0.05;

const getQuantile = (data: number[], quantile: number) => {
    const sortedIncreasingData = data.sort((a, b) => a - b);
    const rank = Math.floor(quantile * (data.length - 1));
    return sortedIncreasingData[rank];
};

function test(DDSketch: any) {
    const evaluateSketchAccuracy = (sketch: DDSketch, data: number[]) => {
        for (const quantile of testQuantiles) {
            const sketchQ = sketch.getValueAtQuantile(quantile);
            const dataQ = getQuantile(data, quantile);
            const error = Math.abs(sketchQ - dataQ);

            const adjustedError =
                error - sketch.mapping.relativeAccuracy * Math.abs(dataQ);
            const allowedError = 1e-15;

            if (Number.isNaN(adjustedError) || adjustedError > allowedError) {
                console.error(
                    `For q(${quantile}), size(${data.length}):\nSketch result: ${sketchQ}\nData result: ${dataQ}\nData: [${data}]\nSketch bins: [${sketch.store.bins}]`
                );
            }

            expect(adjustedError).toBeLessThanOrEqual(allowedError);
        }
    };

    it('can be initialized without parameters', () => {
        const data = generateIncreasing(5);
        const sketch = new DDSketch();

        for (const value of data) {
            sketch.accept(value);
        }

        evaluateSketchAccuracy(sketch, data);
    });

    it('can have values with integer weights added to it', () => {
        const data = generateRandomIntegers(100);
        const sketch = new DDSketch({ relativeAccuracy });
        const counter = new Counter(data);

        for (const value of data) {
            const count = counter.get(value);
            sketch.accept(value, count);
        }

        evaluateSketchAccuracy(sketch, data);
    });

    it('can have values with decimal weights added to it', () => {
        const data = generateIncreasing(100);
        const sketch = new DDSketch({ relativeAccuracy });

        for (const value of data) {
            sketch.accept(value, 1.1);
        }
        sketch.accept(100, 110);

        const dataMedian = 99;
        const sketchMedian = sketch.getValueAtQuantile(0.5);
        const error = Math.abs(sketchMedian - dataMedian);

        expect(
            error - relativeAccuracy * Math.abs(dataMedian)
        ).toBeLessThanOrEqual(1e-15);
        expect(Math.abs(sketch.count - 110 * 2)).toBeLessThan(1e-5);
        expect(sketch.sum).toEqual(5445 + 11000);
        expect(Math.abs(sketch.sum / sketch.count - 74.75)).toBeLessThan(1e-5);
    });

    it('can be serialized to and from a protobuf', () => {
        const data = generateIncreasing(100);
        const sketch = new DDSketch({ relativeAccuracy });

        for (const value of data) {
            sketch.accept(value);
        }

        evaluateSketchAccuracy(sketch, data);

        const encodedProto = sketch.toProto();
        const decodedProto = DDSketch.fromProto(encodedProto);

        evaluateSketchAccuracy(decodedProto, data);
    });

    it('can be serialized to and from JSON', () => {
        const data = generateIncreasing(100);
        const sketch = new DDSketch({ relativeAccuracy });

        for (const value of data) {
            sketch.accept(value);
        }

        evaluateSketchAccuracy(sketch, data);

        const json = sketch.toJSON();
        const decodedJSON = DDSketch.fromJSON(json);

        evaluateSketchAccuracy(decodedJSON, data);
    });

    it('produces the same quantiles after JSON round-trip as original', () => {
        // Test with various datasets to ensure JSON serialization is lossless
        const testCases = [
            { name: 'random values', data: generateRandom(500) },
            {
                name: 'positive and negative',
                data: generatePositiveAndNegative(500)
            },
            { name: 'constant values', data: generateConstant(100) },
            { name: 'random integers', data: generateRandomIntegers(300) }
        ];

        for (const testCase of testCases) {
            const sketch = new DDSketch({ relativeAccuracy });

            for (const value of testCase.data) {
                sketch.accept(value);
            }

            const json = sketch.toJSON();
            const restored = DDSketch.fromJSON(json);

            // Verify count matches
            expect(restored.count).toEqual(sketch.count);

            // Verify all quantiles match (within floating-point precision)
            for (const quantile of testQuantiles) {
                const original = sketch.getValueAtQuantile(quantile);
                const restoredValue = restored.getValueAtQuantile(quantile);

                // Quantiles should match within floating-point precision
                // Allow small differences due to floating-point arithmetic
                // during reconstruction - much smaller than the sketch's
                // relative accuracy guarantee
                if (!Number.isNaN(original)) {
                    const relativeError =
                        Math.abs(original - restoredValue) / Math.abs(original);
                    expect(relativeError).toBeLessThan(1e-6);
                } else {
                    expect(restoredValue).toEqual(original);
                }
            }

            // Also verify the restored sketch is accurate against the original data
            evaluateSketchAccuracy(restored, testCase.data);
        }
    });

    it('produces compact JSON representation', () => {
        const sketch = new DDSketch({ relativeAccuracy });

        // Add sparse data
        sketch.accept(100);
        sketch.accept(500);
        sketch.accept(1000);

        const json = sketch.toJSON();

        // JSON should be an array of length 5
        expect(Array.isArray(json)).toBe(true);
        expect(json.length).toEqual(5);

        // Verify structure: [gamma, indexOffset, positiveValues, negativeValues, zeroCount]
        expect(typeof json[0]).toBe('number'); // gamma
        expect(typeof json[1]).toBe('number'); // indexOffset
        expect(Array.isArray(json[2])).toBe(true); // positiveValues
        expect(Array.isArray(json[3])).toBe(true); // negativeValues
        expect(typeof json[4]).toBe('number'); // zeroCount

        // Positive values should be sparse: [offset, [idx, count], ...]
        const positiveValues = json[2] as unknown[];
        expect(positiveValues.length).toBeGreaterThan(0);
        expect(typeof positiveValues[0]).toBe('number'); // offset

        // Should only have non-zero bins (3 values = 3 non-zero bins)
        expect(positiveValues.length).toBe(4); // offset + 3 sparse entries
    });

    describe('datasets', () => {
        for (const dataset of datasets) {
            it(`is accurate for dataset '${dataset.name}'`, () => {
                for (const n of testSizes) {
                    const data = dataset(n);
                    const sketch = new DDSketch({
                        relativeAccuracy
                    });

                    for (const value of data) {
                        sketch.accept(value);
                    }

                    evaluateSketchAccuracy(sketch, data);
                }
            });
        }
    });

    describe('merging sketches', () => {
        it('allows a sketch with values to be merged into an empty sketch', () => {
            /**
             * sketch1: Data is added
             * sketch2: Empty, sketch1 is merged into it
             */

            for (const n of testSizes) {
                const data = generateIncreasing(n);
                const sketch1 = new DDSketch({
                    relativeAccuracy
                });

                for (const value of data) {
                    sketch1.accept(value);
                }

                const sketch2 = new DDSketch({
                    relativeAccuracy
                });

                expect(sketch2.count).toEqual(0);

                sketch2.merge(sketch1);

                expect(sketch2.count).toEqual(sketch1.count);
                evaluateSketchAccuracy(sketch2, data);
            }
        });

        it('allows sketches with different lengths to be merged', () => {
            for (const n of testSizes) {
                const data = generateIncreasing(n);
                const sketch1 = new DDSketch({
                    relativeAccuracy
                });
                const sketch2 = new DDSketch({
                    relativeAccuracy
                });

                for (let i = 0; i < n; i++) {
                    const value = data[i];
                    if (i % 2 === 0) {
                        sketch1.accept(value);
                    } else {
                        sketch2.accept(value);
                    }
                }

                sketch1.merge(sketch2);

                evaluateSketchAccuracy(sketch1, data);
            }
        });

        it('does not modify the sketch that is passed in as a parameter', () => {
            const data1 = generateRandom(100);
            const data2 = generateRandom(50);
            const sketch1 = new DDSketch({
                relativeAccuracy
            });
            const sketch2 = new DDSketch({
                relativeAccuracy
            });

            for (const value of data1) {
                sketch1.accept(value);
            }

            sketch1.merge(sketch2);

            evaluateSketchAccuracy(sketch1, data1);

            /* sketch2 is still empty */
            expect(sketch2.count).toEqual(0);

            for (const value of data2) {
                sketch2.accept(value);
            }

            sketch2.merge(sketch1);

            /* Add additional data to sketch1 that shouldn't be in sketch2 post-merge */
            sketch1.accept(100000);

            evaluateSketchAccuracy(sketch2, [...data1, ...data2]);
        });
    });
}

describe('DDSketch', () => {
    test(DDSketch)
});

describe('LogCollapsingHighestDenseDDSketch', () => {
    test(LogCollapsingHighestDenseDDSketch)
});

describe('LogCollapsingLowestDenseDDSketch', () => {
    test(LogCollapsingLowestDenseDDSketch)
});
