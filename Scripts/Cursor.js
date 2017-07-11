function Cursor(data)
{
	var _LineFrom = 0;
	var _LineTo = 0;
	var _ColumnFrom = 0;
	var _ColumnTo = 0;
    var _PlacedColumnMonoSpaces = 0;
    var _AtEnd = false;

    if(data)
    {
        _LineFrom = data.lineFrom;
        _LineTo = data.lineTo;
        _ColumnFrom = data.columnFrom;
        _ColumnTo = data.columnTo;
        _AtEnd = data.atEnd;
        _PlacedColumnMonoSpaces = data.placedColumnMonoSpaces;
    }


	this.__defineGetter__("hasRange", function()
    {
        return _LineFrom != _LineTo || _ColumnFrom != _ColumnTo;
    });

    this.__defineGetter__("lineFrom", function()
    {
        return _LineFrom;
    });

    this.__defineGetter__("lineAt", function()
    {
        return _AtEnd ? _LineTo : _LineFrom;
    });

    this.__defineGetter__("atEnd", function()
    {
        return _AtEnd;
    });


    function _SetPlacedColumn(doc)
    {
        var lines = doc.lines;
        if(_AtEnd)
        {
            _PlacedColumnMonoSpaces = _GetRowMonoSpaces(lines[_LineTo], _ColumnTo, doc.numTabSpaces);
        }
        else
        {
            _PlacedColumnMonoSpaces = _GetRowMonoSpaces(lines[_LineFrom], _ColumnFrom, doc.numTabSpaces);
        }        
    };

    this.setPlacedColumn = _SetPlacedColumn;

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

    function _UnmaskChar(c)
    {
        // Last 11 bits in the mask represent the color.
        // By shifting and 0-filling the old positions we can retrieve the current char.
        let codePoint = (c << 11) >>> 11;
        return codePoint;
    }

    function _Serialize()
    {
        return {
            lineFrom:_LineFrom,
            lineTo:_LineTo,
            columnFrom:_ColumnFrom,
            columnTo:_ColumnTo,
            atEnd:_AtEnd,
            placedColumnMonoSpaces:_PlacedColumnMonoSpaces
        };
    };

    function _SpanWord(doc)
    {
        var line = doc.lines[_LineFrom];
        // var c = line.charCodeAt(_ColumnTo);
        let c = line[_ColumnTo];
        c = _UnmaskChar(c);

        if(_IsSpace(c))
        {
            _ColumnFrom = _FindFirstNonSpace(_ColumnTo, -1, line)+1;
            _ColumnTo = _FindFirstNonSpace(_ColumnTo, 1, line);
        }
        else if(_IsSymbol(c))
        {
            _ColumnFrom = _FindFirstNonSymbol(_ColumnTo, -1, line)+1;
            _ColumnTo = _FindFirstNonSymbol(_ColumnTo, 1, line);
        }
        else
        {
            _ColumnFrom = _FindNonWordCharacter(_ColumnTo, -1, line)+1;
            _ColumnTo = _FindNonWordCharacter(_ColumnTo, 1, line);
        }
    }

    function _Span(lineFrom, columnFrom, lineTo, columnTo, atEnd)
    {
        var s = _Serialize();
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

        var s2 = _Serialize();

        for(var k in s)
        {
            if(s[k] !== s2[k])
            {
                // changed
                return true;
            }
        }
        // same
        return false;
    };

    this.span = _Span;
    this.spanWord = _SpanWord;
    this.serialize = _Serialize;

    this.clone = function(offsetLines, offsetColumns)
    {
        if(!offsetLines)
        {
            offsetLines = 0;
        }
        if(!offsetColumns)
        {
            offsetColumns = 0;
        }
        return new Cursor({
            lineFrom:_LineFrom+offsetLines,
            lineTo:_LineTo+offsetLines,
            columnFrom:_ColumnFrom+offsetColumns,
            columnTo:_ColumnTo+offsetColumns,
            atEnd:_AtEnd
        });
    };

    function _GetRowMonoSpaces(line, x, numTabSpaces)
    {
        var monoSpaces = 0;
        for(var i = 0; i < x; i++)
        {
            // var c = line.charCodeAt(i);
            let c = line[i];
            c = _UnmaskChar(c);

            switch(c)
            {
                case 9:
                    monoSpaces += numTabSpaces;
                    break;
                default:
                    monoSpaces++;
                    break;
            }
        }
        return monoSpaces;
    }

    function _GetFirstEmptyColumn(line)
    {
        var ll = line.length;
        for(var i = 0; i < ll; i++)
        {
            // var c = line.charCodeAt(i);
            let c = line[i];
            c = _UnmaskChar(c);

            switch(c)
            {
                case 9:
                case 32:
                    break;
                default:
                    return i;
                    break;
            }
        }
        return 0;
    }

    function _GetRowColumn(line, spaces, numTabSpaces)
    {
        var monoSpaces = 0;
        var ll = line.length;
        for(var i = 0; i < ll; i++)
        {
            // var c = line.charCodeAt(i);
            let c = line[i];
            c = _UnmaskChar(c);

            switch(c)
            {
                case 9:
                    monoSpaces += numTabSpaces;
                    break;
                default:
                    monoSpaces++;
                    break;
            }

            if(monoSpaces > spaces)
            {
                return i;
            }
        }
        return ll;
    }

    function _IsSpace(c)
    {
        c = _UnmaskChar(c);
        switch(c)
        {
            case 9:
            case 32:
                return true;
                break;
        }
        return false;
    }

    function _IsSymbol(c)
    {
        c = _UnmaskChar(c);

        switch(c)
        {
            case 33: // !
            case 34: // ""
            case 35: // #
            case 36: // $
            case 37: // %
            case 38: // &
            case 39: // '
            case 40: // (
            case 41: // )
            case 42: // *
            case 43: // +
            case 44: // ,
            case 45: // -
            case 46: // .
            case 47: // /

            // numbers follow

            case 58: // :
            case 59: // ;
            case 60: // <
            case 61: // =
            case 62: // >
            case 63: // ?
            case 64: // @

            // letters follow

            case 91: // [
            case 92: // \
            case 93: // ]
            case 94: // ^
            // case 95: // _  underscores are word characters
            case 96: // backtick

            // lowercase letters follow

            case 123: // {
            case 124: // |
            case 125: // |
            case 126: // ~
                return true;

            default:
                return false;

        }
    }

    function _FindFirstNonSymbol(col, inc, line)
    {
        var end = inc > 0 ? line.length : -1;
        for(var i = col; i != end; i+=inc)
        {
            // var c = line.charCodeAt(i);
            let c = line[i];
            c = _UnmaskChar(c);
            
            if(_IsSymbol(c))
            {
                continue;
            }
            return i;
        }
        return end;
    }

    function _FindNonWordCharacter(col, inc, line)
    {
        var end = inc > 0 ? line.length : -1;
        for(var i = col; i != end; i+=inc)
        {
            // var c = line.charCodeAt(i);
            let c = line[i];
            c = _UnmaskChar(c);

            if(_IsSymbol(c))
            {
                return i;
            }

            switch(c)
            {
                case 9:
                case 32:
                    return i;
            }
        }
        return end;
    }

    function _FindFirstNonSpace(col, inc, line)
    {
        var end = inc > 0 ? line.length : -1;
        for(var i = col; i != end; i+=inc)
        {
            // var c = line.charCodeAt(i);
            let c = line[i];
            c = _UnmaskChar(c);

            switch(c)
            {
                case 9:
                case 32:
                    break;
                default:
                    return i;
            }
        }
        return end;
    }

    this.wordBoundary = function(inc, doc, span)
    {
        var lines = doc.lines;
        var line = lines[_AtEnd ? _LineTo : _LineFrom];
        var col = _AtEnd ? _ColumnTo : _ColumnFrom;

        if(col === 0 && inc < 0)
        {
            _Move(-1, 0, doc, span);
            return;
        }
        else if(col === line.length && inc > 0)
        {
            _Move(1, 0, doc, span);
            return;
        }
        if(inc === -1)
        {
            col--;
        }
        
        let c = line[col];
        c = _UnmaskChar(c);

        if(_IsSpace(c))
        {
            col = _FindFirstNonSpace(col, inc, line);
        }
        else if(_IsSymbol(c))
        {
            col = _FindFirstNonSymbol(col, inc, line);
        }
        else
        {
            col = _FindNonWordCharacter(col, inc, line);
        }

        if(inc === -1)
        {
            col++;
        }

        if(_AtEnd)
        {
            var line = lines[_LineTo];
            var colTo = col;

            if(span)
            {
                _Span(_LineFrom, _ColumnFrom, _LineTo, colTo, _AtEnd);
            }
            else
            {
                _LineFrom = _LineTo;
                _ColumnFrom = _ColumnTo = colTo;
            }
        }
        else
        {
            var line = lines[_LineFrom];
            var colFrom = col;
            if(span)
            {
                _Span(_LineFrom, colFrom, _LineTo, _ColumnTo, _AtEnd);
            }
            else
            {
                _LineTo = _LineFrom;
                _ColumnFrom = _ColumnTo = colFrom;
            }
        }
        _SetPlacedColumn(doc);
    };

    this.home = function(doc, span)
    {
        var lines = doc.lines;
        
        if(_AtEnd)
        {
            var line = lines[_LineTo];
            var colTo = _GetFirstEmptyColumn(line);
            if(colTo === _ColumnTo)
            {
                colTo = 0;
            }
            if(span)
            {
                _Span(_LineFrom, _ColumnFrom, _LineTo, colTo, _AtEnd);
            }
            else
            {
                _LineFrom = _LineTo;
                _ColumnFrom = _ColumnTo = colTo;
            }
        }
        else
        {
            var line = lines[_LineFrom];
            var colFrom = _GetFirstEmptyColumn(line);
            if(colFrom === _ColumnFrom)
            {
                colFrom = 0;
            }
            if(span)
            {
                _Span(_LineFrom, colFrom, _LineTo, _ColumnTo, _AtEnd);
            }
            else
            {
                _LineTo = _LineFrom;
                _ColumnFrom = _ColumnTo = colFrom;
            }
        }
        _SetPlacedColumn(doc);
    };

    function _MoveTo(x, y, doc, span)
    {
        var lines = doc.lines;
        var maxY = lines.length-1;

        y = Math.min(maxY, Math.max(0, y));
        x = Math.min(lines[y].length, Math.max(0, x));

        if(_AtEnd)
        {
            var line = lines[_LineTo];
            
            if(span)
            {
                _Span(_LineFrom, _ColumnFrom, y, x, _AtEnd);
            }
            else
            {
                _LineFrom = _LineTo = y;
                _ColumnFrom = _ColumnTo = x;
            }
        }
        else
        {
            var line = lines[_LineFrom];
            if(span)
            {
                _Span(y, x, _LineTo, _ColumnTo, _AtEnd);
            }
            else
            {
                _LineTo = _LineFrom = y;
                _ColumnFrom = _ColumnTo = x;
            }
        }

        _SetPlacedColumn(doc);
    }

    function _Move(x, y, doc, span, noWrap)
    {
        var lines = doc.lines;
        var maxY = lines.length-1;
        var setPlaced = false;
        if(_AtEnd)
        {
            var lineTo = Math.max(0, Math.min(maxY, _LineTo+y));
            var maxX = lines[lineTo].length;
            var colTo = _ColumnTo+x;//Math.max(0, Math.min(maxX, _ColumnTo+x));
            if(x !== 0)
            {
                if(noWrap)
                {
                    colTo = Math.max(0, Math.min(maxX, colTo));
                }
                else if(colTo < 0)
                {
                    if(lineTo === 0)
                    {
                        return;
                    }
                    lineTo = Math.max(0, Math.min(maxY, lineTo-1));
                    colTo = lines[lineTo].length;

                    // When the column changes, we want to set the place for pivoting (pivot column/placed column);
                    setPlaced = true;
                }
                else if(colTo > maxX)
                {
                    if(lineTo === maxY)
                    {
                        return;
                    }
                    lineTo = Math.max(0, Math.min(maxY, lineTo+1));
                    colTo = 0;

                    // When the column changes, we want to set the place for pivoting (pivot column/placed column);
                    setPlaced = true;
                }
            }
            else if(y !== 0)
            {
                //var monoSpaces = _GetRowMonoSpaces(lines[_LineTo], _ColumnTo, doc.numTabSpaces);
                colTo = _GetRowColumn(lines[lineTo], _PlacedColumnMonoSpaces, doc.numTabSpaces);
            }
            if(span)
            {
                _Span(_LineFrom, _ColumnFrom, lineTo, colTo, _AtEnd);
            }
            else
            {
                _LineFrom = _LineTo = lineTo;
                _ColumnFrom = _ColumnTo = colTo;
            }
        }
        else
        {
            var lineFrom = Math.max(0, Math.min(maxY, _LineFrom+y));
            var maxX = lines[lineFrom].length;
            var colFrom = _ColumnFrom+x;
            if(x !== 0)
            {
                if(noWrap)
                {
                    colFrom = Math.max(0, Math.min(maxX, colFrom));
                }
                else if(colFrom < 0)
                {
                    lineFrom = Math.max(0, Math.min(maxY, lineFrom-1));
                    colFrom = lines[lineFrom].length;

                    // When the column changes, we want to set the place for pivoting (pivot column/placed column);
                    setPlaced = true;
                }
                else if(colFrom > maxX)
                {
                    lineFrom = Math.max(0, Math.min(maxY, lineFrom+1));
                    colFrom = 0;

                    // When the column changes, we want to set the place for pivoting (pivot column/placed column);
                    setPlaced = true;
                }
            }
            else if(y !== 0)
            {
                //var monoSpaces = _GetRowMonoSpaces(lines[_LineFrom], _ColumnFrom, doc.numTabSpaces);
                colFrom = _GetRowColumn(lines[lineFrom], _PlacedColumnMonoSpaces, doc.numTabSpaces);
            }
            if(span)
            {
                _Span(lineFrom, colFrom, _LineTo, _ColumnTo, _AtEnd);
            }
            else
            {
                _LineFrom = _LineTo = lineFrom;
                _ColumnFrom = _ColumnTo = colFrom;
            }
        }

        if(setPlaced)
        {
            _SetPlacedColumn(doc);
        }
    };

    this.move = _Move;
    this.moveTo = _MoveTo;
}