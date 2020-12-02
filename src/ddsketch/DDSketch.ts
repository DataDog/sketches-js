/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { DenseStore } from './store';
import { Mapping, LogarithmicMapping } from './mapping';

const DEFAULT_RELATIVE_ACCURACY = 0.01;
const DEFAULT_BIN_LIMIT = 2048;

interface SketchConfig {
    /** The accuracy guarantee of the sketch, between 0-1 (default 0.01) */
    relativeAccuracy?: number;
    /** The maximum number of bins that the underlying stores can grow to (default 2048) */
    binLimit?: number;
}

const defaultConfig: Required<SketchConfig> = {
    relativeAccuracy: DEFAULT_RELATIVE_ACCURACY,
    binLimit: DEFAULT_BIN_LIMIT
};

/** A quantile sketch with relative-error guarantees */
export class DDSketch {
    mapping: Mapping;
    /** Storage for positive values */
    store: DenseStore;
    /** Storage for negative values */
    negativeStore: DenseStore;
    /** The count of zero values */
    zeroCount: number;
    /** The minimum value seen by the sketch */
    min: number;
    /** The maximum value seen by the sketch */
    max: number;
    /** The total number of values seen by the sketch */
    count: number;
    /** The sum of the values seen by the sketch */
    sum: number;

    /**
     * Initialize a new DDSketch
     *
     * @param relativeAccuracy The accuracy guarantee of the sketch (default 0.01)
     * @param binLimit The maximum number of bins that the underlying store can grow to (default 2048)
     */
    constructor(
        {
            relativeAccuracy = defaultConfig.relativeAccuracy,
            binLimit = defaultConfig.binLimit
        } = defaultConfig as SketchConfig
    ) {
        this.mapping = new LogarithmicMapping(relativeAccuracy);
        this.store = new DenseStore();
        this.negativeStore = new DenseStore();

        this.zeroCount = 0;

        this.count = 0;
        this.min = Infinity;
        this.max = -Infinity;
        this.sum = 0;
    }

    /**
     * Add a value to the sketch
     *
     * @param value The value to be added
     * @param weight The amount to weight the value (default 1.0)
     *
     * @throws Error if `weight` is 0 or negative
     */
    accept(value: number, weight = 1): void {
        if (weight <= 0) {
            throw Error('Weight must be a positive number');
        }

        if (value > this.mapping.minPossible) {
            const key = this.mapping.key(value);
            this.store.add(key, weight);
        } else if (value < -this.mapping.minPossible) {
            const key = this.mapping.key(-value);
            this.negativeStore.add(key, weight);
        } else {
            this.zeroCount += weight;
        }

        /* Keep track of summary stats */
        this.count += weight;
        this.sum += value * weight;
        if (value < this.min) {
            this.min = value;
        }
        if (value > this.max) {
            this.max = value;
        }
    }

    /**
     * Retrieve a value from the sketch at the quantile
     *
     * @param quantile A number between `0` and `1` (inclusive)
     */
    getValueAtQuantile(quantile: number): number {
        if (quantile < 0 || quantile > 1 || this.count === 0) {
            return NaN;
        }

        const rank = quantile * (this.count - 1);

        let quantileValue = 0;
        if (rank < this.negativeStore.count) {
            const reversedRank = this.negativeStore.count - rank - 1;
            const key = this.negativeStore.keyAtRank(reversedRank, false);
            quantileValue = -this.mapping.value(key);
        } else if (rank < this.zeroCount + this.negativeStore.count) {
            return 0;
        } else {
            const key = this.store.keyAtRank(
                rank - this.zeroCount - this.negativeStore.count
            );
            quantileValue = this.mapping.value(key);
        }

        return Math.max(quantileValue, this.min);
    }

    /**
     * Merge the contents of the parameter `sketch` into this sketch
     *
     * @param sketch The sketch to merge into the caller sketch
     * @throws Error if the sketches were initialized with different `relativeAccuracy` values
     */
    merge(sketch: DDSketch): void {
        if (!this.mergeable(sketch)) {
            throw new Error(
                'Cannot merge two DDSketches with different `relativeAccuracy` parameters'
            );
        }

        if (sketch.count === 0) {
            return;
        }

        if (this.count === 0) {
            this._copy(sketch);
            return;
        }

        this.store.merge(sketch.store);

        /* Merge summary stats */
        this.count += sketch.count;
        this.sum += sketch.sum;
        if (sketch.min < this.min) {
            this.min = sketch.min;
        }
        if (sketch.max > this.max) {
            this.max = sketch.max;
        }
    }

    /**
     * Determine whether two sketches can be merged
     *
     * @param sketch The sketch to be merged into the caller sketch
     */
    mergeable(sketch: DDSketch): boolean {
        return this.mapping.gamma === sketch.mapping.gamma;
    }

    /**
     * Helper method to copy the contents of the parameter `store` into this store
     * @see DDSketch.merge to merge two sketches safely
     *
     * @param store The store to be copied into the caller store
     */
    _copy(sketch: DDSketch): void {
        this.store.copy(sketch.store);
        this.negativeStore.copy(sketch.negativeStore);
        this.zeroCount = sketch.zeroCount;
        this.min = sketch.min;
        this.max = sketch.max;
        this.count = sketch.count;
        this.sum = sketch.sum;
    }
}
