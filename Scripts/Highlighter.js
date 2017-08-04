export default class Highlighter
{
	constructor()
	{
		this._CurrentLanguage;
		this._Lines;
		this._TextLines;
		let self = this;

		this._RegExes = 
		[
			{
				name: "keywords",
				pattern: /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g,
				color: 7 // Purple.
			},
			{
				name: "symbols",
				pattern: /[\[\]\|\.,\/#!$%\^&\*;:{}=\+\-`~()><]/g,
				color: 5 // Light Blue.
			},
			{
				name: "number",
				pattern: /\b-?(0[xX][\dA-Fa-f]+|0[bB][01]+|0[oO][0-7]+|\d*\.?\d+([Ee][+-]?\d+)?|NaN|Infinity)\b/g,
				color: 2 // Light Orange.
			},	
			{
				name: "quotedString",
				pattern: /("(.*?)")|('(.*?)')/g,
				color: 1 // Light Green.
			},
			{
				name: "simpleComment",
				pattern: /\/\/.*\n?/g,
				color: 6 // Brown.
			},
			{
				name: "regex",
				pattern: /\/(?:(?!\*))(.+\/)([gimuy])?/g,
				paint: function(match, lineNo)
				{
					/* This match is made of two groups
						1) regex
						2) flag (optional)
					*/
					let i = match.index;
					let line = self._Lines[lineNo];
					let endCol = match.index + match[1].length;
					while(i <= endCol)
					{
						let c = line[i];
						line[i] = self.colorChar(c, 3); // First group: Electric Blue.
						i++;
					}

					if(match[2])
					{
						let c = line[i]; // i now points to the single char after group 1.
						line[i] = self.colorChar(c, 7); // Second group: Purple.
					}
				}
			},
			{
				name: "multilineComment",
				pattern: /\/\*/g,
				paint: function(match, lineNo)
				{
					let reClose = /\*\//g;
					
					let i = lineNo;
					let j = match.index;

					let intLine = self._Lines[i];
					let textLine = self._TextLines[i];
					
					let closeMatch;
					// If the closing pattern hasn't been found, paint the whole line brown and move onto the next
					while((closeMatch = reClose.exec(textLine)) === null)
					{
						while(j < intLine.length)
						{
							let c = intLine[j];
							intLine[j] = self.colorChar(c, 6);
							j++;
						}

						j = 0;
						i++; 
						textLine = self._TextLines[i];
						intLine = self._Lines[i];
					}

					// The pattern has closed, finish coloring
					let endCol = closeMatch.index + 2;
					while(j < endCol)
					{
						let c = intLine[j];
						intLine[j] = self.colorChar(c, 6);
						j++;
					}
				}
			},
			{
				// Paint function name and args
				name: "functionDefinition",
				pattern: /function(\s*(\s\w+)?)\(((?:\s*\w*[,]?)*)\)/g,
				paint: function(match, lineNo)
				{
					/* Groups:
						1) padding before open parenthesis (incl. function name)
						2) function name
						3) function args (optional) 
					*/
					let i = match.index + "function".length;
					let line = self._Lines[lineNo];
					if(match[1])
					{
						let endCol = i + match[1].length;
						while(i < endCol)
						{
							let c = line[i];
							line[i] = self.colorChar(c, 5);
							i++;
						}
					}

					if(match[3])
					{
						let endCol = i + match[3].length;
						i++; // move over the parenthesis
						while(i <= endCol)
						{
							let c = (line[i] << 11) >>> 11;
							if(c === 44) // COMMA 
							{
								i++;
								continue; 
							}
							line[i] = self.colorChar(c, 2);
							i++;
						}
					}
				}
			},
			{
				name: "functionVariable",
				pattern: /(?:\s|^)(\S+)(?=\s+?=\s+?function\()/g,
				paint: function(match, lineNo)
				{
					if(match[1])
					{
						let startCol = match.index + match[0].length - match[1].length;
						let endCol = startCol + match[1].length;
						let line = self._Lines[lineNo];

						for(let i = startCol; i < endCol; i++)
						{
							let c = line[i];
							line[i] = self.colorChar(c, 5);
						}
					}
				}
			},
			{
				name: "functionObjectProperty",
				pattern: /(\w+)(?=:\s{0,}function)/g,
				paint: function(match, lineNo)
				{
					if(match[1])
					{	
						let line = self._Lines[lineNo];
						let endCol = match.index + match[1].length;
						for(let i = match.index; i < endCol; i++)
						{
							let c = line[i];
							line[i] = self.colorChar(c, 3);
						}
					}
				}
			}
		];
	}
	
	Paint(lines)
	{
		if(!lines)
		{
			console.log("Nothing to Process");
			return;
		}

		let text = this.codePointsToText(lines);
		
		this._Lines = lines;
		this._TextLines = text;

		for(let re of this._RegExes)
		{		
			for(let i = 0; i < text.length; i++)
			{
				let line = text[i];

				let match = re.pattern.exec(line);
				while(match)
				{
					// console.log("MATCH:", re.name, match, re.pattern.lastIndex);
					if(re.paint)
					{
						re.paint(match, i);
					}
					else for(let j = match.index; j < re.pattern.lastIndex; j++)
					{
						let c = lines[i][j];
						lines[i][j] = this.colorChar(c, re.color);
					}

					match = re.pattern.exec(line);
				}
			}
		}
		
		return 0;
	}

	PaintLine(lines, lineNo)
	{
		let start = Date.now();
		if(!lines || !lines.length || lineNo === undefined)
		{
			console.log("CAN'T PAINT LINE.");
			return;
		}
		
		this._Lines = lines;
		
		let line = lines[lineNo];
		let textLine = this.codePointsToText([line])[0];

		for(let re of this._RegExes)
		{	
			let match = re.pattern.exec(textLine);
			while(match)
			{
				// console.log("LINE MATCH:", re.name, match);
				if(re.paint)
				{
					re.paint(match, lineNo);
				}
				else for(let j = match.index; j < re.pattern.lastIndex; j++)
				{
					let c = line[j];
					line[j] = this.colorChar(c, re.color);
				}

				match = re.pattern.exec(textLine);
			}
		}
		console.log("PAINTED SINGLE LINE IN:", Date.now() - start);
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

	/*
		Colors a single character `c` (represented by a Unicode Code Point)  with the color at given index in the Palette
		- 'c' Uint32 
		- 'colorIndex' int
	*/
	colorChar(c, colorIndex)
	{
		colorIndex = colorIndex || 0; // Make sure color is a value
		c = (c << 11) >>> 11; // Clear old color mask
		let colorIdx = colorIndex << 21; 
		c = c ^ colorIdx;

		return c;
	}
}