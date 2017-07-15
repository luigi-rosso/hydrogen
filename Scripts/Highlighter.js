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

	function _HandleNode(node)
	{
		let curType = node.type;

		switch(curType)
		{
			case "FunctionDeclaration":
				if(node.id)
				{
					_HandleNode(node.id);
				}

				node.params.forEach(function(el)
					{
						_HandleNode(el);
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
			case "Identifier":
			{
				let startLine = node.start.line;
				let startCol = node.start.column;
				let endLine = node.end.line;
				let endCol = node.end.column;

				for(let i = startLine; i < endLine; i++)
				{
					let line = _Lines[i];
					for(let j = 0; )
					{

					}
				}

			}
				break;
			case "VariableDeclaration":
			{
				// TODO paint the "var" | "let" | "const"
				let line = _Lines[node.loc.start.line];
				let startCol = node.loc.start.column;
				let numCols = node.kind.length;

				for(let i = 0; i < numCols; i++)
				{
					let c = _Lines[startLine][startCol + i];
					let colorIdx = 2 << 21;
                    c = c ^ colorIdx;
                    line[w] = c;
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