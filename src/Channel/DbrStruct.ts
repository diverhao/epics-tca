
export type type_DBR_meta_struct_props = {
	type: "int" | "uint" | "float" | "double" | "string" | "string[]";
	size: number;
	offset: number;
};

export class DbrStruct {
	static DBR_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		// empty
	};

	static DBR_STS_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		status: {
			type: "int",
			size: 2, // byte
			offset: 0, // byte
		},
		severity: {
			type: "int",
			size: 2,
			offset: 2,
		},
	};

	static DBR_TIME_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		secondsSinceEpoch: {
			type: "int",
			size: 4,
			offset: 4,
		},
		nanoSeconds: {
			type: "uint",
			size: 4,
			offset: 8,
		},
	};

	static DBR_GR_SHORT_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "int",
			size: 2,
			offset: 12,
		},
		lower_display_limit: {
			type: "int",
			size: 2,
			offset: 14,
		},
		upper_alarm_limit: {
			type: "int",
			size: 2,
			offset: 16,
		},
		upper_warning_limit: {
			type: "int",
			size: 2,
			offset: 18,
		},
		lower_warning_limit: {
			type: "int",
			size: 2,
			offset: 20,
		},
		lower_alarm_limit: {
			type: "int",
			size: 2,
			offset: 22,
		},
	};

	static DBR_GR_CHAR_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "uint",
			size: 1,
			offset: 12,
		},
		lower_display_limit: {
			type: "uint",
			size: 1,
			offset: 13,
		},
		upper_alarm_limit: {
			type: "uint",
			size: 1,
			offset: 14,
		},
		upper_warning_limit: {
			type: "uint",
			size: 1,
			offset: 15,
		},
		lower_warning_limit: {
			type: "uint",
			size: 1,
			offset: 16,
		},
		lower_alarm_limit: {
			type: "uint",
			size: 1,
			offset: 17,
		},
	};

	static DBR_GR_LONG_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "int",
			size: 4,
			offset: 12,
		},
		lower_display_limit: {
			type: "int",
			size: 4,
			offset: 16,
		},
		upper_alarm_limit: {
			type: "int",
			size: 4,
			offset: 20,
		},
		upper_warning_limit: {
			type: "int",
			size: 4,
			offset: 24,
		},
		lower_warning_limit: {
			type: "int",
			size: 4,
			offset: 28,
		},
		lower_alarm_limit: {
			type: "int",
			size: 4,
			offset: 32,
		},
	};

	static DBR_GR_FLOAT_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		precision: {
			type: "int",
			size: 2,
			offset: 4,
		},
		padding: {
			type: "int",
			size: 2,
			offset: 6,
		},
		units: {
			type: "string",
			size: 8,
			offset: 8,
		},
		upper_display_limit: {
			type: "float",
			size: 4,
			offset: 16,
		},
		lower_display_limit: {
			type: "float",
			size: 4,
			offset: 20,
		},
		upper_alarm_limit: {
			type: "float",
			size: 4,
			offset: 24,
		},
		upper_warning_limit: {
			type: "float",
			size: 4,
			offset: 28,
		},
		lower_warning_limit: {
			type: "float",
			size: 4,
			offset: 32,
		},
		lower_alarm_limit: {
			type: "float",
			size: 4,
			offset: 36,
		},
	};

	static DBR_GR_DOUBLE_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		precision: {
			type: "int",
			size: 2,
			offset: 4,
		},
		padding: {
			type: "int",
			size: 2,
			offset: 6,
		},
		units: {
			type: "string",
			size: 8,
			offset: 8,
		},
		upper_display_limit: {
			type: "double",
			size: 8,
			offset: 16,
		},
		lower_display_limit: {
			type: "double",
			size: 8,
			offset: 24,
		},
		upper_alarm_limit: {
			type: "double",
			size: 8,
			offset: 32,
		},
		upper_warning_limit: {
			type: "double",
			size: 8,
			offset: 40,
		},
		lower_warning_limit: {
			type: "double",
			size: 8,
			offset: 48,
		},
		lower_alarm_limit: {
			type: "double",
			size: 8,
			offset: 56,
		},
	};

	static DBR_GR_ENUM_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		number_of_string_used: {
			type: "int",
			size: 2,
			offset: 4,
		},
		strings: {
			type: "string[]",
			size: 416, // 16 x 26
			offset: 6,
		},
	};

	static DBR_CTRL_SHORT_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "int",
			size: 2,
			offset: 12,
		},
		lower_display_limit: {
			type: "int",
			size: 2,
			offset: 14,
		},
		upper_alarm_limit: {
			type: "int",
			size: 2,
			offset: 16,
		},
		upper_warning_limit: {
			type: "int",
			size: 2,
			offset: 18,
		},
		lower_warning_limit: {
			type: "int",
			size: 2,
			offset: 20,
		},
		lower_alarm_limit: {
			type: "int",
			size: 2,
			offset: 22,
		},
		upper_ctrl_limit: {
			type: "int",
			size: 2,
			offset: 24,
		},
		lower_ctrl_limit: {
			type: "int",
			size: 2,
			offset: 26,
		},
	};

	static DBR_CTRL_CHAR_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "uint",
			size: 1,
			offset: 12,
		},
		lower_display_limit: {
			type: "uint",
			size: 1,
			offset: 13,
		},
		upper_alarm_limit: {
			type: "uint",
			size: 1,
			offset: 14,
		},
		upper_warning_limit: {
			type: "uint",
			size: 1,
			offset: 15,
		},
		lower_warning_limit: {
			type: "uint",
			size: 1,
			offset: 16,
		},
		lower_alarm_limit: {
			type: "uint",
			size: 1,
			offset: 17,
		},
		upper_ctrl_limit: {
			type: "uint",
			size: 1,
			offset: 18,
		},
		lower_ctrl_limit: {
			type: "uint",
			size: 1,
			offset: 19,
		},
	};

	static DBR_CTRL_LONG_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		units: {
			type: "string",
			size: 8,
			offset: 4,
		},
		upper_display_limit: {
			type: "int",
			size: 4,
			offset: 12,
		},
		lower_display_limit: {
			type: "int",
			size: 4,
			offset: 16,
		},
		upper_alarm_limit: {
			type: "int",
			size: 4,
			offset: 20,
		},
		upper_warning_limit: {
			type: "int",
			size: 4,
			offset: 24,
		},
		lower_warning_limit: {
			type: "int",
			size: 4,
			offset: 28,
		},
		lower_alarm_limit: {
			type: "int",
			size: 4,
			offset: 32,
		},
		upper_ctrl_limit: {
			type: "int",
			size: 4,
			offset: 36,
		},
		lower_ctrl_limit: {
			type: "int",
			size: 4,
			offset: 40,
		},
	};

	static DBR_CTRL_FLOAT_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		precision: {
			type: "int",
			size: 2,
			offset: 4,
		},
		padding: {
			type: "int",
			size: 2,
			offset: 6,
		},
		units: {
			type: "string",
			size: 8,
			offset: 8,
		},
		upper_display_limit: {
			type: "float",
			size: 4,
			offset: 16,
		},
		lower_display_limit: {
			type: "float",
			size: 4,
			offset: 20,
		},
		upper_alarm_limit: {
			type: "float",
			size: 4,
			offset: 24,
		},
		upper_warning_limit: {
			type: "float",
			size: 4,
			offset: 28,
		},
		lower_warning_limit: {
			type: "float",
			size: 4,
			offset: 32,
		},
		lower_alarm_limit: {
			type: "float",
			size: 4,
			offset: 36,
		},
		upper_ctrl_limit: {
			type: "float",
			size: 4,
			offset: 40,
		},
		lower_ctrl_limit: {
			type: "float",
			size: 4,
			offset: 44,
		},
	};

	static DBR_CTRL_DOUBLE_meta_struct: Record<string, type_DBR_meta_struct_props> = {
		...this.DBR_STS_meta_struct,
		precision: {
			type: "int",
			size: 2,
			offset: 4,
		},
		padding: {
			type: "int",
			size: 2,
			offset: 6,
		},
		units: {
			type: "string",
			size: 8,
			offset: 8,
		},
		upper_display_limit: {
			type: "double",
			size: 8,
			offset: 16,
		},
		lower_display_limit: {
			type: "double",
			size: 8,
			offset: 24,
		},
		upper_alarm_limit: {
			type: "double",
			size: 8,
			offset: 32,
		},
		upper_warning_limit: {
			type: "double",
			size: 8,
			offset: 40,
		},
		lower_warning_limit: {
			type: "double",
			size: 8,
			offset: 48,
		},
		lower_alarm_limit: {
			type: "double",
			size: 8,
			offset: 56,
		},
		upper_ctrl_limit: {
			type: "double",
			size: 8,
			offset: 64,
		},
		lower_ctrl_limit: {
			type: "double",
			size: 8,
			offset: 72,
		},
	};

	// https://epics.anl.gov/base/R3-16/0-docs/CAproto/index.html#payload-data-types
	// [Meta size, padding size, Element size]
	static bufferSizes_table = [
		[0, 0, 40], // DBR_STRING
		[0, 0, 2], // DBR_INT, DBR_SHORT
		[0, 0, 4], // DBR_FLOAT
		[0, 0, 2], // DBR_ENUM
		[0, 0, 1], // DBR_CHAR
		[0, 0, 4], // DBR_LONG
		[0, 0, 8], // DBR_DOUBLE
		[4, 0, 40], // DBR_STS_STRING
		[4, 0, 2], // DBR_STS_INT, DBR_STS_SHORT
		[4, 0, 4], // DBR_STS_FLOAT
		[4, 0, 2], // DBR_STS_ENUM
		[4, 0, 1], // DBR_STS_CHAR // padding is 1 in webpage
		[4, 0, 4], // DBR_STS_LONG
		[4, 4, 8], // DBR_STS_DOUBLE
		[12, 0, 40], // DBR_TIME_STRING
		[12, 2, 2], // DBR_TIME_INT, DBR_TIME_SHORT
		[12, 0, 4], // DBR_TIME_FLOAT
		[12, 2, 2], // DBR_TIME_ENUM
		[12, 2, 1], // DBR_TIME_CHAR // padding is 3 in webpage
		[12, 0, 4], // DBR_TIME_LONG
		[12, 4, 8], // DBR_TIME_DOUBLE
		[4, 0, 40], // DBR_GR_STRING
		[24, 0, 2], // DBR_GR_INT, DBR_GR_SHORT
		[40, 0, 4], // DBR_GR_FLOAT // padding is 2 in webpage
		[422, 0, 2], // DBR_GR_ENUM
		[18, 1, 1], // DBR_GR_CHAR // meat size is 24
		[36, 0, 4], // DBR_GR_LONG // meat size is 24
		[64, 0, 8], // DBR_GR_DOUBLE
		[4, 0, 40], // DBR_CTRL_STRING
		[28, 0, 2], // DBR_CTRL_INT, DBR_CTRL_SHORT
		[48, 0, 4], // DBR_CTRL_FLOAT
		[422, 0, 2], // DBR_CTRL_ENUM
		[20, 1, 1], // DBR_CTRL_CHAR
		[44, 0, 4], // DBR_CTRL_LONG
		[80, 0, 8], // DBR_CTRL_DOUBLE
	];

	static valueType_table = [
		"string", // DBR_STRING
		"int", // DBR_INT, DBR_SHORT
		"float", // DBR_FLOAT
		"int", // DBR_ENUM
		"char", // DBR_CHAR
		"int", // DBR_LONG
		"double", // DBR_DOUBLE
		"string", // DBR_STS_STRING
		"int", // DBR_STS_INT, DBR_STS_SHORT
		"float", // DBR_STS_FLOAT
		"int", // DBR_STS_ENUM
		"char", // DBR_STS_CHAR
		"int", // DBR_STS_LONG
		"double", // DBR_STS_DOUBLE
		"string", // DBR_TIME_STRING
		"int", // DBR_TIME_INT, DBR_TIME_SHORT
		"float", // DBR_TIME_FLOAT
		"int", // DBR_TIME_ENUM
		"char", // DBR_TIME_CHAR
		"int", // DBR_TIME_LONG
		"double", // DBR_TIME_DOUBLE
		"string", // DBR_GR_STRING
		"int", // DBR_GR_INT, DBR_GR_SHORT
		"float", // DBR_GR_FLOAT
		"int", // DBR_GR_ENUM
		"char", // DBR_GR_CHAR
		"int", // DBR_GR_LONG
		"double", // DBR_GR_DOUBLE
		"string", // DBR_CTRL_STRING
		"int", // DBR_CTRL_INT, DBR_CTRL_SHORT
		"float", // DBR_CTRL_FLOAT
		"int", // DBR_CTRL_ENUM
		"char", // DBR_CTRL_CHAR
		"int", // DBR_CTRL_LONG
		"double", // DBR_CTRL_DOUBLE
	];

	static DBR_meta_struct_table = [
		this.DBR_meta_struct, // DBR_STRING
		this.DBR_meta_struct, // DBR_INT, DBR_SHORT
		this.DBR_meta_struct, // DBR_FLOAT
		this.DBR_meta_struct, // DBR_ENUM
		this.DBR_meta_struct, // DBR_CHAR
		this.DBR_meta_struct, // DBR_LONG
		this.DBR_meta_struct, // DBR_DOUBLE
		this.DBR_STS_meta_struct, // DBR_STS_STRING
		this.DBR_STS_meta_struct, // DBR_STS_INT, DBR_STS_SHORT
		this.DBR_STS_meta_struct, // DBR_STS_FLOAT
		this.DBR_STS_meta_struct, // DBR_STS_ENUM
		this.DBR_STS_meta_struct, // DBR_STS_CHAR
		this.DBR_STS_meta_struct, // DBR_STS_LONG
		this.DBR_STS_meta_struct, // DBR_STS_DOUBLE
		this.DBR_TIME_meta_struct, // DBR_TIME_STRING
		this.DBR_TIME_meta_struct, // DBR_TIME_INT, DBR_TIME_SHORT
		this.DBR_TIME_meta_struct, // DBR_TIME_FLOAT
		this.DBR_TIME_meta_struct, // DBR_TIME_ENUM
		this.DBR_TIME_meta_struct, // DBR_TIME_CHAR
		this.DBR_TIME_meta_struct, // DBR_TIME_LONG
		this.DBR_TIME_meta_struct, // DBR_TIME_DOUBLE
		this.DBR_STS_meta_struct, // DBR_GR_STRING
		this.DBR_GR_SHORT_meta_struct, // DBR_GR_INT, DBR_GR_SHORT
		this.DBR_GR_FLOAT_meta_struct, // DBR_GR_FLOAT
		this.DBR_GR_ENUM_meta_struct, // DBR_GR_ENUM
		this.DBR_GR_CHAR_meta_struct, // DBR_GR_CHAR
		this.DBR_GR_LONG_meta_struct, // DBR_GR_LONG
		this.DBR_GR_DOUBLE_meta_struct, // DBR_GR_DOUBLE
		this.DBR_STS_meta_struct, // DBR_CTRL_STRING
		this.DBR_CTRL_SHORT_meta_struct, // DBR_CTRL_INT, DBR_CTRL_SHORT
		this.DBR_CTRL_FLOAT_meta_struct, // DBR_CTRL_FLOAT
		this.DBR_GR_ENUM_meta_struct, // DBR_CTRL_ENUM
		this.DBR_CTRL_CHAR_meta_struct, // DBR_CTRL_CHAR
		this.DBR_CTRL_LONG_meta_struct, // DBR_CTRL_LONG
		this.DBR_CTRL_DOUBLE_meta_struct, // DBR_CTRL_DOUBLE
	];
}