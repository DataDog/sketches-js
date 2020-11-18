/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { DenseStore } from './DenseStore';
import { sumOfRange } from './util';

/**
 * `CollapsingHighestDenseStore` is a dense store that keeps all the bins between
 * the bin for the `minKey` and the `maxKey`, but collapsing the left-most bins
 * if the number of bins exceeds `binLimit`
 */
export class CollapsingHighestDenseStore extends DenseStore {
    /** The maximum number of bins */
    binLimit: number;
    /** Whether the store has been collapsed to make room for additional keys */
    isCollapsed: boolean;

    /**
     * Initialize a new CollapsingHighestDenseStore
     *
     * @param binLimit The maximum number of bins
     * @param chunkSize The number of bins to add each time the bins grow (default 128)
     */
    constructor(binLimit: number, chunkSize?: number) {
        super(chunkSize);
        this.binLimit = binLimit;
        this.isCollapsed = false;
    }

    /**
     * Merge the contents of the parameter `store` into this store
     *
     * @param store The store to merge into the caller store
     */
    merge(store: CollapsingHighestDenseStore): void {
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

        const collapseEndIndex = store.maxKey - store.offset + 1;
        let collapseStartIndex =
            Math.max(this.maxKey + 1, store.minKey) - store.offset;
        if (collapseEndIndex > collapseStartIndex) {
            const collapseCount = sumOfRange(
                store.bins,
                collapseStartIndex,
                collapseEndIndex
            );
            this.bins[this.length() - 1] += collapseCount;
        } else {
            collapseStartIndex = collapseEndIndex;
        }

        for (
            let key = store.minKey;
            key < collapseStartIndex + store.offset;
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
    copy(store: CollapsingHighestDenseStore): void {
        super.copy(store);
        this.isCollapsed = store.isCollapsed;
    }

    _getNewLength(newMinKey: number, newMaxKey: number): number {
        const desiredLength = newMaxKey - newMinKey + 1;
        return Math.min(
            this.chunkSize * Math.ceil(desiredLength / this.chunkSize),
            this.binLimit
        );
    }

    /**
     * Adjust the `bins`, the `offset`, the `minKey`, and the `maxKey`
     * without resizing the bins, in order to try to make it fit the specified range.
     * Collapse to the left if necessary
     */
    _adjust(newMinKey: number, newMaxKey: number): void {
        if (newMaxKey - newMinKey + 1 > this.length()) {
            // The range of keys is too wide, the lowest bins need to be collapsed
            newMaxKey = newMinKey + this.length() + 1;

            if (newMaxKey <= this.minKey) {
                // Put everything in the first bin
                this.offset = newMinKey;
                this.maxKey = newMaxKey;
                this.bins.fill(0);
                this.bins[this.length() - 1] = this.count;
            } else {
                const shift = this.offset - newMinKey;
                if (shift > 0) {
                    const collapseStartIndex = newMaxKey - this.offset + 1;
                    const collapseEndIndex = this.maxKey - this.offset + 1;
                    const collapsedCount = sumOfRange(
                        this.bins,
                        collapseStartIndex,
                        collapseEndIndex
                    );
                    this.bins.fill(0, collapseStartIndex, collapseEndIndex);
                    this.bins[collapseStartIndex - 1] += collapsedCount;
                    this.maxKey = newMaxKey;
                    this._shiftBins(shift);
                } else {
                    this.maxKey = newMaxKey;
                    // Shift the buckets to make room for newMinKey
                    this._shiftBins(shift);
                }
                this.minKey = newMinKey;
                this.isCollapsed = true;
            }
        } else {
            this._centerBins(newMinKey, newMaxKey);
            this.minKey = newMinKey;
            this.maxKey = newMaxKey;
        }
    }

    /** Calculate the bin index for the key, extending the range if necessary */
    _getIndex(key: number): number {
        if (key < this.minKey) {
            if (this.isCollapsed) {
                return this.length() - 1;
            }

            this._extendRange(key);

            if (this.isCollapsed) {
                return this.length() - 1;
            }
        } else if (key > this.maxKey) {
            this._extendRange(key);
        }

        return key - this.offset;
    }
}
