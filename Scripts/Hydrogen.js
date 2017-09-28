import bind from "bind";
import CachedFont from "./CachedFont.js";
import Graphics from "./Graphics.js";
import Pane from "./Pane.js";

export default class Hydrogen
{
	constructor(container, font)
	{
		let fakeFocus = document.createElement("button");
		container.appendChild(fakeFocus);
		fakeFocus.style.position = "absolute";
		fakeFocus.style.width = "1px";
		fakeFocus.style.height = "1px";
		fakeFocus.style.outline = "none";
		fakeFocus.style.border = "none";
		fakeFocus.style.background = "none";
		fakeFocus.style.padding = "0";

		let canvas = document.createElement("canvas");
		container.appendChild(canvas);
		canvas.style.imageRendering = "pixelated";
		canvas.style.position = "absolute";

		let cursorsDOM = document.createElement("div");
		this._CursorsDOM = cursorsDOM;
		container.appendChild(cursorsDOM);
		//cursorsDOM.style.width = "100%";
		//cursorsDOM.style.height = "100%";
		cursorsDOM.style.position = "absolute";
		cursorsDOM.className = "cursors";

		this._Container = container;
		this._Canvas = canvas;
		this._Hydrogen = this;
		this._FocusElement = fakeFocus;
		this._Font = new CachedFont(font || "Fonts/Terminus.ttf16.cache");
		let self = this;
		this._Font.onReady = function()
		{
			self.scheduleUpdate();
		};

		this._Graphics = new Graphics(this._Canvas);
		this._UpdateTime = Date.now();
		this._Panes = [];
		this._MouseCaptureUI;
		this._FocusUI;
		this._Focused = true;
		this._IsOSX = navigator.userAgent.indexOf("Mac OS X") != -1;
		this._WillAdvanceNextFrame = true;

		if(!this._Graphics.init())
		{
			// TODO: Handle error.
			return;
		}

		window.addEventListener("resize", this._OnResize, false);
		document.body.addEventListener("dragover", this._OnDragOver);
		document.body.addEventListener("dragleave", this._OnDragLeave);
		document.body.addEventListener("drop", this._OnDragDrop);
		document.body.addEventListener("paste", this._OnPaste, true);
		document.body.addEventListener("copy", this._OnCopy, true);
		document.body.addEventListener("cut", this._OnCut, true);
		canvas.addEventListener("mousewheel", this._OnMouseWheel, false);
		canvas.addEventListener("mousedown", this._OnMouseDown, false);
		document.body.addEventListener("mousemove", this._OnMouseMove, true);
		document.body.addEventListener("mouseup", this._OnMouseUp, true);
		fakeFocus.addEventListener("keypress", this._OnKeyPress, false);
		fakeFocus.addEventListener("keydown", this._OnKeyDown, false);

		// Detect general focus changes.
		document.addEventListener("focusin", this.onFocusIn);
		document.addEventListener("focusout", this.onFocusOut);

		this._OnResize();
		this._Update();
		this._AddPane(1.0, 1.0);
	}
	
	onFocused()
	{
		if(this._Focused)
		{
			return;
		}
		this._Focused = true;

		this.scheduleUpdate();
		if(this._FocusUI && this._RefocusCursors && this._FocusUI.numCursors === 0)
		{
			this._FocusUI.deserializeCursors(this._RefocusCursors);
		}
		this._RefocusCursors = null;
	}

	onBlurred()
	{
		if(!this._Focused)
		{
			return;
		}
		this._Focused = false;
		this.scheduleUpdate();
		if(this._FocusUI)
		{
			console.log("REMOVING THEM");
			this._RefocusCursors = this._FocusUI.serializeCursors();
			this._FocusUI.clearCursors();
		}
	}

	get focusUI()
	{
		return document.activeElement === this._FocusElement ? this._FocusUI : null;
	}

	@bind
	onFocusIn(ev)
	{
		if(document.activeElement === this._FocusElement)
		{
			this.onFocused();
		}
		else
		{
			this.onBlurred();
		}	
	}

	@bind
	onFocusOut(ev)
	{
		if(document.activeElement === this._FocusElement)
		{
			this.onFocused();
		}
		else
		{
			this.onBlurred();
		}	
	}

	_AddPane(xf, yf)
	{
		let pane = new Pane(this);
		pane.xf = xf;
		pane.yf = yf;
		pane.setFont(this._Font);
		this._Panes.push(pane);

		this._SizeToFit();	
	}

	@bind
	_OnResize()
	{
		this._SizeToFit();	
	}

	@bind
	_OnDragOver(evt)
	{
		console.log("DRAG OVER");
		evt.stopPropagation();
		evt.preventDefault();
		evt.dataTransfer.dropEffect = "copy";
		return false;
	}

	@bind
	_OnDragLeave(evt)
	{
		evt.stopPropagation();
		evt.preventDefault();
	}

	openFile(file, pane)
	{
		if(!pane)
		{
			if(this._Panes.length === 0)
			{
				return;
			}
			pane = this._Panes[0];
		}
		pane.openFile(file);
	}

	setContents(text, pane)
	{
		if(!pane)
		{
			if(this._Panes.length === 0)
			{
				return;
			}
			pane = this._Panes[0];
		}
		pane.setContents(text);
	}

	find(searchTerm, pane)
	{
		if(!pane)
		{
			if(this._Panes.length === 0)
			{
				return false;
			}
			pane = this._Panes[0];
		}
		return pane.find(searchTerm, this._RefocusCursors && this._RefocusCursors[this._RefocusCursors.length-1]);
	}

	findNext(searchTerm, pane)
	{
		if(!pane)
		{
			if(this._Panes.length === 0)
			{
				return false;
			}
			pane = this._Panes[0];
		}
		return pane.findNext(searchTerm, this._RefocusCursors && this._RefocusCursors[this._RefocusCursors.length-1]);
	}

	selectNext(pane)
	{
		if(!pane)
		{
			if(this._Panes.length === 0)
			{
				return false;
			}
			pane = this._Panes[0];
		}
		return pane.selectNext();
	}

	findPrevious(searchTerm, pane)
	{
		if(!pane)
		{
			if(this._Panes.length === 0)
			{
				return false;
			}
			pane = this._Panes[0];
		}
		return pane.findPrevious(searchTerm, this._RefocusCursors && this._RefocusCursors[this._RefocusCursors.length-1]);
	}

	@bind
	_OnDragDrop(evt)
	{
		console.log("DROP!");
		evt.stopPropagation();
		evt.preventDefault();

		let x = evt.offsetX;
		let y = evt.offsetY;

		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			if(x >= pane.x && x <= pane.x2 && y >= pane.y && y <= pane.y2)
			{
				let files = evt.dataTransfer.files;

				// For now just open the first file.
				if(files.length >= 1)
				{
					pane.openFile(files[0]);
				}
				break;
			}
		}
	}

	@bind
	_OnPaste(e)
	{
		if(this._FocusUI)
		{
			this._FocusUI.onPaste(e.clipboardData);
		}
	}

	@bind
	_OnCopy(e)
	{
		if(!this._FocusUI)
		{
			return;
		}
		let data = this._FocusUI.onCopy();
		if(data)
		{
			//console.log("SETTING DATA", data);
			e.clipboardData.setData("text/plain", data);
			e.preventDefault();
		}
	}

	@bind
	_OnCut(e)
	{
		if(!this._FocusUI)
		{
			return;
		}
		let data = this._FocusUI.onCut();
		if(data)
		{
			e.clipboardData.setData("text/plain", data);
		}
	}

	@bind
	_OnMouseWheel(evt)
	{
		evt.stopPropagation();
		evt.preventDefault();

		let x = evt.offsetX;
		let y = evt.offsetY;

		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			if(x >= pane.x && x <= pane.x2 && y >= pane.y && y <= pane.y2)
			{
				pane.onMouseWheel(evt);
				break;
			}
		}
	}

	focus(ui)
	{
		this.scheduleUpdate();
		if(this._FocusUI !== ui)
		{
			this._RefocusCursors = null;
		}
		this.scheduleUpdate();
		this._FocusUI = ui;
	}

	captureMouse(ui)
	{
		this._MouseCaptureUI = ui;
	}

	@bind
	_OnMouseDown(evt)
	{
		this._FocusElement.focus();
		evt.stopPropagation();
		evt.preventDefault();

		let x = evt.offsetX;
		let y = evt.offsetY;

		// Clear focus from any other items that may be in the DOM (usually this resets the document.activeElement to the body).
		if(document.activeElement !== this._FocusElement)
		{
			document.activeElement.blur();
		}
		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			if(x >= pane.x && x <= pane.x2 && y >= pane.y && y <= pane.y2)
			{
				pane.onMouseDown(evt, x-pane.x, y-pane.y);
				break;
			}
		}
	}

	@bind
	_OnMouseMove(evt)
	{
		if(document.activeElement !== this._FocusElement)
		{
			return;
		}
		evt.stopPropagation();
		evt.preventDefault();

		let rect = this._Container.getBoundingClientRect();

		let x = evt.clientX - rect.left;
		let y = evt.clientY - rect.top;

		if(this._MouseCaptureUI)
		{
			this._MouseCaptureUI.onMouseMove(evt, x-this._MouseCaptureUI.x, y-this._MouseCaptureUI.y);
			return;
		}

		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			if(x >= pane.x && x <= pane.x2 && y >= pane.y && y <= pane.y2)
			{
				pane.onMouseMove(evt, x-pane.x, y-pane.y);
				break;
			}
		}
	}

	get forceHighlight()
	{
		return (this._Panes.length && this._Panes[0].forceHighlight) ? true : false;
	}

	set forceHighlight(f)
	{
		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			pane.forceHighlight = f;
		}
	}
	
	@bind
	_OnMouseUp(evt)
	{
		evt.stopPropagation();
		evt.preventDefault();

		let rect = this._Container.getBoundingClientRect();

		let x = evt.clientX - rect.left;
		let y = evt.clientY - rect.top;

		if(this._MouseCaptureUI)
		{
			this._MouseCaptureUI.onMouseUp(evt, x-this._MouseCaptureUI.x, y-this._MouseCaptureUI.y);
			this._MouseCaptureUI = null;
			return;
		}

		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			if(x >= pane.x && x <= pane.x2 && y >= pane.y && y <= pane.y2)
			{
				pane.onMouseUp(evt, x-pane.x, y-pane.y);
				break;
			}
		}
	}

	@bind
	_OnKeyDown(evt)
	{
		// Do pre-focus specific events first.
		switch(evt.keyCode)
		{
				// F for find
			case 70:
				if((this._IsOSX && evt.metaKey) || evt.ctrlKey)
				{
					if(this.onShowSearch)
					{
						this.onShowSearch(evt);
					}
				}

				// esc
				break;

				// G for find next
			case 71:
				if((this._IsOSX && evt.metaKey) || evt.ctrlKey)
				{
					if(evt.shiftKey)
					{
						if(this.onSearchPrevious)
						{
							this.onSearchPrevious(evt);
						}
					}
					else if(this.onSearchNext)
					{
						this.onSearchNext(evt);
					}
				}

				// esc
				break;

				// D for select next
			case 68:
				if((this._IsOSX && evt.metaKey) || evt.ctrlKey)
				{
					evt.preventDefault();
					evt.stopPropagation();
					this.selectNext();
				}

				// esc
				break;

			case 27:
				if(this.onEscape)
				{
					this.onEscape(evt);
				}
				break;
		}

		// Check a pane is in focus (not a search input or something else we may add in the DOM later).
		if(document.activeElement !== this._FocusElement)
		{
			return;
		}

		if(evt.keyCode == 8) // Prevent backspace navigation.
		{
			evt.preventDefault();
		}
		console.log("KEY DOWN", evt.keyCode, evt.altKey);
		switch(evt.keyCode)
		{
			case 9:
				this._FocusUI.doTab(evt.shiftKey);
				evt.preventDefault();
				break;
			case 46:
				this._FocusUI.doDelete();
				evt.preventDefault();
				break;
			case 38:
				if(this._IsOSX && evt.metaKey)
				{
					this._FocusUI.cursorPageUp(evt.shiftKey);
				}
				else
				{
					this._FocusUI.cursorUp(evt.shiftKey);	
				}
				evt.preventDefault();
				break;
			case 40:
				if(this._IsOSX && evt.metaKey)
				{
					this._FocusUI.cursorPageDown(evt.shiftKey);
				}
				else
				{
					this._FocusUI.cursorDown(evt.shiftKey);
				}
				evt.preventDefault();
				break;
			case 37:
				if(this._IsOSX && evt.metaKey)
				{
					this._FocusUI.cursorHome(evt.shiftKey);
				}
				else if(evt.altKey)
				{
					this._FocusUI.cursorWordLeft(evt.shiftKey);
				}
				else
				{
					this._FocusUI.cursorLeft(evt.shiftKey);
				}
				evt.preventDefault();
				break;
			case 39:
				if(this._IsOSX && evt.metaKey)
				{
					this._FocusUI.cursorEnd(evt.shiftKey);
				}
				else if(evt.altKey)
				{
					this._FocusUI.cursorWordRight(evt.shiftKey);
				}
				else
				{
					this._FocusUI.cursorRight(evt.shiftKey);
				}
				evt.preventDefault();
				break;
			case 8:
				this._FocusUI.backspace();
				evt.preventDefault();
				break;
			case 90:
				if(this._IsOSX)
				{
					if(evt.metaKey)
					{
						if(evt.shiftKey)
						{
							this._FocusUI.redo();
						}
						else
						{
							this._FocusUI.undo();
						}
					}
				}
				else if(evt.ctrlKey)
				{
					if(evt.shiftKey)
					{
						this._FocusUI.redo();
					}
					else
					{
						this._FocusUI.undo();
					}
				}
				break;

		}

		
	}

	@bind
	_OnKeyPress(evt)
	{
		if(document.activeElement !== this._FocusElement)
		{
			return;
		}
		if(this._FocusUI)
		{
			if(this._IsOSX && evt.metaKey)
			{
				switch(evt.keyCode)
				{
					case 99: // C copy
					case 118: // Command V paste.
					case 120: // cut
					case 122: // z undo
						return;
				}
			}
			if(this._FocusUI.onKeyPress(evt))
			{
				evt.stopPropagation();
				evt.preventDefault();
			}
		}
	}

	@bind
	_SizeToFit()
	{
		let rect = this._Container.getBoundingClientRect();
		this._Canvas.width = rect.width;
		this._Canvas.height = rect.height;
		this._CursorsDOM.style.width = rect.width + "px";
		this._CursorsDOM.style.height = rect.height + "px";
		//cursorsDOM.style.height = "100%";
		this._Graphics.setViewport(0.0, 0.0, this._Canvas.width, this._Canvas.height);

		let x = 0;
		let y = 0;
		let width = this._Canvas.width;
		let height = this._Canvas.height;
		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			pane.place(x, y, this._Canvas.width * pane.xf, this._Canvas.height * pane.yf);
			x += pane.width;
			//y += pane.height;
		}
	}

	@bind
	_Update()
	{
		let now = Date.now();
		let elapsed = now - this._UpdateTime;
		let elapsedS = elapsed/1000.0;
		this._UpdateTime = now;

		let redraw = false;
		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			if(pane.advance(elapsedS))
			{
				redraw = true;
			}
		}

		this._Graphics.clear(Pane.backgroundColor);

		for(let i = 0; i < this._Panes.length; i++)
		{
			let pane = this._Panes[i];
			pane.draw(this._Graphics);
		}

		if(redraw)
		{
			this._WillAdvanceNextFrame = true;
			window.requestAnimationFrame(this._Update);
		}
		else
		{
			this._WillAdvanceNextFrame = false;
		}
	}

	scheduleUpdate()
	{
		if(this._WillAdvanceNextFrame)
		{
			return;
		}
		this._UpdateTime = Date.now();
		this._WillAdvanceNextFrame = true;
		window.requestAnimationFrame(this._Update);
	}

	get font()
	{
		return this._Font;
	}
}