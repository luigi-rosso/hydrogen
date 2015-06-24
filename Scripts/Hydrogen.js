function Hydrogen(_Canvas)
{
	var _CachedFont = new CachedFont("Fonts/Terminus.ttf16.cache");

	var _Graphics = new Graphics(_Canvas);
	var _UpdateTime = Date.now();
	var _Font;
	var _LineBreak = '\n';

	var _Lines = [];
	var _MaxLineDigits = 0;

	if(!_Graphics.init())
	{
		// TODO: Handle error.
		return;
	}
	_Font = new Font("Terminus16");

	function _OnResize()
	{
		_SizeToFit();	
	};

	function _OnDragOver(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = "copy";
	}

	function _OnDragDrop(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();

        var files = evt.dataTransfer.files;
        
        for(var i = 0; i < Math.min(1,files.length); i++)
        {
            var file = files[i];
            var filename = file.name.toLowerCase();
            
            var reader = new FileReader();
            reader.onload = (function(theFile) 
            {
                return function(e) 
                {
                	_SetContents(e.target.result);
                };
            })(file);

            // Read in the image file as a data URL.
            reader.readAsText(file);
            break;
        }
	}

	function _OnPaste()
	{

	}

	function _SetContents(text)
	{
		var start = Date.now();
		_Lines = [];

		var lastFoundIndex = 0;
		while(lastFoundIndex != -1)
		{
			var index = Array.prototype.indexOf.call(text, _LineBreak, lastFoundIndex)
			if(index != -1)
			{
				_Lines.push({
					"label":(_Lines.length+1).toString(),
					"text":text.substring(lastFoundIndex, index)
				});
				//console.log(text.substring(lastFoundIndex, index+1));
				lastFoundIndex = index+1;
			}
			else
			{
				lastFoundIndex = index;
			}
		}

		_MaxLineDigits = _Lines.length.toString().length;

		var end = Date.now();

		var elapsed = end-start;
		console.log("TO PARSE:", elapsed);
	}

	window.addEventListener('resize', _OnResize, false);
    document.body.addEventListener('dragover', _OnDragOver, false);
    document.body.addEventListener('drop', _OnDragDrop, false);
    document.body.addEventListener('paste', _OnPaste, false);

	function _SizeToFit()
	{
		_Canvas.width = window.innerWidth;
		_Canvas.height = window.innerHeight;
		_Graphics.setViewport(0.0, 0.0, _Canvas.width, _Canvas.height);
	}

	_SizeToFit();

	function _Update()
	{
		var now = Date.now();
        var elapsed = now - _UpdateTime;
		var elapsedS = elapsed/1000.0;
		_UpdateTime = now;

		_Graphics.clear();

		if(_Graphics.setCachedFont(_CachedFont))
		{	
			var glyphMap = _CachedFont.map;
			var lineHeight = _CachedFont.lineHeight;
			var maxDescender = _CachedFont.maxDescender;
			var baseLine = lineHeight + maxDescender;
			//console.log(lineHeight, maxDescender);
			var x = 20;
			var y = 0;
			for(var i = 0; i < _Lines.length; i++)
			{
				var line = _Lines[i];
				_Graphics.drawCachedText(x, y+baseLine, line.text);
				y += lineHeight;
				if(y > _Canvas.height)
				{
					break;
				}

			}
		}
		/*if(_Graphics.setFont(_Font))
		{
			var glyphMap = _Font.data.map;
			var lineHeight = _Font.data.lineHeight;
			var maxDescender = _Font.data.maxDescender;
			var baseLine = lineHeight - maxDescender;
			//console.log(lineHeight, baseLine);
			var x = 20;
			var y = 0;
			for(var i = 0; i < _Lines.length; i++)
			{
				var line = _Lines[i];
				_Graphics.drawText(x, y+baseLine, line.text);
				y += lineHeight;
			}
		}*/
		
			//_Graphics.drawText(20.0, 20.0, "Hello world.");
		//}
		requestAnimFrame(_Update);
	}
	_Update();
}