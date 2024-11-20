import { encodeData } from "./DataEncoder";
import { type_typeIndex, checkDataAndType, SIZE_TYPE, typeIndexEnum } from "./PvaData_typeEncoding";
import { createSizeBuffer, encodeSize, ENDIAN, writeDouble, writeFloat, writeInt16, writeInt32, writeInt64, writeInt8, writeUInt16, writeUInt32, writeUInt64, writeUInt8 } from "./PvaMethods";
import { encodeType } from "./TypeEncoder";


export class PvRequest {

    static recordDataBufferArray: Buffer[] = [];

    /**
     * Encode a PV request string
     * 
     */
    static encodePvRequest = (pvRequestString: string, endian: ENDIAN) => {
        this.recordDataBufferArray.length = 0;

        const type: Record<string, any> = {
            typeIndex: "0x80",
            name: "",
            fields: {}
        }

        const data: Record<string, any> = {};

        // special case, empty pvRequestString
        // it can be correctly encoded using the code below, but there are additional fields
        // added to the buffer, instead, we can simply use an empty type defined above to represent it
        if (pvRequestString.replaceAll(/\s+/g, "") === "") {
            return encodeType(type, endian);
        }

        const str = pvRequestString.replaceAll(/\s+/g, "");
        if (str.startsWith("record[")) {
            // find the contents inside []
            const start = 7; // after "record["
            const end = str.indexOf("]");
            const recordTypeAndData = this.extractPvRequestRecordTypeAndData(str.substring(start, end), endian);
            const recordType = recordTypeAndData["type"];
            const recordData = recordTypeAndData["data"];
            type["fields"]["record"] = recordType;
            data["record"] = recordData;

            // field() is after record[], no comma in between
            if (str.substring(end + 1, end + 1 + 6) === "field(") {
                const fieldStart = end + 1 + 6; // after "field("
                const fieldEnd = str.indexOf(")");
                const fieldTypeAndData = this.extractPvRequestFieldTypeAndData(str.substring(fieldStart, fieldEnd), endian);
                const fieldType = fieldTypeAndData["type"];
                const fieldData = fieldTypeAndData["data"];
                type["fields"]["field"] = fieldType;
                data["field"] = fieldData;
            }
        } else if (str.startsWith("field(")) {
            const start = 6;
            const end = str.indexOf(")");
            const fieldTypeAndData = this.extractPvRequestFieldTypeAndData(str.substring(start, end), endian);
            const fieldType = fieldTypeAndData["type"];
            const fieldData = fieldTypeAndData["data"];
            type["fields"]["field"] = fieldType;
            data["field"] = fieldData;
        } else {
            const start = 0;
            const end = str.length;
            const fieldTypeAndData = this.extractPvRequestFieldTypeAndData(str.substring(start, end), endian);
            const fieldType = fieldTypeAndData["type"];
            const fieldData = fieldTypeAndData["data"];
            type["fields"]["field"] = fieldType;
            data["field"] = fieldData;
        }

        // console.log("type & data = ")
        // console.dir(type, { depth: null });
        // console.dir(data, { depth: null });
        return encodeData({
            typeIndex: typeIndexEnum.complex_scalar_variantUnion,
        },
            {
                type: type,
                value: data,
            },
            endian
        )
    }

    // ---------------------- record[...] -------------------------

    /**
     * "name1=value1,name2=value2,name3=value3"
     * 
     * The result is a variant union data buffer, which is composed of a struct type buffer and 
     * a data buffer of this struct.
     * 
     * The top field of the struct is always "_options", all its fields are of type "0x60" (string)
     * 
     * If this pv request record is on the top level, we need to add 
     * 
     */
    private static extractPvRequestRecordTypeAndData = (str: string, endian: ENDIAN) => {

        const typeOptions: Record<string, any> = {};
        const dataOptions: Record<string, any> = {};
        const type: Record<string, any> = {
            typeIndex: "0x80",
            name: "",
            fields: {
                _options: { // no "record"
                    typeIndex: "0x80",
                    name: "",
                    fields: typeOptions, // reference to above options struct
                }
            }
        };
        const data = {
            _options: dataOptions
        }
        const pairsArray = str.split(",");
        for (let pair of pairsArray) {
            const pairArray = pair.split("=");
            const key = pairArray[0];

            const typeValue = { typeIndex: "0x60" };
            typeOptions[key] = typeValue; // modify options object

            const dataValue = pairArray[1];
            dataOptions[key] = dataValue; // modify options object
        }

        const dataBuffer = encodeData(type, data, endian);
        this.recordDataBufferArray.push(dataBuffer);

        return {
            type: type,
            data: data,
        };

    }



    // ---------------------- field(...) -------------------------

    /**
     * "alarm,timeStamp,power.value"
     * 
     * "alarm,timeStamp[algorithm=onChange,causeMonitor=false],power{value,alarm}"
     * 
     * "alarm,timeStamp[causeMonitor=true],power.value"
     * 
     * "power.value" === "field(power{value})" === "field(power.value)"
     */
    private static extractPvRequestFieldTypeAndData = (str: string, endian: ENDIAN) => {
        const requestStrs = this.splitPvRequestStr(str);
        const type: Record<string, any> = {
            typeIndex: "0x80",
            name: "",
            fields: {
                // fieldName: {typeIndex: "0x80", name: "", fields: {}}
            },
        };

        const data: Record<string, any> = {};


        for (let i = 0; i < requestStrs.length; i++) {

            let requestStr = requestStrs[i];
            let fieldName = "";

            let squareBracketCount = 0;
            let curlyBracketCount = 0;
            let squareBracketStart = 0; // top-level square bracket starting position
            let curlyBracketStart = 0; // top-level square bracket starting position

            const subFieldType: Record<string, any> = { typeIndex: "0x80", name: "", fields: {} };
            const subFieldData: Record<string, any> = {};

            for (let ii = 0; ii < requestStr.length; ii++) {

                // encounter any bracket or reach the end of the string
                if ((requestStr[ii] == "{" || requestStr[ii] == "[" || requestStr[ii] == "}" || requestStr[ii] == "]") || ii === requestStr.length - 1) {

                    // get the name
                    if (fieldName === "" && curlyBracketCount === 0 && squareBracketCount === 0 && (requestStr[ii] == "{" || requestStr[ii] == "[" || ii === requestStr.length - 1)) {
                        if (ii === requestStr.length - 1) {
                            ii++;
                        }
                        fieldName = requestStr.substring(0, ii);
                        type["fields"][fieldName] = subFieldType;
                        data[fieldName] = subFieldData;
                    }

                    // update bracket counts and start locations for brackets
                    if (requestStr[ii] === "{") {
                        if (curlyBracketCount === 0 && squareBracketCount === 0) {
                            curlyBracketStart = ii;
                        }
                        curlyBracketCount++;
                    } else if (requestStr[ii] === "}") {
                        curlyBracketCount--;
                    } else if (requestStr[ii] === "[") {
                        if (curlyBracketCount === 0 && squareBracketCount === 0) {
                            squareBracketStart = ii;
                        }
                        squareBracketCount++;
                    } else if (requestStr[ii] === "]") {
                        squareBracketCount--;
                    }

                    if (requestStr[ii] == "}" && squareBracketCount === 0 && curlyBracketCount === 0) {
                        // end of top-level {}
                        const childStr = requestStr.substring(curlyBracketStart + 1, ii);
                        const fieldTypeAndData = this.extractPvRequestFieldTypeAndData(childStr, endian);
                        const fieldType = fieldTypeAndData["type"]["fields"];
                        const fieldData = fieldTypeAndData["data"];
                        subFieldType["fields"] = { ...subFieldType["fields"], ...fieldType };
                        data[fieldName] = { ...data[fieldName], ...fieldData };
                    } else if (requestStr[ii] == "]" && squareBracketCount === 0 && curlyBracketCount === 0) {
                        // end of top-level []
                        const childStr = requestStr.substring(squareBracketStart + 1, ii);
                        const recordTypeAndData = this.extractPvRequestRecordTypeAndData(childStr, endian);
                        const recordType = recordTypeAndData["type"];
                        const recordData = recordTypeAndData["data"];
                        subFieldType["fields"]["_options"] = recordType["fields"]["_options"];
                        subFieldData["_options"] = recordData["_options"];
                    }
                }
            }
        }
        return {
            type: type,
            data: data,
        };
    }

    private static splitPvRequestStr = (str: string) => {


        // convert abc.def.ghi to abc{def{ghi}}
        let numOfDots = 0;
        let squareBracketCount = 0;
        for (let ii = 0; ii < str.length; ii++) {
            if (str[ii] === "[") {
                squareBracketCount++;
            }
            if (str[ii] === "]") {
                squareBracketCount--;
            }

            if (str[ii] === "." && squareBracketCount === 0) {
                str = str.substring(0, ii) + "{" + str.substring(ii + 1);
                numOfDots++;
            }
        }

        for (let jj = 0; jj < numOfDots; jj++) {
            str = str + "}";
        }

        if (!str.endsWith(",")) {
            str = str + ",";
        }

        let bracketCount = 0;
        let start = 0;
        let end = 0;
        const result: string[] = [];

        for (let ii = 0; ii < str.length; ii++) {
            if (str[ii] === "[" || str[ii] === "{") {
                bracketCount++;
            } else if (str[ii] === "]" || str[ii] === "}") {
                bracketCount--;
            }

            if (bracketCount === 0 && str[ii] === ",") {
                // highest-level closed
                end = ii;
                result.push(str.substring(start, end));
                start = ii + 1;
            }


        }
        return result;
    }
}