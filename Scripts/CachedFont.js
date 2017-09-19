export default class CachedFont
{
    constructor(filename)
    {
        this._Map = {};
        this._Glyphs = [];
        this._Bitmaps = [];
        this._LineHeight = 0;
        this._MaxDescender = 0;
        this._IsReady = false;
        this._GlyphBufferCount = 0;
        this._HorizontalAdvance = 0;

        let xhr = new XMLHttpRequest();
        xhr.responseType = "arraybuffer";

        let self = this;
        xhr.onreadystatechange = function(req)
        {
            if(this.readyState == this.DONE)
            {
                let data = new DataView(this.response);
                let offset = 0;

                self._LineHeight = data.getInt32(offset, true);
                offset += 4;

                self._MaxDescender = data.getInt32(offset, true);
                offset += 4;

                let numGlyphs = data.getUint32(offset, true);
                offset += 4;

                //console.log(lineHeight, descender, numGlyphs);

                // Read in all glyph data.
                for(let i = 0; i < numGlyphs; i++)
                {
                    let gly = {};

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
                        for(let j = 0; j < gly.kpc; j++)
                        {
                            let kp = {};
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

                    self._Map[gly.utf8] = gly;
                    self._Glyphs.push(gly);

                    if(gly.w != 0 && gly.h != 0)
                    {
                        self._GlyphBufferCount++;
                    }

                    if(gly.ha > self._HorizontalAdvance)
                    {
                        self._HorizontalAdvance = gly.ha;
                    }
                }

                // Read in all texture data.
                let numTextures = data.getUint32(offset, true);
                offset += 4;
                self._Bitmaps = new Array(numTextures);

                for(let i = 0; i < numTextures; i++)
                {
                    let bmp = {};
                    bmp.w = data.getUint32(offset, true);
                    offset += 4;

                    bmp.h = data.getUint32(offset, true);
                    offset += 4;

                    // Create the single channel buffer.
                    let size = bmp.w*bmp.h;
                    bmp.buffer = new Uint8Array(data.buffer.slice(offset, offset + size));

                    self._Bitmaps[i] = bmp;
                }

                self._IsReady = true;
                if(self.onReady)
                {
                    self.onReady();
                }
            }
        };
        xhr.open("GET", filename, true);
        xhr.send();
    }
	
    get lineHeight()
    {
        return this._LineHeight;
    }

    get maxDescender()
    {
        return this._MaxDescender;
    }

    get map()
    {
        return this._Map;
    }

    get bitmaps()
    {
        return this._Bitmaps;
    }

    get isReady()
    {
        return this._IsReady;
    }

    get glyphBufferCount()
    {
        return this._GlyphBufferCount;
    }

    get glyphs()
    {
        return this._Glyphs;
    }

    get horizontalAdvance()
    {
        return this._HorizontalAdvance;
    }
}