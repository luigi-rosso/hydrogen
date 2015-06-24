function CachedFont(filename)
{
	var _Map = {};
	var _Glyphs = [];
	var _Bitmaps = [];
	var _LineHeight = 0;
	var _MaxDescender = 0;
	var _IsReady = false;
	var _GlyphBufferCount = 0;

	var xhr = new XMLHttpRequest();
	xhr.responseType = "arraybuffer";

    xhr.onreadystatechange = function(req)
    {
        if(this.readyState == this.DONE)
        {
        	var data = new DataView(this.response);
        	var offset = 0;

        	_LineHeight = data.getInt32(offset, true);
        	offset += 4;

        	_MaxDescender = data.getInt32(offset, true);
        	offset += 4;

        	var numGlyphs = data.getUint32(offset, true);
        	offset += 4;

        	//console.log(lineHeight, descender, numGlyphs);

        	// Read in all glyph data.
        	for(var i = 0; i < numGlyphs; i++)
        	{
        		var gly = {};

        		gly.bufferIndex = -1;
        		gly.index = data.getInt32(offset, true);
        		offset += 4;

        		// Width
        		gly.w = data.getInt32(offset, true);
        		offset += 4;

        		// Height
        		gly.h = data.getInt32(offset, true);
        		offset += 4;

        		// Horizontal Bearing X
        		gly.hbx = data.getInt32(offset, true);
        		offset += 4;

        		// Horizontal Bearing Y
        		gly.hby = data.getInt32(offset, true);
        		offset += 4;

        		// Horizontal Advance
        		gly.ha = data.getInt32(offset, true);
        		offset += 4;

        		// Vertical Bearing X
        		gly.vbx = data.getInt32(offset, true);
        		offset += 4;

        		// Vertical Bearing Y
        		gly.vby = data.getInt32(offset, true);
        		offset += 4;

        		// Vertical Advance
        		gly.va = data.getInt32(offset, true);
        		offset += 4;

        		// UTF8 code
        		gly.utf8 = data.getUint32(offset, true);
        		offset += 4;

        		// u coord
        		gly.u = data.getFloat32(offset, true);
        		offset += 4;

        		// v coord
        		gly.v = data.getFloat32(offset, true);
        		offset += 4;

        		// u coord size
        		gly.vs = data.getFloat32(offset, true);
        		offset += 4;

        		// v coord size
        		gly.us = data.getFloat32(offset, true);
        		offset += 4;

        		// Texture Index
        		gly.ti = data.getInt32(offset, true);
        		offset += 4;

        		// Kerning Pairs Count
        		gly.kpc = data.getUint32(offset, true);
        		offset += 4;

        		if(gly.kpc)
        		{
        			gly.kp = new Array(gly.kpc);
        			for(var j = 0; j < gly.kpc; j++)
        			{
        				var kp = {};
        				// Kerning pair UTF8 code
        				kp.utf8 = data.getUint32(offset, true);
        				offset += 4;

        				// Kern fix X
        				kp.x = data.getInt32(offset, true);
        				offset += 4;

        				// Kern fix Y
        				kp.y = data.getInt32(offset, true);
        				offset += 4;

        				gly.kp[j] = kp;
        			}
        		}

        		_Map[gly.utf8] = gly;
        		_Glyphs.push(gly);

        		if(gly.w != 0 && gly.h != 0)
        		{
        			_GlyphBufferCount++;
        		}
        	}

	        // Read in all texture data.
	        var numTextures = data.getUint32(offset, true);
	        offset += 4;
	        _Bitmaps = new Array(numTextures);

	        for(var i = 0; i < numTextures; i++)
	        {
	        	var bmp = {};
	        	bmp.w = data.getUint32(offset, true);
	        	offset += 4;

	        	bmp.h = data.getUint32(offset, true);
	        	offset += 4;

	        	// Create the single channel buffer.
	        	var size = bmp.w*bmp.h;
	        	bmp.buffer = new Uint8Array(data.buffer.slice(offset, offset + size));

	        	_Bitmaps[i] = bmp;
	        }

	        _IsReady = true;
	    }
    };
    xhr.open("GET", filename, true);
    xhr.send();


    this.__defineGetter__("lineHeight", function()
    {
    	return _LineHeight;
    });

    this.__defineGetter__("maxDescender", function()
    {
    	return _MaxDescender;
    });

    this.__defineGetter__("map", function()
    {
    	return _Map;
    });

    this.__defineGetter__("bitmaps", function()
    {
    	return _Bitmaps;
    });

    this.__defineGetter__("isReady", function()
    {
    	return _IsReady;
    });

    this.__defineGetter__("glyphBufferCount", function()
    {
    	return _GlyphBufferCount;
    });

    this.__defineGetter__("glyphs", function()
    {
    	return _Glyphs;
    });
}