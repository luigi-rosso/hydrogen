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
	var _IsDragging = false;

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

	function _PositionToLocation(rx, ry)
	{
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

		if(hitLine >= lines.length)
		{
			return null;
		}

		var line = lines[hitLine];
		var hitColumn = Math.max(0, Math.min(line.text.length, firstColumn + Math.round((rx - firstColumnOrigin - gutter)/columnWidth)));

		return { line:hitLine, column:hitColumn };
	}

	function _OnMouseDown(evt, rx, ry)
	{
		if(!_Document)
		{
			return;
		}

		_IsDragging = true;
		_Hydrogen.captureMouse(this);
		_Hydrogen.focus(this);

		var hit = _PositionToLocation(rx, ry);
		if(!hit)
		{
			return;
		}

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

			var line2 = hit.line;
			var column2 = hit.column;

			var minLine = cursor.line;
			var minColumn = cursor.column;
			var maxLine = cursor.line;
			var maxColumn = cursor.column;

			if(cursor.range)
			{
				minLine = cursor.range.line1;
				minColumn = cursor.range.column1;
				maxLine = cursor.range.line2;
				maxColumn = cursor.range.column2;
			}
			
			if(line2 <= minLine)
			{
				cursor.range = 
				{
					line1:line2,
					column1:column2,
					line2:maxLine,
					column2:maxColumn
				};
			}
			else 
			{
				cursor.range = 
				{
					line1:minLine,
					column1:minColumn,
					line2:line2,
					column2:column2
				};
			}

			cursor.line = hit.line;
			cursor.column = hit.column;
		}
		else
		{
			_Cursors = [];

			_Cursors.push(
			{
				line:hit.line,
				column:hit.column
			});
		}

		//console.log(evt);
	}

	function _OnMouseMove(evt, rx, ry)
	{
		if(!_IsDragging || _Cursors.length == 0)
		{
			return;
		}

		var cursor = _Cursors[0];
		if(!cursor.pivot)
		{
			cursor.pivot =
			{
				line: cursor.line,
				column: cursor.column
			};
		}

		var hit = _PositionToLocation(rx, ry);

		cursor.line = hit.line;
		cursor.column = hit.column;
		
		if(cursor.line == cursor.pivot.line)
		{
			cursor.range = 
			{
				line1:cursor.line,
				column1:cursor.column < cursor.pivot.column ? cursor.column : cursor.pivot.column,
				line2:cursor.line,
				column2:cursor.column < cursor.pivot.column ? cursor.pivot.column : cursor.column,
			};
		}
		else if(cursor.line < cursor.pivot.line)
		{
			cursor.range = 
			{
				line1:cursor.line,
				column1:cursor.column,
				line2:cursor.pivot.line,
				column2:cursor.pivot.column
			};
		}
		else
		{
			cursor.range = 
			{
				line2:cursor.line,
				column2:cursor.column,
				line1:cursor.pivot.line,
				column1:cursor.pivot.column
			};
		}
	}

	function _OnKeyPress(evt)
	{
		console.log(evt.keyCode);
		switch(evt.keyCode)
		{
			case 13: // Enter
				break;
			case 8: // Backspace
				break;
			case 46: // Delete
				break;
		}

		var str = String.fromCharCode(evt.charCode);
		console.log(str);
		
	}

	function _OnMouseUp(evt, rx, ry)
	{
		_IsDragging = false;
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

		var minScrollY = Math.min(0, paneHeight - contentHeight - 100);
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

		var renderScrollY = Math.round(_ScrollY);
		var renderScrollX = Math.round(_ScrollX);
		
		var contentHeight = lines.length * lineHeight;
		var visibleLines = Math.round(_Height / lineHeight) + 1;
		var firstLine = Math.floor(-renderScrollY / lineHeight);
		var lastLine = Math.min(firstLine + visibleLines, lines.length-1);
		var firstLineOrigin = renderScrollY % lineHeight;

		var columnWidth = _Font.horizontalAdvance;
		var visibleColumns = Math.round(_Width / columnWidth) + 1;
		var firstColumn = Math.floor(-renderScrollX / columnWidth);
		var lastColumn = firstColumn + visibleColumns;
		var firstColumnOrigin = renderScrollX % columnWidth;

		var x = _X+gutter+firstColumnOrigin;
		var y = _Y+firstLineOrigin;

		graphics.pushClip(_X, _Y, _Width, _Height);

		// Draw cursors.
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			var cursorY = _Y + renderScrollY + cursor.line * lineHeight;
			var cursorX = _X + gutter + renderScrollX + cursor.column * columnWidth;
			graphics.drawRect(cursorX, cursorY, 1.0, lineHeight, 1.0, [1.0, 1.0, 1.0, 1.0]);
			if(cursor.range)
			{
				var range = cursor.range;

				var currentLine = range.line1;
				var endLine = range.line2;
				var columnStart = range.column1;

				while(true)
				{
					var startY = _Y + renderScrollY + currentLine * lineHeight;
					var startX = _X + gutter + renderScrollX + columnStart * columnWidth;
					var endX;

					if(currentLine == endLine)
					{
						endX = _X + gutter + renderScrollX + range.column2 * columnWidth;
					}
					else
					{
						endX = _X + gutter + renderScrollX + (lines[currentLine].text.length+1) * columnWidth;
					}

					graphics.drawRect(startX, startY, endX-startX, lineHeight, 0.5, [1.0, 1.0, 1.0, 1.0]);

					if(currentLine == endLine)
					{
						break;
					}
					columnStart = 0;
					currentLine++;
				}
				/*
				var range = cursor.range;
				var startY = _Y + renderScrollY + range.line1 * lineHeight;
				var startX = _X + gutter + renderScrollX + range.column1 * columnWidth;
				var endX;
				if(range.line1 == range.line2)
				{
					endX = _X + gutter + renderScrollX + range.column2 * columnWidth;
				}
				else
				{
					endX = _X + gutter + renderScrollX + lines[range.line1].text.length * columnWidth;
				}
				graphics.drawRect(startX, startY, endX-startX, lineHeight, 0.5, [1.0, 1.0, 1.0, 1.0]);*/
					
				
			}
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
	this.onMouseMove = _OnMouseMove;
	this.onMouseUp = _OnMouseUp;
	this.onKeyPress = _OnKeyPress;
	this.setFont = _SetFont;
	this.draw = _Draw;
}