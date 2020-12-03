import * as $protobuf from "protobufjs";
/** Properties of a DDSketch. */
export interface IDDSketch {

    /** DDSketch mapping */
    mapping?: (IIndexMapping|null);

    /** DDSketch positiveValues */
    positiveValues?: (IStore|null);

    /** DDSketch negativeValues */
    negativeValues?: (IStore|null);

    /** DDSketch zeroCount */
    zeroCount?: (number|null);
}

/** Represents a DDSketch. */
export class DDSketch implements IDDSketch {

    /**
     * Constructs a new DDSketch.
     * @param [properties] Properties to set
     */
    constructor(properties?: IDDSketch);

    /** DDSketch mapping. */
    public mapping?: (IIndexMapping|null);

    /** DDSketch positiveValues. */
    public positiveValues?: (IStore|null);

    /** DDSketch negativeValues. */
    public negativeValues?: (IStore|null);

    /** DDSketch zeroCount. */
    public zeroCount: number;

    /**
     * Creates a new DDSketch instance using the specified properties.
     * @param [properties] Properties to set
     * @returns DDSketch instance
     */
    public static create(properties?: IDDSketch): DDSketch;

    /**
     * Encodes the specified DDSketch message. Does not implicitly {@link DDSketch.verify|verify} messages.
     * @param message DDSketch message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IDDSketch, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified DDSketch message, length delimited. Does not implicitly {@link DDSketch.verify|verify} messages.
     * @param message DDSketch message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IDDSketch, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a DDSketch message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns DDSketch
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): DDSketch;

    /**
     * Decodes a DDSketch message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns DDSketch
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): DDSketch;

    /**
     * Verifies a DDSketch message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a DDSketch message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns DDSketch
     */
    public static fromObject(object: { [k: string]: any }): DDSketch;

    /**
     * Creates a plain object from a DDSketch message. Also converts values to other types if specified.
     * @param message DDSketch
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: DDSketch, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this DDSketch to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

/** Properties of an IndexMapping. */
export interface IIndexMapping {

    /** IndexMapping gamma */
    gamma?: (number|null);

    /** IndexMapping indexOffset */
    indexOffset?: (number|null);

    /** IndexMapping interpolation */
    interpolation?: (IndexMapping.Interpolation|null);
}

/** Represents an IndexMapping. */
export class IndexMapping implements IIndexMapping {

    /**
     * Constructs a new IndexMapping.
     * @param [properties] Properties to set
     */
    constructor(properties?: IIndexMapping);

    /** IndexMapping gamma. */
    public gamma: number;

    /** IndexMapping indexOffset. */
    public indexOffset: number;

    /** IndexMapping interpolation. */
    public interpolation: IndexMapping.Interpolation;

    /**
     * Creates a new IndexMapping instance using the specified properties.
     * @param [properties] Properties to set
     * @returns IndexMapping instance
     */
    public static create(properties?: IIndexMapping): IndexMapping;

    /**
     * Encodes the specified IndexMapping message. Does not implicitly {@link IndexMapping.verify|verify} messages.
     * @param message IndexMapping message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IIndexMapping, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified IndexMapping message, length delimited. Does not implicitly {@link IndexMapping.verify|verify} messages.
     * @param message IndexMapping message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IIndexMapping, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes an IndexMapping message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns IndexMapping
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): IndexMapping;

    /**
     * Decodes an IndexMapping message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns IndexMapping
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): IndexMapping;

    /**
     * Verifies an IndexMapping message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates an IndexMapping message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns IndexMapping
     */
    public static fromObject(object: { [k: string]: any }): IndexMapping;

    /**
     * Creates a plain object from an IndexMapping message. Also converts values to other types if specified.
     * @param message IndexMapping
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: IndexMapping, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this IndexMapping to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}

export namespace IndexMapping {

    /** Interpolation enum. */
    enum Interpolation {
        NONE = 0,
        LINEAR = 1,
        QUADRATIC = 2,
        CUBIC = 3
    }
}

/** Properties of a Store. */
export interface IStore {

    /** Store binCounts */
    binCounts?: ({ [k: string]: number }|null);

    /** Store contiguousBinCounts */
    contiguousBinCounts?: (number[]|null);

    /** Store contiguousBinIndexOffset */
    contiguousBinIndexOffset?: (number|null);
}

/** Represents a Store. */
export class Store implements IStore {

    /**
     * Constructs a new Store.
     * @param [properties] Properties to set
     */
    constructor(properties?: IStore);

    /** Store binCounts. */
    public binCounts: { [k: string]: number };

    /** Store contiguousBinCounts. */
    public contiguousBinCounts: number[];

    /** Store contiguousBinIndexOffset. */
    public contiguousBinIndexOffset: number;

    /**
     * Creates a new Store instance using the specified properties.
     * @param [properties] Properties to set
     * @returns Store instance
     */
    public static create(properties?: IStore): Store;

    /**
     * Encodes the specified Store message. Does not implicitly {@link Store.verify|verify} messages.
     * @param message Store message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encode(message: IStore, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Encodes the specified Store message, length delimited. Does not implicitly {@link Store.verify|verify} messages.
     * @param message Store message or plain object to encode
     * @param [writer] Writer to encode to
     * @returns Writer
     */
    public static encodeDelimited(message: IStore, writer?: $protobuf.Writer): $protobuf.Writer;

    /**
     * Decodes a Store message from the specified reader or buffer.
     * @param reader Reader or buffer to decode from
     * @param [length] Message length if known beforehand
     * @returns Store
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decode(reader: ($protobuf.Reader|Uint8Array), length?: number): Store;

    /**
     * Decodes a Store message from the specified reader or buffer, length delimited.
     * @param reader Reader or buffer to decode from
     * @returns Store
     * @throws {Error} If the payload is not a reader or valid buffer
     * @throws {$protobuf.util.ProtocolError} If required fields are missing
     */
    public static decodeDelimited(reader: ($protobuf.Reader|Uint8Array)): Store;

    /**
     * Verifies a Store message.
     * @param message Plain object to verify
     * @returns `null` if valid, otherwise the reason why it is not
     */
    public static verify(message: { [k: string]: any }): (string|null);

    /**
     * Creates a Store message from a plain object. Also converts values to their respective internal types.
     * @param object Plain object
     * @returns Store
     */
    public static fromObject(object: { [k: string]: any }): Store;

    /**
     * Creates a plain object from a Store message. Also converts values to other types if specified.
     * @param message Store
     * @param [options] Conversion options
     * @returns Plain object
     */
    public static toObject(message: Store, options?: $protobuf.IConversionOptions): { [k: string]: any };

    /**
     * Converts this Store to JSON.
     * @returns JSON object
     */
    public toJSON(): { [k: string]: any };
}
