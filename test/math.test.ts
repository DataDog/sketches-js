/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { frexp, ldexp } from '../src/ddsketch/math';

describe('math', () => {
    describe('frexp', () => {
        const small = require('./fixtures/math/frexp/x_1e-200_1e-308.json');
        const medium = require('./fixtures/math/frexp/x_-1e3_1e3.json');
        const large = require('./fixtures/math/frexp/x_1e200_1e308.json');
        const subnormal = require('./fixtures/math/frexp/x_1e-310_5e-324.json');

        it('should split a floating-point number into a normalized fraction and an integer power of two (small `x`)', () => {
            const expected = small.expected;
            const x = small.x;

            for (let i = 0; i < x.length; i++ ) {
                expect(frexp(x[i])).toEqual(expected[i]);
            }
        });

        it('should split a floating-point number into a normalized fraction and an integer power of two (medium `x`)', () => {
            const expected = medium.expected;
            const x = medium.x;

            for (let i = 0; i < x.length; i++ ) {
                expect(frexp(x[i])).toEqual(expected[i]);
            }
        });

        it('should split a floating-point number into a normalized fraction and an integer power of two (large `x`)', () => {
            const expected = large.expected;
            const x = large.x;

            for (let i = 0; i < x.length; i++ ) {
                expect(frexp(x[i])).toEqual(expected[i]);
            }
        });

        it('should split a floating-point number into a normalized fraction and an integer power of two (subnormal `x`)', () => {
            const expected = subnormal.expected;
            const x = subnormal.x;

            for (let i = 0; i < x.length; i++ ) {
                expect(frexp(x[i])).toEqual(expected[i]);
            }
        });
    })

    describe('ldexp', () => {
        const small = require('./fixtures/math/ldexp/small.json');
        const medium = require('./fixtures/math/ldexp/medium.json');
        const large = require('./fixtures/math/ldexp/large.json');
        const subnormal = require('./fixtures/math/ldexp/subnormal.json');

        it('should multiply a number by an integer power of two (small values)', () => {
            const expected = small.expected;
            const frac = small.frac;
            const exp = small.exp;

            for (let i = 0; i < frac.length; i++ ) {
                expect(ldexp(frac[i], exp[i])).toEqual(expected[i]);
            }
        });

        it('should multiply a number by an integer power of two (medium values)', () => {
            const expected = medium.expected;
            const frac = medium.frac;
            const exp = medium.exp;

            for (let i = 0; i < frac.length; i++ ) {
                expect(ldexp(frac[i], exp[i])).toEqual(expected[i]);
            }
        });

        it('should multiply a number by an integer power of two (large values)', () => {
            const expected = large.expected;
            const frac = large.frac;
            const exp = large.exp;

            for (let i = 0; i < frac.length; i++ ) {
                expect(ldexp(frac[i], exp[i])).toEqual(expected[i]);
            }
        });

        it('should multiply a number by an integer power of two (subnormals)', () => {
            const expected = subnormal.expected;
            const frac = subnormal.frac;
            const exp = subnormal.exp;

            for (let i = 0; i < frac.length; i++ ) {
                expect(ldexp(frac[i], exp[i])).toEqual(expected[i]);
            }
        });
    });
});
