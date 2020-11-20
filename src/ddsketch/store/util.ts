/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

/**
 * Return the sum of the values from range `start` to `end` in `array`
 */
export const sumOfRange = (
    array: number[],
    start: number,
    end: number
): number => {
    let sum = 0;

    for (let i = start; i <= end; i++) {
        sum += array[i];
    }

    return sum;
};
