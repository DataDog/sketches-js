/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { DenseStore } from './store';
import { Mapping, KeyMapping, LogarithmicMapping } from './mapping';

const DEFAULT_RELATIVE_ACCURACY = 0.01;

interface BaseSketchConfig {
    /** The mapping between values and indicies for the sketch */
    mapping: Mapping;
    /** Storage for positive values */
    store: DenseStore;
    /** Storage for negative values */
    negativeStore: DenseStore;
    /** The number of zeroes added to the sketch */
    zeroCount: number;
}

/** Base class for DDSketch*/
class BaseDDSketch {
    /** The mapping between values and indicies for the sketch */
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

    constructor({
        mapping,
        store,
        negativeStore,
        zeroCount
    }: BaseSketchConfig) {
        this.mapping = mapping;
        this.store = store;
        this.negativeStore = negativeStore;

        this.zeroCount = zeroCount;

        this.count =
            this.negativeStore.count + this.zeroCount + this.store.count;
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

        return quantileValue;
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
        this.zeroCount += sketch.zeroCount;
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

    /** Serialize a DDSketch to protobuf format */
    toProto(): Uint8Array {
        const ProtoDDSketch = require('./proto/compiled').DDSketch;
        const message = ProtoDDSketch.create({
            mapping: this.mapping.toProto(),
            positiveValues: this.store.toProto(),
            negativeValues: this.negativeStore.toProto(),
            zeroCount: this.zeroCount
        });
        return ProtoDDSketch.encode(message).finish();
    }

    /**
     * Deserialize a DDSketch from protobuf data
     *
     * Note: `fromProto` currently loses summary statistics for the original
     * sketch (i.e. `min`, `max`)
     *
     * @param buffer Byte array containing DDSketch in protobuf format (from DDSketch.toProto)
     */
    static fromProto(buffer: Uint8Array): DDSketch {
        const ProtoDDSketch = require('./proto/compiled').DDSketch;
        const decoded = ProtoDDSketch.decode(buffer);
        const mapping = KeyMapping.fromProto(decoded.mapping);
        const store = DenseStore.fromProto(decoded.positiveValues);
        const negativeStore = DenseStore.fromProto(decoded.negativeValues);
        const zeroCount = decoded.zeroCount;

        return new BaseDDSketch({ mapping, store, negativeStore, zeroCount });
    }
}

interface SketchConfig {
    /** The accuracy guarantee of the sketch, between 0-1 (default 0.01) */
    relativeAccuracy?: number;
}

const defaultConfig: Required<SketchConfig> = {
    relativeAccuracy: DEFAULT_RELATIVE_ACCURACY
};

/** A quantile sketch with relative-error guarantees */
export class DDSketch extends BaseDDSketch {
    /**
     * Initialize a new DDSketch
     *
     * @param relativeAccuracy The accuracy guarantee of the sketch (default 0.01)
     */
    constructor(
        {
            relativeAccuracy = DEFAULT_RELATIVE_ACCURACY
        } = defaultConfig as SketchConfig
    ) {
        const mapping = new LogarithmicMapping(relativeAccuracy);
        const store = new DenseStore();
        const negativeStore = new DenseStore();

        super({ mapping, store, negativeStore, zeroCount: 0 });
    }
}
