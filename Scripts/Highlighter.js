function Highlighter()
{
	let _CurrentLanguage;
	let longString = " This a superlong multiline String I'm not sure if this counts towards the understanding of anything";

	let _RegExes = 
	[
		{
			name: "keywords",
			pattern: /\b(as|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|instanceof|interface|let|new|null|of|package|private|protected|public|return|set|static|super|switch|this|throw|true|try|typeof|var|void|while|with|yield)\b/g,
			color: 4 // Intese Red.
		},
		{
			name: "punctuation",
			pattern: /[\[\]\|\.,\/#!$%\^&\*;:{}=\+\-`~()]/g,
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
		// console.log("GOT TEXT:\n", text);


		for(let re of _RegExes)
		{		
			for(let i = 0; i < text.length; i++)
			{
				let line = text[i];

				let match = re.pattern.exec(line);
				let col = 0; // Offset on the line.
				while(match)
				{
					console.log("MATCH:", re.name, match, re.pattern.lastIndex);
					
					for(let j = match.index; j < re.pattern.lastIndex; j++)
					{
						let c = lines[i][j];
						lines[i][j] = colorChar(c, re.color);
					}

					col = re.pattern.lastIndex;
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