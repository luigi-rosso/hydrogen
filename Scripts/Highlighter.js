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
				if(node.id)
				{
					_HandleNode(node.id);
				}

				node.params.forEach(function(el)
					{
						_HandleNode(el, 3);
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
				break;
			}
				break;
			case "VariableDeclaration":
			{
				let line = _Lines[node.loc.start.line - 1];
				let startCol = node.loc.start.column;
				let numCols = node.kind.length;

				for(let i = 0; i < numCols; i++)
				{
					let c = line[startCol + i];
					c = colorChar(c, 2);
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
		let startLine = identifier.loc.start.line - 1; // Lines are 1-indexed
		let startCol = identifier.loc.start.column;
		let endLine = identifier.loc.end.line - 1;
		let endCol = identifier.loc.end.column;

		for(let i = startLine; i <= endLine; i++)
		{
			let line = _Lines[i];
			for(let j = startCol; j < endCol; j++)
			{
				let c = line[j];
				c = colorChar(c, color);
				_Lines[i][j] = c;
			}
		}
	}

	function _HandleExpression(node)
	{
		// TODO
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
				_HandleIdentifier();
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

				break;
			
			case "NewExpression":
				_HandleExpression(node.callee);

				node.arguments.forEach(function(el)
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