/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

export function generateIncreasing(size: number): number[] {
    const data = new Array<number>(size);
    for (let i = 0; i < size; i++) {
        data[i] = i;
    }

    return data;
}

export function generateDecreasing(size: number): number[] {
    const data = generateIncreasing(size);
    return data.reverse();
}

export function generateRandom(size: number): number[] {
    const data = new Array<number>(size);
    for (let i = 0; i < size; i++) {
        data[i] = Math.random();
    }

    return data;
}

export function generateConstant(size: number): number[] {
    const data = new Array<number>(size).fill(42);

    return data;
}

export function generateConstantNegative(size: number): number[] {
    const data = new Array<number>(size).fill(-42);

    return data;
}

export function generatePositiveAndNegative(size: number): number[] {
    const data = new Array<number>(size);
    for (let i = 0; i < size; i++) {
        data[i] = Math.random() > 0.5 ? i : -i;
    }

    return data;
}
