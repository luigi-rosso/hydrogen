function Highlighter()
{
	let _CurrentLanguage;

	let _RegExes = 
	[
		{
			name: "keywords",
			pattern: /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g,
			color: 4 // Intese Red.
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
			name: "multilineComment",
			pattern: /\/\*[\s\S]*\*\//g,
			color: 6
		},
		{
			name: "regex",
			pattern: /\/(.+\/)([gimuy])?/g,
			color: 3,
			paint: function(match, line)
			{
				/* This match is made of two groups
					1) regex
					2) flag (optional)
				*/
				let i = match.index;
				let endCol = match.index + match[1].length;
				while(i <= endCol)
				{
					let c = line[i];
					line[i] = colorChar(c, 3); // First group: Electric Blue.
					i++;
				}

				if(match[2])
				{
					let c = line[i]; // i now points to the single char after group 1.
					line[i] = colorChar(c, 7); // Second group: Purple.
				}
			}
		},
		{
			// Paint function name and args
			name: "functionDefinition",
			pattern: /function(\s*(\s\w+)?)\(((?:\s*\w*[,]?)*)\)/g,
			paint: function(match, line)
			{
				/* Groups:
					1) padding before open parenthesis (incl. function name)
					2) function name
					3) function args (optional) 
				*/
				let i = match.index + "function".length;
				if(match[1])
				{
					let endCol = i + match[1].length;
					while(i < endCol)
					{
						let c = line[i];
						line[i] = colorChar(c, 5);
						i++;
					}
				}

				if(match[3])
				{
					endCol = i + match[3].length;
					i++; // move over the parenthesis
					while(i <= endCol)
					{
						let c = (line[i] << 11) >>> 11;
						if(c === 44) // COMMA 
						{
							i++;
							continue; 
						}
						line[i] = colorChar(c, 2);
						i++;
					}
				}
			}
		}
		
		/* TODO:
			- Functions
				- Function arguments
			- Comments
			- RegEx	
		*/
	];

	function _Paint(lines)
	{
		if(!lines)
		{
			console.log("Nothing to Process");
			return;
		}

		let text = codePointsToText(lines);

		for(let re of _RegExes)
		{		
			for(let i = 0; i < text.length; i++)
			{
				let line = text[i];

				let match = re.pattern.exec(line);
				while(match)
				{
					console.log("MATCH:", re.name, match, re.pattern.lastIndex);
					if(re.paint)
					{
						re.paint(match, lines[i]);
					}
					else 
					for(let j = match.index; j < re.pattern.lastIndex; j++)
					{
						let c = lines[i][j];
						lines[i][j] = colorChar(c, re.color);
					}

					match = re.pattern.exec(line);
				}
			}
		}
		
		return 0;
	}

	/*
		Text representation of the Code Points in `lines`
		- 'lines' Array of Uint32Arrays
	*/
	function codePointsToText(lines)
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
	function colorChar(c, colorIndex)
	{
		colorIndex = colorIndex || 0; // Make sure color is a value
		c = (c << 11) >>> 11; // Clear old color mask
		let colorIdx = colorIndex << 21; 
		c = c ^ colorIdx;

		return c;
	}

	this.Paint = _Paint;
}