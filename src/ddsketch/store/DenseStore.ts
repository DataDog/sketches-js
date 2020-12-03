/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { sumOfRange } from './util';
import type { Store } from './types';
import { Store as ProtoStore, IStore } from '../proto/compiled';

/** The default number of bins to grow when necessary */
const CHUNK_SIZE = 128;

/**
 * `DenseStore` is a store that keeps all the bins between
 * the bin for the `minKey` and the `maxKey`.
 */
export class DenseStore implements Store<DenseStore> {
    /** Storage for counts */
    bins: number[];
    /** The total number of values added to the store */
    count: number;
    /** The minimum key bin */
    minKey: number;
    /** The maximum key bin */
    maxKey: number;
    /** The number of bins to grow when necessary */
    chunkSize: number;
    /** The difference between the keys and the index in which they are stored */
    offset: number;

    /**
     * Initialize a new DenseStore
     *
     * @param chunkSize The number of bins to add each time the bins grow (default 128)
     */
    constructor(chunkSize = CHUNK_SIZE) {
        this.chunkSize = chunkSize;

        this.bins = [];

        this.count = 0;
        this.minKey = Infinity;
        this.maxKey = -Infinity;
        this.offset = 0;
    }

    /**
     * Update the counter at the specified index key, growing the number of bins if necessary
     *
     * @param key The key of the index to update
     * @param weight The amount to weight the key (default 1.0)
     */
    add(key: number, weight = 1): void {
        const index = this._getIndex(key);
        this.bins[index] += weight;
        this.count += weight;
    }

    /**
     * Return the key for the value at the given rank
     *
     * E.g., if the non-zero bins are [1, 1] for keys a, b with no offset
     *
     * if lower = True:
     *     keyAtRank(x) = a for x in [0, 1)
     *     keyAtRank(x) = b for x in [1, 2)
     * if lower = False:
     *     keyAtRank(x) = a for x in (-1, 0]
     *     keyAtRank(x) = b for x in (0, 1]
     *
     * @param rank The rank at which to retrieve the key
     */
    keyAtRank(rank: number, lower = true): number {
        let runningCount = 0;

        for (let i = 0; i < this.length(); i++) {
            const bin = this.bins[i];
            runningCount += bin;
            if (
                (lower && runningCount > rank) ||
                (!lower && runningCount >= rank + 1)
            ) {
                return i + this.offset;
            }
        }

        return this.maxKey;
    }

    /**
     * Merge the contents of the parameter `store` into this store
     *
     * @param store The store to merge into the caller store
     */
    merge(store: DenseStore): void {
        if (store.count === 0) {
            return;
        }

        if (this.count === 0) {
            this.copy(store);
            return;
        }

        if (store.minKey < this.minKey || store.maxKey > this.maxKey) {
            this._extendRange(store.minKey, store.maxKey);
        }

        const collapseStartIndex = store.minKey - store.offset;
        let collapseEndIndex =
            Math.min(this.minKey, store.maxKey + 1) - store.offset;
        if (collapseEndIndex > collapseStartIndex) {
            const collapseCount = sumOfRange(
                store.bins,
                collapseStartIndex,
                collapseEndIndex
            );
            this.bins[0] += collapseCount;
        } else {
            collapseEndIndex = collapseStartIndex;
        }

        for (
            let key = collapseEndIndex + store.offset;
            key < store.maxKey + 1;
            key++
        ) {
            this.bins[key - this.offset] += store.bins[key - store.offset];
        }

        this.count += store.count;
    }

    /**
     * Directly clone the contents of the parameter `store` into this store
     *
     * @param store The store to be copied into the caller store
     */
    copy(store: DenseStore): void {
        this.bins = [...store.bins];
        this.count = store.count;
        this.minKey = store.minKey;
        this.maxKey = store.maxKey;
        this.offset = store.offset;
    }

    /**
     * Return the length of the underlying storage (`bins`)
     */
    length(): number {
        return this.bins.length;
    }

    _getNewLength(newMinKey: number, newMaxKey: number): number {
        const desiredLength = newMaxKey - newMinKey + 1;
        return this.chunkSize * Math.ceil(desiredLength / this.chunkSize);
    }

    /**
     * Adjust the `bins`, the `offset`, the `minKey`, and the `maxKey`
     * without resizing the bins, in order to try to make it fit the specified range.
     * Collapse to the left if necessary
     */
    _adjust(newMinKey: number, newMaxKey: number): void {
        this._centerBins(newMinKey, newMaxKey);
        this.minKey = newMinKey;
        this.maxKey = newMaxKey;
    }

    /** Shift the bins by `shift`. This changes the `offset` */
    _shiftBins(shift: number): void {
        if (shift > 0) {
            this.bins = this.bins.slice(0, -shift);
            this.bins.unshift(...new Array(shift).fill(0));
        } else {
            this.bins = this.bins.slice(Math.abs(shift));
            this.bins.push(...new Array(Math.abs(shift)).fill(0));
        }

        this.offset -= shift;
    }

    /** Center the bins. This changes the `offset` */
    _centerBins(newMinKey: number, newMaxKey: number): void {
        const middleKey =
            newMinKey + Math.floor((newMaxKey - newMinKey + 1) / 2);
        this._shiftBins(
            Math.floor(this.offset + this.length() / 2) - middleKey
        );
    }

    /** Grow the bins as necessary, and call _adjust */
    _extendRange(key: number, secondKey?: number): void {
        secondKey = secondKey || key;
        const newMinKey = Math.min(key, secondKey, this.minKey);
        const newMaxKey = Math.max(key, secondKey, this.maxKey);

        if (this.length() === 0) {
            this.bins = new Array(
                this._getNewLength(newMinKey, newMaxKey)
            ).fill(0);
            this.offset = newMinKey;
            this._adjust(newMinKey, newMaxKey);
        } else if (
            newMinKey >= this.minKey &&
            newMaxKey < this.offset + this.length()
        ) {
            // No need to change the range, just update the min and max keys
            this.minKey = newMinKey;
            this.maxKey = newMaxKey;
        } else {
            // Grow the bins
            const newLength = this._getNewLength(newMinKey, newMaxKey);
            if (newLength > this.length()) {
                this.bins.push(...new Array(newLength - this.length()).fill(0));
            }
            this._adjust(newMinKey, newMaxKey);
        }
    }

    /** Calculate the bin index for the key, extending the range if necessary */
    _getIndex(key: number): number {
        if (key < this.minKey) {
            this._extendRange(key);
        } else if (key > this.maxKey) {
            this._extendRange(key);
        }

        return key - this.offset;
    }

    toProto(): IStore {
        return ProtoStore.create({
            contiguousBinCounts: this.bins,
            contiguousBinIndexOffset: this.offset
        });
    }

    static fromProto(protoStore?: IStore | null): DenseStore {
        if (
            !protoStore ||
            /* Double equals (==) is intentional here to check for
             * `null` | `undefined` without including `0` */
            protoStore.contiguousBinCounts == null ||
            protoStore.contiguousBinIndexOffset == null
        ) {
            throw Error('Failed to decode store from protobuf');
        }

        const store = new this();
        let index = protoStore.contiguousBinIndexOffset;
        store.offset = index;

        for (const count of protoStore.contiguousBinCounts) {
            store.add(index, count);
            index += 1;
        }

        return store;
    }
}
