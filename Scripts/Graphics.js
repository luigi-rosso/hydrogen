var Graphics = function (canvas)
{
    var _This = this;
    var _GL;
    var _OrthoProjection;
    var _FontWorldMatrix;
    var _SpriteShader;
    var _ColorShader;
    var _RectVertexBuffer;
    var _RectVertexData;

    var _BoundShader;
    var _BoundBuffer;

    var _Color = new Float32Array(4);
    var _DefaultColor = [ 1.0, 1.0, 1.0, 1.0 ];
    var _LastColorIdx = 0;
    var _ColorPalette = 
    [
        new Float32Array([1, 1, 1, 1.0]),
        new Float32Array([0.6, 0.98, 0.59, 1.0]),
        new Float32Array([1.0, 0.9, 0.8, 1.0]),
        new Float32Array([0.4, 0.4, 0.4, 1.0]),
        new Float32Array([0.0, 0.0, 1.0, 1.0]),
        new Float32Array([0.2, 0.8, 0.2, 1.0])
    ];

    var _ColorBuffer;
    var _CurrentFont;
    var _CurrentFontMap;
    var _CurrentFontTexture;
    var _CompiledShaders = {};

    var _ViewportWidth;
    var _ViewportHeight;
    var _ViewportX;
    var _ViewportY;

    var _Clips = [];

    try
    {
        var options =
        {
            premultipliedAlpha: false,
            preserveDrawingBuffer: true
        };
        _GL = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);

    }
    catch (e)
    {
    }

    _Initialize = function()
    {
        _OrthoProjection = mat4.create();
        _FontWorldMatrix = mat4.create();
        _ColorBuffer = new Float32Array(_DefaultColor);

        if(!(_SpriteShader = _InitializeShader(
        {
            Name: "SpriteShader",

            Vertex: "sprite-vs",
            Fragment:"sprite-fs",

            Attributes:
            {
                VertexPosition: 
                {
                    Name:"VertexPosition",
                    Size: 2,
                    Stride: 16,
                    Offset: 0
                },
                VertexNormal: 
                {
                    Name:"VertexTexCoord",
                    Size: 2,
                    Stride: 16,
                    Offset: 8
                }
            },

            Uniforms:
            {
                ProjectionMatrix: "ProjectionMatrix",
                WorldMatrix: "WorldMatrix",
                TextureSampler: "TextureSampler",
                Opacity: "Opacity",
                Color: "Color"
            }
        })))
        {
            return false;
        }

        if(!(_ColorShader = _InitializeShader(
        {
            Name: "Color",

            Vertex: "color-vs",
            Fragment:"color-fs",

            Attributes:
            {
                VertexPosition: 
                {
                    Name:"VertexPosition",
                    Size: 2,
                    Stride: 16,
                    Offset: 0
                }
            },

            Uniforms:
            {
                ProjectionMatrix: "ProjectionMatrix",
                WorldMatrix: "WorldMatrix",
                Opacity: "Opacity",
                Color: "Color"
            }
        })))
        {
            return false;
        }

        _RectVertexBuffer = _GL.createBuffer();
        _GL.bindBuffer(_GL.ARRAY_BUFFER, _RectVertexBuffer);
        _GL.bufferData(_GL.ARRAY_BUFFER, (_RectVertexData=new Float32Array([
            0, 1,
            0, 1,

            0, 0,
            0, 0,

            1, 1,
            1, 1,

            1, 0,
            1, 0
        ])), _GL.DYNAMIC_DRAW);

        return true;
    };

    var _GetShader = function(id)
    {
        var s = _CompiledShaders[id];
        if(s)
        {
            return s;
        }

        var shaderScript = document.getElementById(id);
        if (!shaderScript) 
        {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) 
        {
            if (k.nodeType == 3)
                str += k.textContent;
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") 
        {
            shader = _GL.createShader(_GL.FRAGMENT_SHADER);
        } 
        else if (shaderScript.type == "x-shader/x-vertex") 
        {
            shader = _GL.createShader(_GL.VERTEX_SHADER);
        } 
        else
        {
            return null;
        }

        _GL.shaderSource(shader, str);
        _GL.compileShader(shader);

        if (!_GL.getShaderParameter(shader, _GL.COMPILE_STATUS)) 
        {
          console.log(id, _GL.getShaderInfoLog(shader));
          return null;
        }

        _CompiledShaders[id] = shader;

        return shader;
    };

    var _InitializeShader = function(s)
    {
        s.Fragment = _GetShader(s.Fragment, _GL.FRAGMENT_SHADER);
        s.Vertex = _GetShader(s.Vertex, _GL.VERTEX_SHADER);
        s.Program = _GL.createProgram();

        _GL.attachShader(s.Program, s.Vertex);
        _GL.attachShader(s.Program, s.Fragment);
        _GL.linkProgram(s.Program);

        if(!_GL.getProgramParameter(s.Program, _GL.LINK_STATUS))
        {
            console.log("Could not link shader", s.Name, _GL.getProgramInfoLog(s.Program));
            return false;
        }

        _GL.useProgram(s.Program);

        for(var a in s.Attributes)
        {
            if((s.Attributes[a].Index = _GL.getAttribLocation(s.Program, s.Attributes[a].Name)) == -1)
            {
                console.log("Could not find attribute", s.Attributes[a].Name, " for shader ", s.Name);
            }
        }
        for(var u in s.Uniforms)
        {
            var name = s.Uniforms[u];
            if((s.Uniforms[u] = _GL.getUniformLocation(s.Program, name)) == null)
            {
                console.log("Could not find uniform", name, "for shader", s.Name);
            }
        }
        
        return s;
    };

    var _EnableDepthTest = function()
    {
        _GL.enable(_GL.DEPTH_TEST);
    };

    var _DisableDepthTest = function()
    {
        _GL.disable(_GL.DEPTH_TEST);
    };

    var _EnableBlending = function()
    {
        _GL.enable(_GL.BLEND);
        _GL.blendFuncSeparate(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);
    };

    var _DisableBlending = function()
    {
        _GL.disable(_GL.BLEND);
    };

    var _Bind = function(shader, buffer)
    {
        if(_BoundShader == shader && _BoundBuffer == buffer)
        {
            return;
        }

        // Disable anything necessary for the old shader.
        if(_BoundShader)
        {
            for(var a in _BoundShader.Attributes)
            {
                var at = _BoundShader.Attributes[a];
                if(at.Index != -1)
                {
                    _GL.disableVertexAttribArray(at.Index);
                }
            }
        }

        if(shader == null)
        {
            _BoundShader = null;
            _BoundBuffer = null;
            _GL.useProgram(null);
            return;
        }

        // Bind the new one.
        _GL.useProgram(shader.Program);

        _BoundShader = shader;
        _BoundBuffer = buffer;

        _GL.bindBuffer(_GL.ARRAY_BUFFER, _BoundBuffer);

        for(var a in shader.Attributes)
        {
            var at = shader.Attributes[a];

            if(at.Index != -1)
            {
                _GL.enableVertexAttribArray(at.Index);
                _GL.vertexAttribPointer(at.Index, at.Size, _GL.FLOAT, false, at.Stride, at.Offset); 
            }
        }
    };


    this.setViewport = function(x, y, width, height)//, isOrtho)
    {
        _ViewportX = x;
        _ViewportY = y;
        _ViewportWidth = width;
        _ViewportHeight = height;

        _GL.viewport(_ViewportX, _ViewportY, _ViewportWidth, _ViewportHeight);
        mat4.ortho(_OrthoProjection, 0, _ViewportWidth, _ViewportHeight, 0, 0, 1);
    };

    this.__defineGetter__("viewportX", function()
    {
        return _ViewportX;
    });

    this.__defineGetter__("viewportY", function()
    {
        return _ViewportY;
    });

    this.__defineGetter__("viewportWidth", function()
    {
        return _ViewportWidth;
    });

    this.__defineGetter__("viewportHeight", function()
    {
        return _ViewportHeight;
    });

    var _Clear = function(color)
    {
        _GL.clearColor(color[0], color[1], color[2], color[3]);
        _GL.disable(_GL.DEPTH_TEST);
        _GL.clear(_GL.COLOR_BUFFER_BIT);
        _GL.depthMask(false);
        _GL.enable(_GL.BLEND);
        _GL.blendFuncSeparate(_GL.SRC_ALPHA, _GL.ONE_MINUS_SRC_ALPHA, _GL.ONE, _GL.ONE_MINUS_SRC_ALPHA);

        _GL.viewport(_ViewportX, _ViewportY, _ViewportWidth, _ViewportHeight);
    };

    var _SetFont = function(font, opacity, color)
    {
        if(!font.isReady)
        {
            // Font still loading, or failed.
            return false;
        }

        if(opacity === undefined)
        {
            opacity = 1.0;
        }

        if(!color) 
        {
            color = _DefaultColor;
        }

        for(var i = 0; i < 4; i++) _ColorBuffer[i] = color[i];

        var shader = _SpriteShader;
        _CurrentFont = font;
        _CurrentFontMap = font.map;

        if(!font.vertexBuffer)
        {
            // Create buffer.
            var vertices = new Float32Array(font.glyphBufferCount * 16);
            var bufferIndex = 0;
            var glyphs = font.glyphs;
            for(var i = 0; i < glyphs.length; i++)
            {
                var glyph = glyphs[i];

                if(glyph.w == 0 || glyph.h == 0)
                {
                    continue;
                }

                glyph.bufferIndex = bufferIndex;
                var baseIndex = bufferIndex * 16;
                bufferIndex++;

                vertices[baseIndex+0] = 0.0;
                vertices[baseIndex+1] = glyph.h;
                vertices[baseIndex+2] = glyph.u;
                vertices[baseIndex+3] = glyph.v;

                vertices[baseIndex+4] = 0.0;
                vertices[baseIndex+5] = 0.0;
                vertices[baseIndex+6] = glyph.u;
                vertices[baseIndex+7] = glyph.v + glyph.vs;

                vertices[baseIndex+8] = glyph.w;
                vertices[baseIndex+9] = glyph.h;
                vertices[baseIndex+10] = glyph.u + glyph.us;
                vertices[baseIndex+11] = glyph.v;

                vertices[baseIndex+12] = glyph.w;
                vertices[baseIndex+13] = 0.0;
                vertices[baseIndex+14] = glyph.u + glyph.us;
                vertices[baseIndex+15] = glyph.v + glyph.vs;

                //console.log(glyph.v + glyph.vs, glyph.u + glyph.us, glyph.w, glyph.h);
            }

            font.vertexBuffer = _GL.createBuffer();
            _GL.bindBuffer(_GL.ARRAY_BUFFER, font.vertexBuffer);
            _GL.bufferData(_GL.ARRAY_BUFFER, vertices, _GL.STATIC_DRAW);
        }
        if(!font.textures)
        {
            font.textures = new Array(font.bitmaps.length);
            for(var i = 0; i < font.bitmaps.length; i++)
            {
                var bitmap = font.bitmaps[i];
                var texture = _GL.createTexture();

                _GL.bindTexture(_GL.TEXTURE_2D, texture);

                _GL.pixelStorei(_GL.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                
                //_GL.pixelStorei(_GL.UNPACK_ALIGNMENT, 1);
                _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MAG_FILTER, _GL.NEAREST);
                _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_MIN_FILTER, _GL.NEAREST);
                _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_S, _GL.CLAMP_TO_EDGE);
                _GL.texParameteri(_GL.TEXTURE_2D, _GL.TEXTURE_WRAP_T, _GL.CLAMP_TO_EDGE);

                _GL.texImage2D(_GL.TEXTURE_2D, 0, _GL.ALPHA, bitmap.w, bitmap.h, 0, _GL.ALPHA, _GL.UNSIGNED_BYTE, bitmap.buffer);

                font.textures[i] = texture;
            }
        }

        _Bind(shader, font.vertexBuffer);

        _GL.uniformMatrix4fv(shader.Uniforms.ProjectionMatrix, false, _OrthoProjection);
        _GL.uniformMatrix4fv(shader.Uniforms.WorldMatrix, false, _FontWorldMatrix);   

        _CurrentFontTexture = -1;
        //_GL.activeTexture(_GL.TEXTURE0);
        //_GL.bindTexture(_GL.TEXTURE_2D, font.texture);
        //_GL.uniform1i(shader.Uniforms.TextureSampler, 0);

        _GL.uniform1f(shader.Uniforms.Opacity, opacity);  
        _GL.uniform4fv(shader.Uniforms.Color, _ColorBuffer);

        return true;
    };

    var _TabSpaces = 4;
    var _DrawText = function(x, y, t, offset, lastChar)
    {
        //x = Math.round(x);
        //y = Math.round(y);
        var startX = x;

        offset |= 0;
        if(lastChar == undefined)
        {
            lastChar = t.length-1;
        }
        else
        {
            lastChar = Math.min(lastChar, t.length-1);
        }
        
        var p = 0;

        for(var i = offset; i <= lastChar; i++)
        {
            var c = t[i]; // Returns the UTF code for the character.
            let colorIdx = c >> 21;
            c = (c << 11) >>> 11;
            // console.log("COLORIDX:", colorIdx);
  
            var isTab = false;
            switch(c)
            {
                case 32:        // SPACE
                case 13:        // RETURN
                    c = 32;
                    break;


                case 9:        // TAB - for now we translate a tab to a space
                    c = 32;
                    isTab = true;
                    break;
            }

            var g = _CurrentFontMap[c];
            if(!g)
            {
                g = _CurrentFontMap[0];
            }
            
            /*if(p)
            {
                var k = g.kern[p];
                if(k)
                {
                    x += k.x;
                }
            }*/
            if(g.bufferIndex !== -1)
            {
                if(colorIdx != _LastColorIdx)
                {
                    _LastColorIdx = colorIdx;
                    _GL.uniform4fv(_SpriteShader.Uniforms.Color, _ColorPalette[colorIdx]);
                }

                if(g.ti != _CurrentFontTexture)
                {
                    _CurrentFontTexture = g.ti;

                    _GL.activeTexture(_GL.TEXTURE0);
                    _GL.bindTexture(_GL.TEXTURE_2D, _CurrentFont.textures[g.ti]);
                    _GL.uniform1i(_SpriteShader.Uniforms.TextureSampler, 0);
                }
                _FontWorldMatrix[12] = x + g.hbx;
                _FontWorldMatrix[13] = y - g.hby;
                _GL.uniformMatrix4fv(_SpriteShader.Uniforms.WorldMatrix, false, _FontWorldMatrix);
                
                _GL.drawArrays(_GL.TRIANGLE_STRIP, g.bufferIndex*4, 4);
            }
            if(isTab)
            {
                x = startX + Math.floor(((x-startX) / (_TabSpaces*g.ha))+1)*(_TabSpaces*g.ha);
            }
            else
            {
                x += g.ha;    
            }
            p = c;
        }
    };

    var _DrawRect = function(x, y, width, height, opacity, color)
    {
        _RectVertexData[0] = x;
        _RectVertexData[1] = y + height;

        _RectVertexData[4] = x;
        _RectVertexData[5] = y;

        _RectVertexData[8] = x+width;
        _RectVertexData[9] = y+height;

        _RectVertexData[12] = x+width;
        _RectVertexData[13] = y;

        _Bind(_ColorShader, _RectVertexBuffer);
        _GL.bufferData(_GL.ARRAY_BUFFER, _RectVertexData, _GL.DYNAMIC_DRAW);

        for(var i = 0; i < 4; i++) _ColorBuffer[i] = color[i];

        _GL.uniform1f(_ColorShader.Uniforms.Opacity, opacity);  
        _GL.uniform4fv(_ColorShader.Uniforms.Color, _ColorBuffer);

        _FontWorldMatrix[12] = 0;
        _FontWorldMatrix[13] = 0;
        _GL.uniformMatrix4fv(_ColorShader.Uniforms.WorldMatrix, false, _FontWorldMatrix);
        _GL.uniformMatrix4fv(_ColorShader.Uniforms.ProjectionMatrix, false, _OrthoProjection);

        _GL.drawArrays(_GL.TRIANGLE_STRIP, 0, 4);
    };

    var _SetClip = function(x, y, w, h)
    {
        _GL.enable(_GL.SCISSOR_TEST);
        _GL.scissor(x, _ViewportHeight-y-h, w, h);

        _Clips = 
        [
            {x:x, y:y, w:w, h:h}
        ];
    };

    var _PushClip = function(x,y,w,h)
    {
        //console.log("PUSH", _Clips.length);
        if(!_Clips || _Clips.length == 0)
        {
            //_Clips.push({x:_ViewportX, y:_ViewportY, w:_ViewportWidth, h:_ViewportHeight})
            _Clips.push({x:0.0, y:0.0, w:canvas.width, h:canvas.height})
        }

        var lastClip = _Clips[_Clips.length-1];
        var clip = {};
        if(lastClip.x > x)
        {
            clip.x = lastClip.x;
        }
        else
        {
            clip.x = x;
        }

        if(lastClip.y > y)
        {
            clip.y = lastClip.y;
        }
        else
        {
            clip.y = y;
        }

        if(lastClip.x+lastClip.w < x+w)
        {
            clip.w = (lastClip.x+lastClip.w)-x;
        }
        else
        {
            clip.w = (x+w)-x;
        }
        
        if(lastClip.y+lastClip.h < y+h)
        {
            clip.h = (lastClip.y+lastClip.h)-y;
        }
        else
        {
            clip.h = (y+h)-y;
        }
        _Clips.push(clip)
        _GL.enable(_GL.SCISSOR_TEST);
        _GL.scissor(clip.x, canvas.height-clip.y-clip.h, clip.w < 0 ? 0 : clip.w, clip.h < 0 ? 0 : clip.h);
    };

    var _PopClip = function(x,y,w,h)
    {
        if(_Clips.length < 2)
        {
            return;
        }
        else if(_Clips.length == 2)
        {
            _ClearClip();
            return;
        }
        _Clips.splice(_Clips.length-1, 1);
        var clip = _Clips[_Clips.length-1];

        _GL.enable(_GL.SCISSOR_TEST);
        _GL.scissor(clip.x, _ViewportHeight-clip.y-clip.h, clip.w < 0 ? 0 : clip.w, clip.h < 0 ? 0 : clip.h);
    };

    var _ClearClip = function()
    {
        _GL.disable(_GL.SCISSOR_TEST);
        _Clips = [];
    };

    this.setClip = _SetClip;
    this.clearClip = _ClearClip;
    this.pushClip = _PushClip;
    this.popClip = _PopClip;

    this.enableBlending = _EnableBlending;
    this.disableBlending = _DisableBlending;
    this.enableDepthTest = _EnableDepthTest;
    this.disableDepthTest = _DisableDepthTest;

    this.setFont = _SetFont;
    this.drawText = _DrawText;
    this.drawRect = _DrawRect;

    this.init = _Initialize;
    this.clear = _Clear;
    this.setTabSpaces = function(n)
    {
        _TabSpaces = n;
    };
};