function Pane(_Hydrogen)
{
	var _X = 0;
	var _Y = 0;
	var _Width = 0;
	var _Height = 0;
	var _X2 = 0;
	var _Y2 = 0;

	var _Font;
	var _LineBreak = '\n';

	var _Lines = [];
	var _MaxLineDigits = 0;

	var _GutterPadding = 10.0;
	var _LineLabelColor = [0.6, 0.6, 0.6, 1.0];

	var _ScrollX = 0.0;
	var _ScrollY = 0.0;
	var _MaxLineLength = 0;

	function _SetFont(font)
	{
		_Font = font;
		_ClampScroll();
	}

	function _Place(x, y, width, height)
	{
		_X = Math.round(x);
		_X2 = Math.round(x + width);
		_Width = Math.round(width);
		_Y = Math.round(y);
		_Y2 = Math.round(y + height);
		_Height = Math.round(height);

		_ClampScroll();
	}

    this.__defineGetter__("x", function()
    {
        return _X;
    });

    this.__defineGetter__("y", function()
    {
        return _Y;
    });

    this.__defineGetter__("x2", function()
    {
        return _X2;
    });

    this.__defineGetter__("y2", function()
    {
        return _Y2;
    });

    this.__defineGetter__("width", function()
    {
        return _Width;
    });

    this.__defineGetter__("height", function()
    {
        return _Height;
    });

    function _OpenFile(file)
    {
    	var filename = file.name.toLowerCase();
        var reader = new FileReader();
        reader.onload = function(e) 
        {
        	_SetContents(e.target.result);
        };

        reader.readAsText(file);
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
		if(!_Font.isReady)
		{
			return;
		}
		var maxLabelWidth = _MaxLineDigits * _Font.horizontalAdvance;
		var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

		var paneWidth = _Width - gutter;
		var paneHeight = _Height;

		var lineHeight = _Font.lineHeight;
		var contentHeight = _Lines.length * lineHeight;
		var contentWidth = _MaxLineLength * _Font.horizontalAdvance;

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

	function _Draw(graphics)
	{
		if(graphics.setCachedFont(_Font))
		{	
			var maxLabelWidth = _MaxLineDigits * _Font.horizontalAdvance;
			var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

			var glyphMap = _Font.map;
			var lineHeight = _Font.lineHeight;
			var maxDescender = _Font.maxDescender;
			var baseLine = lineHeight + maxDescender;
			
			var contentHeight = _Lines.length * lineHeight;
			var visibleLines = Math.round(_Height / lineHeight) + 1;
			var firstLine = Math.floor(-_ScrollY / lineHeight);
			var lastLine = Math.min(firstLine + visibleLines, _Lines.length-1);
			var firstLineOrigin = _ScrollY % lineHeight;

			var columnWidth = _Font.horizontalAdvance;
			var visibleColumns = Math.round(_Width / columnWidth) + 1;
			var firstColumn = Math.floor(-_ScrollX / columnWidth);
			var lastColumn = firstColumn + visibleColumns;
			var firstColumnOrigin = _ScrollX % columnWidth;

			var x = _X+gutter+firstColumnOrigin;
			var y = _Y+firstLineOrigin;

			graphics.pushClip(_X+gutter, _Y, _Width-gutter, _Height);
			for(var i = firstLine; i <= lastLine; i++)
			{
				var line = _Lines[i];
				graphics.drawCachedText(x, y+baseLine, line.text, firstColumn, lastColumn);

				y += lineHeight;
			}
			graphics.popClip();

			graphics.pushClip(_X, _Y, gutter, _Height);
			// Draw lines.
			if(graphics.setCachedFont(_Font, 1.0, _LineLabelColor))
			{	
				var x = _X + _GutterPadding + maxLabelWidth;
				var y = _Y+firstLineOrigin;
				for(var i = firstLine; i <= lastLine; i++)
				{
					var line = _Lines[i];
					graphics.drawCachedText(x - (line.label.length*_Font.horizontalAdvance), y+baseLine, line.label);

					y += lineHeight;
				}
			}
			graphics.popClip();
		}
	}

	this.place = _Place;
	this.openFile = _OpenFile;
	this.onMouseWheel = _OnMouseWheel;
	this.setFont = _SetFont;
	this.draw = _Draw;
}