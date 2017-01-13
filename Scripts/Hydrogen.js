function Hydrogen(_Canvas)
{
	var _Hydrogen = this;
	var _Font = new CachedFont("Fonts/Terminus.ttf16.cache");

	var _Graphics = new Graphics(_Canvas);
	var _UpdateTime = Date.now();
	var _Panes = [];
	var _MouseCaptureUI;
	var _FocusUI;
	var _IsOSX = navigator.userAgent.indexOf('Mac OS X') != -1;
	var _WillAdvanceNextFrame = true;

	if(!_Graphics.init())
	{
		// TODO: Handle error.
		return;
	}

	function _AddPane(xf, yf)
	{
		var pane = new Pane(_Hydrogen);
		pane.xf = xf;
		pane.yf = yf;
		pane.setFont(_Font);
		_Panes.push(pane);

		_SizeToFit();	
	}

	function _OnResize()
	{
		_SizeToFit();	
	};

	function _OnDragOver(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = "copy";
	}

	function _OnDragDrop(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();

        for(var i = 0; i < _Panes.length; i++)
        {
        	var pane = _Panes[i];
        	if(evt.x >= pane.x && evt.x <= pane.x2 && evt.y >= pane.y && evt.y <= pane.y2)
        	{
        		var files = evt.dataTransfer.files;

        		// For now just open the first file.
		        if(files.length >= 1)
		        {
		            pane.openFile(files[0]);
		        }
        		break;
        	}
        }
	}

	function _OnPaste(e)
	{
		_FocusUI.onPaste(e.clipboardData);
	}

	function _OnCopy(e)
	{
		var data = _FocusUI.onCopy();
		if(data)
		{
			//console.log("SETTING DATA", data);
			e.clipboardData.setData("text/plain", data);
			e.preventDefault();
		}
	}

	function _OnCut(e)
	{
		var data = _FocusUI.onCut();
		if(data)
		{
			e.clipboardData.setData('text/plain', data);
		}
	}

	function _OnMouseWheel(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();

        for(var i = 0; i < _Panes.length; i++)
        {
        	var pane = _Panes[i];
        	if(evt.x >= pane.x && evt.x <= pane.x2 && evt.y >= pane.y && evt.y <= pane.y2)
        	{
        		pane.onMouseWheel(evt);
        		break;
        	}
        }
	}

	function _Focus(ui)
	{
		_FocusUI = ui;
	}

	function _CaptureMouse(ui)
	{
		_MouseCaptureUI = ui;
	}

	function _OnMouseDown(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();

        for(var i = 0; i < _Panes.length; i++)
        {
        	var pane = _Panes[i];
        	if(evt.x >= pane.x && evt.x <= pane.x2 && evt.y >= pane.y && evt.y <= pane.y2)
        	{
        		pane.onMouseDown(evt, evt.x-pane.x, evt.y-pane.y);
        		break;
        	}
        }
	}

	function _OnMouseMove(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();

        if(_MouseCaptureUI)
        {
        	_MouseCaptureUI.onMouseMove(evt, evt.x-_MouseCaptureUI.x, evt.y-_MouseCaptureUI.y);
        	return;
        }

        for(var i = 0; i < _Panes.length; i++)
        {
        	var pane = _Panes[i];
        	if(evt.x >= pane.x && evt.x <= pane.x2 && evt.y >= pane.y && evt.y <= pane.y2)
        	{
        		pane.onMouseMove(evt, evt.x-pane.x, evt.y-pane.y);
        		break;
        	}
        }
	}

	function _OnMouseUp(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();

        if(_MouseCaptureUI)
        {
        	_MouseCaptureUI.onMouseUp(evt, evt.x-_MouseCaptureUI.x, evt.y-_MouseCaptureUI.y);
        	_MouseCaptureUI = null;
        	return;
        }

        for(var i = 0; i < _Panes.length; i++)
        {
        	var pane = _Panes[i];
        	if(evt.x >= pane.x && evt.x <= pane.x2 && evt.y >= pane.y && evt.y <= pane.y2)
        	{
        		pane.onMouseUp(evt, evt.x-pane.x, evt.y-pane.y);
        		break;
        	}
        }
	}

	function _OnKeyDown(evt)
	{
		if(evt.keyCode == 8) // Prevent backspace navigation.
		{
			evt.preventDefault();
		}
		//console.log("KEY DOWN", evt.keyCode, evt.altKey);
		switch(evt.keyCode)
		{
			case 38:
				if(_IsOSX && evt.metaKey)
				{
					_FocusUI.cursorPageUp(evt.shiftKey);
				}
				else
				{
					_FocusUI.cursorUp(evt.shiftKey);	
				}
				evt.preventDefault();
				break;
			case 40:
				if(_IsOSX && evt.metaKey)
				{
					_FocusUI.cursorPageDown(evt.shiftKey);
				}
				else
				{
					_FocusUI.cursorDown(evt.shiftKey);
				}
				evt.preventDefault();
				break;
			case 37:
				if(_IsOSX && evt.metaKey)
				{
					_FocusUI.cursorHome(evt.shiftKey);
				}
				else if(evt.altKey)
				{
					_FocusUI.cursorWordLeft(evt.shiftKey);
				}
				else
				{
					_FocusUI.cursorLeft(evt.shiftKey);
				}
				evt.preventDefault();
				break;
			case 39:
				if(_IsOSX && evt.metaKey)
				{
					_FocusUI.cursorEnd(evt.shiftKey);
				}
				else if(evt.altKey)
				{
					_FocusUI.cursorWordRight(evt.shiftKey);
				}
				else
				{
					_FocusUI.cursorRight(evt.shiftKey);
				}
				evt.preventDefault();
				break;
			case 8:
				_FocusUI.backspace();
				evt.preventDefault();
				break;
			case 90:
				if(_IsOSX)
				{
					if(evt.metaKey)
					{
						if(evt.shiftKey)
						{
							_FocusUI.redo();
						}
						else
						{
							_FocusUI.undo();
						}
					}
				}
				else if(evt.ctrlKey)
				{
					if(evt.shiftKey)
					{
						_FocusUI.redo();
					}
					else
					{
						_FocusUI.undo();
					}
				}
				break;
		}

        
	}

	function _OnKeyPress(evt)
	{
		if(_FocusUI)
		{
			if(_IsOSX)
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
			if(_FocusUI.onKeyPress(evt))
			{
				evt.stopPropagation();
				evt.preventDefault();
			}
		}
	}


	window.addEventListener('resize', _OnResize, false);
    document.body.addEventListener('dragover', _OnDragOver, false);
    document.body.addEventListener('drop', _OnDragDrop, false);
    document.body.addEventListener('paste', _OnPaste, true);
    document.body.addEventListener('copy', _OnCopy, true);
    document.body.addEventListener('cut', _OnCut, true);
    document.body.addEventListener('mousewheel', _OnMouseWheel, false);
    document.body.addEventListener('mousedown', _OnMouseDown, false);
    window.addEventListener('mousemove', _OnMouseMove, true);
    window.addEventListener('mouseup', _OnMouseUp, true);
    document.body.addEventListener('keypress', _OnKeyPress, false);
    document.body.addEventListener('keydown', _OnKeyDown, false);

	function _SizeToFit()
	{
		_Canvas.width = window.innerWidth;
		_Canvas.height = window.innerHeight;
		_Graphics.setViewport(0.0, 0.0, _Canvas.width, _Canvas.height);

		var x = 0;
		var y = 0;
		var width = _Canvas.width;
		var height = _Canvas.height;
		for(var i = 0; i < _Panes.length; i++)
		{
			var pane = _Panes[i];
			pane.place(x, y, _Canvas.width * pane.xf, _Canvas.height * pane.yf);
			x += pane.width;
			//y += pane.height;
		}
	}

	_OnResize();

	function _Update()
	{
		var now = Date.now();
        var elapsed = now - _UpdateTime;
		var elapsedS = elapsed/1000.0;
		_UpdateTime = now;

		var redraw = false;
		for(var i = 0; i < _Panes.length; i++)
		{
			var pane = _Panes[i];
			if(pane.advance(elapsedS))
			{
				redraw = true;
			}
		}

		_Graphics.clear([0.12, 0.12, 0.12, 1.0]);

		for(var i = 0; i < _Panes.length; i++)
		{
			var pane = _Panes[i];
			pane.draw(_Graphics);
		}

		if(redraw)
		{
			_WillAdvanceNextFrame = true;
			requestAnimFrame(_Update);
		}
		else
		{
			_WillAdvanceNextFrame = false;
		}
	}
	this.scheduleUpdate = _ScheduleUpdate;
	function _ScheduleUpdate()
	{
		if(_WillAdvanceNextFrame)
		{
			return;
		}
		_UpdateTime = Date.now();
		_WillAdvanceNextFrame = true;
		requestAnimFrame(_Update);
	}

	_Update();

    this.__defineGetter__("font", function()
    {
        return _Font;
    });

    this.captureMouse = _CaptureMouse;
    this.focus = _Focus;

    _AddPane(1.0, 1.0);
	//_AddPane(0.5, 1.0);
}