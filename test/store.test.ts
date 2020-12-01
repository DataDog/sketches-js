/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import {
    CollapsingLowestDenseStore,
    CollapsingHighestDenseStore,
    DenseStore
} from '../src/ddsketch/store';
import {
    generateDecreasing,
    generateIncreasing,
    generateConstant,
    generateConstantNegative,
    generatePositiveAndNegative,
    Counter
} from './datasets';

const datasets = [
    generateIncreasing,
    generateDecreasing,
    generateConstant,
    generateConstantNegative,
    generatePositiveAndNegative
];

const testBinLimits = [2048];
const testSizes = [0, 1, 10, 1000];

/** Test helper to calculate the sum of the values in an array */
const sumArray = (values: number[]) =>
    values.reduce((acc, cur) => acc + cur, 0);

describe('Store', () => {
    const evaluateStoreAccuracy = (store: DenseStore, data: number[]) => {
        const count = new Counter(data);
        const counterSum = sumArray(count.values());
        const storeBinSum = sumArray(store.bins);

        if (counterSum !== storeBinSum) {
            console.error(
                `Counter sum: ${counterSum}\nStore bins sum: ${storeBinSum}`
            );
        }

        expect(counterSum).toEqual(storeBinSum);
        expect(counterSum).toEqual(store.count);

        if (counterSum === 0) {
            expect(store.bins.every(bin => bin === 0));
        } else {
            expect(store.bins.some(bin => bin !== 0));
        }
    };

    describe('DenseStore', () => {
        for (const dataset of datasets) {
            it(`is accurate for dataset '${dataset.name}'`, () => {
                for (const size of testSizes) {
                    const data = dataset(size);
                    const store = new DenseStore();

                    for (const value of data) {
                        store.add(value);
                    }

                    evaluateStoreAccuracy(store, data);
                }
            });
        }
    });

    describe('CollapsingLowestDenseStore', () => {
        for (const dataset of datasets) {
            it(`is accurate for dataset '${dataset.name}'`, () => {
                for (const binLimit of testBinLimits) {
                    for (const size of testSizes) {
                        const data = dataset(size);
                        const store = new CollapsingLowestDenseStore(binLimit);

                        for (const value of data) {
                            store.add(value);
                        }

                        evaluateStoreAccuracy(store, data);
                    }
                }
            });
        }
    });

    describe('CollapsingHighestDenseStore', () => {
        for (const dataset of datasets) {
            it(`is accurate for dataset '${dataset.name}'`, () => {
                for (const binLimit of testBinLimits) {
                    for (const size of testSizes) {
                        const data = dataset(size);
                        const store = new CollapsingHighestDenseStore(binLimit);

                        for (const value of data) {
                            store.add(value);
                        }

                        evaluateStoreAccuracy(store, data);
                    }
                }
            });
        }
    });
});
