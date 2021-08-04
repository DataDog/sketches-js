/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { KeyMapping } from './KeyMapping';
import frexp from '@stdlib/math-base-special-frexp';
import ldexp from '@stdlib/math-base-special-ldexp';
import { IndexMapping as IndexMappingProto } from '../proto/compiled';

/**
 * A fast KeyMapping that approximates the memory-optimal one
 * (LogarithmicMapping) by extracting the floor value of the logarithm to the
 * base 2 from the binary representations of floating-point values and
 * linearly interpolating the logarithm in-between.
 */
export class LinearlyInterpolatedMapping extends KeyMapping {
    constructor(relativeAccuracy: number, offset = 0) {
        super(relativeAccuracy, offset);
    }

    /**
     * Approximates log2 by s + f
     * where v = (s+1) * 2 ** f  for s in [0, 1)
     *
     * frexp(v) returns m and e s.t.
     * v = m * 2 ** e ; (m in [0.5, 1) or 0.0)
     * so we adjust m and e accordingly
     */
    _log2Approx(value: number): number {
        const [mantissa, exponent] = frexp(value);
        const significand = 2 * mantissa - 1;
        return significand + (exponent - 1);
    }

    /** Inverse of _log2Approx */
    _exp2Approx(value: number): number {
        const exponent = Math.floor(value) + 1;
        const mantissa = (value - exponent + 2) / 2;
        return ldexp(mantissa, exponent);
    }

    _logGamma(value: number): number {
        return Math.log2(value) * this._multiplier;
    }

    _powGamma(value: number): number {
        return Math.pow(2, value / this._multiplier);
    }

    _protoInterpolation(): IndexMappingProto.Interpolation {
        return IndexMappingProto.Interpolation.LINEAR;
    }
}
