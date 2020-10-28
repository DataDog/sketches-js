/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

/** The default number of bins to allocate for a store */
const INITIAL_BINS = 128;
/** The default number of bins to grow when necessary */
const CHUNK_SIZE = 128;

interface Store {
    add: (value: number) => void;
    keyAtRank: (rank: number) => number;
}

/**
 * `CollapsingLowestDenseStore` is a dense store that keeps all the bins between
 * the bin for the `minKey` and the `maxKey`, but collapsing the left-most bins
 * if the number of bins exceeds `maxBins`
 */
export class CollapsingLowestDenseStore implements Store {
    /** The maximum number of bins */
    maxBins: number;
    /** Storage for counts */
    bins: number[];
    /** The total number of values added to the store */
    count: number;
    /** The minimum key bin */
    minKey: number;
    /** The maximum key bin */
    maxKey: number;
    /** The initial number of bins to initialize the store with */
    initialBins: number;
    /** The number of bins to grow when necessary */
    chunkSize: number;
    /** The initial number of bins to grow by, if the store was not originally initialized */
    initialChunkSize: number;

    /**
     * Initialize a new CollapsingLowestDenseStore
     *
     * @param maxBins The maximum number of bins
     * @param initialBins The initial number of bins (default 128)
     * @param chunkSize The number of bins to add each time the bins grow (default 128)
     */
    constructor(
        maxBins: number,
        initialBins = INITIAL_BINS,
        chunkSize = CHUNK_SIZE
    ) {
        this.maxBins = maxBins;
        this.initialBins = Math.min(maxBins, initialBins);
        this.chunkSize = chunkSize;
        this.initialChunkSize = Math.min(maxBins, chunkSize);

        this.bins = new Array(this.initialBins).fill(0);

        this.count = 0;
        this.minKey = 0;
        this.maxKey = 0;
    }

    /**
     * Update the counter at the specified index key, growing the number of bins if necessary
     *
     * @param key The key of the index to update
     */
    add(key: number): void {
        /* Grow the store if it was initialized with 0 `initialBins` */
        if (this.bins.length === 0) {
            this.bins = new Array(this.initialChunkSize).fill(0);
        }

        if (this.count === 0) {
            this.maxKey = key;
            this.minKey = key - this.bins.length + 1;
        } else if (key < this.minKey) {
            this._growLeft(key);
        } else if (key > this.maxKey) {
            this._growRight(key);
        }

        const index = Math.max(0, key - this.minKey);
        this.bins[index] += 1;
        this.count += 1;
    }

    /**
     * Return the key for the value at the given rank
     *
     * @param rank
     */
    keyAtRank(rank: number): number {
        let n = 0;

        for (let i = 0; i < this.bins.length; i++) {
            const bin = this.bins[i];
            n += bin;
            if (n >= rank) {
                return i + this.minKey;
            }
        }

        return this.maxKey;
    }

    /**
     * Return the key for the value at the given rank in reversed order
     *
     * @param rank
     */
    reversedKeyAtRank(rank: number): number {
        let n = 0;

        for (let i = this.bins.length - 1; i >= 0; i--) {
            const bin = this.bins[i];
            n += bin;
            if (n >= rank) {
                return i + this.minKey;
            }
        }

        return this.minKey;
    }

    /**
     * Merge the contents of the parameter `store` into this store
     *
     * @param store The store to merge into the caller store
     */
    merge(store: CollapsingLowestDenseStore): void {
        if (store.count === 0) {
            return;
        }

        if (this.count === 0) {
            this.copy(store);
            return;
        }

        if (this.maxKey > store.maxKey) {
            if (store.minKey < this.minKey) {
                this._growLeft(store.minKey);
            }

            const largestMinKey = Math.max(this.minKey, store.minKey);

            for (let i = largestMinKey; i <= store.maxKey; i++) {
                this.bins[i - this.minKey] += store.bins[i - store.minKey];
            }

            if (this.minKey > store.minKey) {
                const n = sumOfRange(store.bins, 0, this.minKey - store.minKey);
                this.bins[0] += n;
            }
        } else {
            if (store.minKey < this.minKey) {
                const temp = [...store.bins];
                for (let i = this.minKey; i <= this.maxKey; i++) {
                    temp[i - store.minKey] += this.bins[i - this.minKey];
                }
                this.bins = temp;
                this.maxKey = store.maxKey;
                this.minKey = store.minKey;
            } else {
                this._growRight(store.maxKey);
                for (let i = store.minKey; i <= store.maxKey; i++) {
                    this.bins[i - this.minKey] += store.bins[i - store.minKey];
                }
            }
        }

        this.count += store.count;
    }

    /**
     * Directly clone the contents of the parameter `store` into this store
     *
     * @param store The store to be copied into the caller store
     */
    copy(store: CollapsingLowestDenseStore): void {
        this.bins = [...store.bins];
        this.maxBins = store.maxBins;
        this.count = store.count;
        this.minKey = store.minKey;
        this.maxKey = store.maxKey;
    }

    /**
     * Add bins to the left
     */
    _growLeft(key: number): void {
        if (this.minKey < key || this.bins.length >= this.maxBins) {
            return;
        }
        const minPossible = this.maxKey - this.maxBins + 1;

        let minKey;
        if (this.maxKey - key >= this.maxBins) {
            minKey = minPossible;
        } else {
            minKey = Math.max(
                this.minKey - this._getGrowBySize(this.minKey - key),
                minPossible
            );
        }

        this.bins.unshift(...new Array(this.minKey - minKey).fill(0));
        this.minKey = minKey;
    }

    /**
     * Add bins to the right
     */
    _growRight(key: number): void {
        if (this.maxKey > key) {
            return;
        }

        if (key - this.maxKey >= this.maxBins) {
            this.bins = new Array(this.maxBins).fill(0);
            this.maxKey = key;
            this.minKey = key - this.maxBins + 1;
            this.bins[0] = this.count;
        } else if (key - this.minKey >= this.maxBins) {
            const minKey = key - this.maxBins + 1;
            const n = sumOfRange(this.bins, 0, minKey - this.minKey);
            this.bins = this.bins.slice(minKey - this.minKey, this.bins.length);
            this.bins.push(...new Array(key - this.maxKey).fill(0));
            this.maxKey = key;
            this.minKey = minKey;
            this.bins[0] += n;
        } else {
            const maxKey = Math.min(
                this.maxKey + this._getGrowBySize(key - this.maxKey),
                this.minKey + this.maxBins - 1
            );
            this.bins.push(...new Array(maxKey - this.maxKey).fill(0));
            this.maxKey = maxKey;
        }
    }

    /**
     * Return the size by which to grow the store's bins
     */
    _getGrowBySize(requiredGrowth: number): number {
        return this.chunkSize * Math.ceil(requiredGrowth / this.chunkSize);
    }
}

/**
 * Return the sum of the values from range `start` to `end` in `array`
 */
const sumOfRange = (array: number[], start: number, end: number) => {
    let sum = 0;

    for (let i = start; i <= end; i++) {
        sum += array[i];
    }

    return sum;
};
