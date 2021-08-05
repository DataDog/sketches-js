/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

/**
 * Splits a double-precision floating-point number into a normalized fraction
 * and an integer power of two.
 */
export function frexp(value: number): [number, number] {
    if (value === 0 || !Number.isFinite(value)) return [value, 0];

    const absValue = Math.abs(value);

    let exponent = Math.max(-1023, Math.floor(Math.log2(absValue)) + 1);
    let mantissa = absValue * Math.pow(2, -exponent);

    while (mantissa < 0.5) {
        mantissa *= 2;
        exponent--;
    }

    while (mantissa >= 1) {
        mantissa *= 0.5;
        exponent++;
    }

    if (value < 0) {
        mantissa = -mantissa;
    }

    return [mantissa, exponent];
}

/**
 * Multiplies a double-precision floating-point number by an integer power of
 * two; i.e., x = frac * 2^exp.
 */
export function ldexp(mantissa: number, exponent: number): number {
    const iterations = Math.min(3, Math.ceil(Math.abs(exponent) / 1023));

    let result = mantissa;

    for (let i = 0; i < iterations; i++) {
        result *= Math.pow(2, Math.floor((exponent + i) / iterations));
    }

    return result;
}
