var webpack = require("webpack");
var path = require("path");

var BUILD_DIR = path.resolve(__dirname, "build/");
var APP_DIR = path.resolve(__dirname, "Scripts/");

var config = 
{
	entry: APP_DIR + "/main.jsx",
	output:
	{
		path: BUILD_DIR,
		filename: "bundle.js"
	},
	devtool: "source-map",
	module:
	{
		loaders:
		[
			{
				test : /\.jsx?/,
				include : APP_DIR,
				loader : "babel-loader"	
			}
		]
	}
};


module.exports = config;