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

		_Lines = text.split(_LineBreak);
		for(var i = 0; i < _Lines.length; i++)
		{
			var line = _Lines[i];
			if(line.length > _MaxLineLength)
			{
				_MaxLineLength = line.length;
			}
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
        return _Lines.join(_LineBreak);
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