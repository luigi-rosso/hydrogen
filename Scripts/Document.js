import bind from "bind";
// import Parser from "./Parser.js";
import Highlighter from "./Highlighter.js";

export default class Document
{
    constructor(pane, hydrogen)
    {
        this._Pane = pane;
        this._Hydrogen = hydrogen;
        this._Acorn = window.acorn;
        this._LineBreak = '\n';
        this._Tab = '\t';
        this._Lines = [];
        this._MaxLineLength = 0;
        this._NumTabSpaces = 4;
        // this._Parser = new Parser();
        // this._Highlighter = new Highlighter();

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
    
    @bind
	fromFile(file)
	{
		let filename = file.name.toLowerCase();
        let reader = new FileReader();
        let self = this;
        reader.onload = function(e) 
        {
        	self.setContents(e.target.result);
        };

        reader.readAsText(file);
	}

    @bind
	setContents(text, silent)
	{
		let start = Date.now();
		this._Lines = [];
		this._MaxLineLength = 0;
        let stringLines = text.split(this._LineBreak);

        // We build an array of Uint32 elements. Each element represents a single line of text in our file. Each character code associated with the UTF16 representation of the character.
		this._Lines = new Array(stringLines.length);
		for(let i = 0; i < stringLines.length; i++)
		{
			let stringLine = stringLines[i];
			if(stringLine.length > this._MaxLineLength)
			{
				this._MaxLineLength = stringLine.length;
			}    

            let line = new Uint32Array(stringLine.length);

            for(let j = 0; j < stringLine.length; j++)
            {
                let val = stringLine.codePointAt(j);
                // let colorIdx = Math.floor(Math.random() * 6.0);
                // colorIdx = colorIdx << 21;
                // val = val ^ colorIdx;
                line[j] = val;
            }

            this._Lines[i] = line;

		}

        this.repaintLines();

		let end = Date.now();

		let elapsed = end-start;
		console.log("Document.parse took:", elapsed);
		if(!silent && /*this.onContentsChange*/ this._Pane)
		{
			// this.onContentsChange();
            this._Pane.onDocumentContentsChanged();
		}
        
        this.repaintLines();    
    }

    repaintLines()
    {
        let start = Date.now();
        // _Parser.process(_Lines);
        // this._Highlighter.Paint(this._Lines);
        console.log("PAINTED IN:", Date.now() - start);
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
        let result = "";
        
        for(let i = 0; i < this._Lines.length; i++)
        {
            let line = this._Lines[i];
            
            // let resultLine = String.fromCodePoint.apply(this, line.subarray(0));

            for(let j = 0; j < line.length; j++)
            {
                // console.log("CODE POINT:", line[j]);
                let codePoint = (line[j] << 11) >>> 11;
                let char = String.fromCodePoint(codePoint);
                result += char;
            }

            result += this._LineBreak;
        }

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
}