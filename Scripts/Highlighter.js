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

function Highlighter()
{
	let _CodePointsPunctuation = new Set([9, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 58, 59, 60, 61, 62, 63, 91, 92, 93, 94, 96, 123, 124, 125, 126]);
	let _Acorn = window.acorn;
	let _Lines;

	this.process = _Process;
	function _Process(lines)
	{
		_Lines = lines; // Store|Override the lines locally
		
		// Color punctuation
		for(let i = 0; i < _Lines.length; i++)
		{
			let line = _Lines[i];

			for(let j = 0; j < line.length; j++)
			{
				let cp = _Lines[i][j];
				cp = (cp << 11) >>> 11; // Clean out older colors
				if(_CodePointsPunctuation.has(cp))
				{
					_Lines[i][j] = colorChar(cp, 5);
				}
			}
		}

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

		// Color Comments
		let multilineComment = false;

		for(let i = 0; i < _Lines.length; i++)
		{
			let line = _Lines[i];

			for(let j = 0; j < line.length; j++)
			{
				let cp = _Lines[i][j];
				cp = (cp << 11) >>> 11; // Clean out older colors

				if(multilineComment)
				{
					_Lines[i][j] = colorChar(cp, 6); // Color '*'
					if(cp === 42) // '*' character
					{
						let adj = _Lines[i][j+1];
						adj = (adj << 11) >>> 11;
						if(adj === 47) // '/' character
						{
							multilineComment = false;
							_Lines[i][j+1] = colorChar(adj, 6);	// Color '/'
						}
					}
				}
				else if(cp === 47) // '/' character
				{
					let adj = _Lines[i][j+1];
					adj = (adj << 11) >>> 11;
					if(adj === 47)
					{
						// Single line comment, color rest of the line
						while(j < line.length)
						{
							cp = _Lines[i][j];
							cp = (cp << 11) >>> 11;
							_Lines[i][j] = colorChar(cp, 6);
							j++;
						}
					}
					else if(adj === 42) // '*' character
					{
						multilineComment = true;
						_Lines[i][j] = colorChar(cp, 6); 	// Color '/'
					}
					
				}
			}
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
				colorWord(node.loc.start.line - 1, node.loc.start.column, "function", 3);
				
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

			case "IfStatement":
				colorWord(node.loc.start.line - 1, node.loc.start.column, "if", 3);
				_HandleExpression(node.test);
				_HandleNode(node.consequent);
				if(node.alternate) _HandleNode(node.alternate);
				break;

			case "ForStatement":
				colorWord(node.loc.start.line - 1, node.loc.start.column, "for", 3);
				if(node.init) _HandleNode(node.init);
				if(node.test) _HandleExpression(node.test);
				if(node.update) _HandleExpression(node.update);

				_HandleNode(node.body);

				break;

			case "ReturnStatement":
				colorWord(node.loc.start.line - 1, node.loc.start.column, "return", 4);
				
				if(node.argument) _HandleExpression(node.argument);
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
				colorWord(node.loc.start.line - 1, node.loc.start.column, node.kind, 3);

				for(let i = 0; i < node.declarations.length; i++)
				{
					let d = node.declarations[i];
					_HandleNode(d);
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

	function colorWord(lineNo, colNo, word, color)
	{
		let line = _Lines[lineNo];
		let endCol = colNo + word.length;

		for(let i = colNo; i < endCol; i++)
		{
			let c = line[i];
			c = colorChar(c, color);
			_Lines[lineNo][i] = c;
		}
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
		
		console.log("GOING IN:", node.type, node.loc);

		switch(node.type)
		{
			case "ThisExpression":
				colorWord(node.loc.start.line - 1, node.loc.start.column, "this", 4);
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
					_HandleExpression(node.object);
					let c = node.computed ? 0 : color;
					_HandleExpression(node.property, c);
				}
				break;

			case "Super":
				break;

			case "MetaProperty":
				break;

			case "NewExpression":
				colorWord(node.loc.start.line - 1, node.loc.start.column, "new", 4);

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
			
			case "UnaryExpression":
			case "UpdateExpression":
				if(node.prefix)
				{
					colorWord(node.loc.start.line - 1, node.loc.start.column, node.operator, 5);
				}
				else
				{
					colorWord(node.loc.end.line - 1, node.loc.end.column - node.operator.length, node.operator, 5);
				}

				break;

			case "AwaitExpression":
			_HandleExpression(node.argument);
				break;

			case "BinaryExpression":
			case "LogicalExpression":
				{
					// Color the operator in between
					let startCol = node.left.loc.end.column;
					let endCol = node.right.loc.start.column;
					let line = _Lines[node.loc.start.line - 1];

					// TODO handle multiline case
					for(let i = startCol; i < endCol; i++)
					{
						let c = line[i];
						c = colorChar(c, 5);
						_Lines[node.loc.start.line - 1][i] = c;
					}
				}

				_HandleExpression(node.left);
				_HandleExpression(node.right);

				break;

			case "ConditionalExpression":
				_HandleExpression(node.test);
				_HandleExpression(node.alternate);
				_HandleExpression(node.consequent);
				break;

			case "YieldExpression":
				break;

			case "AssignmentExpression":
				{
					// Color the operator in between
					let startCol = node.left.loc.end.column;
					let endCol = node.right.loc.start.column;
					let line = _Lines[node.loc.start.line - 1];

					// TODO handle multiline case
					for(let i = startCol; i < endCol; i++)
					{
						let c = line[i];
						c = colorChar(c, 5);
						_Lines[node.loc.start.line - 1][i] = c;
					}
				}

				_HandleExpression(node.left, 5);
				_HandleExpression(node.right, 5);
				break;

			case "SequenceExpression":
				node.expressions.forEach(function(el)
					{
						_HandleExpression(el);
					});
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