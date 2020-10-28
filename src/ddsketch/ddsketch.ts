/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { CollapsingLowestDenseStore as Store } from './store';

const DEFAULT_RELATIVE_ACCURACY = 0.01;
const DEFAULT_BIN_LIMIT = 2048;

interface SketchConfig {
    /** Number between 0 and 1 (default `0.01`) */
    relativeAccuracy?: number;
    /** Default `2048` */
    binLimit?: number;
}

const defaultConfig: Required<SketchConfig> = {
    relativeAccuracy: DEFAULT_RELATIVE_ACCURACY,
    binLimit: DEFAULT_BIN_LIMIT
};

/**
 * A quantile sketch with relative-error guarantees
 */
export class DDSketch {
    store: Store;
    negativeStore: Store;
    relativeAccuracy: number;
    gamma: number;
    zeroCount: number;
    multiplier: number;
    minPossible: number;

    /* Track summary statistics */
    _min: number;
    _max: number;
    _count: number;
    _sum: number;

    /**
     * Initialize a new DDSketch
     *
     * @param relativeAccuracy The relative retrieval accuracy
     * @param binLimit The maximum number of bins that the underlying store can grow to
     */
    constructor(
        {
            relativeAccuracy = defaultConfig.relativeAccuracy,
            binLimit = defaultConfig.binLimit
        } = defaultConfig as SketchConfig
    ) {
        this.store = new Store(binLimit);
        this.negativeStore = new Store(binLimit, 0);
        this.relativeAccuracy = relativeAccuracy;

        this.zeroCount = 0;

        const gammaMantissa = (2 * relativeAccuracy) / (1 - relativeAccuracy);
        this.gamma = 1 + gammaMantissa;
        const gammaLn = Math.log1p(gammaMantissa);
        this.multiplier = 1 / gammaLn;
        this.minPossible = Number.MIN_VALUE * this.gamma;

        this._count = 0;
        this._min = Infinity;
        this._max = -Infinity;
        this._sum = 0;
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
        this._count += 1;
        this._sum += value;
        if (value < this._min) {
            this._min = value;
        }
        if (value > this._max) {
            this._max = value;
        }
    }

    /**
     * Retrieve a value from the sketch at the quantile
     *
     * @param q A number between `0` and `1` (inclusive)
     */
    getValueAtQuantile(quantile: number): number {
        if (quantile < 0 || quantile > 1 || this._count === 0) {
            return NaN;
        }
        if (quantile === 0) {
            return this._min;
        }
        if (quantile === 1) {
            return this._max;
        }

        const rank = Math.floor(quantile * (this._count - 1) + 1);

        let quantileValue = 0;
        if (rank <= this.negativeStore.count) {
            const key = this.negativeStore.reversedKeyAtRank(rank);
            quantileValue = -(2 * Math.pow(this.gamma, key)) / (1 + this.gamma);
        } else if (rank <= this.zeroCount + this.negativeStore.count) {
            return 0;
        } else {
            const key = this.store.keyAtRank(
                rank - this.zeroCount - this.negativeStore.count
            );
            quantileValue = (2 * Math.pow(this.gamma, key)) / (1 + this.gamma);
        }

        return Math.max(quantileValue, this._min);
    }

    merge(sketch: DDSketch): void {
        if (!this.mergeable(sketch)) {
            throw new Error(
                'Cannot merge two DDSketches with different parameters'
            );
        }

        if (sketch._count === 0) {
            return;
        }

        if (this._count === 0) {
            this.copy(sketch);
            return;
        }

        this.store.merge(sketch.store);

        /* Merge summary stats */
        this._count += sketch._count;
        this._sum += sketch._sum;
        if (sketch._min < this._min) {
            this._min = sketch._min;
        }
        if (sketch._max > this._max) {
            this._max = sketch._max;
        }
    }

    mergeable(sketch: DDSketch): boolean {
        return this.gamma === sketch.gamma;
    }

    copy(sketch: DDSketch): void {
        this.store.copy(sketch.store);
        this.negativeStore.copy(sketch.negativeStore);
        this.zeroCount = sketch.zeroCount;
        this._min = sketch._min;
        this._max = sketch._max;
        this._count = sketch._count;
        this._sum = sketch._sum;
    }
}
