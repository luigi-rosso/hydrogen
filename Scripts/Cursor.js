function Cursor(data)
{
	var _LineFrom = 0;
	var _LineTo = 0;
	var _ColumnFrom = 0;
	var _ColumnTo = 0;
    var _AtEnd = false;

    if(data)
    {
        _LineFrom = data.lineFrom;
        _LineTo = data.lineTo;
        _ColumnFrom = data.columnFrom;
        _ColumnTo = data.columnTo;
        _AtEnd = data.atEnd;
    }


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

    this.serialize = function()
    {
        return {
            lineFrom:_LineFrom,
            lineTo:_LineTo,
            columnFrom:_ColumnFrom,
            columnTo:_ColumnTo,
            atEnd:_AtEnd
        };
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
}