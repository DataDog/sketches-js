/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import { KeyMapping, Mapping } from '../src/ddsketch/mapping';
import {
    LogarithmicMapping,
    LinearlyInterpolatedMapping,
    CubicallyInterpolatedMapping
} from '../src/ddsketch/mapping';

describe('Mapping', () => {
    const relativeAccuracyMultiplier = 1 - Math.sqrt(2) * 1e-1;
    const minRelativeAccuracy = 1e-8;
    const INITIAL_RELATIVE_ACCURACY = 1 - 1e-3;
    const testOffsets = [0, 1, -12.23, 7768.3];

    const calculateRelativeError = (
        expectedMin: number,
        expectedMax: number,
        actual: number
    ): number => {
        if (expectedMin < 0 || expectedMax < 0 || actual < 0) {
            throw Error;
        }

        if (expectedMin <= actual && actual <= expectedMax) {
            return 0;
        }

        if (expectedMin === 0 && expectedMax === 0) {
            if (actual === 0) {
                return 0;
            }
            return Infinity;
        }

        if (actual < expectedMin) {
            return (expectedMin - actual) / expectedMin;
        }

        return (actual - expectedMax) / expectedMax;
    };

    const evaluateValueRelativeAccuracy = (mapping: Mapping) => {
        const valueMultiplier = 2 - Math.sqrt(2) * 1e-1;
        let maxRelativeAccuracy = 0;
        let value = mapping.minPossible;

        while (value < mapping.maxPossible / valueMultiplier) {
            value *= valueMultiplier;
            const mapValue = mapping.value(mapping.key(value));
            const relativeError = calculateRelativeError(
                value,
                value,
                mapValue
            );
            if (relativeError >= mapping.relativeAccuracy) {
                console.error(
                    `\nValue: ${value}\nMapping relativeAccuracy: ${
                        mapping.relativeAccuracy
                    }\nMapping value: ${mapValue}\nRelative error: ${relativeError}\nMapping maxPoss: ${
                        mapping.maxPossible
                    }\nMapping minPoss: ${
                        mapping.minPossible
                    }\nMapping gamma: ${
                        mapping.gamma
                    }\nMapping key: ${mapping.key(value)}`
                );
            }
            expect(relativeError).toBeLessThan(mapping.relativeAccuracy);
            maxRelativeAccuracy = Math.max(maxRelativeAccuracy, relativeError);
        }
        maxRelativeAccuracy = Math.max(
            maxRelativeAccuracy,
            calculateRelativeError(
                mapping.maxPossible,
                mapping.maxPossible,
                mapping.value(mapping.key(mapping.maxPossible))
            )
        );
        return maxRelativeAccuracy;
    };

    describe('LogarithmicMapping', () => {
        it('is accurate', () => {
            let relativeAccuracy = INITIAL_RELATIVE_ACCURACY;

            while (relativeAccuracy >= minRelativeAccuracy) {
                const mapping = new LogarithmicMapping(relativeAccuracy);
                const maxRelativeAccuracy = evaluateValueRelativeAccuracy(
                    mapping
                );
                expect(maxRelativeAccuracy).toBeLessThan(
                    mapping.relativeAccuracy
                );
                relativeAccuracy *= relativeAccuracyMultiplier;
            }
        });

        it('can be initialized with an offset', () => {
            for (const offset of testOffsets) {
                const mapping = new LogarithmicMapping(0.01, offset);
                expect(mapping.key(1)).toEqual(offset);
            }
        });

        it('can be serialized to and from a protobuf', () => {
            const relativeAccuracies = [1e-1, 1e-2, 1e-8];

            for (const relativeAccuracy of relativeAccuracies) {
                for (const offset of testOffsets) {
                    const mapping = new LogarithmicMapping(
                        relativeAccuracy,
                        offset
                    );
                    const decodedMapping = KeyMapping.fromProto(
                        mapping.toProto()
                    );
                    expect(decodedMapping.constructor.name).toEqual(
                        mapping.constructor.name
                    );
                    expect(
                        Math.abs(
                            decodedMapping.relativeAccuracy -
                                mapping.relativeAccuracy
                        )
                    ).toBeLessThan(1e-7);
                    expect(
                        Math.abs(decodedMapping.value(0) - mapping.value(0))
                    ).toBeLessThan(1e-7);
                }
            }
        });
    });

    describe('LinearlyInterpolatedMapping', () => {
        it('is accurate', () => {
            let relativeAccuracy = INITIAL_RELATIVE_ACCURACY;

            while (relativeAccuracy >= minRelativeAccuracy) {
                const mapping = new LinearlyInterpolatedMapping(
                    relativeAccuracy
                );
                const maxRelativeAccuracy = evaluateValueRelativeAccuracy(
                    mapping
                );
                expect(maxRelativeAccuracy).toBeLessThan(
                    mapping.relativeAccuracy
                );
                relativeAccuracy *= relativeAccuracyMultiplier;
            }
        });
    });

    describe('CubicallyInterpolatedMapping', () => {
        it('is accurate', () => {
            let relativeAccuracy = INITIAL_RELATIVE_ACCURACY;

            while (relativeAccuracy >= minRelativeAccuracy) {
                const mapping = new CubicallyInterpolatedMapping(
                    relativeAccuracy
                );
                const maxRelativeAccuracy = evaluateValueRelativeAccuracy(
                    mapping
                );
                expect(maxRelativeAccuracy).toBeLessThan(
                    mapping.relativeAccuracy
                );
                relativeAccuracy *= relativeAccuracyMultiplier;
            }
        });
    });
});
