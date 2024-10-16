const path = require("path");
const { node } = require("webpack");

module.exports = {
	entry: "./webpack_entry.js",
	output: {
		path: __dirname + "/lib/WebPack",
		filename: "epics-tca.js",
		library: "epics-tca",
		libraryTarget: "umd",
		globalObject: "this",
	},
    target: "node",
	resolve: {
		fallback: {
			// no fallback if we choose node as target
		},
	},

	module: {
		rules: [
            // no rule needed
		],
	},
};
