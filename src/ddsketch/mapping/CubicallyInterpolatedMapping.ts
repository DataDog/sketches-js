/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { KeyMapping } from './KeyMapping';
import frexp from '@stdlib/math-base-special-frexp';
import ldexp from '@stdlib/math-base-special-ldexp';
import type { IndexMapping as IndexMappingProtoType } from '../proto/compiled';

/**
 * A fast KeyMapping that approximates the memory-optimal LogarithmicMapping by
 * extracting the floor value of the logarithm to the base 2 from the binary
 * representations of floating-point values and cubically interpolating the
 * logarithm in-between.
 *
 * More detailed documentation of this method can be found in:
 * <a href="https://github.com/DataDog/sketches-java/">sketches-java</a>
 */
export class CubicallyInterpolatedMapping extends KeyMapping {
    A = 6 / 35;
    B = -3 / 5;
    C = 10 / 7;

    constructor(relativeAccuracy: number, offset = 0) {
        super(relativeAccuracy, offset);
        this._multiplier /= this.C;
    }

    /** Approximates log2 using a cubic polynomial */
    _cubicLog2Approx(value: number): number {
        const [mantissa, exponent] = frexp(value);
        const significand = 2 * mantissa - 1;
        return (
            ((this.A * significand + this.B) * significand + this.C) *
                significand +
            (exponent - 1)
        );
    }

    /** Derived from Cardano's formula */
    _cubicExp2Approx(value: number): number {
        const exponent = Math.floor(value);
        const delta0 = this.B * this.B - 3 * this.A * this.C;
        const delta1 =
            2 * this.B * this.B * this.B -
            9 * this.A * this.B * this.C -
            27 * this.A * this.A * (value - exponent);
        const cardano = Math.cbrt(
            (delta1 -
                Math.sqrt(delta1 * delta1 - 4 * delta0 * delta0 * delta0)) /
                2
        );
        const significandPlusOne =
            -(this.B + cardano + delta0 / cardano) / (3 * this.A) + 1;
        const mantissa = significandPlusOne / 2;
        return ldexp(mantissa, exponent + 1);
    }

    _logGamma(value: number): number {
        return this._cubicLog2Approx(value) * this._multiplier;
    }

    _powGamma(value: number): number {
        return this._cubicExp2Approx(value / this._multiplier);
    }

    _protoInterpolation(): IndexMappingProtoType.Interpolation {
        const { IndexMapping: IndexMappingProto } = require('../proto/compiled');
        return IndexMappingProto.Interpolation.CUBIC;
    }
}
