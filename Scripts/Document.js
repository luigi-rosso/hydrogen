function Document(_Hydrogen)
{
	var _LineBreak = '\n';
	var _Lines = [];
	var _MaxLineDigits = 0;
	var _MaxLineLength = 0;

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

	function _SetContents(text)
	{
		var start = Date.now();
		_Lines = [];
		_MaxLineLength = 0;

		var lastFoundIndex = 0;
		while(lastFoundIndex != -1)
		{
			var index = Array.prototype.indexOf.call(text, _LineBreak, lastFoundIndex)
			
			var lineText = text.substring(lastFoundIndex, index == -1 ? undefined : index); 
			_Lines.push({
				"label":(_Lines.length+1).toString(),
				"text":lineText
			});
			if(lineText.length > _MaxLineLength)
			{
				_MaxLineLength = lineText.length;
			}
			lastFoundIndex = index == -1 ? index : index+1;
		}

		_MaxLineDigits = _Lines.length.toString().length;

		var end = Date.now();

		var elapsed = end-start;
		console.log("Document.parse took:", elapsed);
	}


	this.fromFile = _FromFile;
	
    this.__defineGetter__("lines", function()
    {
        return _Lines;
    });

    this.__defineGetter__("maxLineDigits", function()
    {
        return _MaxLineDigits;
    });

    this.__defineGetter__("maxLineLength", function()
    {
        return _MaxLineLength;
    });
}