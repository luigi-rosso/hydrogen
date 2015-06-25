function Hydrogen(_Canvas)
{
	var _CachedFont = new CachedFont("Fonts/Terminus.ttf16.cache");

	var _Graphics = new Graphics(_Canvas);
	var _UpdateTime = Date.now();
	var _Font;
	var _LineBreak = '\n';

	var _Lines = [];
	var _MaxLineDigits = 0;

	var _GutterPadding = 10.0;
	var _LineLabelColor = [0.6, 0.6, 0.6, 1.0];

	var _ScrollX = 0.0;
	var _ScrollY = 0.0;
	var _MaxLineLength = 0;

	if(!_Graphics.init())
	{
		// TODO: Handle error.
		return;
	}
	_Font = new Font("Terminus16");

	function _OnResize()
	{
		_SizeToFit();	
		_ClampScroll();
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

	function _OnMouseWheel(evt)
	{
		_ScrollY -= evt.deltaY;
		_ScrollX -= evt.deltaX;

		_ClampScroll();
	}

	function _ClampScroll()
	{
		if(!_CachedFont.isReady)
		{
			return;
		}
		var maxLabelWidth = _MaxLineDigits * _CachedFont.horizontalAdvance;
		var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

		var paneWidth = _Canvas.width - gutter;
		var paneHeight = _Canvas.height;

		var lineHeight = _CachedFont.lineHeight;
		var contentHeight = _Lines.length * lineHeight;
		var contentWidth = _MaxLineLength * _CachedFont.horizontalAdvance;

		var minScrollY = Math.min(0, paneHeight - contentHeight);
		var minScrollX = Math.min(0, paneWidth - contentWidth);

		_ScrollY = Math.max(minScrollY, Math.min(0, _ScrollY));
		_ScrollX = Math.max(minScrollX, Math.min(0, _ScrollX));

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
		console.log("TO PARSE:", elapsed);
	}

	window.addEventListener('resize', _OnResize, false);
    document.body.addEventListener('dragover', _OnDragOver, false);
    document.body.addEventListener('drop', _OnDragDrop, false);
    document.body.addEventListener('paste', _OnPaste, false);
    document.body.addEventListener('mousewheel', _OnMouseWheel, false);

	function _SizeToFit()
	{
		_Canvas.width = window.innerWidth;
		_Canvas.height = window.innerHeight;
		_Graphics.setViewport(0.0, 0.0, _Canvas.width, _Canvas.height);
	}

	_OnResize();

	function _Update()
	{
		var now = Date.now();
        var elapsed = now - _UpdateTime;
		var elapsedS = elapsed/1000.0;
		_UpdateTime = now;

		_Graphics.clear();

		if(_Graphics.setCachedFont(_CachedFont))
		{	
			var maxLabelWidth = _MaxLineDigits * _CachedFont.horizontalAdvance;
			var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

			var glyphMap = _CachedFont.map;
			var lineHeight = _CachedFont.lineHeight;
			var maxDescender = _CachedFont.maxDescender;
			var baseLine = lineHeight + maxDescender;
			
			var contentHeight = _Lines.length * lineHeight;
			var visibleLines = Math.round(_Canvas.height / lineHeight) + 1;
			var firstLine = Math.floor(-_ScrollY / lineHeight);
			var lastLine = Math.min(firstLine + visibleLines, _Lines.length-1);
			var firstLineOrigin = _ScrollY % lineHeight;

			var columnWidth = _CachedFont.horizontalAdvance;
			var visibleColumns = Math.round(_Canvas.width / columnWidth) + 1;
			var firstColumn = Math.floor(-_ScrollX / columnWidth);
			var lastColumn = firstColumn + visibleColumns;
			var firstColumnOrigin = _ScrollX % columnWidth;

			var x = gutter+firstColumnOrigin;
			var y = firstLineOrigin;

			_Graphics.pushClip(gutter, 0, _Canvas.width-gutter, _Canvas.height);
			for(var i = firstLine; i <= lastLine; i++)
			{
				var line = _Lines[i];
				_Graphics.drawCachedText(x, y+baseLine, line.text, firstColumn, lastColumn);

				y += lineHeight;
				if(y > _Canvas.height)
				{
					break;
				}
			}
			_Graphics.popClip();

			_Graphics.pushClip(0, 0, gutter, _Canvas.height);
			// Draw lines.
			if(_Graphics.setCachedFont(_CachedFont, 1.0, _LineLabelColor))
			{	
				var x = _GutterPadding;
				var y = firstLineOrigin;
				for(var i = firstLine; i <= lastLine; i++)
				{
					var line = _Lines[i];
					_Graphics.drawCachedText(_GutterPadding + maxLabelWidth - (line.label.length*_CachedFont.horizontalAdvance), y+baseLine, line.label);

					y += lineHeight;
					if(y > _Canvas.height)
					{
						break;
					}

				}
			}
			_Graphics.popClip();
		}
		requestAnimFrame(_Update);
	}
	_Update();
}