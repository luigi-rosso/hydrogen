function Font(filename)
{
	var imagefile = "Fonts/" + filename + ".png";
	var datafile = "Fonts/" + filename + ".json";

	var _This = this;

	var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(req)
    {
        if(this.readyState == this.DONE)
        {
        	var d = { File: name, LineHeight: 1 };
			try
			{
				var obj = JSON.parse(this.responseText);
			}
			catch(err)
			{
				return;
			}
			d.lineHeight = obj['LineHeight'];
			d.map = {};

			var maxHeight = 0;
			var maxDescend = 0;
			var maxNumeral = 0;
			var glyphs = obj['Glyphs'];
			for(var i = 0; i < glyphs.length; i++)
			{
				var dt = glyphs[i];
				var gly = {};
				var u = dt['u'];
				d.map[u] = gly;
				gly.kern = {};

				gly.hbx = dt['hbx'];
				gly.hby = dt['hby'];
				gly.w = dt['w'];
				gly.h = dt['h'];
				gly.u1 = dt['u1'];
				gly.v1 = dt['v1'];
				gly.u2 = dt['u2'];
				gly.v2 = dt['v2'];
				gly.ha = dt['ha'];


				if(u >= 48 && u <= 57 && gly.hby > maxNumeral)
				{
					maxNumeral = gly.hby;
				}

				if(gly.hby > maxHeight)
				{
					maxHeight = gly.hby;
				}
				var ds = gly.h - gly.hby;
				if( ds > maxDescend)
				{
					maxDescend = ds;
				}
				gly.d = ds;

				if(dt['K'])
				{
					var k = dt['K'];
					var j = 0;
					while(j < k.length)
					{
						gly.kern[glyphs[k[j]]['u']] = { x:k[j+1], y:k[j+2]};
						j+=3;
					}
				}
			}

			d.maxGlyphHeight = maxHeight;
			d.maxDescender = maxDescend;
			d.maxNumberHeight = maxNumeral;
			_This.data = d;
        }   
    };
    xhr.open("GET", datafile, true);
    xhr.send();

    var img = document.createElement("img");
	img.style.display = "none";
	img.onload = function(e)
	{
		document.body.removeChild(img);
		_This.image = img;
	};
	img.onerror = function(e)
	{
		document.body.removeChild(img);
	}
	img.setAttribute("src", imagefile);
	document.body.appendChild(img);

	this.findIndex = function(t, xPos)
	{
		if(!_This.data)
		{
			return { w: 0, h: 0, a: 0, d: 0 };
		}
		var x = 0;
		var p = 0;
        var map = _This.data.map;


        for(var i = 0; i < t.length; i++)
        {
            var c = t.charCodeAt(i);

            switch(c)
            {
                case 32:        // SPACE
                case 9: 
                case 13:        // TAB - for now we translate a tab to a space
                    c = 32;
                    break;
            }

            var g = map[c];
            if(!g)
            {
                g = map[0];
            }
            
            if(p)
            {
                var k = g.kern[p];
                if(k)
                {
                    x += k.x;
                }
            }
            if(x+g.ha/2.0 > xPos)
            {
            	return i;
            }
            x += g.ha;
            
            p = c;
        }

        return t.length;
	};

	this.measure = function(t, length)
	{
		if(!_This.data)
		{
			return { w: 0, h: 0, a: 0, d: 0 };
		}
		var x = 0;
		var p = 0;
        var map = _This.data.map;

        var maxAscender = 0.0;
        var maxDescender = 0.0;

        if(length === undefined)
        {
        	length = t.length;
        }
        
        for(var i = 0; i < length; i++)
        {
            var c = t.charCodeAt(i);

            switch(c)
            {
                case 32:        // SPACE
                case 9: 
                case 13:        // TAB - for now we translate a tab to a space
                    c = 32;
                    break;
            }

            var g = map[c];
            if(!g)
            {
                g = map[0];
            }
            
            if(p)
            {
                var k = g.kern[p];
                if(k)
                {
                    x += k.x;
                }
            }

            x += g.ha;
            if(g.d > maxDescender)
            {
            	maxDescender = g.d;
            }
            if(g.hby > maxAscender)
            {
            	maxAscender = g.hby;
            }
            p = c;
        }

        return { w: x, h: maxDescender + maxAscender, a: maxAscender, d: maxDescender };
	}; 


    this.__defineGetter__("lineHeight", function()
    {
    	if(!_This.data)
    	{
    		return 0;
    	}
        return _This.data.lineHeight;
    });
}