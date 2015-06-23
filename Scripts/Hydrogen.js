function Hydrogen(_Canvas)
{
	var _Graphics = new Graphics(_Canvas);
	var _UpdateTime = Date.now();
	var _Font;

	if(!_Graphics.init())
	{
		// TODO: Handle error.
		return;
	}
	_Font = new Font("Terminus16");

	window.onresize = function()
	{
		_SizeToFit();	
	};

	function _SizeToFit()
	{
		_Canvas.width = window.innerWidth;
		_Canvas.height = window.innerHeight;
		_Graphics.setViewport(0.0, 0.0, _Canvas.width, _Canvas.height);
	}

	_SizeToFit();

	function _Update()
	{
		var now = Date.now();
        var elapsed = now - _UpdateTime;
		var elapsedS = elapsed/1000.0;
		_UpdateTime = now;

		_Graphics.clear();
		if(_Graphics.setFont(_Font))
		{
			_Graphics.drawText(20.0, 20.0, "Hello world.");
		}
		requestAnimFrame(_Update);
	}
	_Update();
}