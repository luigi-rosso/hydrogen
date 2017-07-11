function Document(_Hydrogen)
{
	var _This = this;
	var _LineBreak = '\n';
	var _Tab = '\t';
	var _Lines = [];
	var _MaxLineLength = 0;
	var _NumTabSpaces = 4;

    // A Set for more performant lookups
    var _Keywords = new Set(
    [
        "break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", 
        "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in", 
        "instanceof", "new", "return", "super", "switch", "this", "throw", "try", "typeof", 
        "var", "void", "while", "with", "yield",
        "implements", "interface", "let", "package", "private", "protected", "public", "static"
    ]);

    var _CodePointsPunctuation = new Set([9, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 58, 59, 60, 61, 62, 63, 91, 92, 93, 94, 96, 123, 124, 125, 126]);

	function _FromFile(file)
	{
		var filename = file.name.toLowerCase();
        var reader = new FileReader();
        reader.onload = function(e) 
        {
        	_SetContents(e.target.result);
        };

        reader.readAsText(file);
	}

	function _SetContents(text, silent)
	{
		var start = Date.now();
		_Lines = [];
		_MaxLineLength = 0;
        let stringLines = text.split(_LineBreak);

        // We build an array of Uint32 elements. Each element represents a single line of text in our file. Each character code associated with the UTF16 representation of the character.
		_Lines = new Array(stringLines.length);
		for(var i = 0; i < stringLines.length; i++)
		{
			var stringLine = stringLines[i];
			if(stringLine.length > _MaxLineLength)
			{
				_MaxLineLength = stringLine.length;
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

            _Lines[i] = line;

		}

        _RepaintLines();

		var end = Date.now();

		var elapsed = end-start;
		console.log("Document.parse took:", elapsed);
		if(!silent && _This.onContentsChange)
		{
			_This.onContentsChange();
		}
	}

    function _RepaintLines()
    {

        for(let i = 0; i < _Lines.length; i++)
        {
            let line = _Lines[i];
            let wordsIdx = new Array();
            let isNewWord = false;
            for(let j = 0; j < line.length; j++)
            {
                let c = (line[j] << 11) >>> 11;

                switch(true)
                {
                    case _CodePointsPunctuation.has(c):
                        isNewWord = false;
                        break;
                    default:
                        if(!isNewWord)
                        {
                            isNewWord = true;
                            wordsIdx.push(j);
                        }
                        break;
                }
            }

            let lineWords = [];

            for(let wi = 0; wi < wordsIdx.length; wi++)
            {
                let col = wordsIdx[wi];
                let word = String.fromCodePoint(line[col]);
                let wordEndIdx = col + 1;
                while(wordEndIdx < line.length && !_CodePointsPunctuation.has(line[wordEndIdx]) )
                {
                    word += String.fromCodePoint(line[wordEndIdx++]);
                }

                if(_Keywords.has(word)){
                    // col is start offset, and wordEndIdx is end offset
                    for(let w = col; w < wordEndIdx; w++)
                    {
                        let c = line[w];
                        let colorIdx = 1 << 21;
                        c = c ^ colorIdx;
                        line[w] = c;
                    }
                }
                
                lineWords.push(word);
                word.length = 0;
            }

            let doc = this;

        }
    }

    var _CodePointTab = 9;
    var _CodePointSpace = 32;

	this.fromFile = _FromFile;
	this.setContents = _SetContents;
	
    this.__defineGetter__("lines", function()
    {
        return _Lines;
    });

    this.__defineGetter__("numTabSpaces", function()
    {
    	return _NumTabSpaces;
    });

    this.__defineGetter__("lineBreak", function()
    {
        return _LineBreak;
    });

    this.__defineGetter__("text", function()
    {
        let result = "";
        
        for(let i = 0; i < _Lines.length; i++)
        {
            let line = _Lines[i];
            
            // let resultLine = String.fromCodePoint.apply(this, line.subarray(0));

            for(let j = 0; j < line.length; j++)
            {
                // console.log("CODE POINT:", line[j]);
                let codePoint = (line[j] << 11) >>> 11;
                let char = String.fromCodePoint(codePoint);
                result += char;
            }

            result += _LineBreak;
        }

        return result;
    });

    this.__defineGetter__("tab", function()
    {
        return _Tab;
    });

    this.__defineGetter__("tabCode", function()
    {
        return _CodePointTab;
    });
    
    this.__defineGetter__("keywords", function()
    {
        return _Keywords;
    });
    
    this.__defineSetter__("text", function(t)
    {
    	_SetContents(t);
    });

    this.__defineGetter__("maxLineDigits", function()
    {
        return _Lines.length.toString().length;
    });

    this.__defineGetter__("maxLineLength", function()
    {
        return _MaxLineLength;
    });
}