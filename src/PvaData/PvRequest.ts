import { encodeBitSets, encodeData } from "./DataEncoder";
import { type_typeIndex, checkDataAndType, SIZE_TYPE, typeIndexEnum } from "./PvaData_typeEncoding";
import { createSizeBuffer, encodeSize, ENDIAN, writeDouble, writeFloat, writeInt16, writeInt32, writeInt64, writeInt8, writeUInt16, writeUInt32, writeUInt64, writeUInt8 } from "./PvaMethods";
import { reduceStructTypeWithBitSets } from "./TypeDecoder";
import { encodeType } from "./TypeEncoder";


export class PvRequest {

    // -------------------- encode/decode pv request string -------------------

    static recordDataBufferArray: Buffer[] = [];

    /**
     * Decode a PV request string, obtain the type defined by this pv request 
     * and the data that is enclodsed in it.
     * 
     * The result of this funciton is fed into the encodePvRequest to generate 
     * the buffer of the "FieldDesc pvRequestIF" and "PVField pvRequest"
     * 
     * The returned type has 2 possible top-level fields: "record" and "field", the "record" has
     * one field named as "_options" which contains the record types.
     * 
     * The returned data has 2 types: one is for the "record", one is for the "field". 
     * The values in the "record" are always string, the values in "field" are always empty object {}.
     * 
     * @returns {{type: any, value: any}} where type is type definition of the pv request,
     *                                    value is the data for this type definition, the data is 
     *                                    from the "record" part of the pv request
     * 
     */
    static decodePvRequest = (pvRequestString: string, endian: ENDIAN) => {
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
            return {
                type: type,
                value: {},
            };
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
            const fieldTypeAndData = this.extractPvRequestFieldTypeAndData(str.substring(start, end), endian, true);
            const fieldType = fieldTypeAndData["type"];
            const fieldData = fieldTypeAndData["data"];
            type["fields"]["field"] = fieldType;
            data["field"] = fieldData;
        }

        // the number of tip data should be the same as the number of pv request
        const pvRequestStrs = this.splitPvRequestStr(pvRequestString);
        let numberOfRequest = 0;
        for (let pvRequestStr of pvRequestStrs) {
            const match = pvRequestStr.match(/\,/g);
            if (match !== null) {
                numberOfRequest = numberOfRequest + match.length + 1;
            } else {
                numberOfRequest = numberOfRequest + 1;
            }
        }
        let numberOfTips = this.countPvRequestDataTips(data);

        if (numberOfRequest !== numberOfTips) {
            throw new Error("aaa")
        }
        


        return {
            type: type,
            value: data,
        };

    }

    static countPvRequestDataTips = (data: any) => {
        let numberOfTips = 0;
        for (let dataField of Object.values(data)) {
            if (typeof dataField === "object") {
                if (Object.keys(dataField as any).length === 0) {
                    numberOfTips++;
                } else {
                    numberOfTips = numberOfTips + this.countPvRequestDataTips(dataField);
                }
            }
        }
        return numberOfTips;
    }

    static encodePvRequest = (pvRequestString: string, endian: ENDIAN) => {
        const typeAndValue = this.decodePvRequest(pvRequestString, endian);
        return encodeData({ typeIndex: typeIndexEnum.complex_scalar_variantUnion, }, typeAndValue, endian);
    }

    // ---- record[...] ------

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



    // -------- field(...) --------

    /**
     * "alarm,timeStamp,power.value"
     * 
     * "alarm,timeStamp[algorithm=onChange,causeMonitor=false],power{value,alarm}"
     * 
     * "alarm,timeStamp[causeMonitor=true],power.value"
     * 
     * "power.value" === "field(power{value})" === "field(power.value)"
     */

    static dataTmp: Record<string, any> = {};

    private static extractPvRequestFieldTypeAndData = (str: string, endian: ENDIAN, topLevel: boolean = false) => {
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
                if ((requestStr[ii] === "{" || requestStr[ii] === "[" || requestStr[ii] === "}" || requestStr[ii] === "]") || ii === requestStr.length - 1) {

                    // get the name
                    if (fieldName === "" && curlyBracketCount === 0 && squareBracketCount === 0 && (requestStr[ii] === "{" || requestStr[ii] === "[" || ii === requestStr.length - 1)) {
                        if (ii === requestStr.length - 1) {
                            ii++;
                        }
                        fieldName = requestStr.substring(0, ii);
                        if (type["fields"][fieldName] === undefined) {
                            type["fields"][fieldName] = JSON.parse(JSON.stringify(subFieldType));

                        }

                        if (data[fieldName] === undefined) {
                            data[fieldName] = subFieldData;
                        }
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
                        type["fields"][fieldName]["fields"] = this.deepMerge(type["fields"][fieldName]["fields"], fieldType);
                        data[fieldName] = this.deepMerge(data[fieldName], fieldData);
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

    private static deepMerge = (obj1: any, obj2: any) => {
        const result = { ...obj1 };

        for (const key in obj2) {
            if (obj2[key] && typeof obj2[key] === 'object') {
                result[key] = this.deepMerge(obj1[key] || {}, obj2[key]);
            } else {
                result[key] = obj2[key];
            }
        }

        return result;
    }





    private static splitPvRequestStr = (str: string) => {

        str = str.replaceAll(/\s+/g, "");
        if (!str.endsWith(",")) {
            str = str + ",";
        }

        const result: string[] = [];
        let bracketCount = 0;
        let start = 0;
        for (let ii = 0; ii < str.length; ii++) {
            if (str[ii] === "[" || str[ii] === "{") {
                bracketCount++;
            } else if (str[ii] === "]" || str[ii] === "}") {
                bracketCount--;
            } else if (str[ii] === ",") {
                if (bracketCount === 0) {
                    result.push(str.substring(start, ii));
                    start = ii + 1;
                }
            }
        }

        for (let ii = 0; ii < result.length; ii++) {
            let bracketCount = 0;
            let dotCount = 0;
            let subStr = result[ii];
            for (let jj = 0; jj < subStr.length; jj++) {
                if (subStr[jj] === "[" || subStr[jj] === "{") {
                    bracketCount++;
                } else if (subStr[jj] === "]" || subStr[jj] === "}") {
                    bracketCount--;
                } else if (subStr[jj] === ".") {
                    if (bracketCount === 0) {
                        result[ii] = result[ii].substring(0, jj) + "{" + result[ii].substring(jj + 1);
                        dotCount++;
                    }
                }
            }
            for (let kk = 0; kk < dotCount; kk++) {
                result[ii] = result[ii] + "}";
            }
        }

        return result;
    }

    // ------------------------- create  -------------------------------------

    static bitsetIndex = 0;
    static bitsetResult: number[] = [];
    static valuesIndex: number = 0;
    static dataKeyTmp: string[] = [];
    static fullTypeBitSets: number[] = [];
    static fullTypeBitSetIndex: number = 0;
    static typeFieldNamesTmp: string[] = [];

    /**
     * Create a buffer that holds 
     * 
     *  (1) the bitsets for a pv request data struct and 
     * 
     *  (2) the pv request data struct that is assigned with values
     * 
     * For the first one, the bit sets is 
     * 
     */



    static encodePvRequestDataWithValue = (pvRequest: string, type: any, values: any[], endian: ENDIAN) => {
        const { bitSets, reducedType, pvRequestData } = this.decodePvRequestDataWithValue(pvRequest, type, values, endian);
        const bitSetsBuffer = encodeBitSets(bitSets, endian);
        const pvRequestBuffer = encodeData(reducedType, pvRequestData, endian);
        return Buffer.concat([bitSetsBuffer, pvRequestBuffer]);
    }


    static decodePvRequestDataWithValue = (pvRequest: string, type: any, values: any[], endian: ENDIAN) => {

        this.bitsetIndex = 0;
        this.bitsetResult = [];
        this.valuesIndex = 0;
        this.dataKeyTmp = [];
        this.fullTypeBitSets = [];
        this.typeFieldNamesTmp = [];

        // should not contain record
        if (pvRequest.includes("[") || pvRequest.includes("]")) {
            throw new Error("");
        }

        // number of pv requests and the number of values must be the same
        const pvRequestStrs = this.splitPvRequestStr(pvRequest);
        let numberOfRequest = 0;
        for (let pvRequestStr of pvRequestStrs) {
            const match = pvRequestStr.match(/\,/g);
            if (match !== null) {
                numberOfRequest = numberOfRequest + match.length + 1;
            } else {
                numberOfRequest = numberOfRequest + 1;
            }
        }
        if (numberOfRequest !== values.length) {
            throw new Error("");
        }


        const pvRequestTypeAndData = this.decodePvRequest(pvRequest, endian);

        // we only need "field" data, all end points are all empty JSON object {}
        const pvRequestType = pvRequestTypeAndData["type"]["field"];
        const pvRequestData = pvRequestTypeAndData["value"]["field"];

        this.blabla(pvRequestData, values, type);



        const reducedType = reduceStructTypeWithBitSets(type, this.fullTypeBitSets, true);
        console.log("----- decodePvRequestDataWithValue ----, fulltype, pvReqeust data, and redecuded");
        console.dir(type, { depth: null })
        console.dir(pvRequestData, { depth: null })
        console.dir(reducedType, { depth: null })

        if (this.bitsetResult.length !== numberOfRequest) {
            throw new Error("");
        }

        return JSON.parse(JSON.stringify({
            bitSets: this.bitsetResult,
            reducedType: reducedType,
            pvRequestData: pvRequestData,
        }));
    }


    static blabla = (pvRequestData: any, values: any[], type: any) => {
        const dataKeys = Object.keys(pvRequestData);
        const dataValues = Object.values(pvRequestData);
        for (let ii = 0; ii < dataKeys.length; ii++) {
            const dataKey = dataKeys[ii];
            const dataValue = dataValues[ii];

            this.dataKeyTmp.push(dataKey);

            if (typeof dataValue === "object") {
                this.bitsetIndex++;

                // if at endpoint: empty JSON object {}
                if (Object.keys(dataValue as any).length === 0) {
                    // add bitset
                    this.bitsetResult.push(this.bitsetIndex);

                    // assign value to the end point, replace {}
                    const newValue = values[this.valuesIndex];
                    if (newValue === undefined) {
                        throw new Error("");
                    }
                    pvRequestData[dataKey] = newValue;
                    this.valuesIndex++;

                    // iterate over the full type, compare it with this.dataKeyTmp which contains
                    // the path to the end point of a pv request data
                    // then find out the bitsets in full type, and reduce the full type
                    this.iterateOverType(type, 0)
                } else { // if not at endpoint: continue

                    this.blabla(dataValue, values, type);
                }
            } else {
                throw new Error("");
            }


            this.dataKeyTmp.pop()
        }
    }

    /**
     * Iterate over the full type
     * 
     * This funciton is invoked on at the tip
     */
    private static iterateOverType = (type: any, layer: number) => {

        if (layer === 0) {
            this.fullTypeBitSetIndex = 0;
        }

        const fieldTypes = type["fields"];

        if (fieldTypes === undefined) {
            return;
        }

        for (const fieldName of Object.keys(fieldTypes)) {
            this.fullTypeBitSetIndex++;

            this.typeFieldNamesTmp.push(fieldName);

            const fieldType = fieldTypes[fieldName];

            // if (fieldName === this.dataKeyTmp[layer] && layer === this.dataKeyTmp.length - 1) {
            if (this.typeFieldNamesTmp.join(".") === this.dataKeyTmp.join(".")) {
                this.fullTypeBitSets.push(this.fullTypeBitSetIndex);
                this.typeFieldNamesTmp.pop();
                return;
            }

            this.iterateOverType(fieldType, layer + 1);
            this.typeFieldNamesTmp.pop();
        }


    }

}