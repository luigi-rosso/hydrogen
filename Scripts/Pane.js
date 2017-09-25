import bind from "bind";
import Cursor from "./Cursor.js";
import Document from "./Document.js";
import _ from "lodash/core";

export default class Pane
{
	constructor(hydrogen)
	{
		this._Hydrogen = hydrogen;
		this._X = 0;
		this._Y = 0;
		this._Width = 0;
		this.let = 0;

		this._X2 = 0;
		this._Y2 = 0;
		this._DragScrollMargin = 50;
		this._DoubleClickDelay = 300;
		this._HistoryCaptureDelay = 1000;

		this._UseDomCursor = true;
		this._DomCursors = [];
		this._IsBlinkingDisabled = false;
		this._JustInput = null;
		this._JustInputTimeout;

		this._Font;

		this._GutterPadding = 10.0;
		this._LineHeightScale = 1.5;
		this._CodeColor = [1.0, 1.0, 1.0, 1.0];
		this._CursorColor = [1.0, 0.7, 0.0, 1.0];
		this._LineLabelColor = [0.3, 0.3, 0.3, 1.0];
		this._SelectionColor = [0.2, 0.2, 0.2, 1.0];
		this._HighlightColor = [0.07, 0.07, 0.07, 1.0];

		this._ScrollX = 0.0;
		this._ScrollY = 0.0;
		this._RenderScrollX = 0.0;
		this._RenderScrollY = 0.0;
		this._ScrollYVelocity = 0.0;

		this._TriggeredScrollX = 0.0;
		this._TriggeredScrollY = 0.0;

		this._Document;

		this._Cursors = [];
		this._IsDragging = false;
		this._ChangeTimeout = null;


		this._Journal = [];
		this._JournalIndex = -1;

		this._LastMouseDown = Date.now();

		this._MouseX = 0;
		this._MouseY = 0;
	}
	
	setFont(font)
	{
		this._Font = font;
		this._ClampScroll();
		this._Hydrogen.scheduleUpdate();
	}

	@bind
	place(x, y, width, height)
	{
		this._X = Math.round(x);
		this._X2 = Math.round(x + width);
		this._Width = Math.round(width);
		this._Y = Math.round(y);
		this._Y2 = Math.round(y + height);
		this._Height = Math.round(height);

		this._ClampScroll();
		this._Hydrogen.scheduleUpdate();
	}

	@bind
	onDocumentContentsChanged()
	{
		clearTimeout(this._ChangeTimeout);
		this._CaptureJournalEntry();
		this._Hydrogen.scheduleUpdate();
	}

	@bind
	openFile(file)
	{
		this._Document = new Document(this, this._Hydrogen);
		/*this._Document.onContentsChange = function()
		{
			// let start = Date.now();
			// let lines = self._Document.lines;
			clearTimeout(self._ChangeTimeout);
			self._CaptureJournalEntry();
			self._Hydrogen.scheduleUpdate();
		};*/
		this._Document.fromFile(file);
		this._Cursors = [];
		this._ClampScroll();
		this._Hydrogen.scheduleUpdate();
	}

	_CaptureJournalEntry()
	{
		let txt = this._Document.text;

		let entry = {
			text:this._Document.text,
			redoCursors:[],
			undoCursors:[]
		};

		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			entry.redoCursors.push(cursor.serialize());
		}

		if(this._JournalIndex+1 < this._Journal.length)
		{
			this._Journal.splice(this._JournalIndex+1, this._Journal.length+1 - this._JournalIndex);
		}
		this._Journal.push(entry);
		this._JournalIndex = this._Journal.length-1;
	}

	clearCursors()
	{
		this._Cursors.length = 0;
		this._Hydrogen.scheduleUpdate();
	}

	get numCursors()
	{
		return this._Cursors.length;
	}

	serializeCursors()
	{
		let cursors = [];
		for(let cursor of this._Cursors)
		{
			cursors.push(cursor.serialize());
		}
		return cursors;
	}

	deserializeCursors(cursors)
	{
		this._Cursors.length = 0;
		for(let i = 0; i < cursors.length; i++)
		{
			let cursorData = cursors[i];
			this._Cursors.push(new Cursor(cursorData));
		}
		this._Hydrogen.scheduleUpdate();
	}

	onPaste(data)
	{
		let plainText = data.getData("text/plain");
		if(plainText && plainText.constructor === String)
		{
			this._ReplaceSelectionWith(plainText);
		}
	}

	_ConvertToText(intArray)
	{
		let result = "";
		for(let ti = 0; ti < intArray.length; ti++)
		{
			let codePoint = (intArray[ti] << 11) >>> 11;
			let char = String.fromCodePoint(codePoint);
			result += char;
		}

		return result;
	}

	onCopy()
	{
		let data = [];
		let lines = this._Document.lines;
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			if(cursor.hasRange)
			{
				if(cursor.lineFrom === cursor.lineTo)
				{
					let line = lines[cursor.lineFrom];
					let sel = this._ConvertToText(line.slice(cursor.columnFrom, cursor.columnTo));
					data.push(sel);
				}
				else
				{
					let sel = this._ConvertToText(lines[cursor.lineFrom].slice(cursor.columnFrom));
					data.push(sel);
					for(let j = cursor.lineFrom+1; j < cursor.lineTo; j++)
					{
						sel = this._ConvertToText(lines[j]);
						data.push(sel);
					}

					sel = this._ConvertToText(lines[cursor.lineTo].slice(0, cursor.columnTo));
					data.push(sel);
				}
			}
		}

		let finalData = data.length ? data.join(this._Document.lineBreak) : null;
		return finalData;
	}

	onCut()
	{
		let data = "";
		return data.length ? data : null;
	}

	_PositionToLocation(rx, ry)
	{
		let lines = this._Document.lines;

		let maxLabelWidth = this._Document.maxLineDigits * this._Font.horizontalAdvance;
		let gutter = this._GutterPadding + maxLabelWidth + this._GutterPadding;

		let lineHeight = Math.round(this._Font.lineHeight * this._LineHeightScale);
		let firstLine = Math.floor(-this._ScrollY / lineHeight);
		
		let firstLineOrigin = this._ScrollY % lineHeight;

		let hitLine = firstLine + Math.floor((ry - firstLineOrigin)/lineHeight);

		let columnWidth = this._Font.horizontalAdvance;

		if(hitLine >= lines.length)
		{
			return { line:lines.length-1, column:lines[lines.length-1].length };
		}
		else if(hitLine < 0)
		{
			return { line:0, column:0 };	
		}

		let line = lines[hitLine];

		let t = line;
		let tl = t.length;
		let x = this._ScrollX + gutter;
		let startX = x;

		let hitColumn = -1;

		if(rx < x)
		{
			return { line:hitLine, column:0 };
		}
		let numTabSpaces = this._Document.numTabSpaces;
		for(let i = 0; i < tl; i++)
		{
			let c = t[i];
			let lx = x;
			switch(c)
			{
				case 9:
					x = startX + Math.floor(((x-startX) / (numTabSpaces*columnWidth))+1)*(numTabSpaces*columnWidth);
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
		return { line:hitLine, column:hitColumn };
	}

	@bind
	onMouseDown(evt, rx, ry)
	{
		if(!this._Document)
		{
			return;
		}

		let now = Date.now();
		let spanWord = !this._IsDragging && (now-this._LastMouseDown < this._DoubleClickDelay || evt.altKey) && this._Cursors.length === 1;
		this._LastMouseDown = now;
		this._IsDragging = true;
		this._Hydrogen.captureMouse(this);
		this._Hydrogen.focus(this);

		let hit = this._PositionToLocation(rx, ry);
		if(!hit)
		{
			return;
		}

		let cursor = null;

		if(evt.shiftKey && this._Cursors.length > 0)
		{
			let cursorLine = 0;

			for(let i = 0; i < this._Cursors.length; i++)
			{
				let cur = this._Cursors[i];
				if(cursor.lineFrom > cursorLine)
				{
					cursorLine = cursor.lineFrom;
					cursor = cur;
				}
			}

			let line2 = hit.line;
			let column2 = hit.column;

			let minLine = cursor.lineFrom;
			let minColumn = cursor.columnFrom;
			let maxLine = cursor.lineTo;
			let maxColumn = cursor.columnTo;

			
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
				this._Cursors = [];
			}
			
			cursor = new Cursor();
			cursor.place(hit.line, hit.column);
			this._Cursors.push(cursor);

			if(spanWord)
			{
				cursor.spanWord(this._Document);
			}
			this._ValidateCursors();
		}

		cursor.setPlacedColumn(this._Document);
		this._EnsureCursorVisible(true);
		this._Hydrogen.scheduleUpdate();
	}

	_EnsureCursorVisible(closest)
	{
		if(this._Cursors.length === 0)
		{
			return;
		}

		let lines = this._Document.lines;
		let lineHeight = Math.round(this._Font.lineHeight * this._LineHeightScale);

		let renderScrollY = Math.round(this._ScrollY);
		let renderScrollX = Math.round(this._ScrollX);
		
		let contentHeight = lines.length * lineHeight;
		let visibleLines = Math.floor(this._Height / lineHeight);
		let firstLine = Math.ceil(-renderScrollY / lineHeight);
		let lastLine = Math.min(firstLine + visibleLines-1, lines.length-1); // visible lines - 1 as it's the last index

		let isCursorVisible = false;
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			if(cursor.lineAt >= firstLine && cursor.lineAt <= lastLine)
			{
				isCursorVisible = true;
				break;
			}
		}
		if(!isCursorVisible)
		{
			let cursor = this._Cursors[0];
			if(!closest)
			{
				this._ScrollY = -cursor.lineAt * lineHeight + this._Height/2;
			}
			else
			{
				let cursorTop = -cursor.lineAt * lineHeight;
				//let cursorBottom = this._Height - lineHeight - cursor.lineAt * lineHeight;

				let cursorHeight = this._Font.lineHeight;
				let startY = cursor.lineAt * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0;
				let cursorBottom = this._Height - lineHeight - startY;

				if(Math.abs(cursorTop - this._ScrollY) < Math.abs(cursorBottom - this._ScrollY))
				{
					this._ScrollY = cursorTop;
				}
				else
				{
					this._ScrollY = cursorBottom;
				}
			}
			this._ClampScroll();
			this._Hydrogen.scheduleUpdate();
		}
	}

	_ValidateCursors()
	{
		// Don't use .sort to do multi key sorting as it's not stable (elements with the same value may get swapped).
		// Use lodash to stable sort the cursors.
		this._Cursors = _.sortBy(this._Cursors, function(o) { return o.columnFrom; });
		this._Cursors = _.sortBy(this._Cursors, function(o) { return o.lineFrom; });

		// Merge overlaps.
		for(let i = 0; i < this._Cursors.length-1; i++)
		{
			let cursorA = this._Cursors[i];
			let cursorB = this._Cursors[i+1];
			//console.log("HERE", cursorA.serialize(), cursorB.serialize());

			if(cursorB.lineFrom < cursorA.lineTo || (cursorB.lineFrom == cursorA.lineTo && cursorB.columnFrom <= cursorA.columnTo))
			{
				cursorA.span(cursorA.lineFrom, cursorA.columnFrom, cursorB.lineTo, cursorB.columnTo);
				this._Cursors.splice(i+1, 1);
				i--;
			}
		}
	}

	_DragCursor(rx, ry)
	{
		let cursor = this._Cursors[0];
		if(!cursor.pivot)
		{
			cursor.pivot =
			{
				line: cursor.lineFrom,
				column: cursor.columnFrom
			};
		}

		let hit = this._PositionToLocation(rx, ry);

		//cursor.line = hit.line;
		//cursor.column = hit.column;
		
		let changed = cursor.span(hit.line, hit.column, cursor.pivot.line, cursor.pivot.column);
		let sv;
		if(ry <= this._DragScrollMargin)
		{
			let lineHeight = Math.round(this._Font.lineHeight * this._LineHeightScale);
			sv = lineHeight*25;
		}
		else if(ry >= this._Height - this._DragScrollMargin)
		{
			let lineHeight = Math.round(this._Font.lineHeight * this._LineHeightScale);
			sv = -lineHeight*25;
		}
		else
		{
			sv = 0;
		}

		if(this._ScrollYVelocity != sv)
		{
			this._ScrollYVelocity = sv;
			changed = true;
		}

		if(changed)
		{
			this._Hydrogen.scheduleUpdate();
		}
	}
	
	@bind
	onMouseMove(evt, rx, ry)
	{
		this._MouseX = rx;
		this._MouseY = ry;
		if(!this._IsDragging || this._Cursors.length == 0)
		{
			return;
		}
		this._IsDragging = true;

		this._DragCursor(rx, ry);
	}

	@bind
	_ChangeComplete()
	{
		if(this._ChangeTimeout)
		{
			clearTimeout(this._ChangeTimeout);
			this._ChangeTimeout = null;
			this._CaptureJournalEntry();
			this._Document.repaintLines();
		}
	}

	_TriggerChange()
	{
		if(!this._ChangeTimeout)
		{
			let lastEntry = this._Journal[this._JournalIndex];
			lastEntry.undoCursors.length = 0;
			for(let i = 0; i < this._Cursors.length; i++)
			{
				let cursor = this._Cursors[i];
				lastEntry.undoCursors.push(cursor.serialize());
			}
		}
		if(!this._ChangeTimeout)
		{
			this._ChangeTimeout = setTimeout(this._ChangeComplete, this._HistoryCaptureDelay);
		}
		
		this._TriggeredScrollX = this._ScrollX;
		this._TriggeredScrollY = this._ScrollY;
	}

	backspace()
	{
		this._TriggerChange();

		let nonRangeCursors = [];
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			if(!cursor.hasRange)
			{
				nonRangeCursors.push(cursor);
			}
		}
		this._DeleteSelection();
		let lines = this._Document.lines;
		let removedLines = 0;
		for(let i = 0; i < nonRangeCursors.length; i++)
		{
			let cursor = nonRangeCursors[i];
			let lineFrom = cursor.lineFrom - removedLines;
			let line = lines[lineFrom];
			let column = cursor.columnFrom;

			if(column === 0)
			{
				if(lineFrom > 0)
				{
					let previousLine = lines[lineFrom-1];
					let previousLineLength = previousLine.length;

					lines[lineFrom-1] = new Uint32Array(previousLine.length + lines[lineFrom].length);
					lines[lineFrom-1].set(previousLine);
					lines[lineFrom-1].set(lines[lineFrom], previousLine.length);

					// lines[lineFrom-1] = previousLine + lines[lineFrom];
					lines.splice(lineFrom, 1);
					removedLines++;
					cursor.place(lineFrom-1, previousLineLength);
				}
			}
			else
			{
				let start = line.slice(0, cursor.columnFrom - 1);
				let end = line.slice(cursor.columnFrom);
				lines[lineFrom] = new Uint32Array(start.length + end.length);
				lines[lineFrom].set(start);
				lines[lineFrom].set(end, start.length);

				// lines[lineFrom] = line.slice(0, cursor.columnFrom - 1) + line.slice(cursor.columnFrom);
				cursor.place(lineFrom, column-1);
			}
		}

		this._EnsureCursorVisible();
	}

	_Enter()
	{
		this._TriggerChange();

		this._DeleteSelection();
		let lines = this._Document.lines;
		let linesAdded = 0;
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			if(!cursor.hasRange)
			{
				let lineFrom = cursor.lineFrom + linesAdded;
				let line = lines[lineFrom];
				let column = cursor.columnFrom;

				let remainingLine = line.slice(0, cursor.columnFrom);

				// find remaining line first non white space character
				let firstNonWhiteIndex = -1;
				let firstNonWhiteCode = -1;
				for(let j = 0; j < column && firstNonWhiteIndex === -1; j++)
				{
					let c = (remainingLine[j] << 11) >>> 11;
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
				
				if(firstNonWhiteIndex === -1)
				{
					firstNonWhiteIndex = remainingLine.length;
				}
				
				let prepend = new Uint32Array();
				let extraSpace = 0;
				if(firstNonWhiteIndex !== -1)
				{
					prepend = remainingLine.slice(0, firstNonWhiteIndex);
					if(firstNonWhiteCode === 123) // Add a tab if first char is a '{' 
					{
						// prepend += _Document.tab;
						let pr = new Uint32Array(prepend.length + 1);
						pr.set(prepend);
						// pr.set(_Document._TabCodePoint, prepend.length);
						pr[prepend.length] = this._Document.tabCode;
						prepend = pr;

						// Check if it's followed by a matching '}'
						for(let j = column, firstNonWhiteIndex = -1; firstNonWhiteIndex === -1 && j < line.length; j++)
						{
							let c = (line[j] << 11) >>> 11;
							switch(c)
							{
								case 9: // Tab
								case 32: // space
									break;
								case 125:
									firstNonWhiteIndex = j;
									extraSpace = 1;
									lines.splice(lineFrom + 1, 0, prepend);
									prepend = new Uint32Array(prepend.slice(0, prepend.length-1));
									break;
							}
						}
					}
				}

				// Leave everything before the cursor untouched
				lines[lineFrom] = remainingLine;
				
				let append = line.slice(cursor.columnFrom);
				let enterLine = new Uint32Array(prepend.length + append.length);
				enterLine.set(prepend);
				enterLine.set(append, prepend.length);
				lines.splice(lineFrom+1+extraSpace, 0, enterLine);

				linesAdded++;
				cursor.place(lineFrom+1, prepend.length + extraSpace);
			}
		}

		this._EnsureCursorVisible();
	}

	_DeleteSelection()
	{
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let c = this._Cursors[i];
			console.log(i, c.serialize());
		}
		let lines = this._Document.lines;
		for(let i = this._Cursors.length-1; i >= 0; i--)
		{
			let cursor = this._Cursors[i];

			let lineFrom = cursor.lineFrom;
			let lineTo = cursor.lineTo;

			let columnChange = 0;
			if(lineFrom == lineTo)
			{
				// ---XXXX----
				let line = lines[lineFrom];
				let start = line.slice(0, cursor.columnFrom);
				let end = line.slice(cursor.columnTo);

				lines[lineFrom] = new Uint32Array(start.length + end.length);
				lines[lineFrom].set(start);
				lines[lineFrom].set(end, start.length);

				columnChange = start.length - cursor.columnTo;
			//	cursor.place(lineFrom, start.length);
			}
			else
			{
				// ---XXXXXX
				// XXXXXXXXX
				// XXXXX----
				let line = lines[lineFrom];
				let start = line.slice(0, cursor.columnFrom);
				let end = lines[lineTo].slice(cursor.columnTo);

				// lines[lineFrom] = start + lines[lineTo].slice(cursor.columnTo);
				lines[lineFrom] = new Uint32Array(start.length + end.length);
				lines[lineFrom].set(start);
				lines[lineFrom].set(end, start.length);
				let dbg = this._ConvertToText(lines[lineFrom]); // TODO remove: for debugging purposes only 

				columnChange = start.length - cursor.columnTo;

				let rem = lineTo-lineFrom;
				lines.splice(lineFrom+1, rem);

	//			cursor.place(lineFrom, start.length);
			}
/*
			for(let j = i+1; j < _Cursors.length; j++)
			{
				let nextCursor = _Cursors[j];
				if(nextCursor.lineFrom == lineFrom)
			}*/

			//cursor.place(lineFrom, cursor.columnFrom);
		}

		// Now fix up the cursors.
		let linesRemoved = 0;
		let lastLine = -1;
		let columnsRemoved = 0;
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];

			let lineFrom = cursor.lineFrom;
			let lineTo = cursor.lineTo;
			if(lineFrom !== lastLine)
			{
				columnsRemoved = 0;
			}
			lastLine = lineTo;
			

			let columnsRemovedThisIteration = 0;

			if(lineFrom == lineTo)
			{
				columnsRemovedThisIteration = cursor.columnTo - cursor.columnFrom;
				console.log("PLACE CA", i, lineFrom - linesRemoved, cursor.columnFrom - columnsRemoved);
				cursor.place(lineFrom - linesRemoved, cursor.columnFrom - columnsRemoved);
				columnsRemoved += columnsRemovedThisIteration;
			}
			else
			{
				let oldTo = cursor.columnTo;
				console.log("PLACE CB", lineFrom - linesRemoved, cursor.columnFrom - columnsRemoved, columnsRemoved, oldTo);
				let columnsGained = cursor.columnFrom - columnsRemoved;
				cursor.place(lineFrom - linesRemoved, cursor.columnFrom - columnsRemoved);
				let rem = lineTo-lineFrom;
				linesRemoved += rem;
				columnsRemoved = -columnsGained+oldTo;
			}
		}
		/*
		let linesRemoved = 0;
		let lastLine = -1;
		let columnsRemoved = 0;
		for(let i = 0; i < _Cursors.length; i++)
		{
			let cursor = _Cursors[i];

			let lines = _Document.lines;

			let lineFrom = cursor.lineFrom - linesRemoved;
			let lineTo = cursor.lineTo - linesRemoved;
			if(lineFrom !== lastLine)
			{
				columnsRemoved = 0;
			}
			lastLine = lineTo;
			

			let columnsRemovedThisIteration = 0;

			if(lineFrom == lineTo)
			{
				// ---XXX----
				let line = lines[lineFrom];
				lines[lineFrom] = line.slice(0, cursor.columnFrom - columnsRemoved) + line.slice(cursor.columnTo - columnsRemoved);
				columnsRemovedThisIteration = cursor.columnTo - cursor.columnFrom;
			}
			else
			{
				// ---XXXXXX
				// XXXXXXXXX
				// XXXXX----
				let start = lines[lineFrom].slice(0, cursor.columnFrom - columnsRemoved);
				lines[lineFrom] = start + lines[lineTo].slice(cursor.columnTo);
				columnsRemovedThisIteration = -columnsRemoved;//cursor.columnTo;

				let rem = lineTo-lineFrom;
				linesRemoved += rem;
				lines.splice(lineFrom+1, rem);
				console.log("LINES REMOVED", rem);

				// Find any cursor that was on line lineTo
				for(let j = i+1; j < _Cursors.length; j++)
				{
					let cursorCheck = _Cursors[j];
					if(cursorCheck.lineFrom === lineTo)
					{
						if(cursorCheck.lineTo === lineTo)
						{
							console.log("YE");
							cursorCheck.span(cursorCheck.lineFrom, cursorCheck.columnFrom - cursor.columnTo + start.length, cursorCheck.lineTo, cursorCheck.columnTo - cursor.columnTo + start.length, cursorCheck.atEnd);	
						}
						else
						{
							cursorCheck.span(cursorCheck.lineFrom, cursorCheck.columnFrom - cursor.columnTo + start.length, cursorCheck.lineTo, cursorCheck.columnTo, cursorCheck.atEnd);
						}
					}
				}
			}

			cursor.place(lineFrom, cursor.columnFrom - columnsRemoved);
			columnsRemoved += columnsRemovedThisIteration;
		}*/
		this._ValidateCursors();
		this._MarkJustInput();
		this._Hydrogen.scheduleUpdate();
	}

	_ReplaceSelectionWith(text)
	{
		this._TriggerChange();
		// Not really necessary to call this again, no?
		this._ValidateCursors();

		this._DeleteSelection();

		if(text.length)
		{
			let lastLine = -1;
			let columnsAdded = 0;
			let linesAdded = 0;

			// Convert current text to UTF8 code point representation.
			let insertTextLines = text.split(this._Document.lineBreak);
			let insertLines = [];
			
			for(let tl = 0; tl < insertTextLines.length; tl++)
			{
				let cur = insertTextLines[tl];
				let insertText = new Uint32Array(cur.length);
				for(let ti = 0; ti < cur.length; ti++)
				{
					insertText[ti] = cur.codePointAt(ti);
				}

				insertLines.push(insertText);
			}

			// let insertLines = text.split(_Document.lineBreak);

			for(let i = 0; i < this._Cursors.length; i++)
			{
				let cursor = this._Cursors[i];

				let lines = this._Document.lines;
				
				let lineFrom = cursor.lineFrom + linesAdded;
				let lineTo = cursor.lineTo + linesAdded;

				let line = lines[lineFrom];
				if(lineFrom !== lastLine)
				{
					columnsAdded = 0;
				}
				lastLine = cursor.lineTo;

				if(insertLines.length === 1)
				{
					let openBracket = insertLines[0][0] === 123 && insertLines[0].length === 1;
					let insertText;
					if(openBracket)
					{
						insertText = new Uint32Array(2);
						insertText.set([123,125]); // Open and closed brackets
					}
					else insertText = insertLines[0];

					let cbr = (line[cursor.columnFrom] << 11) >>> 11;
					if(insertLines[0][0] === 125 && insertLines[0].length === 1 && cbr === 125)
					{
						cursor.place(lineFrom, cursor.columnFrom + 1);
						// Upon closing bracket, skip insertion
						break;
					}	
					// let insertText = new Uint32Array(text.length);
					// for(let ti = 0; ti < text.length; ti++) insertText[ti] = text.codePointAt(ti);						

					// Inserting text into the new line
					/* 	
					let adjChar = line[cursor.columnFrom-1];
					let adjColorIdx = (adjChar) ? (adjChar >> 21) : 0;
					adjColorIdx = adjColorIdx << 21;
					if(!adjChar || !adjColorIdx) // If needed also check the following char 
					{
						adjChar = line[cursor.columnFrom+1];
						adjColorIdx = (adjChar) ? (adjChar >> 21) : 0;
						adjColorIdx = adjColorIdx << 21;
					}

					for(let tc = 0; tc < insertText.length; tc++)
					{
						insertText[tc] = insertText[tc] ^ adjColorIdx; // Add in the color 
					} 
					*/

					let firstPart = line.slice(0, cursor.columnFrom + columnsAdded);
					let secondPart = line.slice(cursor.columnTo + columnsAdded);
					// finalLine = firstPart + insertText + secondPart;
					let finalLine = new Uint32Array(firstPart.length + insertText.length + secondPart.length);
					finalLine.set(firstPart);
					finalLine.set(insertText, firstPart.length);
					finalLine.set(secondPart, firstPart.length + insertText.length);
					lines[lineFrom] = finalLine;

					this._Document.repaintLines(lineFrom);

					columnsAdded += openBracket ? 1 : insertText.length;
					cursor.place(lineFrom, cursor.columnFrom + columnsAdded);	
				}
				else
				{
					let start = line.slice(0, cursor.columnFrom + columnsAdded);
					lines[lineFrom] = new Uint32Array(start.length + insertLines[0].length);
					lines[lineFrom].set(start);
					lines[lineFrom].set(insertLines[0], start.length);
					this._Document.repaintLines(lineFrom);

					// lines[lineFrom] = line.slice(0, cursor.columnFrom + columnsAdded) + insertLines[0];// + line.slice(cursor.columnTo + columnsAdded);
					for(let j = 1; j < insertLines.length-1; j++)
					{
						let typedArrayInsert = new Uint32Array(insertLines[j].length);
						typedArrayInsert.set(insertLines[j]);
						lines.splice(lineFrom+j, 0, typedArrayInsert);
						this._Document.repaintLines(lineFrom+j);
					}

					let lastInsertLineStart = insertLines[insertLines.length-1];
					let lastInsertLineEnd = line.slice(cursor.columnTo + columnsAdded);
					let lastInsertLine = new Uint32Array(lastInsertLineStart.length + lastInsertLineEnd.length);
					lastInsertLine.set(lastInsertLineStart);
					lastInsertLine.set(lastInsertLineEnd, lastInsertLineStart.length);

					lines.splice(lineFrom+insertLines.length-1, 0, lastInsertLine);
					this._Document.repaintLines(lineFrom+insertLines.length-1);
					linesAdded += insertLines.length-1;
					cursor.place(lineFrom+insertLines.length-1, lastInsertLineStart.length);
				}
			}
		}

		this._EnsureCursorVisible();
	}

	_ApplyJournalEntry(entry, cursors)
	{
		this._Document.setContents(entry.text, true);
		this._Cursors.length = 0;
		for(let i = 0; i < cursors.length; i++)
		{
			let cursorData = cursors[i];
			this._Cursors.push(new Cursor(cursorData));
		}
		this._ClampScroll();
		this._ValidateCursors();
		this._EnsureCursorVisible();
		this._MarkJustInput();
		this._Hydrogen.scheduleUpdate();
	}

	undo()
	{
		this._ChangeComplete();
		if(this._JournalIndex < 1)
		{
			return;
		}
		let entry = this._Journal[this._JournalIndex-1];
		this._JournalIndex--;
		this._ApplyJournalEntry(entry, entry.undoCursors);
		//console.log("UNDO", _Journal.length, _JournalIndex);
	}

	redo()
	{
		this._ChangeComplete();
		if(this._JournalIndex == this._Journal.length-1)
		{
			return;
		}
		let entry = this._Journal[this._JournalIndex+1];
		this._JournalIndex++;
		this._ApplyJournalEntry(entry, entry.redoCursors);
		//console.log("REDO", _Journal.length, _JournalIndex);
	}

	doTab(back)
	{
		this._TriggerChange();
		this._ValidateCursors();

		//_DeleteSelection();

		let lastLine = -1;
		let columnsAdded = 0;
		let insertText = "\t";
		let lines = this._Document.lines;

		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];

			if(cursor.hasRange)
			{
				let backedFirst = false;
				let backedLast = false;
				for(let j = cursor.lineFrom; j <= cursor.lineTo; j++)
				{
					if(j !== lastLine)
					{
						if(back)
						{
							let line = lines[j];
							if(line.length > 0)
							{
								let c = line[0];
								switch(c)
								{
									case 32:
									case 9:
										lines[j] = lines[j].slice(1);
										if(j === cursor.lineFrom)
										{
											backedFirst = true;
										}
										if(j === cursor.lineTo)
										{
											backedLast = true;
										}
										break;
								}
							}
						}
						else
						{
							// lines[j] = insertText + lines[j];
							let prev = lines[j];
							lines[j] = new Uint32Array(prev.length + 1);
							lines[j][0] = 9;
							lines[j].set(prev, 1);
						}
						
						lastLine = j;
					}
				}
				if(back)
				{
					cursor.span(cursor.lineFrom, cursor.columnFrom+(backedFirst ? -1 : 0), cursor.lineTo, cursor.columnTo+(backedLast ? -1 : 0));
				}
				else
				{
					cursor.span(cursor.lineFrom, cursor.columnFrom+1, cursor.lineTo, cursor.columnTo+1);
				}
			}
			else
			{
				let lineFrom = cursor.lineFrom;
				let lineTo = cursor.lineTo;

				let line = lines[lineFrom];
				if(lineFrom !== lastLine)
				{
					columnsAdded = 0;
				}
				lastLine = cursor.lineTo;

				if(back)
				{
					if(line.length > 0)
					{
						if(cursor.columnFrom !== 0)
						{
							let c = line[cursor.columnFrom-1];
							switch(c)
							{
								case 32:
								case 9:
									let start 	= line.slice(0, cursor.columnFrom - 1 + columnsAdded);
									let end 	= line.slice(cursor.columnFrom + columnsAdded);
									lines[lineFrom] = new Uint32Array(start.length + end.length);
									lines[lineFrom].set(start);
									lines[lineFrom].set(end, start.length);
									// lines[lineFrom] = line.slice(0, cursor.columnFrom - 1 + columnsAdded) + line.slice(cursor.columnFrom + columnsAdded);
									columnsAdded--;
									cursor.place(lineFrom, cursor.columnFrom + columnsAdded);
									break;
							}
						}
						else
						{
							let c = line[cursor.columnFrom];
							switch(c)
							{
								case 32:
								case 9:
									let start = line.slice(0, cursor.columnFrom + columnsAdded);
									let end = line.slice(cursor.columnFrom + 1 + columnsAdded);
									lines[lineFrom] = new Uint32Array(start.length + end.length); //line.slice(0, cursor.columnFrom + columnsAdded) + line.slice(cursor.columnFrom + 1 + columnsAdded);
									lines[lineFrom].set(start);
									lines[lineFrom].set(end, start.length);
									
									columnsAdded--;
									cursor.place(lineFrom, Math.max(0, cursor.columnFrom + columnsAdded));
									break;
							}
						}
					}
				}
				else
				{
					let start = line.slice(0, cursor.columnFrom + columnsAdded);
					let end = line.slice(cursor.columnFrom + columnsAdded);
					lines[lineFrom] = new Uint32Array(start.length + 1 + end.length);
					lines[lineFrom].set(start);
					lines[lineFrom][start.length] = 9; // TAB CHARACTER
					lines[lineFrom].set(end, start.length + 1);
					// lines[lineFrom] = line.slice(0, cursor.columnFrom + columnsAdded) + insertText + line.slice(cursor.columnFrom + columnsAdded);
					columnsAdded += 1;
					cursor.place(lineFrom, cursor.columnFrom + columnsAdded);
				}
			}
		}

		this._EnsureCursorVisible();
		this._Hydrogen.scheduleUpdate();
	}

	doDelete()
	{
		this._TriggerChange();
		let lines = this._Document.lines;
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			if(!cursor.hasRange)
			{
				let line = lines[cursor.lineFrom];
				if(cursor.columnFrom < line.length)
				{
					cursor.span(cursor.lineFrom, cursor.columnFrom, cursor.lineFrom, cursor.columnFrom+1);
				}
				else if(cursor.lineFrom < lines.length-1)
				{
					cursor.span(cursor.lineFrom, cursor.columnFrom, cursor.lineFrom+1, 0);	
				}
			}
		}
		this._DeleteSelection();
		/*
		let nonRangeCursors = [];
		for(let i = 0; i < _Cursors.length; i++)
		{
			let cursor = _Cursors[i];
			if(!cursor.hasRange)
			{
				nonRangeCursors.push(cursor);
			}
		}
		_DeleteSelection();
		let lines = _Document.lines;
		let removedLines = 0;
		for(let i = 0; i < nonRangeCursors.length; i++)
		{
			let cursor = nonRangeCursors[i];
			let lineFrom = cursor.lineFrom - removedLines;
			let line = lines[lineFrom];
			let column = cursor.columnFrom;

			if(column === line.length)
			{
				if(lineFrom < lines.length)
				{
					let nextLine = lines[lineFrom+1];
					let nextLineLength = nextLine.length;
					lines[lineFrom] += nextLine;
					lines.splice(lineFrom+1, 1);
					removedLines++;
					cursor.place(lineFrom, column);
				}
			}
			else
			{
				lines[lineFrom] = line.slice(0, cursor.columnFrom) + line.slice(cursor.columnFrom+1);
				cursor.place(lineFrom, column);
			}
		}*/

		this._EnsureCursorVisible();
	}

	onKeyPress(evt)
	{
		console.log("KEY PRESS", evt.keyCode, evt);
		
		switch(evt.keyCode)
		{
			case 13: // Enter
				this._Enter();
				return true;
		}

		if(evt.charCode)
		{
			let str = String.fromCharCode(evt.charCode);
			this._ReplaceSelectionWith(str);
			//console.log(str);
			return true;
		}
		
		return false;
	}

	@bind
	onMouseUp(evt, rx, ry)
	{
		this._IsDragging = false;
		this._ScrollYVelocity = 0;
		this._ValidateCursors();
		this._EnsureCursorVisible(true);
		this._Hydrogen.scheduleUpdate();
	}

	@bind
	onMouseWheel(evt)
	{
		this._ScrollY -= evt.deltaY / 2.0;
		this._ScrollX -= evt.deltaX / 2.0;

		this._ClampScroll();
		this._ScrollYVelocity = 0;
		this._Hydrogen.scheduleUpdate();
	}


	_MoveCursors(x, y, span, noWrap)
	{
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			cursor.move(x, y, this._Document, span, noWrap);
			if(x !== 0)
			{
				cursor.setPlacedColumn(this._Document);
			}
		}
		this._ValidateCursors();
		this._EnsureCursorVisible(true);
		this._MarkJustInput();
		this._Hydrogen.scheduleUpdate();
	}

	cursorUp(span)
	{
		this._MoveCursors(0, -1, span);	
	}

	cursorDown(span)
	{
		this._MoveCursors(0, 1, span);	
	}

	cursorLeft(span)
	{
		this._MoveCursors(-1, 0, span);
	}

	cursorRight(span)
	{
		this._MoveCursors(1, 0, span);
	}

	cursorWordLeft(span)
	{
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			cursor.wordBoundary(-1, this._Document,span); 
		}
		this._ValidateCursors();
		this._EnsureCursorVisible(true);
		this._Hydrogen.scheduleUpdate();
	}

	cursorWordRight(span)
	{
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			cursor.wordBoundary(1, this._Document, span);
		}
		this._ValidateCursors();
		this._EnsureCursorVisible(true);
		this._MarkJustInput();
		this._Hydrogen.scheduleUpdate();
	}

	cursorHome(span)
	{
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			cursor.home(this._Document, span);
		}
		this._ValidateCursors();
		this._EnsureCursorVisible(true);
		this._MarkJustInput();
		this._Hydrogen.scheduleUpdate();
	}

	cursorEnd(span)
	{
		this._MoveCursors(Number.MAX_SAFE_INTEGER, 0, span, true);
	}

	cursorPageDown(span)
	{
		let y = this._Document.lines.length-1;
		let x =  this._Document.lines[y].length;
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			cursor.moveTo(x, y, this._Document, span);
		}
		this._ValidateCursors();
		this._EnsureCursorVisible(true);
		this._MarkJustInput();
		this._Hydrogen.scheduleUpdate();
	}

	_ClearJustInput()
	{
		clearTimeout(this._JustInputTimeout);
		this._JustInputTimeout = null;
		if(this._JustInput)
		{
			this._JustInput = false;
			this._UpdateBlinkState();
		}
	}

	_MarkJustInput()
	{
		if(!this._JustInput)
		{
			this._JustInput = true;
			this._UpdateBlinkState();
		}
		clearTimeout(this._JustInputTimeout);
		this._JustInputTimeout = setTimeout(this._ClearJustInput, 1000);
	}

	cursorPageUp(span)
	{
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			cursor.moveTo(0, 0, this._Document, span);
		}
		this._ValidateCursors();
		this._EnsureCursorVisible(true);
		this._Hydrogen.scheduleUpdate();
	}


	_ClampScroll()
	{
		if(!this._Font.isReady || !this._Document)
		{
			return;
		}
		let maxLabelWidth = this._Document.maxLineDigits * this._Font.horizontalAdvance;
		let gutter = this._GutterPadding + maxLabelWidth + this._GutterPadding;

		let paneWidth = this._Width - gutter;
		let paneHeight = this._Height;

		let lineHeight = Math.round(this._Font.lineHeight * this._LineHeightScale);
		let contentHeight = this._Document.lines.length * lineHeight;
		let contentWidth = this._Document.maxLineLength * this._Font.horizontalAdvance;

		let minScrollY = Math.min(0, paneHeight - contentHeight - 100);
		let minScrollX = Math.min(0, paneWidth - contentWidth);

		this._ScrollY = Math.max(minScrollY, Math.min(0, this._ScrollY));
		this._ScrollX = Math.max(minScrollX, Math.min(0, this._ScrollX));
	}

	_LineWidth(line, start, end)
	{
		let columnWidth = this._Font.horizontalAdvance;
		let t = line;
		let tl = t.length;
		let x = 0;
		let numTabSpaces = this._Document.numTabSpaces;
		for(let i = start; i < end; i++)
		{
			let c = t[i];
			switch(c)
			{
				case 9:
					x = Math.floor((x / (numTabSpaces*columnWidth))+1)*(numTabSpaces*columnWidth);
//					x += columnWidth * numTabSpaces;
					break;
				default:
					x += columnWidth;
					break;
			}
		}
		return x;
	}

	_VisibleColumns(line, start, end)
	{
		let columnWidth = this._Font.horizontalAdvance;
		let t = line;
		let tl = t.length;

		let first = -1;
		let firstX = 0;
		let last = tl-1;
		let x = 0;

		let numTabSpaces = this._Document.numTabSpaces;

		for(let i = 0; i < tl; i++)
		{
			let c = t[i];
			let lx = x;
			switch(c)
			{
				case 9:
					x = Math.floor((x / (numTabSpaces*columnWidth))+1)*(numTabSpaces*columnWidth);
					//x += columnWidth * numTabSpaces;
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
		for(let i = first; i < tl; i++)
		{
			let c = t[i];
			switch(c)
			{
				case 9:
					x = Math.floor((x / (numTabSpaces*columnWidth))+1)*(numTabSpaces*columnWidth);
					//x += columnWidth * numTabSpaces;
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

	_GetDomCursor(index)
	{
		let domCursor = null;
		if(index < this._DomCursors.length)
		{
			domCursor = this._DomCursors[index];
		}
		else
		{
			let cursorHeight = this._Font.lineHeight;
			domCursor = document.createElement("div");
			domCursor.style.backgroundColor = "rgb(" + Math.round(this._CursorColor[0] * 255) + "," + Math.round(this._CursorColor[1] * 255) + "," + Math.round(this._CursorColor[2] * 255) + ")";
			domCursor.style.height = cursorHeight + "px";
			this._DomCursors.push(domCursor);
			let cursorsElement = document.getElementById("cursors");
			cursorsElement.appendChild(domCursor);
		}

		return domCursor;
	}

	_UpdateBlinkState()
	{
		if(!this._UseDomCursor)
		{
			return;
		}

		let shouldDisable = this._IsDragging || this._JustInput;
		if(shouldDisable != this._IsBlinkingDisabled)
		{
			let domCursor, cursor;
			for(let i = 0; i < this._Cursors.length; i++)
			{
				cursor = this._Cursors[i];
				
				domCursor = this._GetDomCursor(i);
			}
			domCursor.style.animation = shouldDisable ? "none" : null;
			this._IsBlinkingDisabled = shouldDisable;
		}
	}

	@bind
	advance(elapsed)
	{
		if(this._ScrollYVelocity != 0.0)
		{
			this._ScrollY += this._ScrollYVelocity * elapsed;
			this._ClampScroll();
			if(this._IsDragging)
			{
				this._DragCursor(Math.min(this._Width, Math.max(0, this._MouseX)), Math.min(this._Height, Math.max(0, this._MouseY)));
			}
		}

		let targetScrollY = Math.round(this._ScrollY);
		let targetScrollX = Math.round(this._ScrollX);

		let dx = targetScrollX - this._RenderScrollX;
		let dy = targetScrollY - this._RenderScrollY;

		let keepRendering = false;

		let ds = Math.min(1.0, elapsed*30);

		if(Math.abs(dx) < 0.2)
		{
			this._RenderScrollX = targetScrollX;
		}
		else
		{
			this._RenderScrollX += dx * ds;
			keepRendering = true;
		}
		if(Math.abs(dy) < 0.2)
		{
			this._RenderScrollY = targetScrollY;
		}
		else
		{
			this._RenderScrollY += dy * ds;
			keepRendering = true;
		}

		return keepRendering;
	}

	@bind
	draw(graphics)
	{
		if(!this._Document)
		{
			return;
		}
		//_ScrollX -= 0.2;
		//drawCount++;

		graphics.setTabSpaces(this._Document.numTabSpaces);
		let lines = this._Document.lines;

		let maxLabelWidth = this._Document.maxLineDigits * this._Font.horizontalAdvance;
		let gutter = this._GutterPadding + maxLabelWidth + this._GutterPadding;

		let glyphMap = this._Font.map;
		let lineHeight = Math.round(this._Font.lineHeight * this._LineHeightScale);
		let cursorHeight = this._Font.lineHeight;
		let maxDescender = this._Font.maxDescender;
		let baseLine = lineHeight + maxDescender;

		let renderScrollY = this._RenderScrollY;
		let renderScrollX = this._RenderScrollX;
		
		let contentHeight = lines.length * lineHeight;
		let visibleLines = Math.round(this._Height / lineHeight) + 1;
		let firstLine = Math.floor(-renderScrollY / lineHeight);
		let lastLine = Math.min(firstLine + visibleLines, lines.length-1);
		let firstLineOrigin = renderScrollY % lineHeight;

		let columnWidth = this._Font.horizontalAdvance;
		let visibleColumns = Math.round(this._Width / columnWidth) + 1;
		let y = this._Y+firstLineOrigin;

		graphics.pushClip(this._X, this._Y, this._Width, this._Height);

		// Draw focused line backgrounds.
		let lastCursorLine = -1;
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			if(cursor.hasRange)
			{
				continue;
			}
			if(lastCursorLine == cursor.lineFrom)
			{
				continue;
			}
			lastCursorLine = cursor.lineFrom;
			let startY = Math.round(this._Y + renderScrollY + cursor.lineFrom * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0);
			graphics.drawRect(0, startY, this._Width, lineHeight, 1.0, this._HighlightColor);


		}

		// Draw cursors.
		for(let i = 0; i < this._Cursors.length; i++)
		{
			let cursor = this._Cursors[i];
			if(cursor.hasRange)
			{
				let currentLine = cursor.lineFrom;
				let endLine = cursor.lineTo;
				let columnStart = cursor.columnFrom;

				while(true)
				{
					let line = lines[currentLine];

					let startY = Math.round(this._Y + renderScrollY + currentLine * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0);
					let startX = Math.max(gutter, this._X + gutter + renderScrollX + this._LineWidth(line, 0, columnStart));//columnStart * columnWidth;
					let endX;

					if(currentLine == endLine)
					{
						endX = this._X + gutter + renderScrollX + this._LineWidth(line, 0, cursor.columnTo);//cursor.columnTo * columnWidth;
					}
					else
					{
						endX = this._X + gutter + renderScrollX + this._LineWidth(line, 0, line.length) + columnWidth;//(line.length+1) * columnWidth;
					}

					if(endX > startX)
					{
						graphics.drawRect(startX, startY, endX-startX, lineHeight, 1.0, this._SelectionColor);
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
			//	let startY = Math.round(_Y + renderScrollY + cursor.lineFrom * lineHeight + lineHeight - cursorHeight + cursorHeight/2 - lineHeight/2.0);
			//	graphics.drawRect(0, startY, _Width, lineHeight, 1.0, _HighlightColor);
			//}
			let cursorY = this._Y + renderScrollY + cursor.line * lineHeight + lineHeight - cursorHeight;
			let cursorX = this._X + gutter + renderScrollX + this._LineWidth(lines[cursor.line], 0, cursor.column);
			if(cursorX+1 > gutter && !this._UseDomCursor)
			{
				graphics.drawRect(cursorX, cursorY, 1.0, cursorHeight, 1.0, this._CursorColor);
			}

			if(this._UseDomCursor)
			{
				let domCursor = this._GetDomCursor(i);

				domCursor.style.display = cursorX+1 > gutter ? null : "none";
				domCursor.style.transform = "translate(" + cursorX + "px, " + cursorY + "px)";
			}
		}

		if(this._UseDomCursor)
		{
			for(let i = this._Cursors.length; i < this._DomCursors.length; i++)
			{
				this._DomCursors[i].style.display = "none";
			}
		}

		graphics.pushClip(this._X+gutter, this._Y, this._Width-gutter, this._Height);
		if(graphics.setFont(this._Font, 1.0, this._CodeColor))
		{	
			for(let i = firstLine; i <= lastLine; i++)
			{
				let line = lines[i];

				//let firstColumn = Math.floor(-renderScrollX / columnWidth);
				//let lastColumn = firstColumn + visibleColumns;
				//let firstColumnOrigin = renderScrollX % columnWidth;

				let visRange = this._VisibleColumns(line, -renderScrollX, this._Width - renderScrollX);

				let x = visRange.firstX;//this._X+gutter+firstColumnOrigin;

				graphics.drawText(renderScrollX+gutter+x, y+baseLine, line, visRange.first, visRange.last);
				y += lineHeight;
			}
			graphics.popClip();
			graphics.pushClip(this._X, this._Y, gutter, this._Height);
			// Draw lines.
			if(graphics.setFont(this._Font, 1.0, this._LineLabelColor))
			{	
				let x = this._X + this._GutterPadding + maxLabelWidth;
				let y = this._Y + firstLineOrigin;
				for(let i = firstLine; i <= lastLine; i++)
				{
					let lineNumberLabel = (i+1).toString();
					let label = new Uint32Array(lineNumberLabel.length);
					for(let ln = 0; ln < label.length; ln++)
					{
						label[ln] = lineNumberLabel.codePointAt(ln);
					}

					graphics.drawText(x - (label.length*this._Font.horizontalAdvance), y+baseLine, label);

					y += lineHeight;
				}
			}
		}
		graphics.popClip();
		graphics.popClip();	
	}

	find(searchTerm)
	{
		let results = this._Document.find(searchTerm);

		this._Cursors.length = 0;
		//if(results.length > 3) results.length = 3;
		for(let result of results)
		{
			let cursor = new Cursor();
			//cursor.place(result.start.line, result.start.column);
			cursor.span(result.start.line, result.start.column, result.end.line, result.end.column);
			this._Cursors.push(cursor);
		}
  
	console.log("RESULTS", results);
		//this._ValidateCursors();
		this._EnsureCursorVisible();
		this._Hydrogen.scheduleUpdate();
// → Found 3 at 14
//   Found 42 at 33
//   Found 88 at 40
		//let results = text.match(searchTerm);
		//console.log(results);
	}

	get x()
	{
		return this._X;
	}

	get y()
	{
		return this._Y;
	}

	get x2()
	{
		return this._X2;
	}

	get y2()
	{
		return this._Y2;
	}

	get width()
	{
		return this._Width;
	}

	get height()
	{
		return this._Height;
	}
}