function Pane(_Hydrogen)
{
	var _X = 0;
	var _Y = 0;
	var _Width = 0;
	var _Height = 0;
	var _X2 = 0;
	var _Y2 = 0;

	var _Font;

	var _GutterPadding = 10.0;
	var _LineLabelColor = [0.6, 0.6, 0.6, 1.0];

	var _ScrollX = 0.0;
	var _ScrollY = 0.0;
	var _Document;

	var _Cursors = [];

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
    	_Document = new Document(_Hydrogen);
    	_Document.fromFile(file);
    }

	function _OnPaste()
	{

	}

	function _OnMouseDown(evt, rx, ry)
	{
		if(!_Document)
		{
			return;
		}
		var lines = _Document.lines;

		var maxLabelWidth = _Document.maxLineDigits * _Font.horizontalAdvance;
		var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

		var lineHeight = _Font.lineHeight;
		var firstLine = Math.floor(-_ScrollY / lineHeight);
		
		var firstLineOrigin = _ScrollY % lineHeight;

		var hitLine = firstLine + Math.floor((ry - firstLineOrigin)/lineHeight);

		var columnWidth = _Font.horizontalAdvance;
		var firstColumn = Math.floor(-_ScrollX / columnWidth);
		var firstColumnOrigin = _ScrollX % columnWidth;		

		var line = lines[hitLine];
		var hitColumn = Math.max(0, Math.min(line.text.length, firstColumn + Math.round((rx - firstColumnOrigin - gutter)/columnWidth)));

		if(evt.shiftKey && _Cursors.length > 0)
		{
			var cursorLine = 0;
			var cursor = null;

			for(var i = 0; i < _Cursors.length; i++)
			{
				var cursor = _Cursors[i];
				if(cursor.line > cursorLine)
				{
					cursorLine = cursor.line;
					cursor = cursor;
				}
			}

			var line2 = hitLine;
			var column2 = hitColumn;

			if(line2 == cursor.line)
			{
				cursor.range = 
				{
					line1:line2,
					column1:column2 < cursor.column ? column2 : cursor.column,
					line2:line2,
					column2:column2 < cursor.column ? cursor.column : column2
				};
			}
			else if(line2 < cursor.line)
			{
				cursor.range = 
				{
					line1:line2,
					column1:column2,
					line2:cursor.line,
					column2:cursor.column
				};
			}
			else 
			{
				cursor.range = 
				{
					line2:line2,
					column2:column2,
					line1:cursor.line,
					column1:cursor.column
				};
			}
		}
		else
		{
			_Cursors = [];

			_Cursors.push(
			{
				line:hitLine,
				column:hitColumn
			});
		}

		//console.log(evt);
	}

	function _OnMouseWheel(evt)
	{
		_ScrollY -= evt.deltaY;
		_ScrollX -= evt.deltaX;

		_ClampScroll();
	}

	function _ClampScroll()
	{
		if(!_Font.isReady || !_Document)
		{
			return;
		}
		var maxLabelWidth = _Document.maxLineDigits * _Font.horizontalAdvance;
		var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

		var paneWidth = _Width - gutter;
		var paneHeight = _Height;

		var lineHeight = _Font.lineHeight;
		var contentHeight = _Document.lines.length * lineHeight;
		var contentWidth = _Document.maxLineLength * _Font.horizontalAdvance;

		var minScrollY = Math.min(0, paneHeight - contentHeight);
		var minScrollX = Math.min(0, paneWidth - contentWidth);

		_ScrollY = Math.max(minScrollY, Math.min(0, _ScrollY));
		_ScrollX = Math.max(minScrollX, Math.min(0, _ScrollX));

	}

	function _Draw(graphics)
	{
		if(!_Document)
		{
			return;
		}
		var lines = _Document.lines;

		var maxLabelWidth = _Document.maxLineDigits * _Font.horizontalAdvance;
		var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

		var glyphMap = _Font.map;
		var lineHeight = _Font.lineHeight;
		var maxDescender = _Font.maxDescender;
		var baseLine = lineHeight + maxDescender;
		
		var contentHeight = lines.length * lineHeight;
		var visibleLines = Math.round(_Height / lineHeight) + 1;
		var firstLine = Math.floor(-_ScrollY / lineHeight);
		var lastLine = Math.min(firstLine + visibleLines, lines.length-1);
		var firstLineOrigin = _ScrollY % lineHeight;

		var columnWidth = _Font.horizontalAdvance;
		var visibleColumns = Math.round(_Width / columnWidth) + 1;
		var firstColumn = Math.floor(-_ScrollX / columnWidth);
		var lastColumn = firstColumn + visibleColumns;
		var firstColumnOrigin = _ScrollX % columnWidth;

		var x = _X+gutter+firstColumnOrigin;
		var y = _Y+firstLineOrigin;

		graphics.pushClip(_X, _Y, _Width, _Height);

		// Draw cursors.
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			var cursorY = _Y + _ScrollY + cursor.line * lineHeight;
			var cursorX = _X + gutter + _ScrollX + cursor.column * columnWidth;
			graphics.drawRect(cursorX, cursorY, 1.0, lineHeight, 1.0, [1.0, 1.0, 1.0, 1.0]);
		}
		if(graphics.setFont(_Font))
		{	
			graphics.pushClip(_X+gutter, _Y, _Width-gutter, _Height);
			for(var i = firstLine; i <= lastLine; i++)
			{
				var line = lines[i];
				graphics.drawText(x, y+baseLine, line.text, firstColumn, lastColumn);
				y += lineHeight;
			}
			graphics.popClip();
			graphics.pushClip(_X, _Y, gutter, _Height);
			// Draw lines.
			if(graphics.setFont(_Font, 1.0, _LineLabelColor))
			{	
				var x = _X + _GutterPadding + maxLabelWidth;
				var y = _Y+firstLineOrigin;
				for(var i = firstLine; i <= lastLine; i++)
				{
					var line = lines[i];
					graphics.drawText(x - (line.label.length*_Font.horizontalAdvance), y+baseLine, line.label);

					y += lineHeight;
				}
			}
			graphics.popClip();
		}

		graphics.popClip();
	}

	this.place = _Place;
	this.openFile = _OpenFile;
	this.onMouseWheel = _OnMouseWheel;
	this.onMouseDown = _OnMouseDown;
	this.setFont = _SetFont;
	this.draw = _Draw;
}