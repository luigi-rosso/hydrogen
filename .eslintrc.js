module.exports = 
{
	"parser": "babel-eslint",
	env:
	{
		browser: true,
		commonjs: true,
		es6: true,
		node: true,
	},
	extends: "eslint:recommended",
	"plugins": 
	[
		"react"
	],
	parserOptions:
	{
		ecmaVersion: 6,
		sourceType: "module",
		ecmaFeatures:
		{
			"jsx": true
		}
	},
	rules:
	{
		"comma-dangle": ["error", "never"],
		/*indent: ["error", "tab",
		{
			"SwitchCase": 1,
			"ObjectExpression": 1,
			"VariableDeclarator": 0
		}],*/
		"linebreak-style": ["error", "unix"],
		quotes: ["error", "double"],
		semi: ["error", "always"],
		"no-unused-vars": ["warn"],
		"no-console": 0,
		"react/jsx-uses-react": "error",
		"react/jsx-uses-vars": "error",
		"react/jsx-no-undef": ["error", { "allowGlobals": false }],
		"brace-style": ["error", "allman", { "allowSingleLine": true }],
		"no-inner-declarations": "off"
	}
};