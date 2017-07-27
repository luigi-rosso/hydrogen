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

export default class Parser
{
	constructor()
	{
		this._CodePointsPunctuation = new Set([33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 58, 59, 60, 61, 62, 63, 91, 92, 93, 94, 96, 123, 124, 125, 126]);
		this._Acorn = window.acorn;
		this._Lines;
	}
	
	process(lines)
	{
		this._Lines = lines; // Store|Override the lines locally
		
		// Color punctuation
		// TODO remove and integrate into Node Handling
		for(let i = 0; i < this._Lines.length; i++)
		{
			let line = this._Lines[i];

			for(let j = 0; j < line.length; j++)
			{
				let cp = this._Lines[i][j];
				cp = (cp << 11) >>> 11; // Clean out older colors
				if(this._CodePointsPunctuation.has(cp))
				{
					this._Lines[i][j] = this.colorChar(cp, 5);
				}
			}
		}

		let text = this._ConvertCodePoints(lines);

		try
		{
			let program = acorn.parse_dammit(text, {locations:true});
			this._ParseTree(program);
		}
		catch(e)
		{
			console.log("PARSE FAILED:", e);
		}

		// Color Comments
		let multilineComment = false;

		for(let i = 0; i < this._Lines.length; i++)
		{
			let line = this._Lines[i];

			for(let j = 0; j < line.length; j++)
			{
				let cp = this._Lines[i][j];
				cp = (cp << 11) >>> 11; // Clean out older colors

				if(multilineComment)
				{
					this._Lines[i][j] = this.colorChar(cp, 6); // Color '*'
					if(cp === 42) // '*' character
					{
						let adj = this._Lines[i][j+1];
						adj = (adj << 11) >>> 11;
						if(adj === 47) // '/' character
						{
							multilineComment = false;
							this._Lines[i][j+1] = this.colorChar(adj, 6);	// Color '/'
						}
					}
				}
				else if(cp === 47) // '/' character
				{
					let adj = this._Lines[i][j+1];
					adj = (adj << 11) >>> 11;
					if(adj === 47)
					{
						// Single line comment, color rest of the line
						while(j < line.length)
						{
							cp = this._Lines[i][j];
							cp = (cp << 11) >>> 11;
							this._Lines[i][j] = this.colorChar(cp, 6);
							j++;
						}
					}
					else if(adj === 42) // '*' character
					{
						multilineComment = true;
						this._Lines[i][j] = this.colorChar(cp, 6); 	// Color '/'
					}
					
				}
			}
		}

	}

	_ParseTree(tree)
	{
		if(tree.body.length < 1 || tree.type !== "Program")
		{
			console.log("WRONG TREE FORMAT.", tree);
			return;
		}

		for(let i = 0; i < tree.body.length; i++)
		{
			let rootNode = tree.body[i];
			this._HandleNode(rootNode);
		}
	}

	_HandleNode(node, colorIdx)
	{
		let curType = node.type;
		
		// console.log("GOING IN:", node.type, node.loc);

		switch(curType)
		{
			case "FunctionDeclaration":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "function", 3);
				
				if(node.id)
				{
					this._HandleNode(node.id, 5);
				}

				let self = this;
				node.params.forEach(function(el)
					{
						self._HandleNode(el, 1);
					});
				
				let body = node.body; // BlockStatement || Expression
				this._HandleNode(body);

				break;
			case "BlockStatement":
				for(let i = 0; i < node.body.length; i++)
				{
					let s = node.body[i];
					this._HandleNode(s);
				}

				break;

			case "BreakStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "break", 4);
				if(node.label) this._HandleNode(node.label);
				break;

			case "ContinueStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "continue", 4);
				
				break;

			case "DebuggerStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "debugger", 4);
				
				break;

			case "DoWhileStatement":
				this._HandleNode(node.body);
				this._HandleExpression(node.test);

				break;

			case "EmptyStatement":
				// Nothing to see here
				break;

			case "ExpressionStatement":
				this._HandleExpression(node.expression);
				break;
			
			case "ForStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "for", 3);
				if(node.init) this._HandleNode(node.init);
				if(node.test) this._HandleExpression(node.test);
				if(node.update) this._HandleExpression(node.update);

				this._HandleNode(node.body);

				break;

			case "ForOfStatement":
			case "ForInStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "for", 3);

				if(node.left.type === "VariableDeclaration")
					this._HandleNode(node.left);
				else
					this._HandleExpression(node.left);

				this._HandleExpression(node.right);
				this._HandleNode(node.body);

				break;

			case "IfStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "if", 3);
				this._HandleExpression(node.test);
				this._HandleNode(node.consequent);
				
				if(node.alternate) 
				{
					let startLine = node.consequent.loc.end.line - 1;
					let startCol = node.consequent.loc.end.column;
					let endLine = node.alternate.loc.start.line - 1;
					let endCol = node.alternate.loc.start.column;

					for(let i = startLine; i <= endLine; i++)
					{
						let line = this._Lines[i];

						// For multiline case
						let start = (i == startLine) ? startCol : 0;
						let stop = (i == endLine) ? endCol : line.length;
						
						for(let j = start; j < stop; j++)
						{
							let c = line[j];
							c = this.colorChar(c, 3);
							this._Lines[i][j] = c;
						}
					}

					this._HandleNode(node.alternate);
				}
				break;

			case "LabeledStatement":
				this._HandleNode(node.label);
				this._HandleNode(node.body);

				break;

			case "ReturnStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "return", 4);
				
				if(node.argument) this._HandleExpression(node.argument);
				break;

			case "SwitchStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "switch", 3);

				this._HandleExpression(node.discriminant);
				
				let self = this;
				node.cases.forEach(function(el)
					{
						self._HandleNode(el);
					});
				break;

			case "SwitchCase":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "case", 3);
				if(node.test) this._HandleExpression(node.test);

				let self = this;
				node.consequent.forEach(function(el)
					{
						self._HandleNode(el);
					});

				break;

			case "ThrowStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "throw", 4);

				this._HandleExpression(node.argument);

				break;
			
			case "TryStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "try", 3);

				this._HandleNode(node.block);
				if(node.handler) this._HandleNode(node.handler);
				if(node.finalizer) this._HandleNode(node.finalizer);

				break;

			case "CatchClause":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "catch", 3);
				this._HandleExpression(node.param);
				if(node.guard) this._HandleExpression(node.guard);
				this._HandleNode(node.body);

				break;

			case "VariableDeclaration":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, node.kind, 3);

				for(let i = 0; i < node.declarations.length; i++)
				{
					let d = node.declarations[i];
					this._HandleNode(d);
				}	

				break;

			case "WhileStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "while", 3);
				this._HandleExpression(node.test);
				this._HandleNode(node.body);
				break;

			case "WithStatement":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "with", 3);

				this._HandleExpression(node.object);
				this._HandleNode(node.body);
				break;


			case "VariableDeclarator":
				if(node.init)
				{
					this._HandleExpression(node.init);
				}

				break;

			case "Property":
				this._HandleNode(node.key);
				this._HandleExpression(node.value);
				// TODO node.kind coloring
				break;

			case "Identifier":
				{
					this._HandleIdentifier(node, colorIdx);
				}
				break;
			case "Literal":
				this._HandleLiteral(node);
				break;
			default:
				break;
		}
	}

	colorChar(c, index)
	{
		index = index || 0; // Make sure color is a value
		c = (c << 11) >>> 11; // Clear old color mask
		let colorIdx = index << 21; 
		c = c ^ colorIdx;

		return c;
	}

	colorWord(lineNo, colNo, word, color)
	{
		let line = this._Lines[lineNo];
		let endCol = colNo + word.length;

		for(let i = colNo; i < endCol; i++)
		{
			let c = line[i];
			c = this.colorChar(c, color);
			this._Lines[lineNo][i] = c;
		}
	}

	_HandleIdentifier(identifier, color)
	{
		let startLine = identifier.loc.start.line - 1; // Lines are 1-indexed.
		let startCol = identifier.loc.start.column;
		let endLine = identifier.loc.end.line - 1;
		let endCol = identifier.loc.end.column;

		for(let i = startLine; i <= endLine; i++)
		{
			let line = this._Lines[i];

			// For multiline case
			let start = (i == startLine) ? startCol : 0;
			let stop = (i == endLine) ? endCol : line.length;

			for(let j = start; j < stop; j++)
			{
				let c = line[j];
				c = this.colorChar(c, color);
				this._Lines[i][j] = c;
			}
		}
	}

	_HandleLiteral(node)
	{
		let startLine = node.loc.start.line - 1; // Lines are 1-indexed.
		let endLine = node.loc.end.line - 1;
		let startCol = node.loc.start.column;
		let endCol = node.loc.end.column;

		for(let i = startLine; i <= endLine; i++)
		{
			let line = this._Lines[i];

			// For multiline case
			let start = (i == startLine) ? startCol : 0;
			let stop = (i == endLine) ? endCol : line.length;
			
			for(let j = start; j < stop; j++)
			{
				let c = line[j];
				c = this.colorChar(c, 1);
				this._Lines[i][j] = c;
			}
		}

	}

	_HandleExpression(node, color)
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
		
		// console.log("GOING IN:", node.type, node.loc);

		switch(node.type)
		{
			case "ThisExpression":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "this", 4);
				break;

			case "Identifier":
				this._HandleIdentifier(node, color);
				break;

			case "Literal":
				this._HandleLiteral(node);
				break;

			case "ArrayExpression":
				if(node.elements)
				{
					let self = this;
					node.elements.forEach(function(el)
						{
							self._HandleExpression(el);
						});
				}
				break;

			case "FunctionExpression":
				if (node.id)
				{
					this._HandleNode(node.id); // Identifier Node
				}

				let self = this;
				node.params.forEach(function(el)
					{
						self._HandleNode(el);
					});

				this._HandleNode(node.body);

				break;
			
			case "ArrowFunctionExpression":
				if(node.id)
				{
					this._HandleExpression(node.id);
				}

				let self = this;
				node.params.forEach(function(el)
					{
						self._HandleNode(el);
					});

				break;

			case "ClassExpression":
				// TODO color class keyword
				if(node.id)
				{
					this._HandleIdentifier(node.id);
				}
				
				if(node.superClass)
				{
					this._HandleIdentifier(node.superClass);
				}

				let classBody = node.body;

				let self = this;
				classBody.body.forEach(function(el)
					{
						// Each element is a Method Definition
						if(el.key) self._HandleExpression(el.key);
						if(el.value) self._HandleExpression(el.value);
					});

				break;

			case "TaggedTemplateExpression":
				// TODO
				break;

			case "MemberExpression":
				{
					this._HandleExpression(node.object);
					let c = node.computed ? 0 : color;
					this._HandleExpression(node.property, c);
				}
				break;

			case "Super":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "super", 4);
				break;

			case "MetaProperty":
				this._HandleExpression(node.meta);
				this._HandleExpression(node.property);

				break;

			case "NewExpression":
				this.colorWord(node.loc.start.line - 1, node.loc.start.column, "new", 4);

				this._HandleExpression(node.callee, 2);

				let self = this;
				node.arguments.forEach(function(el)
					{
						self._HandleExpression(el);
					});

				break;
			case "CallExpression":
				this._HandleExpression(node.callee, 5);

				let self = this;
				node.arguments.forEach(function(el)
					{
						self._HandleExpression(el);
					});

				break;
			
			case "UnaryExpression":
			case "UpdateExpression":
				if(node.prefix)
				{
					this.colorWord(node.loc.start.line - 1, node.loc.start.column, node.operator, 5);
				}
				else
				{
					this.colorWord(node.loc.end.line - 1, node.loc.end.column - node.operator.length, node.operator, 5);
				}

				break;

			case "AwaitExpression":
			this._HandleExpression(node.argument);
				break;

			case "BinaryExpression":
			case "LogicalExpression":
				{
					// Color the operator in between
					let startCol = node.left.loc.end.column;
					let endCol = node.right.loc.start.column;
					let line = this._Lines[node.loc.start.line - 1];

					// TODO handle multiline case
					for(let i = startCol; i < endCol; i++)
					{
						let c = line[i];
						c = this.colorChar(c, 5);
						this._Lines[node.loc.start.line - 1][i] = c;
					}
				}

				this._HandleExpression(node.left);
				this._HandleExpression(node.right);

				break;

			case "ConditionalExpression":
				this._HandleExpression(node.test);
				this._HandleExpression(node.alternate);
				this._HandleExpression(node.consequent);
				break;

			case "YieldExpression":
				if(node.argument)
					this._HandleExpression(node.argument);
				// TODO test color 'yield' keyword
				/*
				* this.colorWord(node.loc.start.line - 1, node.loc.start.column, "yield", 4);
				*/
				break;

			case "AssignmentExpression":
				{
					// Color the operator in between
					let startCol = node.left.loc.end.column;
					let endCol = node.right.loc.start.column;
					let line = this._Lines[node.loc.start.line - 1];

					// TODO handle multiline case
					for(let i = startCol; i < endCol; i++)
					{
						let c = line[i];
						c = this.colorChar(c, 5);
						this._Lines[node.loc.start.line - 1][i] = c;
					}
				}

				this._HandleExpression(node.left, 5);
				this._HandleExpression(node.right, 5);
				break;

			case "SequenceExpression":
				let self = this;
				node.expressions.forEach(function(el)
					{
						self._HandleExpression(el);
					});
				break;

			case "AssignmentPattern":
				this._HandleNode(node.left);
				this._HandleExpression(node.right);
				break;

			case "ArrayPattern":
				// elements <: AssignmentPattern | Identifier | BindingPattern | RestElement | null
				// BindingPattern = ArrayPattern | ObjectPattern
				if(node.elements)
				{
					let self = this;
					node.elements.forEach(function(el)
						{
							self._HandleNode(el);
						});
				}
				break;

			case "ObjectExpression":
			case "ObjectPattern":
				let self = this;
				node.properties.forEach(function(el)
					{
						self._HandleExpression(el);
					});
				break;

			default:
				break;
		}
	}

	_ConvertCodePoints(lines)
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