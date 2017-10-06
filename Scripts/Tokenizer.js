export default class Tokenizer
{	
	constructor(inputText)
	{
		this._CurrentLanguage;
		this._Lines = inputText;
		this._TextLines;
		let self = this;
		
		this._LineNum = 0;
		this._ColPos = 0;
		this._PrevToken = null;
		this._Brackets = [];
		this._Tokens = [];
		this._State = 0;
		this._ColorIdx = 0;

		this.STATE_NAMES = 
		[ 
			"WORD", 		// 1    1
			"COMMENT", 		// 2    10
			"STRING", 		// 4    100
			"MULTI_STRING", // 8    1000
			"OPEN_BRACKET", // 16   10000
			"CLOSE_BRACKET",// 32   100000
			"SLASH", 		// 64   1000000
			"COMMENT", 		// 128  10000000
			"MULTICOMMENT", // 256  100000000
			"REGEX", 		// 512  1000000000
			"DOT", 			// 1024 10000000000
			"ASSIGNMENT", 	// 2048 100000000000
			"END_STATEMENT" // 4096 1000000000000
			];
		this.STATES = { "IGNORE": 0 };

		for(let i = 0; i < this.STATE_NAMES.length; i++)
		{
			let name = this.STATE_NAMES[i];
			let val = 1 << i;
			this.STATES[name] = val;
		}

		this.PUNCTUATION =
		{
			",": self.STATES.IGNORE,
			"#": self.STATES.IGNORE,
			"!": self.STATES.IGNORE,
			"$": self.STATES.IGNORE,
			"^": self.STATES.IGNORE,
			"&": self.STATES.IGNORE,
			"*": self.STATES.IGNORE,
			"+": self.STATES.IGNORE,
			"-": self.STATES.IGNORE,
			"~": self.STATES.IGNORE,
			"<": self.STATES.IGNORE,
			">": self.STATES.IGNORE,
			"%": self.STATES.IGNORE,
			"\\": self.STATES.IGNORE,
			".": self.STATES.DOT,
			"=": self.STATES.ASSIGNMENT,
			":": self.STATES.ASSIGNMENT,
			";": self.STATES.END_STATEMENT,
			"(": self.STATES.OPEN_BRACKET,
			")": self.STATES.CLOSE_BRACKET,
			"{": self.STATES.OPEN_BRACKET,
			"}": self.STATES.CLOSE_BRACKET,
			"[": self.STATES.OPEN_BRACKET,
			"]": self.STATES.CLOSE_BRACKET,
			"/": self.STATES.SLASH,
			"\"": self.STATES.STRING,
			"\'": self.STATES.STRING,
			"`": self.STATES.STRING
		};
		this.KEYWORDS = 
		{
			"abstract": 0, "boolean": 1, "break": 2, "byte": 3, "case": 4, "catch": 5, "char": 6, "class": 7, "const": 8, "continue": 9, "debugger": 10, "default": 11, "delete": 12, "do": 13, "double": 14, "else": 15, "enum": 16, "export": 17, "extends": 18, "false": 19, "final": 20, "finally": 21, "float": 22, "for": 23, "function": 24, "goto": 25, "if": 26, "implements": 27, "import": 28, "in": 29, "instanceof": 30, "int": 31, "interface": 32, "let": 33, "long": 34, "native": 35, "new": 36, "null": 37, "package": 38, "private": 39, "protected": 40, "public": 41, "return": 42, "short": 43, "static": 44, "super": 45, "switch": 46, "synchronized": 47, "this": 48, "throw": 49, "throws": 50, "transient": 51, "true": 52, "try": 53, "typeof": 54, "var": 55, "void": 56, "volatile": 57, "while": 58, "with": 59 
		};

		this._RegExes = 
		[
			{
				name: "whitespace",
				pattern: /(\s+)?/g,
				handler: function(match)
				{
					// console.log("WHITESPACE");
					let type = "WHITESPACE";
					let ws = match[0];

					return self._createToken( type, ws, match.index + match[0].length);
				}
			},
			{
				name: "number",
				pattern: /([+-]?(?:0[xX](?:[0-9a-fA-F]+)|[0-9]+(?:\.[0-9]*)?(?:[eE][+-]?[0-9]+)?|\.[0-9]+(?:[eE][+-]?[0-9]+)?))?/g,
				handler: function(match)
				{
					// console.log("NUMBER", match[0]);
					return self._createToken("NUMBER", match[0], match.index + match[0].length);
				}
			},
			{
				name: "word",
				pattern: /([\w\$]+)?/g,
				handler: function(match)
				{
					let type = "WORD";
					let word = match[0];

					// if(self._State === self.STATES.DOT)
					if(self.isState(self.STATES.DOT))
					{
						type = "MEMBER";
						// console.log("MEMBER!", word);
						// self.clearState(self.STATES.DOT);
					}

					if(self.KEYWORDS.hasOwnProperty(word))
					{
						type = "KEYWORD";
					}
					// console.log("TYPE:", type, "\'" + word + "\'");

					return self._createToken(type, word, match.index + word.length);
				}
			},
			{
				name: "punctuation",
				pattern: /([\.=;:\(\)\/\"\'\\\[\]\|,#!$%\^&\*{}\+\-`~><])?/g,
				handler: function(match)
				{
					let type = "PUNCTUATION";
					let m = match[0];

					// console.log("PUNCTUATION:", m);

					self.addState(self.PUNCTUATION[m]);
					
					switch(self.PUNCTUATION[m])
					{
						case self.STATES.END_STATEMENT:
							type = "END_STATEMENT";
							self.clearState(self.STATES.END_STATEMENT);
							self.clearState(self.STATES.ASSIGNMENT);
							self.clearState(self.STATES.DOT);
							return self._createToken(type, m, match.index + m.length);

						case self.STATES.OPEN_BRACKET:
							type = "OPEN_BRACKET";
							self._Brackets.push(m);
							return self._createToken(type, m, match.index + m.length);

						case self.STATES.CLOSE_BRACKET:
							type = "CLOSE_BRACKET";

							self._Brackets.pop();
							self.clearState(self.STATES.CLOSE_BRACKET);
							if(!self._Brackets.length)
							{
								self.clearState(self.STATES.OPEN_BRACKET);
							}
							return self._createToken(type, m, match.index + m.length);

						case self.STATES.SLASH:
							return self._processSlash();

						case self.STATES.STRING:
						{
							let token = self._processString(m);
							self.clearState(self.STATES.STRING);
							return token;
						}
					}
				}
			}/*,
			{
	
			}
			*/
			// TODO Other invalid characters? "[^\s\w\$><=!&\|\+\-\*/%\^~\?:;,\.\(\[\{\)\]\}"']+"
		];
		let s = Date.now();
		this.Tokenize();
		console.log("TOKENIZED IN:", Date.now() - s);
	}

	isState(stateCheck)
	{
		return (this._State & stateCheck) != 0;
	}

	addState(newState)
	{
		/*
		// DEBUG -- TODO REMOVE
		let a = newState, c = 0;
		while(a > 1)
		{
			c++;
			a /= 2;
		}
		// console.log("CURRENT STATE:", this._State.toString(2), this._State, newState.toString(2), newState, this.STATE_NAMES[c]);
		// END DEBUG
		*/
		this._State |= newState;
	}

	clearState(oldState)
	{
		this._State &= (~oldState);
		// console.log("CLEARED STATE:", this._State.toString(2), this._State);
	}

	_processString(openChar)
	{
		let token;
		let type = "STRING", text = "", col = this._ColPos + 1;
		let escapedEOL = true, multistring = openChar === "`";
		let end = new RegExp(openChar, "g");
		end.lastIndex = this._ColPos + 1;
		let match;

		for(; escapedEOL && this._LineNum < this._TextLines.length; this._LineNum++)
		{
			let line = this._TextLines[this._LineNum];
			while((match = end.exec(line)) !== null)
			{
				// console.log("FOUND POTENTIAL STRING END!", match);
				let esc = line[match.index - 1];
				text += line.substring(col, match.index);

				if(esc === "\\")
				{
					// console.log("FALSE ALARM, END WAS ESCAPED!");
					this._ColPos = match.index + 1;
					col = match.index;
				}
				else
				{
					// console.log("FOUND IT!");
					return this._createToken(type, text, end.lastIndex);
				}
			}
			
			escapedEOL = (line[line.length - 1] === "\\") || multistring;
			if(!escapedEOL)
			{
				text += line.substring(col);
				return this._createToken("STRING_UNCLOSED", text, line.length);
			}

			text += line.substring(col) + "\n";
			col = end.lastIndex = 0;
		}

		this.clearState(this.STATES.STRING);

		return token;
	}

	_processSlash()
	{
		// Search for either /, * or =
		// If / => single line comment
		// If * => multi line comment
		// If = => division
		// If there's characters after, that this might be a regex?
		let adjacent = this._TextLines[this._LineNum][this._ColPos + 1];
		let line = this._TextLines[this._LineNum];
		let token;

		switch(adjacent)
		{
			case "*":
			{	// Go look for the matching */
				let t = "/*";
				let endCol = this._ColPos + 2;
				this.colorChar(this._ColPos);
				this.colorChar(this._ColPos + 1);

				let end = /(\*\/)/g;
				this.colorIndex = 4;

				for(; this._LineNum < this._TextLines.length; this._LineNum++)
				{
					end.lastIndex = endCol;
					line = this._TextLines[this._LineNum];
					let match = end.exec(line);
					if(match && match[1] !== undefined)
					{
						let p = match.index + match[0].length;
						for(; endCol < p; endCol++)
						{
							this.colorChar(endCol);
							t += line[endCol];
						}
						// t += " " + line.substring(endCol, match.index + match[0].length).trim();
						// endCol = match.index + match[0].length;
						break;
					}
					else
					{
						t += " " + line.substring(endCol).trim();
						let p = line.length;
						// TODO could optmize with while()
						for(; endCol < p; endCol++)
						{
							this.colorChar(endCol);
							t += line[endCol];
						}
						// TODO Color everything in between
						endCol = 0;
					}
				}

				token = this._createToken("MULTICOMMENT", t, endCol);
				this._ColorIdx = 0;
				break;
			}

			case "/":
			{
				// console.log("COMMENT TOKEN:", line.substring(this._ColPos));
				this.colorIndex = 4;
				let p = line.length;
				let t = "";
				for(let i = this._ColPos; i < p; i++)
				{
					this.colorChar(i);
					t += line[i];
				}
				token = this._createToken("COMMENT", t, line.length);
				
				break;
			}
			default:
			{
				let type, text, endPos = this._ColPos + 1;

				let end = /(\/)/g;
				end.lastIndex = this._ColPos + 1;
				let match = end.exec(line);

				if(match && match[1] !== undefined)
				{
					type = 	"REGEX";
					// TODO color everything for regex
					endPos = match.index + 1;
					text = line.substring(this._ColPos, endPos);
					// console.log("FOUND REGEX END!", text);
					break;
				}
				else
				{
					type = "DIVISION";
					text = "/";
				}

				token = this._createToken(type, text, endPos);
				break;
			}
		}

		this.clearState(this.STATES.SLASH);

		return token;
	}

	_createToken(type, text, endCol)
	{
		this._ColPos = endCol;
		
/*		for(let name in this.STATES)
		{
			if(this.isState(this.STATES[name]))
				console.log("STATE:", name);
		}
*/
		return {
			"type": type,
			"text": text,
			"state": this._State.toString(2)
		};
	}

	_matchRegex(pattern)
	{
		let line = this._TextLines[this._LineNum];
		pattern.lastIndex = this._ColPos;
		let match = pattern.exec(line);

		return match;
	}

	Tokenize()
	{
		this._Tokens.length = 0;
		this._TextLines = this.codePointsToText(this._Lines);
		for(this._LineNum = 0; this._LineNum < this._TextLines.length; this._LineNum++)
		{
			// console.log("LINE: ", this._LineNum, this._TextLines[this._LineNum]);
			this._ColPos = 0; // Reset cursor on the current line

			for(let i = 0; i < this._RegExes.length; i++)
			{
				let line = this._TextLines[this._LineNum];
				if(this._ColPos >= line.length) break;

				let re = this._RegExes[i];
				re.pattern.lastIndex = this._ColPos;
				let match = re.pattern.exec(line);
				// console.log("MATCH?", re.pattern, match);
				if(match[1] !== undefined)
				{
					// this._ColPos = match.index + match[0].length;
					let token = re.handler(match);
					// If we found a match and generated a token, then we have to restart our search; the handler will have moved the cursor to the appropriate position on the line
					if(token != null)
					{
						i = -1;
						// console.log("TOKEN:", token);
						this._Tokens.push(token);
						// console.log("PREV:", this._PrevToken);
						this._PrevToken = token;
					}	
				} 
					
			}
		}
		// console.log("TOKENS:", this._Tokens);
	}
	
	Paint(lines)
	{
	}

	PaintLine(lines, lineNo)
	{
	}

	/*
		Text representation of the Code Points in `lines`
		- 'lines' Array of Uint32Arrays
	*/
	codePointsToText(lines)
	{
		let textLines = [];

		for(let i = 0; i < lines.length; i++)
		{
			let line = lines[i];
			let t = "";
			for(let j = 0; j < line.length; j++)
			{
				// Clear old color index
				let codePoint = (line[j] << 11) >>> 11;
				let char = String.fromCodePoint(codePoint);
				t += char;
			}

			textLines.push(t);
		}

		return textLines;
	}

	set colorIndex(idx)
	{
		idx = idx || 0;
		this._ColorIdx = (idx << 21);
	}

	/*
		Colors a single character `c` (represented by a Unicode Code Point)  with the color at given index in the Palette
		- 'column' int 
	*/
	colorChar(column)
	{
		let c = this._Lines[this._LineNum][column];
		c = (c << 11) >>> 11; // Clear old color mask
		this._Lines[this._LineNum][column] = c ^ this._ColorIdx;
	}
	// Is it faster to calculate the value c from the utf8 elements or rebuild it from the arrays?
}