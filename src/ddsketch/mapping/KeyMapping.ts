/*
 * Unless explicitly stated otherwise all files in this repository are licensed
 * under the Apache 2.0 license (see LICENSE).
 * This product includes software developed at Datadog (https://www.datadoghq.com/).
 * Copyright 2020 Datadog, Inc.
 */

import {
    LinearlyInterpolatedMapping,
    LogarithmicMapping,
    CubicallyInterpolatedMapping
} from './index';
import type {
    IIndexMapping,
    IndexMapping as ProtoIndexMappingType
} from '../proto/compiled';
import type { Mapping } from './types';

// 1.1125369292536007e-308
const MIN_SAFE_FLOAT = Math.pow(2, -1023);
const MAX_SAFE_FLOAT = Number.MAX_VALUE;

/**
 * A mapping between values and integer indices that imposes relative accuracy
 * guarantees. Specifically, for any value `minPossible() < value <
 * maxPossible` implementations of `KeyMapping` must be such that
 * `value(key(v))` is close to `v` with a relative error that is less than
 * `relativeAccuracy`.
 *
 * In implementations of KeyMapping, there is generally a trade-off between the
 * cost of computing the key and the number of keys that are required to cover a
 * given range of values (memory optimality). The most memory-optimal mapping is
 * the LogarithmicMapping, but it requires the costly evaluation of the logarithm
 * when computing the index. Other mappings can approximate the logarithmic
 * mapping, while being less computationally costly.
 */
export class KeyMapping implements Mapping {
    relativeAccuracy: number;
    /** The base for the exponential buckets. gamma = (1 + alpha) / (1 - alpha) */
    gamma: number;
    /** The smallest possible value the sketch can distinguish from 0 */
    minPossible: number;
    /** The largest possible value the sketch can handle */
    maxPossible: number;
    /** Used for calculating _logGamma(value). Initially, _multiplier = 1 / log(gamma) */
    _multiplier: number;
    /** An offset that can be used for shifting all keys */
    _offset: number;

    constructor(relativeAccuracy: number, offset = 0) {
        if (relativeAccuracy <= 0 || relativeAccuracy >= 1) {
            throw Error(
                'Relative accuracy must be between 0 and 1 when initializing a KeyMapping'
            );
        }
        this.relativeAccuracy = relativeAccuracy;
        this._offset = offset;
        const gammaMantissa = (2 * relativeAccuracy) / (1 - relativeAccuracy);
        this.gamma = 1 + gammaMantissa;
        this._multiplier = 1 / Math.log1p(gammaMantissa);
        this.minPossible = MIN_SAFE_FLOAT * this.gamma;
        this.maxPossible = MAX_SAFE_FLOAT / this.gamma;
    }

    static fromGammaOffset(gamma: number, indexOffset: number): KeyMapping {
        const relativeAccuracy = (gamma - 1) / (gamma + 1);
        return new this(relativeAccuracy, indexOffset);
    }

    /** Retrieve the key specifying the bucket for a `value` */
    key(value: number): number {
        return Math.ceil(this._logGamma(value)) + this._offset;
    }

    /** Retrieve the value represented by the bucket at `key` */
    value(key: number): number {
        return this._powGamma(key - this._offset) * (2 / (1 + this.gamma));
    }

    toProto(): IIndexMapping {
        const { IndexMapping: ProtoIndexMapping } = require('../proto/compiled');
        return ProtoIndexMapping.create({
            gamma: this.gamma,
            indexOffset: this._offset,
            interpolation: this._protoInterpolation()
        });
    }

    static fromProto(protoMapping?: IIndexMapping | null): KeyMapping {
        const { IndexMapping: ProtoIndexMapping } = require('../proto/compiled');

        if (
            !protoMapping ||
            /* Double equals (==) is intentional here to check for
             * `null` | `undefined` without including `0` */
            protoMapping.gamma == null ||
            protoMapping.indexOffset == null
        ) {
            throw Error('Failed to decode mapping from protobuf');
        }

        const { interpolation, gamma, indexOffset } = protoMapping;

        switch (interpolation) {
            case ProtoIndexMapping.Interpolation.NONE:
                return LogarithmicMapping.fromGammaOffset(gamma, indexOffset);
            case ProtoIndexMapping.Interpolation.LINEAR:
                return LinearlyInterpolatedMapping.fromGammaOffset(
                    gamma,
                    indexOffset
                );
            case ProtoIndexMapping.Interpolation.CUBIC:
                return CubicallyInterpolatedMapping.fromGammaOffset(
                    gamma,
                    indexOffset
                );
            default:
                throw Error('Unrecognized mapping when decoding from protobuf');
        }
    }

    /** Return (an approximation of) the logarithm of the value base gamma */
    _logGamma(value: number): number {
        return Math.log2(value) * this._multiplier;
    }

    /** Return (an approximation of) gamma to the power value */
    _powGamma(value: number): number {
        return Math.pow(2, value / this._multiplier);
    }

    _protoInterpolation(): ProtoIndexMappingType.Interpolation {
        const { IndexMapping: ProtoIndexMapping } = require('../proto/compiled');
        return ProtoIndexMapping.Interpolation.NONE;
    }
}
