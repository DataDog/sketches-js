/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

export interface Store {
    add: (value: number) => void;
    keyAtRank: (rank: number) => number;
    reversedKeyAtRank: (rank: number) => number;
    count: number;
}
