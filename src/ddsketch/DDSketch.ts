/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import {
    CollapsingLowestDenseStore,
    CollapsingHighestDenseStore
} from './store';

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
    /** Storage for positive values */
    store: CollapsingLowestDenseStore;
    /** Storage for negative values */
    negativeStore: CollapsingHighestDenseStore;
    /** The accuracy guarantee of the sketch */
    relativeAccuracy: number;
    /** The base for the exponential buckets */
    gamma: number;
    /** The count of zero values */
    zeroCount: number;
    /** Used for calculating logGamma(value) */
    multiplier: number;
    /** The smallest value the sketch can distinguish from 0 */
    minPossible: number;

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
        this.store = new CollapsingLowestDenseStore(binLimit);
        this.negativeStore = new CollapsingHighestDenseStore(binLimit);
        this.relativeAccuracy = relativeAccuracy;

        this.zeroCount = 0;

        const gammaMantissa = (2 * relativeAccuracy) / (1 - relativeAccuracy);
        this.gamma = 1 + gammaMantissa;
        const gammaLn = Math.log1p(gammaMantissa);
        this.multiplier = 1 / gammaLn;
        this.minPossible = Number.MIN_VALUE * this.gamma;

        this.count = 0;
        this.min = Infinity;
        this.max = -Infinity;
        this.sum = 0;
    }

    /**
     * Add a value to the sketch
     *
     * @param value The value to be added
     */
    accept(value: number): void {
        if (value > this.minPossible) {
            const key = Math.ceil(Math.log(value) * this.multiplier);
            this.store.add(key);
        } else if (value < -this.minPossible) {
            const key = Math.ceil(Math.log(-value) * this.multiplier);
            this.negativeStore.add(key);
        } else {
            this.zeroCount += 1;
        }

        /* Keep track of summary stats */
        this.count += 1;
        this.sum += value;
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

        const rank = Math.floor(quantile * (this.count - 1) + 1);

        let quantileValue = 0;
        if (rank <= this.negativeStore.count) {
            const key = this.negativeStore.keyAtRank(rank, true);
            quantileValue = -(2 * Math.pow(this.gamma, key)) / (1 + this.gamma);
        } else if (rank <= this.zeroCount + this.negativeStore.count) {
            return 0;
        } else {
            const key = this.store.keyAtRank(
                rank - this.zeroCount - this.negativeStore.count
            );
            quantileValue = (2 * Math.pow(this.gamma, key)) / (1 + this.gamma);
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
        return this.gamma === sketch.gamma;
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
