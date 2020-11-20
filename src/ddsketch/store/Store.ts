/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

export interface Store<S> {
    /** Update the counter at the specified index key, growing the number of bins if necessary */
    add: (key: number) => void;
    /** Directly clone the contents of the parameter `store` into this store */
    copy: (store: S) => void;
    /** Merge the contents of the parameter `store` into this store */
    merge: (store: S) => void;
    /** Return the length of the underlying storage (`bins`) */
    length: () => number;
    /** Return the key for the value at the given rank */
    keyAtRank: (rank: number, reverse?: boolean) => void;
    /** The total number of values added to the store */
    count: number;
}
