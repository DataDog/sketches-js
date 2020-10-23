/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

export const generateIncreasing = (size: number): number[] => {
    const data = new Array<number>(size);
    for (let i = 0; i < size; i++) {
        data[i] = i;
    }

    return data;
};

export const generateDecreasing = (size: number): number[] => {
    const data = generateIncreasing(size);
    return data.reverse();
};

export const generateRandom = (size: number): number[] => {
    const data = new Array<number>(size);
    for (let i = 0; i < size; i++) {
        data[i] = Math.random();
    }

    return data;
};

export const generateConstant = (size: number): number[] => {
    const data = new Array<number>(size).fill(42);

    return data;
};
