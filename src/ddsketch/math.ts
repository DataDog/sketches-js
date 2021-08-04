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
    value = Number(value);

    const result: [number, number] = [value, 0];

    if (value !== 0 && Number.isFinite(value)) {
        const absArg = Math.abs(value);
        let exp = Math.max(-1023, Math.floor(Math.log2(absArg)) + 1);
        let x = absArg * Math.pow(2, -exp);
        // These while loops compensate for rounding errors that sometimes occur
        // because of ECMAScript's Math.log2's undefined precision and also
        // works around the issue of Math.pow(2, -exp) === Infinity when
        // exp <= -1024
        while (x < 0.5) {
            x *= 2;
            exp--;
        }
        while (x >= 1) {
            x *= 0.5;
            exp++;
        }
        if (value < 0) {
            x = -x;
        }
        result[0] = x;
        result[1] = exp;
    }

    return result;
}

/**
 * Multiplies a double-precision floating-point number by an integer power of
 * two; i.e., x = frac * 2^exp.
 */
export function ldexp(mantissa: number, exponent: number): number {
    const steps = Math.min(3, Math.ceil(Math.abs(exponent) / 1023));
    let result = mantissa;
    for (let i = 0; i < steps; i++) {
        result *= Math.pow(2, Math.floor((exponent + i) / steps));
    }
    return result;
}
