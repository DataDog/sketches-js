/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { CollapsingLowestDenseStore as Store } from './store';

const DEFAULT_RELATIVE_ACCURACY = 0.01;
const DEFAULT_BIN_LIMIT = 2048;
const DEFAULT_MIN_VALUE = 1.0e-9;

interface SketchOptions {
    /** Number between 0 and 1 (default `0.01`) */
    relativeAccuracy?: number;
    /** Default `2048` */
    binLimit?: number;
    /** Default `1.0e-9` */
    minValue?: number;
    /** Default `CollapsingLowestDenseStore` */
    store?: Store;
}

/**
 * A quantile sketch with relative-error guarantees
 */
export class DDSketch {
    store: Store;
    relativeAccuracy: number;
    gamma: number;
    gammaLn: number;
    minValue: number;
    offset: number;

    /* Track summary statistics */
    _min: number;
    _max: number;
    _count: number;
    _sum: number;

    /**
     * Initialize a new DDSketch
     *
     * @param relativeAccuracy The relative retrieval accuracy (default `0.01`)
     * @param binLimit The maximum number of bins that `store` can grow to
     * @param minValue The minimum value capable of being stored in the sketch
     * @param store Where to store values added to the sketch
     */
    constructor({
        relativeAccuracy = DEFAULT_RELATIVE_ACCURACY,
        binLimit = DEFAULT_BIN_LIMIT,
        minValue = DEFAULT_MIN_VALUE,
        store = new Store(binLimit)
    }: SketchOptions) {
        this.minValue = minValue;
        this.relativeAccuracy = relativeAccuracy;
        this.store = store;

        const x = (2 * this.relativeAccuracy) / (1 - this.relativeAccuracy);
        this.gamma = 1 + x;
        this.gammaLn = Math.log1p(x);
        this.offset = -Math.ceil(Math.log(this.minValue) / this.gammaLn) + 1;

        this._count = 0;
        this._sum = 0;
        this._min = Infinity;
        this._max = -Infinity;
    }

    /**
     * Add a value to the sketch
     *
     * @param value The value to be added
     */
    add(value: number): void {
        const key = this._getKey(value);
        this.store.add(key);

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
    quantile(q: number): number {
        if (q < 0 || q > 1 || this._count === 0) {
            return NaN;
        }
        if (q === 0) {
            return this._min;
        }
        if (q === 1) {
            return this._max;
        }

        const rank = Math.floor(q * (this._count - 1) + 1);
        let key = this.store.keyAtRank(rank);

        let quantile = 0;
        if (key < 0) {
            key += this.offset;
            quantile = (-2 * Math.pow(this.gamma, -key)) / (1 + this.gamma);
        } else if (key > 0) {
            key -= this.offset;
            quantile = (2 * Math.pow(this.gamma, key)) / (1 + this.gamma);
        }

        return Math.max(quantile, this._min);
    }

    /** Calculate the key in the store for a given value */
    _getKey(value: number): number {
        if (value < -this.minValue) {
            /* Retrieving negative value */
            return -Math.ceil(Math.log(-value) / this.gammaLn) - this.offset;
        } else if (value > this.minValue) {
            /* Retrieving positive value */
            return Math.ceil(Math.log(value) / this.gammaLn) + this.offset;
        } else {
            return 0;
        }
    }
}
