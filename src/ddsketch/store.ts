/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

const INITIAL_BINS = 128;
const CHUNK_SIZE = 128;

interface Store {
    add: (value: number) => void;
    keyAtRank: (rank: number) => number;
}

export class CollapsingLowestDenseStore implements Store {
    maxBins: number;
    bins: number[];
    count: number;
    minKey: number;
    maxKey: number;

    constructor(maxBins: number) {
        this.maxBins = maxBins;
        this.bins = new Array(INITIAL_BINS).fill(0);
        this.count = 0;
        this.minKey = 0;
        this.maxKey = 0;
    }

    add(key: number): void {
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
                this.minKey - getGrowBySize(this.minKey - key),
                minPossible
            );
        }

        this.bins.unshift(...new Array(this.minKey - minKey).fill(0));
        this.minKey = minKey;
    }

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
                this.maxKey + getGrowBySize(key - this.maxKey),
                this.minKey + this.maxBins - 1
            );
            this.bins.push(...new Array(maxKey - this.maxKey).fill(0));
            this.maxKey = maxKey;
        }
    }
}

/**
 * Return the size by which to grow the store's underlying array
 */
const getGrowBySize = (requiredGrowth: number) => {
    return CHUNK_SIZE * Math.ceil(requiredGrowth / CHUNK_SIZE);
};

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
