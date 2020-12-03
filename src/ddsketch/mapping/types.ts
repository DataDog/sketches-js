/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import type { IIndexMapping } from '../proto/compiled';

export interface Mapping {
    relativeAccuracy: number;
    gamma: number;
    minPossible: number;
    maxPossible: number;
    key: (value: number) => number;
    value: (key: number) => number;
    toProto(): IIndexMapping;
}
