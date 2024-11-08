__About PV Access data type in EPICS TCA__


- [Types in PV Access](#types-in-pv-access)
- [Types in EPICS TCA](#types-in-epics-tca)
- [Data in EPICS TCA](#data-in-epics-tca)
- [Summary of types and data in EPICS TCA](#summary-of-types-and-data-in-epics-tca)
- [APIs for PV Access data](#apis-for-pv-access-data)
  - [Encode a type object to a Buffer](#encode-a-type-object-to-a-buffer)
  - [Decode a type Buffer to an object](#decode-a-type-buffer-to-an-object)
  - [Encode a data object to a Buffer](#encode-a-data-object-to-a-buffer)
  - [Decode a data Buffer to an object](#decode-a-data-buffer-to-an-object)


The PV Access data is composed of two parts:
 - the type definition
 - the data itself

# Types in PV Access

There are 4 categories of atomic types of the data in PV Access, each category may contain one or more types:

 - *primitive* types (totally 12)
   - boolean (1-byte), 
   - signed/unsigned short integer (2-byte), 
   - signed/unsigned int integer(4-byte), 
   - signed/unsigned long (8-byte), 
   - floating point (4-byte), 
   - double precision floating point (8-byte), 
   - string (any size)
 - *compond* types (totally 2): 
   - union 
   - struct
 - *any* type (totally 1): 
   - variant union
 - a special type (totally 1): 
   - bounded string

Each *primitive* type has 4 forms:
 - scalar
 - variable size array
 - fixed size array
 - bounded size array

Each *compound* type has 2 forms:
 - scalar
 - variable size array

The *variant union* type has 2 forms:
 - scalar
 - varaible size array

The *bounded string* type has 1 form:
 - scalar

Simple math, there are totally 55 types in PV Access. 

It should be noted that there is no relationship between the scalar type and its array type. For example, long type and fixed-size long array type are two different types of data. They happen to be representing one or multiple long-type data. There is no way to simply derive one from the other in PV Access.

# Types in EPICS TCA

A type in EPICS TCA is an object that has a form like

```typescript
{
    typeIndex: "0x60"
}
```

This type represents a string. For example, its data looks like `"This is TCA."`

Each type must have a `typeIndex`, its value is a string in form of `"0xXX"`. This string can be represented by the value in enum `typeIndexEnum`, e.g. `typeIndexEnum.string_scalar === "0x60"`. So, the above type can also be written as


```typescript
{
    typeIndex: typeIndexEnum.string_scalar
}
```

Some types may have more fields in their type, e.g. for a bounded size array or fixed size array, it comes with a `size` field representing the size (limit) of the array:

```typescript
{
    typeIndex: "0x3f",
    size: 5
}
```

It means this type is a unsigned long array with fixed size of 5. Its data looks like `[1, 2, 3, 4, 5]`.

For more complicated data types, particularly for struct, union and their arrays, they come with more fields, like `name` and `fields`. See below summary section for details.

In EPICS TCA, all types can have optional `id: number`, `tag: number` and `sizeType: SIZE_TYPE` fields, which represent this type's ID, TAG, and type of the size encoding, respectively.

# Data in EPICS TCA

A PV Access data can be 

 - `number`
 - `string`
 - `number[]`
 - `string[]`
 - `bigint`
 - `bigint[]`
 - `Record<string, ...>`

For example, the data of a type `{typeIndex: typeIndexEnum.integer_boundedSizeArray_unsignedByte, size: 5}` can be `[1, 2, 3, 4]` or `[1n, 2n, 3n, 4n]`. The data of a type `{typeIndex: string_fixedSizeArray, size: 5}` should be like `["red", "blue", "green", "white", "black"]`.

The more complicated data types, i.e. struct, union, variant union and their arrays, have their own data formats. They all look like `Record<string ...>`. See the below summary section for details.

# Summary of types and data in EPICS TCA

|`typeIndexEnum` name|type in TCA|it can represent|
|---|---|---|
| complex_variableSizeArray_variantUnion  | `{typeIndex: "0x8a"}`| see footnote [10]|
| complex_variableSizeArray_union  | see footnote [8] | see footnote [9]|
| complex_variableSizeArray_structure  | see footnote [6] | see footnote [7] |
| complex_scalar_boundedString  | `{typeIndex: "0x83", size: 5}`| `string`|
| complex_scalar_variantUnion  | `{typeIndex: "0x82"}`| see footnote [5]|
| complex_scalar_union  | see footnote [3] | see footnote [4]|
| complex_scalar_structure  | see footnote [1] | see footnote [2]|
| string_fixedSizeArray | `{typeIndex: "0x78", size: 5}`| `string[]`|
| string_boundedSizeArray | `typeIndex: "0x70", size: 5}` | `string[]`|
| string_variableSizeArray | `{typeIndex: "0x68"}` | `string[]`|
| string_scalar | `{typeIndex: "0x60"}`| `string`|
| floatingPoint_fixedSizeArray_binary64  | `{typeIndex: "0x5b", size: 5}`| `number[] \| bigint[]`|
| floatingPoint_fixedSizeArray_binary32  | `{typeIndex: "0x5a", size: 5}`| `number[] \| bigint[]`|
| floatingPoint_boundedSizeArray_binary64  | `{typeIndex: "0x53", size: 5}`| `number[] \| bigint[]`|
| floatingPoint_boundedSizeArray_binary32  | `{typeIndex: "0x52", size: 5}`| `number[] \| bigint[]`|
| floatingPoint_variableSizeArray_binary64  |`{typeIndex: "0x4b"}` | `number[] \| bigint[]`|
| floatingPoint_variableSizeArray_binary32  | `{typeIndex: "0x4a"}`| `number[] \| bigint[]`|
| floatingPoint_scalar_binary64  | `{typeIndex: "0x43"}`| `number \| bigint`|
| floatingPoint_scalar_binary32  | `{typeIndex: "0x42"}`| `number \| bigint`|
| integer_fixedSizeArray_unsignedLong  | `{typeIndex: "0x3f", size: 5}`| `number [] \| bigint[]` |
| integer_fixedSizeArray_unsignedInt  | `{typeIndex: "0x3e", size: 5}`| `number[] \| bigint[]` |
| integer_fixedSizeArray_unsignedShort  | `{typeIndex: "0x3d", size: 5}`| `number[] \| bigint[]` |
| integer_fixedSizeArray_unsignedByte  | `{typeIndex: "0x3c", size: 5}`| `number[] \| bigint[]` |
| integer_fixedSizeArray_signedLong  | `{typeIndex: "0x3b", size: 5}`| `number[] \| bigint[]` |
| integer_fixedSizeArray_signedInt  | `{typeIndex: "0x3a", size: 5}`| `number[] \| bigint[]` |
| integer_fixedSizeArray_signedShort  | `{typeIndex: "0x39", size: 5}`| `number[] \| bigint[]` |
| integer_fixedSizeArray_signedByte  | `{typeIndex: "0x38", size: 5}`| `number[] \| bigint[]` |
| integer_boundedSizeArray_unsignedLong  | `{typeIndex: "0x37", size: 5}`| `number[] \| bigint[]` |
| integer_boundedSizeArray_unsignedInt  | `{typeIndex: "0x36", size: 5}`| `number[] \| bigint[]` |
| integer_boundedSizeArray_unsignedShort  | `{typeIndex: "0x35", size: 5}`| `number[] \| bigint[]` |
| integer_boundedSizeArray_unsignedByte  | `{typeIndex: "0x34", size: 5}`| `number[] \| bigint[]` |
| integer_boundedSizeArray_signedLong  | `{typeIndex: "0x33", size: 5}`| `number[] \| bigint[]` |
| integer_boundedSizeArray_signedInt  | `{typeIndex: "0x32", size: 5}`| `number[] \| bigint[]` |
| integer_boundedSizeArray_signedShort  | `{typeIndex: "0x31", size: 5}`| `number[] \| bigint[]` |
| integer_boundedSizeArray_signedByte  | `{typeIndex: "0x30", size: 5}`| `number[] \| bigint[]` |
| integer_variableSizeArray_unsignedLong  | `{typeIndex: "0x2f"}`| `number[] \| bigint[]` |
| integer_variableSizeArray_unsignedInt  | `{typeIndex: "0x2e"}`| `number[] \| bigint[]` |
| integer_variableSizeArray_unsignedShort  | `{typeIndex: "0x2d"}`| `number[] \| bigint[]` |
| integer_variableSizeArray_unsignedByte  | `{typeIndex: "0x2c"}`| `number[] \| bigint[]` |
| integer_variableSizeArray_signedLong  | `{typeIndex: "0x2b"}`| `number[] \| bigint[]` |
| integer_variableSizeArray_signedInt  | `{typeIndex: "0x2a"}`| `number[] \| bigint[]` |
| integer_variableSizeArray_signedShort  | `{typeIndex: "0x29"}`| `number[] \| bigint[]` |
| integer_variableSizeArray_signedByte  | `{typeIndex: "0x28"}`| `number[] \| bigint[]` |
| integer_scalar_unsignedLong  | `{typeIndex: "0x27"}`| `number \| bigint` |
| integer_scalar_unsignedInt  | `{typeIndex: "0x26"}`| `number \| bigint`|
| integer_scalar_unsignedShort  | `{typeIndex: "0x25"}`| `number \| bigint` |
| integer_scalar_unsignedByte  | `{typeIndex: "0x24"}`| `number \| bigint` |
| integer_scalar_signedLong  | `{typeIndex: "0x23"}`| `number \| bigint` |
| integer_scalar_signedInt  | `{typeIndex: "0x22"}`| `number \| bigint` |
| integer_scalar_signedShort  | `{typeIndex: "0x21"}`| `number \| bigint` |
| integer_scalar_signedByte  | `{typeIndex: "0x20"}`| `number \| bigint` |
| boolean_fixedSizeArray | `{typeIndex: "0x18", size: 5}` |  `boolean[]` |
| boolean_boundedSizeArray | `{typeIndex: "0x10", size: 5}`|  `boolean[]` |
| boolean_variableSizeArray | `{typeIndex: "0x8"}`|  `boolean[]` |
| boolean_scalar | `{typeIndex: "0x0"}`| `boolean` |

[1]: complex_scalar_structure type
```typescript
{
    typeIndex: "0x80",
    name: "time_t",
    fields: {
        secondsSinceEpoch: {typeIndex: "0x23"},
        nanoseconds: {typeIndex: "0x22"},
        userTag: {typeIndex: "0x22"}
    }
}
```

[2]: complex_scalar_structure data

```typescript
{
    secondsSinceEpoch: 12345,
    nanoseconds: 678,
    userTag: 90
}
```

[3]: complex_scalar_union type

```typescript
{
	typeIndex: "0x81",
	name: "control target",
	fields: {
		pulse_width: {
			typeIndex: "0x80",
			name: "",
			fields: {
				current: { typeIndex: "0x22" },
				manual: { typeIndex: "0x0" },
			},
		},
		pulse_height: { typeIndex: "0x22" },
		pulse_flattop: { typeIndex: "0x22" },
	},
};
```

[4]: complex_scalar_union data

We choose the 0th field, `pulse_width`, the data should be

```typescript
{
    index: 0,
    value: {
        current: 77,
        manual: false,
    }
}
```

If we choose the 2nd field, `pulse_flattop`, the data should be

```typescript
{
    index: 2,
    value: 882,
}
```

[5]: complex_scalar_varianUnion data

In variant union, the type and data are all defined in the data.

```typescript
{
	type: {
		typeIndex: "0x81",
		name: "control target",
		fields: {
			pulse_width: {
				typeIndex: "0x80",
				name: "",
				fields: {
					current: { typeIndex: "0x22" },
					manual: { typeIndex: "0x0" },
				},
			},
			pulse_height: { typeIndex: "0x22" },
			pulse_flattop: { typeIndex: "0x22" },
		},
	},
    data: {
        index: 2,
        value: 882,
    }
}
```


[6]: complex_variableSizeArray_structure type

This type can have optional `elementId` and `elementTag` fields, they represents the ID and TAG for the element's type.

```typescript
{
    typeIndex: "0x88",
    name: "time_t",
    elementId: 1,
    elementTag: 3,
    fields: {
        secondsSinceEpoch: {typeIndex: "0x23"},
        nanoseconds: {typeIndex: "0x22"},
        userTag: {typeIndex: "0x22"}
    }
}
```


[7]: complex_variableSizeArray_structure data

```typescript
[
    {
        secondsSinceEpoch: 12345,
        nanoseconds: 678,
        userTag: 90
    },
    {
        secondsSinceEpoch: 54321,
        nanoseconds: 876,
        userTag: 9
    }
]
```

[8]: complex_variableSizeArray_union type

This type can have optional `elementId` and `elementTag` fields, they represents the ID and TAG for the element's type.

```typescript
{
	typeIndex: "0x89",
	name: "control target",
    elmentId: 1,
    elementTag: 3,
	fields: {
		pulse_width: {
			typeIndex: "0x80",
			name: "",
			fields: {
				current: { typeIndex: "0x22" },
				manual: { typeIndex: "0x0" },
			},
		},
		pulse_height: { typeIndex: "0x22" },
		pulse_flattop: { typeIndex: "0x22" },
	},
}
```

[9]: complex_variableSizeArray_union data

```typescript
[
    {
        index: 0,
        value: {
            current: 77,
            manual: false,
        }
    },
    {
        index: 2,
        value: 882,
    }
]
```

[10]: complex_variableSizeArray_variantUnion data

It is still unclear how to define it properly.



# APIs for PV Access data

The typing in PV Access data is complicated. There are 55 types of data, each has its specific type and data formats. It is difficult and dangerous to use the typing mechanism (gymnastic) in TypeScript to represent the data or type in PVA in general way. So it was decided to use simple type guard to check each type and data before encoding them to Buffer, as well as after decoding them from Buffer. If there is anything incorrect in data or type, the program simply throws an exception. In this way we can simplify the programming in encoding and decoding functions, and ensures the .

## Encode a type object to a Buffer

```typescript
export const encodeType = (
    type: any,
    endian: ENDIAN) => Buffer
```

Examples. 

 - Encode a integer_scalar_unsignedLong type to Buffer:

```typescript
// <Buffer 27>
const buffer = encodeType({typeIndex: "0x27"}, ENDIAN.BIG);
```

 - Encode a integer_variableSizeArray_signedInt type 

```typescript
// <Buffer 2a>
const buffer = encodeType({typeIndex: "0x2a"}, ENDIAN.BIG);
```

 - Encode a boolean_scalar type 

```typescript
// <Buffer 0>
const buffer = encodeType({ typeIndex: "0x0" }, ENDIAN.BIG);
```

 - Encode a integer_boundedSizeArray_signedInt type

```typescript
// <Buffer 32 14>
const buffer = encodeType({typeIndex: "0x32", size: 20}, ENDIAN.BIG);
// <Buffer 32 ff 00 00 08 ac>
const buffer = encodeType({typeIndex: "0x32", size: 2220}, ENDIAN.BIG);
// <Buffer 32 ff ac 08 00 00>
const buffer = encodeType({typeIndex: "0x32", size: 2220}, ENDIAN.LITTLE);
// <Buffer fd 00 07 32 ff 00 00 08 ac>
const buffer = encodeType({typeIndex: "0x32", size: 2220, id: 7}, ENDIAN.BIG);
```

 - Encode complex_scalar_structure type to Buffer

```typescript
const type = {
    id: 1,
    typeIndex: '0x80',
    name: 'timeStamp_t',
    fields: {
        secondsPastEpoch: { typeIndex: '0x23' },
        nanoSeconds: { typeIndex: '0x22' },
        userTag: { typeIndex: '0x22' }
    }
};
// Buffer<FD 00 01 80 0B 74 69 6D 65 53 74 61 6D 70 5F 74 03 10 73 65 63 6F 6E 64 73 50 61 73 74 45 70 6F 63 68 23 0B 6E 61 6E 6F 53 65 63 6F 6E 64 73 22 07 75 73 65 72 54 61 67 22>
const buffer = encodeType(type, ENDIAN.BIG);
```

 - Encode complex_variableSizeArray_union type to Buffer

```typescript
const endian = ;
const type = {
    typeIndex: "0x89",
    name: "",
    id: 7,
    elementId: 22,
    fields: {
        temperatures: {typeIndex: "0x30", size: 50},
        administrator: {typeIndex: "0x83", size: 50},
        ids: {typeIndex: "0x2f"}
    }
}
// Buffer<fd 00 07 89 fd 00 16 81 00 03 12 0c 74 65 6d 70 65 72 61 74 75 72 65 73 30 32 0d 61 64 6d 69 6e 69 73 74 72 61 74 6f 72 83 32 3 69 64 73 2f>
const buffer = encodeType(type, ENDIAN.BIG);
```


## Decode a type Buffer to an object

We can decode a type Buffer using `decodeType` function:

```typescript
export const decodeType = (
    buffer: Buffer, 
    offset: number, 
    endian: ENDIAN) => any
```

 - Decode a complex_variableSizeArray_union type Buffer 

```typescript
const buffer = Buffer.from([0xfd, 0x00, 0x07, 0x89, 0xfd, 0x00, 0x16, 0x81, 0x00, 0x03, 12, 116, 101, 109, 112, 101, 114, 7, 116, 117, 114, 101, 115, 0x30, 0x32, 13, 97, 100, 109, 105, 110, 105, 115, 116, 114, 97, 116, 111, 114, 0x83, x32, 3, 105, 100, 115, 0x2f]);
// {
//     typeIndex: "0x89",
//     name: "",
//     id: 7,
//     elementId: 22,
//     fields: {
//         temperatures: { typeIndex: "0x30", size: 50 },
//         administrator: { typeIndex: "0x83", size: 50 },
//         ids: { typeIndex: "0x2f" }
//     }
// }
const type = decodeType(buffer, 0, ENDIAN.BIG);
```

## Encode a data object to a Buffer

The data can be encoded to a Buffer using `encodeData` function

```typescript
export const encodeData = (
    type: any,
    data: any,
    endian: ENDIAN) => Buffer
```

## Decode a data Buffer to an object

We can decode a Buffer data using `decodeData` function

```typescript
export const decodeData = (
    type: any,
    buffer: Buffer,
    offset: number,
    endian: ENDIAN) => any
```
