function Document(_Hydrogen)
{
	var _This = this;
	var _LineBreak = '\n';
	var _Tab = '\t';
	var _Lines = [];
	var _MaxLineLength = 0;
	var _NumTabSpaces = 4;

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
                line[j] = stringLine.codePointAt(j);
            }

            _Lines[i] = line;

            console.log("STRING:", line);
		}

		var end = Date.now();

		var elapsed = end-start;
		console.log("Document.parse took:", elapsed);
		if(!silent && _This.onContentsChange)
		{
			_This.onContentsChange();
		}
	}


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
                let char = String.fromCodePoint(line[j]);
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