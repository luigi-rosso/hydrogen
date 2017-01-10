function Hydrogen(_Canvas)
{
	var _Hydrogen = this;
	var _Font = new CachedFont("Fonts/Terminus.ttf16.cache");

	var _Graphics = new Graphics(_Canvas);
	var _UpdateTime = Date.now();
	var _Panes = [];
	var _MouseCaptureUI;
	var _FocusUI;

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

	_AddPane(1.0, 1.0);
	//_AddPane(0.5, 1.0);

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

	function _OnPaste()
	{

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

		switch(evt.keyCode)
		{
			case 8:
				_FocusUI.onKeyPress(evt);
				break;
		}

        
	}

	function _OnKeyPress(evt)
	{
		evt.stopPropagation();
        evt.preventDefault();

		if(_FocusUI)
		{
			_FocusUI.onKeyPress(evt);
		}
	}


	window.addEventListener('resize', _OnResize, false);
    document.body.addEventListener('dragover', _OnDragOver, false);
    document.body.addEventListener('drop', _OnDragDrop, false);
    document.body.addEventListener('paste', _OnPaste, false);
    document.body.addEventListener('mousewheel', _OnMouseWheel, false);
    document.body.addEventListener('mousedown', _OnMouseDown, false);
    document.body.addEventListener('mousemove', _OnMouseMove, false);
    document.body.addEventListener('mouseup', _OnMouseUp, false);
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

		_Graphics.clear([0.12, 0.12, 0.12, 1.0]);

		for(var i = 0; i < _Panes.length; i++)
		{
			var pane = _Panes[i];
			pane.draw(_Graphics);
		}

		requestAnimFrame(_Update);
	}
	_Update();

    this.__defineGetter__("font", function()
    {
        return _Font;
    });

    this.captureMouse = _CaptureMouse;
    this.focus = _Focus;
}