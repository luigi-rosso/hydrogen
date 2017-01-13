function Pane(_Hydrogen)
{
	var _X = 0;
	var _Y = 0;
	var _Width = 0;
	var _Height = 0;
	var _X2 = 0;
	var _Y2 = 0;
	var _DragScrollMargin = 50;

	var _Font;

	var _GutterPadding = 10.0;
	var _LineHeightScale = 1.5;
	var _CodeColor = [1.0, 1.0, 1.0, 1.0];
	var _CursorColor = [1.0, 0.7, 0.0, 1.0];
	var _LineLabelColor = [0.3, 0.3, 0.3, 1.0];
	var _SelectionColor = [0.2, 0.2, 0.2, 1.0];
	var _HighlightColor = [0.07, 0.07, 0.07, 1.0];

	var _ScrollX = 0.0;
	var _ScrollY = 0.0;
	var _RenderScrollX = 0.0;
	var _RenderScrollY = 0.0;
	var _ScrollYVelocity = 0.0;

	var _TriggeredScrollX = 0.0;
	var _TriggeredScrollY = 0.0;

	var _Document;

	var _Cursors = [];
	var _IsDragging = false;
	var _ChangeTimeout = null;

	function _SetFont(font)
	{
		_Font = font;
		_ClampScroll();
		_Hydrogen.scheduleUpdate();
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
		_Hydrogen.scheduleUpdate();
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
    	_Document.onContentsChange = function()
    	{
    		clearTimeout(_ChangeTimeout);
    		_CaptureJournalEntry();
    	};
    	_Document.fromFile(file);
    	_Cursors = [];
    	_Hydrogen.scheduleUpdate();
    }

    var _Journal = [];
    var _JournalIndex = -1;

    function _CaptureJournalEntry()
    {
    	var entry = {
    		text:_Document.text,
    		redoCursors:[],
    		undoCursors:[]
    	};

    	for(var i = 0; i < _Cursors.length; i++)
    	{
    		var cursor = _Cursors[i];
    		entry.redoCursors.push(cursor.serialize());
    	}

    	if(_JournalIndex+1 < _Journal.length)
    	{
    		_Journal.splice(_JournalIndex+1, _Journal.length+1 - _JournalIndex);
    	}
    	_Journal.push(entry);
    	_JournalIndex = _Journal.length-1;
    }

	function _OnPaste(data)
	{
		var plainText = data.getData("text/plain");
	 	if(plainText && plainText.constructor === String)
		{
			_ReplaceSelectionWith(plainText);
		}
	}

	function _OnCopy()
	{
		var data = [];
		var lines = _Document.lines;
		for(var i = 0; i < _Cursors.length; i++)
    	{
    		var cursor = _Cursors[i];
    		if(cursor.hasRange)
    		{
    			if(cursor.lineFrom === cursor.lineTo)
    			{
    				var line = lines[cursor.lineFrom];
    				data.push(line.slice(cursor.columnFrom, cursor.columnTo));
    			}
    			else
    			{
					data.push(lines[cursor.lineFrom].slice(cursor.columnFrom));
					for(var j = cursor.lineFrom+1; j < cursor.lineTo; j++)
					{
						data.push(lines[j]);
					}
					data.push(lines[cursor.lineTo].slice(0, cursor.columnTo));
    			}
    		}
    	}

    	return data.length ? data.join(_Document.lineBreak) : null;
	}

	function _OnCut()
	{
		var data = "";
		return data.length ? data : null;
	}

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
			return { line:lines.length-1, column:lines[lines.length-1].length };
		}
		else if(hitLine < 0)
		{
			return { line:0, column:0 };	
		}

		var line = lines[hitLine];

		var t = line;
		var tl = t.length;
		var x = _ScrollX + gutter;

		var hitColumn = -1;

		var numTabSpaces = _Document.numTabSpaces;
		for(var i = 0; i < tl; i++)
		{
			var c = t.charCodeAt(i);
			var lx = x;
			switch(c)
			{
				case 9:
					x += columnWidth * numTabSpaces;
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
		var hitColumn = Math.max(0, Math.min(line.length, firstColumn + Math.round((rx - firstColumnOrigin - gutter)/columnWidth)));*/

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
				if(hit.column > cursor.columnTo)
				{
					cursor.span(hit.line, hit.column, cursor.lineTo, cursor.columnFrom, false);	
				}
				else
				{
					cursor.span(hit.line, hit.column, cursor.lineTo, cursor.columnTo, false);
				}
			}
			else 
			{
				cursor.span(cursor.lineFrom, cursor.columnFrom, hit.line, hit.column, true);

			}
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
		}

		cursor.setPlacedColumn(_Document);
		_EnsureCursorVisible(true);
		_Hydrogen.scheduleUpdate();

		//console.log(evt);
	}

	function _EnsureCursorVisible(closest)
	{
		if(_Cursors.length === 0)
		{
			return;
		}

		var lines = _Document.lines;
		var lineHeight = Math.round(_Font.lineHeight * _LineHeightScale);

		var renderScrollY = Math.round(_ScrollY);
		var renderScrollX = Math.round(_ScrollX);
		
		var contentHeight = lines.length * lineHeight;
		var visibleLines = Math.floor(_Height / lineHeight);
		var firstLine = Math.ceil(-renderScrollY / lineHeight);
		var lastLine = Math.min(firstLine + visibleLines-1, lines.length-1); // visible lines - 1 as it's the last index

		var isCursorVisible = false;
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			if(cursor.lineAt >= firstLine && cursor.lineAt <= lastLine)
			{
				isCursorVisible = true;
				break;
			}
		}
		if(!isCursorVisible)
		{
			var cursor = _Cursors[0];
			if(!closest)
			{
				_ScrollY = -cursor.lineAt * lineHeight + _Height/2;
			}
			else
			{
				var cursorTop = -cursor.lineAt * lineHeight;
				//var cursorBottom = _Height - lineHeight - cursor.lineAt * lineHeight;

				var cursorHeight = _Font.lineHeight;
				var startY = cursor.lineAt * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0;
				var cursorBottom = _Height - lineHeight - startY;

				if(Math.abs(cursorTop - _ScrollY) < Math.abs(cursorBottom - _ScrollY))
				{
					_ScrollY = cursorTop;
				}
				else
				{
					_ScrollY = cursorBottom;
				}
			}
			_ClampScroll();
			_Hydrogen.scheduleUpdate();
		}
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

		// Merge overlaps.
		for(var i = 0; i < _Cursors.length-1; i++)
		{
			var cursorA = _Cursors[i];
			var cursorB = _Cursors[i+1];

			if(cursorB.lineFrom < cursorA.lineTo || (cursorB.lineFrom == cursorA.lineTo && cursorB.columnFrom < cursorA.columnTo))
			{
				cursorA.span(cursorA.lineFrom, cursorA.columnFrom, cursorB.lineTo, cursorB.columnTo);
				_Cursors.splice(i+1, 1);
				i--;
			}
		}
	}

	function _DragCursor(rx, ry)
	{
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

		//cursor.line = hit.line;
		//cursor.column = hit.column;
		
		var changed = cursor.span(hit.line, hit.column, cursor.pivot.line, cursor.pivot.column);
		var sv;
		if(ry <= _DragScrollMargin)
		{
			var lineHeight = Math.round(_Font.lineHeight * _LineHeightScale);
			sv = lineHeight*25;
		}
		else if(ry >= _Height - _DragScrollMargin)
		{
			var lineHeight = Math.round(_Font.lineHeight * _LineHeightScale);
			sv = -lineHeight*25;
		}
		else
		{
			sv = 0;
		}

		if(_ScrollYVelocity != sv)
		{
			_ScrollYVelocity = sv;
			changed = true;
		}

		if(changed)
		{
			_Hydrogen.scheduleUpdate();
		}
	}

	var _MouseX = 0;
	var _MouseY = 0;
	
	function _OnMouseMove(evt, rx, ry)
	{
		_MouseX = rx;
		_MouseY = ry;
		if(!_IsDragging || _Cursors.length == 0)
		{
			return;
		}
		_IsDragging = true;

		_DragCursor(rx, ry);
	}

	function _ChangeComplete()
	{
		if(_ChangeTimeout)
		{
			clearTimeout(_ChangeTimeout);
			_ChangeTimeout = null;
			_CaptureJournalEntry();
		}
	}

	function _TriggerChange()
	{
		if(!_ChangeTimeout)
		{
			var lastEntry = _Journal[_JournalIndex];
			lastEntry.undoCursors.length = 0;
	    	for(var i = 0; i < _Cursors.length; i++)
	    	{
	    		var cursor = _Cursors[i];
	    		lastEntry.undoCursors.push(cursor.serialize());
	    	}
		}
		clearTimeout(_ChangeTimeout);
		_ChangeTimeout = setTimeout(_ChangeComplete, 1000);
		_TriggeredScrollX = _ScrollX;
		_TriggeredScrollY = _ScrollY;
	}

	function _Backspace()
	{
		_TriggerChange();

		var nonRangeCursors = [];
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			if(!cursor.hasRange)
			{
				nonRangeCursors.push(cursor);
			}
		}
		_DeleteSelection();
		var lines = _Document.lines;
		var removedLines = 0;
		for(var i = 0; i < nonRangeCursors.length; i++)
		{
			var cursor = nonRangeCursors[i];
			var lineFrom = cursor.lineFrom - removedLines;
			var line = lines[lineFrom];
			var column = cursor.columnFrom;

			if(column === 0)
			{
				if(lineFrom > 0)
				{
					var previousLine = lines[lineFrom-1];
					var previousLineLength = previousLine.length;
					lines[lineFrom-1] = previousLine + lines[lineFrom];
					lines.splice(lineFrom, 1);
					removedLines++;
					cursor.place(lineFrom-1, previousLineLength);
				}
			}
			else
			{

				lines[lineFrom] = line.slice(0, cursor.columnFrom - 1) + line.slice(cursor.columnFrom);
				cursor.place(lineFrom, column-1);
			}
		}

		_EnsureCursorVisible();
	}

	function _Enter()
	{
		_TriggerChange();

		_DeleteSelection();
		var lines = _Document.lines;
		var linesAdded = 0;
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			if(!cursor.hasRange)
			{
				var lineFrom = cursor.lineFrom + linesAdded;
				var line = lines[lineFrom];
				var column = cursor.columnFrom;

				var remainingLine = line.slice(0, cursor.columnFrom);

				// find remaining line first non white space character
				var firstNonWhiteIndex = -1;
				var firstNonWhiteCode = -1;
				for(var j = 0; j < remainingLine.length && firstNonWhiteIndex === -1; j++)
				{
					var c = remainingLine.charCodeAt(j);
					switch(c)
					{
						case 9: // Tab
						case 32: // space
							break;
						default:
							firstNonWhiteIndex = j;
							firstNonWhiteCode = c;
							break;
					}
				}
				var prepend = "";
				if(firstNonWhiteIndex !== -1)
				{
					prepend = remainingLine.slice(0, firstNonWhiteIndex);
					if(firstNonWhiteCode === 123)
					{
						prepend += _Document.tab;	
					}
				}

				lines[lineFrom] = remainingLine;
				lines.splice(lineFrom+1, 0, prepend+line.slice(cursor.columnFrom));
				linesAdded++;
				cursor.place(lineFrom+1, prepend.length);
			}
		}

		_EnsureCursorVisible();
	}

	function _DeleteSelection()
	{
		var linesRemoved = 0;
		var lastLine = -1;
		var columnsRemoved = 0;
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];

			var lines = _Document.lines;

			var lineFrom = cursor.lineFrom - linesRemoved;
			var lineTo = cursor.lineTo - linesRemoved;
			if(lineFrom !== lastLine)
			{
				columnsRemoved = 0;
			}
			lastLine = lineTo;
			

			var columnsRemovedThisIteration = 0;

			if(lineFrom == lineTo)
			{
				// ---XXX----
				var line = lines[lineFrom];
				lines[lineFrom] = line.slice(0, cursor.columnFrom - columnsRemoved) + line.slice(cursor.columnTo - columnsRemoved);
				columnsRemovedThisIteration = cursor.columnTo - cursor.columnFrom;
			}
			else
			{
				// ---XXXXXX
				// XXXXXXXXX
				// XXXXX----
				lines[lineFrom] = lines[lineFrom].slice(0, cursor.columnFrom - columnsRemoved) + lines[lineTo].slice(cursor.columnTo);
				columnsRemovedThisIteration = cursor.columnTo;

				var rem = lineTo-lineFrom;
				linesRemoved += rem;
				lines.splice(lineFrom+1, rem);
			}

			cursor.place(lineFrom, cursor.columnFrom - columnsRemoved);
			columnsRemoved += columnsRemovedThisIteration;
		}
		_Hydrogen.scheduleUpdate();
	}

	function _ReplaceSelectionWith(text, transformer)
	{
		_TriggerChange();
		// Not really necessary to call this again, no?
		_ValidateCursors();

		_DeleteSelection();

		if(text.length)
		{
			var lastLine = -1;
			var columnsAdded = 0;
			var linesAdded = 0;
			var insertLines = text.split(_Document.lineBreak);
			for(var i = 0; i < _Cursors.length; i++)
			{
				var cursor = _Cursors[i];

				var lines = _Document.lines;
				
				var lineFrom = cursor.lineFrom + linesAdded;
				var lineTo = cursor.lineTo + linesAdded;

				var line = lines[lineFrom];
				if(lineFrom !== lastLine)
				{
					columnsAdded = 0;
				}
				lastLine = cursor.lineTo;

				if(insertLines.length === 1)
				{
					var insertText = text;
					if(transformer)
					{
						insertText = transformer(text, cursor.clone(linesAdded, columnsAdded));
					}
					lines[lineFrom] = line.slice(0, cursor.columnFrom + columnsAdded) + insertText + line.slice(cursor.columnTo + columnsAdded);
					columnsAdded += insertText.length;
					cursor.place(lineFrom, cursor.columnFrom + columnsAdded);	
				}
				else
				{
					lines[lineFrom] = line.slice(0, cursor.columnFrom + columnsAdded) + insertLines[0];// + line.slice(cursor.columnTo + columnsAdded);
					for(var j = 1; j < insertLines.length-1; j++)
					{
						lines.splice(lineFrom+j, 0, insertLines[j]);
					}
					var lastInsertLineStart = insertLines[insertLines.length-1];
					lines.splice(lineFrom+insertLines.length-1, 0, lastInsertLineStart + line.slice(cursor.columnTo + columnsAdded));
					linesAdded += insertLines.length-1;
					cursor.place(lineFrom+insertLines.length-1, lastInsertLineStart.length);
				}
			}
		}

		_EnsureCursorVisible();
	}

	function _ApplyJournalEntry(entry, cursors)
	{
		_Document.setContents(entry.text, true);
		_Cursors.length = 0;
		for(var i = 0; i < cursors.length; i++)
    	{
    		var cursorData = cursors[i];
    		_Cursors.push(new Cursor(cursorData));
    	}
		_ClampScroll();
		_ValidateCursors();
		_EnsureCursorVisible();
		_Hydrogen.scheduleUpdate();
	}

	function _Undo()
	{
		_ChangeComplete();
		if(_JournalIndex < 1)
		{
			return;
		}
		var entry = _Journal[_JournalIndex-1];
		_JournalIndex--;
		_ApplyJournalEntry(entry, entry.undoCursors);
		//console.log("UNDO", _Journal.length, _JournalIndex);
	}

	function _Redo()
	{
		_ChangeComplete();
		if(_JournalIndex == _Journal.length-1)
		{
			return;
		}
		var entry = _Journal[_JournalIndex+1];
		_JournalIndex++;
		_ApplyJournalEntry(entry, entry.redoCursors);
		//console.log("REDO", _Journal.length, _JournalIndex);
	}

	function _OnKeyPress(evt)
	{
		console.log("KEY PRESS", evt.keyCode, evt);
		
		switch(evt.keyCode)
		{
			case 13: // Enter
				_Enter();
				return true;
			case 46: // Delete
				_ReplaceSelectionWith("");
				return true;
		}

		if(evt.charCode)
		{
			var str = String.fromCharCode(evt.charCode);
			_ReplaceSelectionWith(str);
			console.log(str);
			return true;
		}
		
		return false;
	}

	function _OnMouseUp(evt, rx, ry)
	{
		_IsDragging = false;
		_ScrollYVelocity = 0;
		_ValidateCursors();
		_EnsureCursorVisible(true);
		_Hydrogen.scheduleUpdate();
	}

	function _OnMouseWheel(evt)
	{
		_ScrollY -= evt.deltaY / 2.0;
		_ScrollX -= evt.deltaX / 2.0;

		_ClampScroll();
		_ScrollYVelocity = 0;
		_Hydrogen.scheduleUpdate();
	}


	function _MoveCursors(x, y, span, noWrap)
	{
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			cursor.move(x, y, _Document, span, noWrap);
			if(x !== 0)
			{
				cursor.setPlacedColumn(_Document);
			}
		}
		_ValidateCursors();
		_EnsureCursorVisible(true);
		_Hydrogen.scheduleUpdate();
	}

	function _CursorUp(span)
	{
		_MoveCursors(0, -1, span);	
	}

	function _CursorDown(span)
	{
		_MoveCursors(0, 1, span);	
	}

	function _CursorLeft(span)
	{
		_MoveCursors(-1, 0, span);
	}

	function _CursorRight(span)
	{
		_MoveCursors(1, 0, span);
	}

	function _CursorWordLeft(span)
	{
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			cursor.wordBoundary(-1, _Document,span); 
		}
		_ValidateCursors();
		_EnsureCursorVisible(true);
		_Hydrogen.scheduleUpdate();
	}

	function _CursorWordRight(span)
	{
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			cursor.wordBoundary(1, _Document, span);
		}
		_ValidateCursors();
		_EnsureCursorVisible(true);
		_Hydrogen.scheduleUpdate();
	}

	function _CursorHome(span)
	{
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			cursor.home(_Document, span);
		}
		_ValidateCursors();
		_EnsureCursorVisible(true);
		_Hydrogen.scheduleUpdate();
	}

	function _CursorEnd(span)
	{
		_MoveCursors(Number.MAX_SAFE_INTEGER, 0, span, true);
	}

	function _CursorPageDown(span)
	{
		var y = _Document.lines.length-1;
		var x =  _Document.lines[y].length;
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			cursor.moveTo(x, y, _Document, span);
		}
		_ValidateCursors();
		_EnsureCursorVisible(true);
		_Hydrogen.scheduleUpdate();
	}

	function _CursorPageUp(span)
	{
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			cursor.moveTo(0, 0, _Document, span);
		}
		_ValidateCursors();
		_EnsureCursorVisible(true);
		_Hydrogen.scheduleUpdate();
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
		var t = line;
		var tl = t.length;
		var x = 0;
		var numTabSpaces = _Document.numTabSpaces;
		for(var i = start; i < end; i++)
		{
			var c = t.charCodeAt(i);
			switch(c)
			{
				case 9:
					x += columnWidth * numTabSpaces;
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
		var t = line;
		var tl = t.length;

		var first = -1;
		var firstX = 0;
		var last = tl-1;
		var x = 0;

		var numTabSpaces = _Document.numTabSpaces;

		for(var i = 0; i < tl; i++)
		{
			var c = t.charCodeAt(i);
			var lx = x;
			switch(c)
			{
				case 9:
					x += columnWidth * numTabSpaces;
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
					x += columnWidth * numTabSpaces;
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


	function _Advance(elapsed)
	{
		if(_ScrollYVelocity != 0.0)
		{
			_ScrollY += _ScrollYVelocity * elapsed;
			_ClampScroll();
			if(_IsDragging)
			{
				_DragCursor(Math.min(_Width, Math.max(0, _MouseX)), Math.min(_Height, Math.max(0, _MouseY)));
			}
		}

		var targetScrollY = Math.round(_ScrollY);
		var targetScrollX = Math.round(_ScrollX);

		var dx = targetScrollX - _RenderScrollX;
		var dy = targetScrollY - _RenderScrollY;

		var keepRendering = false;

		var ds = Math.min(1.0, elapsed*30);

		if(Math.abs(dx) < 0.2)
		{
			_RenderScrollX = targetScrollX;
		}
		else
		{
			_RenderScrollX += dx * ds;
			keepRendering = true;
		}
		if(Math.abs(dy) < 0.2)
		{
			_RenderScrollY = targetScrollY;
		}
		else
		{
			_RenderScrollY += dy * ds;
			keepRendering = true;
		}

		return keepRendering;
	}

	function _Draw(graphics)
	{
		if(!_Document)
		{
			return;
		}
		//_ScrollX -= 0.2;
		//drawCount++;

		graphics.setTabSpaces(_Document.numTabSpaces);
		var lines = _Document.lines;

		var maxLabelWidth = _Document.maxLineDigits * _Font.horizontalAdvance;
		var gutter = _GutterPadding + maxLabelWidth + _GutterPadding;

		var glyphMap = _Font.map;
		var lineHeight = Math.round(_Font.lineHeight * _LineHeightScale);
		var cursorHeight = _Font.lineHeight;
		var maxDescender = _Font.maxDescender;
		var baseLine = lineHeight + maxDescender;

		var renderScrollY = _RenderScrollY;
		var renderScrollX = _RenderScrollX;
		
		var contentHeight = lines.length * lineHeight;
		var visibleLines = Math.round(_Height / lineHeight) + 1;
		var firstLine = Math.floor(-renderScrollY / lineHeight);
		var lastLine = Math.min(firstLine + visibleLines, lines.length-1);
		var firstLineOrigin = renderScrollY % lineHeight;

		var columnWidth = _Font.horizontalAdvance;
		var visibleColumns = Math.round(_Width / columnWidth) + 1;
		var y = _Y+firstLineOrigin;

		graphics.pushClip(_X, _Y, _Width, _Height);

		// Draw focused line backgrounds.
		var lastCursorLine = -1;
		for(var i = 0; i < _Cursors.length; i++)
		{
			var cursor = _Cursors[i];
			if(cursor.hasRange)
			{
				continue;
			}
			if(lastCursorLine == cursor.lineFrom)
			{
				continue;
			}
			lastCursorLine = cursor.lineFrom;
			var startY = Math.round(_Y + renderScrollY + cursor.lineFrom * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0);
			graphics.drawRect(0, startY, _Width, lineHeight, 1.0, _HighlightColor);
		}

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
						endX = _X + gutter + renderScrollX + _LineWidth(line, 0, line.length) + columnWidth;//(line.length+1) * columnWidth;
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
			//else
			//{
			//	var startY = Math.round(_Y + renderScrollY + cursor.lineFrom * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0);
			//	graphics.drawRect(0, startY, _Width, lineHeight, 1.0, _HighlightColor);
			//}
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

				var visRange = _VisibleColumns(line, -renderScrollX, _Width - renderScrollX);

				var x = visRange.firstX;//_X+gutter+firstColumnOrigin;

				graphics.drawText(renderScrollX+gutter+x, y+baseLine, line, visRange.first, visRange.last);
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
					var label = (i+1).toString();
					graphics.drawText(x - (label.length*_Font.horizontalAdvance), y+baseLine, label);

					y += lineHeight;
				}
			}
		}
		graphics.popClip();
		graphics.popClip();
		
	}

	this.place = _Place;
	this.openFile = _OpenFile;
	this.onMouseWheel = _OnMouseWheel;
	this.onMouseDown = _OnMouseDown;
	this.onMouseMove = _OnMouseMove;
	this.onMouseUp = _OnMouseUp;
	this.onKeyPress = _OnKeyPress;
	this.onPaste = _OnPaste;
	this.onCopy = _OnCopy;
	this.onCut = _OnCut;
	this.setFont = _SetFont;
	this.advance = _Advance;
	this.draw = _Draw;
	this.undo = _Undo;
	this.redo = _Redo;
	this.backspace = _Backspace;
	this.cursorUp = _CursorUp;
	this.cursorDown = _CursorDown;
	this.cursorLeft = _CursorLeft;
	this.cursorRight = _CursorRight;
	this.cursorWordLeft = _CursorWordLeft;
	this.cursorWordRight = _CursorWordRight;
	this.cursorHome = _CursorHome;
	this.cursorEnd = _CursorEnd;
	this.cursorPageDown = _CursorPageDown;
	this.cursorPageUp = _CursorPageUp;
}