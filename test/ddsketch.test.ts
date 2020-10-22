/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { DDSketch } from '../src/ddsketch';
import {
    generateDecreasing,
    generateIncreasing,
    generateRandom,
    generateConstant
} from './datasets';

const datasets = [
    generateIncreasing,
    generateDecreasing,
    generateRandom,
    generateConstant
];
const testSizes = [3, 5, 10, 100, 1000];
const testQuantiles = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 0.99, 0.999, 1];

const sketchRelativeAccuracy = 0.05;
const sketchBinLimit = 1024;
const sketchMinValue = 1.0e-9;

const getQuantile = (data: number[], quantile: number) => {
    const sortedIncreasingData = data.sort((a, b) => a - b);
    const rank = Math.floor(quantile * (data.length - 1) + 1);
    return sortedIncreasingData[rank - 1];
};

describe('DDSketch', () => {
    const evaluateSketchAccuracy = (sketch: DDSketch, data: number[]) => {
        for (const quantile of testQuantiles) {
            const sketchQ = sketch.quantile(quantile);
            const dataQ = getQuantile(data, quantile);
            const error = Math.abs(sketchQ - dataQ);

            expect(
                error - sketchRelativeAccuracy * Math.abs(dataQ)
            ).toBeLessThanOrEqual(1e-15);
        }
    };

    it('can be initialized without parameters', () => {
        const data = generateIncreasing(5);
        const sketch = new DDSketch();

        for (const value of data) {
            sketch.add(value);
        }

        evaluateSketchAccuracy(sketch, data);
    });

    it('is accurate for multiple sizes and quantiles', () => {
        for (const dataset of datasets) {
            for (const n of testSizes) {
                const data = dataset(n);
                const sketch = new DDSketch({
                    relativeAccuracy: sketchRelativeAccuracy,
                    binLimit: sketchBinLimit,
                    minValue: sketchMinValue
                });

                for (const value of data) {
                    sketch.add(value);
                }

                evaluateSketchAccuracy(sketch, data);
            }
        }
    });
});
