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
