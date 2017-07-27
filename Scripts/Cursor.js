export default class Cursor
{
    constructor(data)
    {
        this._LineFrom = 0;
        this._LineTo = 0;
        this._ColumnFrom = 0;
        this._ColumnTo = 0;
        this._PlacedColumnMonoSpaces = 0;
        this._AtEnd = false;

        if(data)
        {
            this._LineFrom = data.lineFrom;
            this._LineTo = data.lineTo;
            this._ColumnFrom = data.columnFrom;
            this._ColumnTo = data.columnTo;
            this._AtEnd = data.atEnd;
            this._PlacedColumnMonoSpaces = data.placedColumnMonoSpaces;
        }
    }

	get hasRange()
    {
        return this._LineFrom != this._LineTo || this._ColumnFrom != this._ColumnTo;
    }

    get lineFrom()
    {
        return this._LineFrom;
    }

    get lineAt()
    {
        return this._AtEnd ? this._LineTo : this._LineFrom;
    }

    get atEnd()
    {
        return this._AtEnd;
    }

    setPlacedColumn(doc)
    {
        let lines = doc.lines;
        if(this._AtEnd)
        {
            this._PlacedColumnMonoSpaces = this._GetRowMonoSpaces(lines[this._LineTo], this._ColumnTo, doc.numTabSpaces);
        }
        else
        {
            this._PlacedColumnMonoSpaces = this._GetRowMonoSpaces(lines[this._LineFrom], this._ColumnFrom, doc.numTabSpaces);
        }        
    }

    get lineTo()
    {
        return this._LineTo;
    }

    get columnFrom()
    {
        return this._ColumnFrom;
    }

    get columnTo()
    {
        return this._ColumnTo;
    }

    get line()
    {
        return this._AtEnd ? this._LineTo : this._LineFrom;
    }

    get column()
    {
        return this._AtEnd ? this._ColumnTo : this._ColumnFrom;
    }

    place(line, column)
    {
		this._LineFrom = this._LineTo = line;
		this._ColumnFrom = this._ColumnTo = column;
		this._AtEnd = true;
    }

    _UnmaskChar(c)
    {
        // Last 11 bits in the mask represent the color.
        // By shifting and 0-filling the old positions we can retrieve the current char.
        let codePoint = (c << 11) >>> 11;
        return codePoint;
    }

    serialize()
    {
        return {
            lineFrom:this._LineFrom,
            lineTo:this._LineTo,
            columnFrom:this._ColumnFrom,
            columnTo:this._ColumnTo,
            atEnd:this._AtEnd,
            placedColumnMonoSpaces:this._PlacedColumnMonoSpaces
        };
    }

    spanWord(doc)
    {
        let line = doc.lines[this._LineFrom];
        // let c = line.charCodeAt(this._ColumnTo);
        let c = line[this._ColumnTo];
        c = this._UnmaskChar(c);

        if(this._IsSpace(c))
        {
            this._ColumnFrom = this._FindFirstNonSpace(this._ColumnTo, -1, line)+1;
            this._ColumnTo = this._FindFirstNonSpace(this._ColumnTo, 1, line);
        }
        else if(this._IsSymbol(c))
        {
            this._ColumnFrom = this._FindFirstNonSymbol(this._ColumnTo, -1, line)+1;
            this._ColumnTo = this._FindFirstNonSymbol(this._ColumnTo, 1, line);
        }
        else
        {
            this._ColumnFrom = this._FindNonWordCharacter(this._ColumnTo, -1, line)+1;
            this._ColumnTo = this._FindNonWordCharacter(this._ColumnTo, 1, line);
        }
    }

    span(lineFrom, columnFrom, lineTo, columnTo, atEnd)
    {
        let s = this.serialize();
		let fromIsHit = atEnd === undefined;
		if(fromIsHit)
		{
			this._AtEnd = false;
		}
		else
		{
			this._AtEnd = atEnd;	
		}


		this._LineFrom = lineFrom;
		this._LineTo = lineTo;

		this._ColumnFrom = columnFrom;
		this._ColumnTo = columnTo;

        let tmp;

		if(this._LineTo < this._LineFrom)
		{
			tmp = this._LineFrom;
			this._LineFrom = this._LineTo;
			this._LineTo = tmp;

			tmp = this._ColumnFrom;
			this._ColumnFrom = this._ColumnTo;
			this._ColumnTo = tmp;

			// Selected upwards, move cursor to start.
			this._AtEnd = !this._AtEnd;
		}
		else if(this._LineTo == this._LineFrom && columnTo < columnFrom)
		{
			tmp = this._ColumnFrom;
			this._ColumnFrom = this._ColumnTo;
			this._ColumnTo = tmp;

			// Went backwards on same line.
			this._AtEnd = !this._AtEnd;
		}

        let s2 = this.serialize();

        for(let k in s)
        {
            if(s[k] !== s2[k])
            {
                // changed
                return true;
            }
        }
        // same
        return false;
    }

    clone(offsetLines, offsetColumns)
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
            lineFrom:this._LineFrom+offsetLines,
            lineTo:this._LineTo+offsetLines,
            columnFrom:this._ColumnFrom+offsetColumns,
            columnTo:this._ColumnTo+offsetColumns,
            atEnd:this._AtEnd
        });
    }

    _GetRowMonoSpaces(line, x, numTabSpaces)
    {
        let monoSpaces = 0;
        for(let i = 0; i < x; i++)
        {
            // let c = line.charCodeAt(i);
            let c = line[i];
            c = this._UnmaskChar(c);

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

    _GetFirstEmptyColumn(line)
    {
        let ll = line.length;
        for(let i = 0; i < ll; i++)
        {
            // let c = line.charCodeAt(i);
            let c = line[i];
            c = this._UnmaskChar(c);

            switch(c)
            {
                case 9:
                case 32:
                    break;
                default:
                    return i;
                    // break;
            }
        }
        return 0;
    }

    _GetRowColumn(line, spaces, numTabSpaces)
    {
        let monoSpaces = 0;
        let ll = line.length;
        for(let i = 0; i < ll; i++)
        {
            // let c = line.charCodeAt(i);
            let c = line[i];
            c = this._UnmaskChar(c);

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

    _IsSpace(c)
    {
        c = this._UnmaskChar(c);
        switch(c)
        {
            case 9:
            case 32:
                return true;
                // break;
        }
        return false;
    }

    _IsSymbol(c)
    {
        c = this._UnmaskChar(c);

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

    _FindFirstNonSymbol(col, inc, line)
    {
        let end = inc > 0 ? line.length : -1;
        for(let i = col; i != end; i+=inc)
        {
            // let c = line.charCodeAt(i);
            let c = line[i];
            c = this._UnmaskChar(c);
            
            if(this._IsSymbol(c))
            {
                continue;
            }
            return i;
        }
        return end;
    }

    _FindNonWordCharacter(col, inc, line)
    {
        let end = inc > 0 ? line.length : -1;
        for(let i = col; i != end; i+=inc)
        {
            // let c = line.charCodeAt(i);
            let c = line[i];
            c = this._UnmaskChar(c);

            if(this._IsSymbol(c))
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

    _FindFirstNonSpace(col, inc, line)
    {
        let end = inc > 0 ? line.length : -1;
        for(let i = col; i != end; i+=inc)
        {
            // let c = line.charCodeAt(i);
            let c = line[i];
            c = this._UnmaskChar(c);

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

    wordBoundary(inc, doc, span)
    {
        let lines = doc.lines;
        let line = lines[this._AtEnd ? this._LineTo : this._LineFrom];
        let col = this._AtEnd ? this._ColumnTo : this._ColumnFrom;

        if(col === 0 && inc < 0)
        {
            this.move(-1, 0, doc, span);
            return;
        }
        else if(col === line.length && inc > 0)
        {
            this.move(1, 0, doc, span);
            return;
        }
        if(inc === -1)
        {
            col--;
        }
        
        let c = line[col];
        c = this._UnmaskChar(c);

        if(this._IsSpace(c))
        {
            col = this._FindFirstNonSpace(col, inc, line);
        }
        else if(this._IsSymbol(c))
        {
            col = this._FindFirstNonSymbol(col, inc, line);
        }
        else
        {
            col = this._FindNonWordCharacter(col, inc, line);
        }

        if(inc === -1)
        {
            col++;
        }

        if(this._AtEnd)
        {
            let line = lines[this._LineTo];
            let colTo = col;

            if(span)
            {
                this.span(this._LineFrom, this._ColumnFrom, this._LineTo, colTo, this._AtEnd);
            }
            else
            {
                this._LineFrom = this._LineTo;
                this._ColumnFrom = this._ColumnTo = colTo;
            }
        }
        else
        {
            let line = lines[this._LineFrom];
            let colFrom = col;
            if(span)
            {
                this.span(this._LineFrom, colFrom, this._LineTo, this._ColumnTo, this._AtEnd);
            }
            else
            {
                this._LineTo = this._LineFrom;
                this._ColumnFrom = this._ColumnTo = colFrom;
            }
        }
        this.setPlacedColumn(doc);
    }

    home(doc, span)
    {
        let lines = doc.lines;
        
        if(this._AtEnd)
        {
            let line = lines[this._LineTo];
            let colTo = this._GetFirstEmptyColumn(line);
            if(colTo === this._ColumnTo)
            {
                colTo = 0;
            }
            if(span)
            {
                this.span(this._LineFrom, this._ColumnFrom, this._LineTo, colTo, this._AtEnd);
            }
            else
            {
                this._LineFrom = this._LineTo;
                this._ColumnFrom = this._ColumnTo = colTo;
            }
        }
        else
        {
            let line = lines[this._LineFrom];
            let colFrom = this._GetFirstEmptyColumn(line);
            if(colFrom === this._ColumnFrom)
            {
                colFrom = 0;
            }
            if(span)
            {
                this.span(this._LineFrom, colFrom, this._LineTo, this._ColumnTo, this._AtEnd);
            }
            else
            {
                this._LineTo = this._LineFrom;
                this._ColumnFrom = this._ColumnTo = colFrom;
            }
        }
        this.setPlacedColumn(doc);
    }

    moveTo(x, y, doc, span)
    {
        let lines = doc.lines;
        let maxY = lines.length-1;

        y = Math.min(maxY, Math.max(0, y));
        x = Math.min(lines[y].length, Math.max(0, x));

        if(this._AtEnd)
        {
            let line = lines[this._LineTo];
            
            if(span)
            {
                this.span(this._LineFrom, this._ColumnFrom, y, x, this._AtEnd);
            }
            else
            {
                this._LineFrom = this._LineTo = y;
                this._ColumnFrom = this._ColumnTo = x;
            }
        }
        else
        {
            let line = lines[this._LineFrom];
            if(span)
            {
                this.span(y, x, this._LineTo, this._ColumnTo, this._AtEnd);
            }
            else
            {
                this._LineTo = this._LineFrom = y;
                this._ColumnFrom = this._ColumnTo = x;
            }
        }

        this.setPlacedColumn(doc);
    }

    move(x, y, doc, span, noWrap)
    {
        let lines = doc.lines;
        let maxY = lines.length-1;
        let setPlaced = false;
        if(this._AtEnd)
        {
            let lineTo = Math.max(0, Math.min(maxY, this._LineTo+y));
            let maxX = lines[lineTo].length;
            let colTo = this._ColumnTo+x;//Math.max(0, Math.min(maxX, _ColumnTo+x));
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
                //let monoSpaces = _GetRowMonoSpaces(lines[_LineTo], _ColumnTo, doc.numTabSpaces);
                colTo = this._GetRowColumn(lines[lineTo], this._PlacedColumnMonoSpaces, doc.numTabSpaces);
            }
            if(span)
            {
                this.span(this._LineFrom, this._ColumnFrom, lineTo, colTo, this._AtEnd);
            }
            else
            {
                this._LineFrom = this._LineTo = lineTo;
                this._ColumnFrom = this._ColumnTo = colTo;
            }
        }
        else
        {
            let lineFrom = Math.max(0, Math.min(maxY, this._LineFrom+y));
            let maxX = lines[lineFrom].length;
            let colFrom = this._ColumnFrom+x;
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
                //let monoSpaces = _GetRowMonoSpaces(lines[_LineFrom], this._ColumnFrom, doc.numTabSpaces);
                colFrom = this._GetRowColumn(lines[lineFrom], this._PlacedColumnMonoSpaces, doc.numTabSpaces);
            }
            if(span)
            {
                this.span(lineFrom, colFrom, this._LineTo, this._ColumnTo, this._AtEnd);
            }
            else
            {
                this._LineFrom = this._LineTo = lineFrom;
                this._ColumnFrom = this._ColumnTo = colFrom;
            }
        }

        if(setPlaced)
        {
            this.setPlacedColumn(doc);
        }
    }
}