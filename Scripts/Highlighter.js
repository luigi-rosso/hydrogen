/*
This object is responsible for the JS Sytanx Highlighting.
INPUT: 	
	An array of lines:
		- Each element in this array is a Uint32array containing the UTF Code Points for the chars on the corresponding line in the document.
			- Each Uint is made of 32-bits: 
				* the first (rightmost) 21-bits contain the actual Code Point
				* the last (leftmost) 11-bits contain the color index for the code to be displayed

OUTPUT: 
	Masked Uint32Arrays containing the Color Codes for each token in the document
*/

// TODO color palette

function Highlighter()
{
	let _Acorn = window.acorn;
	let _Lines;

	this.process = _Process;
	function _Process(lines)
	{
		_Lines = lines; // Store|Override the lines locally
		
		let text = _ConvertCodePoints(lines);

		try
		{
			let program = acorn.parse(text, {locations:true});
			_ParseTree(program);
		}
		catch(e)
		{
			console.log("PARSE FAILED:", e);
		}
	}

	function _ParseTree(tree)
	{
		if(tree.body.length < 1 || tree.type !== "Program")
		{
			console.log("WRONG TREE FORMAT.", tree);
			return;
		}

		for(let i = 0; i < tree.body.length; i++)
		{
			let rootNode = tree.body[i];
			_HandleNode(rootNode);
		}
	}

	function _HandleNode(node, colorIdx)
	{
		let curType = node.type;
		console.log("GOING IN:", node.type, node.loc);
		switch(curType)
		{
			case "FunctionDeclaration":
				{
					// Color the function keyword
					let startLine = node.loc.start.line - 1;
					let startCol = node.loc.start.column;
					let endCol = startCol + "function".length;

					let line = _Lines[startLine];

					for(let i = startCol; i < endCol; i++)
					{
						let c = line[i];
						c = colorChar(c, 3);
						_Lines[startLine][i] = c;
					}
				}

				if(node.id)
				{
					_HandleNode(node.id, 5);
				}

				node.params.forEach(function(el)
					{
						_HandleNode(el, 1);
					});
				
				let body = node.body; // BlockStatement || Expression
				_HandleNode(body);

				break;
			case "BlockStatement":
				for(let i = 0; i < node.body.length; i++)
				{
					let s = node.body[i];
					_HandleNode(s);
				}

				break;
			case "ExpressionStatement":
				_HandleExpression(node.expression);
				break;

			case "ForStatement":
				{
					let startLine = node.loc.start.line - 1;
					let line = _Lines[startLine]
					let startCol = node.loc.start.column;

					for(let i = startCol; i < startCol + 3; i++)
					{
						let c = line[i];
						c = colorChar(c, 3);
						_Lines[startLine][i] = c;
					}
				}
				if(node.init) _HandleNode(node.init);
				if(node.test) _HandleExpression(node.test);
				if(node.update) _HandleExpression(node.update);

				_HandleNode(node.body);

				break;

			case "AssignmentPattern":
				// TODO 
				break;
			case "ArrayPattern":
				// TODO
				break;
			case "ObjectPattern":
				// TODO
				break;

			case "Identifier":
			{
				_HandleIdentifier(node, colorIdx);
			}
				break;
			case "Literal":
				_HandleLiteral(node);
				break;
			case "VariableDeclaration":
			{
				// Coloring 'var','let','const' keyword
				let line = _Lines[node.loc.start.line - 1];
				let startCol = node.loc.start.column;
				let numCols = node.kind.length;

				for(let i = 0; i < numCols; i++)
				{
					let c = line[startCol + i];
					c = colorChar(c, 3);
                    line[startCol + i] = c;
				}

				for(let i = 0; i < node.declarations.length; i++)
				{
					let d = node.declarations[i];
					_HandleNode(d);
				}	
			}
				break;

			case "VariableDeclarator":
				if(node.init)
				{
					_HandleExpression(node.init);
				}

				break;

			default:
				break;
		}
	}

	function colorChar(c, index)
	{
		index = index || 0; // Make sure color is a value
		c = (c << 11) >>> 11; // Clear old color mask
		let colorIdx = index << 21; 
		c = c ^ colorIdx;

		return c;
	}

	function _HandleIdentifier(identifier, color)
	{
		let startLine = identifier.loc.start.line - 1; // Lines are 1-indexed.
		let startCol = identifier.loc.start.column;
		let endLine = identifier.loc.end.line - 1;
		let endCol = identifier.loc.end.column;

		for(let i = startLine; i <= endLine; i++)
		{
			let line = _Lines[i];

			// For multiline case
			let start = (i == startLine) ? startCol : 0;
			let stop = (i == endLine) ? endCol : line.length;

			for(let j = start; j < stop; j++)
			{
				let c = line[j];
				c = colorChar(c, color);
				_Lines[i][j] = c;
			}
		}
	}

	function _HandleLiteral(node)
	{
		let startLine = node.loc.start.line - 1; // Lines are 1-indexed.
		let endLine = node.loc.end.line - 1;
		let startCol = node.loc.start.column;
		let endCol = node.loc.end.column;

		for(let i = startLine; i <= endLine; i++)
		{
			let line = _Lines[i];

			// For multiline case
			let start = (i == startLine) ? startCol : 0;
			let stop = (i == endLine) ? endCol : line.length;
			
			for(let j = start; j < stop; j++)
			{
				let c = line[j];
				c = colorChar(c, 1);
				_Lines[i][j] = c;
			}
		}

	}

	function _HandleExpression(node, color)
	{
		/*
			Expression <=: 
				ThisExpression | Identifier | Literal |
    			ArrayExpression | ObjectExpression | FunctionExpression | ArrowFunctionExpression | ClassExpression |
			    TaggedTemplateExpression | MemberExpression | Super | MetaProperty |
			    NewExpression | CallExpression | UpdateExpression | AwaitExpression | UnaryExpression |
			    BinaryExpression | LogicalExpression | ConditionalExpression |
			    YieldExpression | AssignmentExpression | SequenceExpression;
		*/
		switch(node.type)
		{
			case "ThisExpression":
				{
					let startLine = node.loc.start.line - 1;
					let startCol = node.loc.start.column;
					let line = _Lines[startLine];

					for(let i = 0; i < 4; i++)
					{
						let c = line[startCol + i];
						c = colorChar(c, 4);
						_Lines[startLine][startCol + i] = c;
					}
				}

				break;

			case "Identifier":
				_HandleIdentifier(node, color);
				break;

			case "Literal":
				_HandleLiteral(node);
				break;

			case "ArrayExpression":
				if(node.elements)
					node.elements.forEach(function(el)
						{
							_HandleExpression(el);
						});
				break;

			case "ObjectExpression":

				break;

			case "FunctionExpression":
				// Highlight function word
				if (node.id)
				{
					_HandleNode(node.id); // Identifier Node
				}

				
				node.params.forEach(function(el)
					{
						_HandleNode(el);
					});

				_HandleNode(node.body);

				break;
			
			case "ArrowFunctionExpression":

				break;

			case "ClassExpression":

				break;

			case "TaggedTemplateExpression":

				break;

			case "MemberExpression":
				{
					node.object; // TODO this is the caller
					_HandleExpression(node.property, color);
				}
				break;

			case "Super":
				break;

			case "MetaProperty":
				break;

			case "NewExpression":
				{
					// Color the 'new' keyword
					let startLine = node.loc.start.line - 1;
					let line = _Lines[startLine];
					let startCol = node.loc.start.column;
					
					for(let i = startCol; i < startCol + 3; i++)
					{
						let c = line[i];
						c = colorChar(c, 4);
						_Lines[startLine][i] = c;
					}
				}
				// Color the Object name.
				_HandleExpression(node.callee, 2);

				node.arguments.forEach(function(el)
					{
						_HandleExpression(el);
					});

				break;
			case "CallExpression":
				_HandleExpression(node.callee, 5);

				node.arguments.forEach(function(el)
					{
						_HandleExpression(el);
					});

				break;

			case "UpdateExpression":
				break;

			case "AwaitExpression":
				break;

			case "UnaryExpression":
				break;

			case "BinaryExpression":
				break;

			case "LogicalExpression":
				break;

			case "ConditionalExpression":
				break;

			case "YieldExpression":
				break;

			case "AssignmentExpression":
				_HandleExpression(node.left, 5);
				_HandleExpression(node.right, 5);
				break;

			case "SequenceExpression":
				break;

			default:
				break;
		}
	}


	function _ConvertCodePoints(lines)
	{
		let textLines = "";

		for(let i = 0; i < lines.length; i++)
		{
			let line = lines[i];

			for(let j = 0; j < line.length; j++)
			{
				let codePoint = (line[j] << 11) >>> 11;
            	let char = String.fromCodePoint(codePoint);
				textLines += char;
			}

			textLines += "\n";
		}

		return textLines;
	}

}