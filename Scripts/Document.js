import bind from "bind";
import Parser from "./Parser.js";
import Highlighter from "./Highlighter.js";

export default class Document
{
	constructor(hydrogen)
	{
		this._Hydrogen = hydrogen;
		this._LineBreak = "\n";
		this._Tab = "\t";
		this._Lines = [];
		this._SearchCache = new Map();
		this._MaxLineLength = 0;
		this._MaxLineDisplayLength = 0;
		this._NumTabSpaces = 4;
		this._MaxLineTabs = 0;
		this._Parser = new Parser();
		this._Highlighter = new Highlighter();
		this._Panes = [];

		// A Set for more performant lookups
		this._Keywords = new Set(
		[
			"break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", 
			"do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in", 
			"instanceof", "new", "return", "super", "switch", "this", "throw", "try", "typeof", 
			"var", "void", "while", "with", "yield",
			"implements", "interface", "let", "package", "private", "protected", "public", "static"
		]);

		this._CodePointsPunctuation = new Set([9, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 58, 59, 60, 61, 62, 63, 91, 92, 93, 94, 96, 123, 124, 125, 126]);

		this._CodePointTab = 9;
		this._CodePointSpace = 32;
	}

	addToPane(pane)
	{
		this._Panes.push(pane);
	}

	removeFromPane(pane)
	{
		let idx = this._Panes.indexOf(pane);
		if(idx !== -1)
		{
			this._Panes.splice(idx, 1);
		}
	}

	@bind
	fromFile(file)
	{
		let reader = new FileReader();
		let self = this;
		reader.onload = function(e) 
		{
			self.setContents(e.target.result);
		};

		reader.readAsText(file);
	}

	scheduleUpdateContentSize()
	{
		clearTimeout(this._UpdateContentSizeTimeout);
		setTimeout(this.updateContentSize, 1500);
	}

	@bind
	updateContentSize()
	{
		let maxLineLength = 0;
		let maxLineDisplayLength = 0;
		let numTabSpaces = this._NumTabSpaces;

		let lines = this._Lines;
		for(let i = 0; i < lines.length; i++)
		{
			let line = lines[i];
			if(line.length > maxLineLength)
			{
				maxLineLength = line.length;
			}    

			let lineDisplayLength = 0;
			for(let j = 0; j < line.length; j++)
			{
				let val = line[j];
				if(val === 9)
				{
					lineDisplayLength += numTabSpaces;
				}
				else
				{
					lineDisplayLength++;
				}
				line[j] = val;
			}
			if(lineDisplayLength > maxLineDisplayLength)
			{
				maxLineDisplayLength = lineDisplayLength;
			}

		}
		this._MaxLineDisplayLength = maxLineDisplayLength;
		this._MaxLineLength = maxLineLength;
	}

	clear()
	{
		this._Lines.length = 0;
		for(let pane of this._Panes)
		{
			pane.onDocumentContentsChanged();
		}
	}

	@bind
	setContents(text, silent, append, forceColor)
	{
		//text = "			hi this is a 			test of how this works or not does it look right?";
		this._TextCache = null;
		let start = Date.now();

		let stringLines = text.split(this._LineBreak);
		let maxLineLength = 0;
		let maxLineDisplayLength = 0;
		let numTabSpaces = this._NumTabSpaces;

		// We build an array of Uint32 elements. Each element represents a single line of text in our file. Each character code associated with the UTF16 representation of the character.
		//this._Lines = new Array(stringLines.length);
		let lineOffset = 0;
		if(append)
		{
			lineOffset = this._Lines.length;
			this._Lines.length += stringLines.length;
		}
		else
		{
			this._Lines.length = stringLines.length;
		}
		for(let i = 0; i < stringLines.length; i++)
		{
			let stringLine = stringLines[i];
			if(stringLine.length > maxLineLength)
			{
				maxLineLength = stringLine.length;
			}    

			let line = new Uint32Array(stringLine.length);

			let lineDisplayLength = 0;
			for(let j = 0; j < stringLine.length; j++)
			{
				let val = stringLine.codePointAt(j);
				// let colorIdx = Math.floor(Math.random() * 6.0);
				// colorIdx = colorIdx << 21;
				// val = val ^ colorIdx;
				if(val === 9)
				{
					lineDisplayLength += numTabSpaces;
				}
				else
				{
					lineDisplayLength++;
				}
				line[j] = val;
			}

			// Set default color for whole line if requested.
			if(forceColor !== undefined)
			{
				for(let j = 0; j < line.length; j++)
				{
					line[j] = this._Highlighter.colorChar(line[j], forceColor);
				}
			}
			if(lineDisplayLength > maxLineDisplayLength)
			{
				maxLineDisplayLength = lineDisplayLength;
			}

			this._Lines[lineOffset+i] = line;

		}
		this._MaxLineDisplayLength = maxLineDisplayLength;
		this._MaxLineLength = maxLineLength;
		if(forceColor === undefined)
		{
			this.repaintLines();
		}

		let end = Date.now();

		let elapsed = end-start;
		console.log("Document.parse took:", elapsed);
		if(!silent)
		{
			for(let pane of this._Panes)
			{
				pane.onDocumentContentsChanged();
			}
		} 
	}

	repaintLines(lineNo)
	{
		let start = Date.now();
		// this._Parser.process(this._Lines);
		if(lineNo)
			this._Highlighter.PaintLine(this._Lines, lineNo);
		else
			this._Highlighter.Paint(this._Lines);
		//console.log("PAINTED IN:", Date.now() - start);
	}
	
	get lines()
	{
		return this._Lines;
	}

	get numTabSpaces()
	{
		return this._NumTabSpaces;
	}

	get lineBreak()
	{
		return this._LineBreak;
	}

	get text()
	{
		if(this._TextCache)
		{
			return this._TextCache;
		}
		let result = "";
		
		for(let i = 0; i < this._Lines.length; i++)
		{
			let line = this._Lines[i];

			// Add the line breaks before each line in order to avoid always forcing a final line break.
			if(i !== 0)
			{
				result += this._LineBreak;
			}

			for(let j = 0; j < line.length; j++)
			{
				// console.log("CODE POINT:", line[j]);
				let codePoint = (line[j] << 11) >>> 11;
				let char = String.fromCodePoint(codePoint);
				result += char;
			}

		}

		this._TextCache = result;
		return result;
	}

	get tab()
	{
		return this._Tab;
	}

	get tabCode()
	{
		return this._CodePointTab;
	}
	
	get keywords()
	{
		return this._Keywords;
	}
	
	set text(t)
	{
		this.setContents(t);
	}

	get maxLineDigits()
	{
		return this._Lines.length.toString().length;
	}

	get maxLineLength()
	{
		return this._MaxLineLength;
	}

	get maxLineDisplayLength()
	{
		return this._MaxLineDisplayLength;
	}

	markDirty()
	{
		this.scheduleUpdateContentSize();
		this._TextCache = null;
		this._SearchCache.clear();
	}
	
	find(term, caseSensitive)
	{
		let key = (!caseSensitive ? "i" + term : "_" + term);
		let cachedResults = this._SearchCache.get(key);
		if(cachedResults)
		{
			return cachedResults;
		}	
		let results = [];
		let text = this.text;
		let regex = new RegExp(term, caseSensitive ? "g" : "gi");
		let match;
		while((match = regex.exec(text)))
		{
			//console.log("Found", match[0], "at", match.index, regex.lastIndex, match);

			// Count line breaks before each.
			let index = -1;
			let lastIndex = 0;
			let line = -1;
			do
			{
				lastIndex = index;
				index = text.indexOf(this._LineBreak, index+1);
				//console.log("IDX", index, match.index);
				line++;
			}while(index < match.index && index !== -1);

			// Count line breaks after.
			let result = {start:{line:line, column:match.index-lastIndex-1}};
			
			index = lastIndex;
			line--;
			do
			{
				lastIndex = index;
				index = text.indexOf(this._LineBreak, index+1);
				//console.log("IDX", index, match.index);
				line++;
			}while(index < regex.lastIndex && index !== -1);
			result.end = {line:line, column:regex.lastIndex-lastIndex-1};
			// 15 91
			//console.log(line, lastIndex, " ", match.index-lastIndex);
			results.push(result);
		}

		this._SearchCache.set(key, results);

		return results;
	}
}