function Cursor()
{
	var _LineFrom = 0;
	var _LineTo = 0;
	var _ColumnFrom = 0;
	var _ColumnTo = 0;

	var _AtEnd = false;

	this.__defineGetter__("hasRange", function()
    {
        return _LineFrom != _LineTo || _ColumnFrom != _ColumnTo;
    });

    this.__defineGetter__("lineFrom", function()
    {
        return _LineFrom;
    });

    this.__defineGetter__("lineTo", function()
    {
        return _LineTo;
    });

    this.__defineGetter__("columnFrom", function()
    {
        return _ColumnFrom;
    });

    this.__defineGetter__("columnTo", function()
    {
        return _ColumnTo;
    });

    this.__defineGetter__("line", function()
    {
        return _AtEnd ? _LineTo : _LineFrom;
    });

    this.__defineGetter__("column", function()
    {
        return _AtEnd ? _ColumnTo : _ColumnFrom;
    });

    this.place = function(line, column)
    {
    	_LineFrom = _LineTo = line;
    	_ColumnFrom = _ColumnTo = column;
    	_AtEnd = true;
    };

    this.span = function(lineFrom, columnFrom, lineTo, columnTo, atEnd)
    {
    	var fromIsHit = atEnd === undefined;
    	if(fromIsHit)
    	{
    		_AtEnd = false;
    	}
    	else
    	{
    		_AtEnd = atEnd;	
    	}

    	_LineFrom = lineFrom;
    	_LineTo = lineTo;

    	_ColumnFrom = columnFrom;
    	_ColumnTo = columnTo;

    	if(_LineTo < _LineFrom)
    	{
    		var tmp = _LineFrom;
    		_LineFrom = _LineTo;
    		_LineTo = tmp;

    		tmp = _ColumnFrom;
    		_ColumnFrom = _ColumnTo;
    		_ColumnTo = tmp;

    		// Selected upwards, move cursor to start.
    		_AtEnd = !_AtEnd;
    	}
    	else if(_LineTo == _LineFrom && columnTo < columnFrom)
    	{
    		tmp = _ColumnFrom;
    		_ColumnFrom = _ColumnTo;
    		_ColumnTo = tmp;

    		// Went backwards on same line.
    		_AtEnd = !_AtEnd;
    	}
    };
}

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
	var _LineHeightScale = 1.5;
	var _CodeColor = [1.0, 1.0, 1.0, 1.0];
	var _CursorColor = [1.0, 0.7, 0.0, 1.0];
	var _LineLabelColor = [0.3, 0.3, 0.3, 1.0];
	var _SelectionColor = [0.2, 0.2, 0.2, 1.0];
	var _HighlightColor = [0.07, 0.07, 0.07, 1.0];
	var _NumTabSpaces = 4;

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
    	_Cursors = [];
    }

	function _OnPaste()
	{

	}

	document.addEventListener('paste', function(e){
		console.log(e.clipboardData);/*
    if(e.clipboardData.types.indexOf('text/html') > -1){
        processDataFromClipboard(e.clipboardData.getData('text/html'));
        e.preventDefault(); // We are already handling the data from the clipboard, we do not want it inserted into the document
    }*/
});

	function _PositionToLocation(rx, ry)
	{
		var lines = _Document.lines;

		var maxLabelWidth = _Document.maxLineDigits * _Font.horizontalAdvance;
		var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

		var lineHeight = Math.round(_Font.lineHeight * _LineHeightScale);
		var firstLine = Math.floor(-_ScrollY / lineHeight);
		
		var firstLineOrigin = _ScrollY % lineHeight;

		var hitLine = firstLine + Math.floor((ry - firstLineOrigin)/lineHeight);

		var columnWidth = _Font.horizontalAdvance;

		if(hitLine >= lines.length)
		{
			return null;
		}

		var line = lines[hitLine];

		var t = line.text;
		var tl = t.length;
		var x = _ScrollX + gutter;

		var hitColumn = -1;
		for(var i = 0; i < tl; i++)
		{
			var c = t.charCodeAt(i);
			var lx = x;
			switch(c)
			{
				case 9:
					x += columnWidth * _NumTabSpaces;
					break;
				default:
					x += columnWidth;
					break;
			}
			if(rx >= lx && rx <= x)
			{
				// If we hit more than halfway through the column, then put the cursor on the next one.
				if(rx > lx + (x - lx)/2.0)
				{
					hitColumn = i + 1;	
				}
				else
				{
					hitColumn = i;
				}
				break;
			}
		}
		if(hitColumn === -1)
		{
			if(rx > x)
			{
				hitColumn = tl;
			}
			else
			{
				hitColumn = 0;
			}
		}
		/*var firstColumn = Math.floor(-_ScrollX / columnWidth);
		var firstColumnOrigin = _ScrollX % columnWidth;		

		console.log(firstColumn, firstColumnOrigin);
		var hitColumn = Math.max(0, Math.min(line.text.length, firstColumn + Math.round((rx - firstColumnOrigin - gutter)/columnWidth)));*/

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
				if(cursor.lineFrom > cursorLine)
				{
					cursorLine = cursor.lineFrom;
					cursor = cursor;
				}
			}

			var line2 = hit.line;
			var column2 = hit.column;

			var minLine = cursor.lineFrom;
			var minColumn = cursor.columnFrom;
			var maxLine = cursor.lineTo;
			var maxColumn = cursor.columnTo;

			
			if(hit.line <= cursor.lineFrom)
			{
				cursor.span(hit.line, hit.column, cursor.lineTo, cursor.columnTo, false);
				// atEnd = false;
				/*cursor.range = 
				{
					line1:line2,
					column1:column2,
					line2:maxLine,
					column2:maxColumn
				};*/
			}
			else 
			{
				cursor.span(cursor.lineFrom, cursor.columnFrom, hit.line, hit.column, true);
				// at end = true
				/*
				cursor.range = 
				{
					line1:minLine,
					column1:minColumn,
					line2:line2,
					column2:column2
				};*/
			}

			//cursor.line = hit.line;
			//cursor.column = hit.column;
		}
		else
		{
			if(!evt.metaKey)
			{
				_Cursors = [];
			}
			
			var cursor = new Cursor();
			cursor.place(hit.line, hit.column);
			_Cursors.push(cursor);

			_ValidateCursors();
			/*
			_Cursors.push(
			{
				line:hit.line,
				column:hit.column
			});*/
		}

		//console.log(evt);
	}

	function _ValidateCursors()
	{
		_Cursors.sort(function(a, b)
		{
			return a.columnFrom - b.columnFrom;
		});

		_Cursors.sort(function(a, b)
		{
			return a.lineFrom - b.lineFrom;
		});
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
				line: cursor.lineFrom,
				column: cursor.columnFrom
			};
		}

		var hit = _PositionToLocation(rx, ry);

		cursor.line = hit.line;
		cursor.column = hit.column;
		
		cursor.span(hit.line, hit.column, cursor.pivot.line, cursor.pivot.column);
/*
		if(hit.line == cursor.pivot.line)
		{
			//cursor.span(lineFrom, columnFrom, lineTo, columnTo)
			//cursor.span(hit.line, hit.column, hit.line, cursor.pivot.column);
			cursor.range = 
			{
				line1:cursor.line,
				column1:cursor.column < cursor.pivot.column ? cursor.column : cursor.pivot.column,
				line2:cursor.line,
				column2:cursor.column < cursor.pivot.column ? cursor.pivot.column : cursor.column,
			};
		}
		else if(hit.line < cursor.pivot.line)
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
		}*/
	}

	function _ReplaceSelectionWith(text)
	{
		// Not really necessary to call this again, no?
		_ValidateCursors();

		console.log(_Cursors.length);
		var linesRemoved = 0;
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];

			var lines = _Document.lines;

			var lineFrom = cursor.lineFrom - linesRemoved;
			var lineTo = cursor.lineTo - linesRemoved;

			if(lineFrom == lineTo)
			{
				// ---XXX----
				var line = lines[lineFrom].text;
				lines[lineFrom].text = line.slice(0, cursor.columnFrom) + line.slice(cursor.columnTo);
			}
			else
			{
				// ---XXXXXX
				// XXXXXXXXX
				// XXXXX----
				lines[lineFrom].text = lines[lineFrom].text.slice(0, cursor.columnFrom) + lines[lineTo].text.slice(cursor.columnTo);

				var rem = lineTo-lineFrom;
				linesRemoved += rem;
				lines.splice(lineFrom+1, rem);
			}
/*
			var insertLine = cursor.lineFrom;
			var insertColumn = cursor.columnFrom;

			var currentLine = insertLine;
			var currentColumn = insertColumn;


			
			while(currentLine <= cursor.lineTo)
			{
				var line = _Document.lines[currentLine].text;
				var del = currentLine == cursor.lineTo ? cursor.columnTo : line.length - 1;
				_Document.lines[currentLine].text = line.slice(0, currentColumn) + line.slice(del);
				console.log(_Document.lines[currentLine].text );
				currentColumn = 0;
				currentLine++;
			}*/

			cursor.place(lineFrom, cursor.columnFrom);
		}
	}


	function _OnKeyPress(evt)
	{
		console.log("KEY PRESS", evt.keyCode);
		switch(evt.keyCode)
		{
			case 13: // Enter
				break;
			case 8: // Backspace
				_ReplaceSelectionWith("");
				break;
			case 46: // Delete
				_ReplaceSelectionWith("");
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

		var lineHeight = Math.round(_Font.lineHeight * _LineHeightScale);
		var contentHeight = _Document.lines.length * lineHeight;
		var contentWidth = _Document.maxLineLength * _Font.horizontalAdvance;

		var minScrollY = Math.min(0, paneHeight - contentHeight - 100);
		var minScrollX = Math.min(0, paneWidth - contentWidth);

		_ScrollY = Math.max(minScrollY, Math.min(0, _ScrollY));
		_ScrollX = Math.max(minScrollX, Math.min(0, _ScrollX));
	}

	function _LineWidth(line, start, end)
	{
		var columnWidth = _Font.horizontalAdvance;
		var t = line.text;
		var tl = t.length;
		var x = 0;
		for(var i = start; i < end; i++)
		{
			var c = t.charCodeAt(i);
			switch(c)
			{
				case 9:
					x += columnWidth * _NumTabSpaces;
					break;
				default:
					x += columnWidth;
					break;
			}
		}
		return x;
	}

	function _VisibleColumns(line, start, end)
	{
		var columnWidth = _Font.horizontalAdvance;
		var t = line.text;
		var tl = t.length;

		var first = -1;
		var firstX = 0;
		var last = tl-1;
		var x = 0;

		for(var i = 0; i < tl; i++)
		{
			var c = t.charCodeAt(i);
			var lx = x;
			switch(c)
			{
				case 9:
					x += columnWidth * _NumTabSpaces;
					break;
				default:
					x += columnWidth;
					break;
			}

			if(x > start)
			{
				first = i;
				firstX = lx;
				break;
			}
		}
		if(first === -1)
		{
			first = t.length;
			firstX = x;
		}
		for(var i = first; i < tl; i++)
		{
			var c = t.charCodeAt(i);
			switch(c)
			{
				case 9:
					x += columnWidth * _NumTabSpaces;
					break;
				default:
					x += columnWidth;
					break;
			}

			if(x >= end)
			{
				last = i;
				break;
			}
		}
		return {first:first, firstX:firstX, last:last};
	}


var drawCount = 0;
	function _Draw(graphics)
	{
		if(drawCount > 1)
		{
			return;
		}

		if(!_Document)
		{
			return;
		}
		//_ScrollX -= 0.2;
		//drawCount++;
		graphics.setTabSpaces(_NumTabSpaces);
		var lines = _Document.lines;

		var maxLabelWidth = _Document.maxLineDigits * _Font.horizontalAdvance;
		var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

		var glyphMap = _Font.map;
		var lineHeight = Math.round(_Font.lineHeight * _LineHeightScale);
		var cursorHeight = _Font.lineHeight;
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
		var y = _Y+firstLineOrigin;

		graphics.pushClip(_X, _Y, _Width, _Height);

		// Draw cursors.
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			if(cursor.hasRange)
			{
				var currentLine = cursor.lineFrom;
				var endLine = cursor.lineTo;
				var columnStart = cursor.columnFrom;

				while(true)
				{
					var line = lines[currentLine];

					var startY = Math.round(_Y + renderScrollY + currentLine * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0);
					var startX = Math.max(gutter, _X + gutter + renderScrollX + _LineWidth(line, 0, columnStart));//columnStart * columnWidth;
					var endX;

					if(currentLine == endLine)
					{
						endX = _X + gutter + renderScrollX + _LineWidth(line, 0, cursor.columnTo);//cursor.columnTo * columnWidth;
					}
					else
					{
						endX = _X + gutter + renderScrollX + _LineWidth(line, 0, line.text.length) + columnWidth;//(line.text.length+1) * columnWidth;
					}

					if(endX > startX)
					{
						graphics.drawRect(startX, startY, endX-startX, lineHeight, 1.0, _SelectionColor);
					}

					if(currentLine == endLine)
					{
						break;
					}
					columnStart = 0;
					currentLine++;
				}
			}
			else
			{
				var startY = Math.round(_Y + renderScrollY + cursor.lineFrom * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0);
				graphics.drawRect(0, startY, _Width, lineHeight, 1.0, _HighlightColor);
			}
			var cursorY = _Y + renderScrollY + cursor.line * lineHeight + lineHeight - cursorHeight;
			var cursorX = _X + gutter + renderScrollX + _LineWidth(lines[cursor.line], 0, cursor.column);
			if(cursorX+1 > gutter)
			{
				graphics.drawRect(cursorX, cursorY, 1.0, cursorHeight, 1.0, _CursorColor);
			}
		}

		graphics.pushClip(_X+gutter, _Y, _Width-gutter, _Height);
		if(graphics.setFont(_Font, 1.0, _CodeColor))
		{	
			for(var i = firstLine; i <= lastLine; i++)
			{
				var line = lines[i];

				//var firstColumn = Math.floor(-renderScrollX / columnWidth);
				//var lastColumn = firstColumn + visibleColumns;
				//var firstColumnOrigin = renderScrollX % columnWidth;

				var visRange = _VisibleColumns(line, -renderScrollX, _Width - gutter - renderScrollX);

				var x = visRange.firstX;//_X+gutter+firstColumnOrigin;

				graphics.drawText(renderScrollX+gutter+x, y+baseLine, line.text, visRange.first, visRange.last);
				y += lineHeight;
			}
			graphics.popClip();
			graphics.pushClip(_X, _Y, gutter, _Height);
			// Draw lines.
			if(graphics.setFont(_Font, 1.0, _LineLabelColor))
			{	
				var x = _X + _GutterPadding + maxLabelWidth;
				var y = _Y + firstLineOrigin;
				for(var i = firstLine; i <= lastLine; i++)
				{
					var line = lines[i];
					graphics.drawText(x - (line.label.length*_Font.horizontalAdvance), y+baseLine, line.label);

					y += lineHeight;
				}
			}
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