import bind from "bind";
import {mat4} from "./glMatrix.js";

export default class Graphics
{
    constructor(canvas)
    {
        this._Canvas = canvas;
        this._GL;
        this._OrthoProjection;
        this._FontWorldMatrix;
        this._SpriteShader;
        this._ColorShader;
        this._RectVertexBuffer;
        this._RectVertexData;

        this._BoundShader;
        this._BoundBuffer;

        this._Color = new Float32Array(4);
        this._DefaultColor = [ 1.0, 1.0, 1.0, 1.0 ];
        this._LastColorIdx = 0;
        this._ColorPalette = 
        [
            new Float32Array([1, 1, 1, 1.0]),           // 0) WHITE
            new Float32Array([0.6, 0.98, 0.59, 1.0]),   // 1) LIGHT GREEN
            new Float32Array([0.95, 0.69, 0.41, 1.0]),  // 2) LIGHT ORANGE
            new Float32Array([0.12, 0.54, 0.91, 1.0]),  // 3) ELECTRIC BLUE
            new Float32Array([0.97, 0.25, 0.25, 1.0]),  // 4) INTENSE RED
            new Float32Array([0.66, 0.82, 0.96, 1.0]),  // 5) LIGHT BLUE
            new Float32Array([0.55, 0.47, 0.44, 1.0]),   // 6) BROWN (FOR COMMENTS)
            new Float32Array([0.78, 0.59, 0.97, 1.0])   // 7) PURPLE.
        ];

        this._ColorBuffer;
        this._CurrentFont;
        this._CurrentFontMap;
        this._CurrentFontTexture;
        this._CompiledShaders = {};

        this._ViewportWidth;
        this._ViewportHeight;
        this._ViewportX;
        this._ViewportY;

        this._Clips = [];

        try
        {
            let options =
            {
                premultipliedAlpha: false,
                preserveDrawingBuffer: true
            };
            this._GL = canvas.getContext("webgl", options) || canvas.getContext("experimental-webgl", options);

        }
        catch (e)
        {
        }

        this._TabSpaces = 4;
    }

    @bind
    init()
    {
        this._OrthoProjection = mat4.create();
        this._FontWorldMatrix = mat4.create();
        this._ColorBuffer = new Float32Array(this._DefaultColor);

        if(!(this._SpriteShader = this._InitializeShader(
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

        if(!(this._ColorShader = this._InitializeShader(
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

        this._RectVertexBuffer = this._GL.createBuffer();
        this._GL.bindBuffer(this._GL.ARRAY_BUFFER, this._RectVertexBuffer);
        this._GL.bufferData(this._GL.ARRAY_BUFFER, (this._RectVertexData=new Float32Array([
            0, 1,
            0, 1,

            0, 0,
            0, 0,

            1, 1,
            1, 1,

            1, 0,
            1, 0
        ])), this._GL.DYNAMIC_DRAW);

        return true;
    }

    _GetShader(id)
    {
        var s = this._CompiledShaders[id];
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
            shader = this._GL.createShader(this._GL.FRAGMENT_SHADER);
        } 
        else if (shaderScript.type == "x-shader/x-vertex") 
        {
            shader = this._GL.createShader(this._GL.VERTEX_SHADER);
        } 
        else
        {
            return null;
        }

        this._GL.shaderSource(shader, str);
        this._GL.compileShader(shader);

        if (!this._GL.getShaderParameter(shader, this._GL.COMPILE_STATUS)) 
        {
          console.log(id, this._GL.getShaderInfoLog(shader));
          return null;
        }

        this._CompiledShaders[id] = shader;

        return shader;
    }

    _InitializeShader(s)
    {
        s.Fragment = this._GetShader(s.Fragment, this._GL.FRAGMENT_SHADER);
        s.Vertex = this._GetShader(s.Vertex, this._GL.VERTEX_SHADER);
        s.Program = this._GL.createProgram();

        this._GL.attachShader(s.Program, s.Vertex);
        this._GL.attachShader(s.Program, s.Fragment);
        this._GL.linkProgram(s.Program);

        if(!this._GL.getProgramParameter(s.Program, this._GL.LINK_STATUS))
        {
            console.log("Could not link shader", s.Name, this._GL.getProgramInfoLog(s.Program));
            return false;
        }

        this._GL.useProgram(s.Program);

        for(let a in s.Attributes)
        {
            if((s.Attributes[a].Index = this._GL.getAttribLocation(s.Program, s.Attributes[a].Name)) == -1)
            {
                console.log("Could not find attribute", s.Attributes[a].Name, " for shader ", s.Name);
            }
        }
        for(let u in s.Uniforms)
        {
            let name = s.Uniforms[u];
            if((s.Uniforms[u] = this._GL.getUniformLocation(s.Program, name)) == null)
            {
                console.log("Could not find uniform", name, "for shader", s.Name);
            }
        }
        
        return s;
    }

    @bind
    enableDepthTest()
    {
        this._GL.enable(this._GL.DEPTH_TEST);
    }

    @bind
    disableDepthTest()
    {
        this._GL.disable(this._GL.DEPTH_TEST);
    }

    @bind
    enableBlending()
    {
        this._GL.enable(this._GL.BLEND);
        this._GL.blendFuncSeparate(this._GL.SRC_ALPHA, this._GL.ONE_MINUS_SRC_ALPHA, this._GL.ONE, this._GL.ONE_MINUS_SRC_ALPHA);
    }

    @bind
    disableBlending()
    {
        this._GL.disable(this._GL.BLEND);
    }

    _Bind(shader, buffer)
    {
        if(this._BoundShader == shader && this._BoundBuffer == buffer)
        {
            return;
        }

        // Disable anything necessary for the old shader.
        if(this._BoundShader)
        {
            for(var a in this._BoundShader.Attributes)
            {
                var at = this._BoundShader.Attributes[a];
                if(at.Index != -1)
                {
                    this._GL.disableVertexAttribArray(at.Index);
                }
            }
        }

        if(shader == null)
        {
            this._BoundShader = null;
            this._BoundBuffer = null;
            this._GL.useProgram(null);
            return;
        }

        // Bind the new one.
        this._GL.useProgram(shader.Program);

        this._BoundShader = shader;
        this._BoundBuffer = buffer;

        this._GL.bindBuffer(this._GL.ARRAY_BUFFER, this._BoundBuffer);

        for(var a in shader.Attributes)
        {
            var at = shader.Attributes[a];

            if(at.Index != -1)
            {
                this._GL.enableVertexAttribArray(at.Index);
                this._GL.vertexAttribPointer(at.Index, at.Size, this._GL.FLOAT, false, at.Stride, at.Offset); 
            }
        }
    }


    setViewport(x, y, width, height)//, isOrtho)
    {
        this._ViewportX = x;
        this._ViewportY = y;
        this._ViewportWidth = width;
        this._ViewportHeight = height;

        this._GL.viewport(this._ViewportX, this._ViewportY, this._ViewportWidth, this._ViewportHeight);
        mat4.ortho(this._OrthoProjection, 0, this._ViewportWidth, this._ViewportHeight, 0, 0, 1);
    }

    get viewportX()
    {
        return this._ViewportX;
    }

    get viewportY()
    {
        return this._ViewportY;
    }

    get viewportWidth()
    {
        return this._ViewportWidth;
    }

    viewportHeight()
    {
        return this._ViewportHeight;
    }

    @bind
    clear(color)
    {
        this._GL.clearColor(color[0], color[1], color[2], color[3]);
        this._GL.disable(this._GL.DEPTH_TEST);
        this._GL.clear(this._GL.COLOR_BUFFER_BIT);
        this._GL.depthMask(false);
        this._GL.enable(this._GL.BLEND);
        this._GL.blendFuncSeparate(this._GL.SRC_ALPHA, this._GL.ONE_MINUS_SRC_ALPHA, this._GL.ONE, this._GL.ONE_MINUS_SRC_ALPHA);

        this._GL.viewport(this._ViewportX, this._ViewportY, this._ViewportWidth, this._ViewportHeight);
    }

    @bind
    setFont(font, opacity, color)
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
            color = this._DefaultColor;
        }

        for(let i = 0; i < 4; i++) this._ColorBuffer[i] = color[i];

        let shader = this._SpriteShader;
        this._CurrentFont = font;
        this._CurrentFontMap = font.map;

        if(!font.vertexBuffer)
        {
            // Create buffer.
            let vertices = new Float32Array(font.glyphBufferCount * 16);
            let bufferIndex = 0;
            let glyphs = font.glyphs;
            for(let i = 0; i < glyphs.length; i++)
            {
                let glyph = glyphs[i];

                if(glyph.w == 0 || glyph.h == 0)
                {
                    continue;
                }

                glyph.bufferIndex = bufferIndex;
                let baseIndex = bufferIndex * 16;
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

            font.vertexBuffer = this._GL.createBuffer();
            this._GL.bindBuffer(this._GL.ARRAY_BUFFER, font.vertexBuffer);
            this._GL.bufferData(this._GL.ARRAY_BUFFER, vertices, this._GL.STATIC_DRAW);
        }
        if(!font.textures)
        {
            font.textures = new Array(font.bitmaps.length);
            for(let i = 0; i < font.bitmaps.length; i++)
            {
                let bitmap = font.bitmaps[i];
                let texture = this._GL.createTexture();

                this._GL.bindTexture(this._GL.TEXTURE_2D, texture);

                this._GL.pixelStorei(this._GL.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
                
                //this._GL.pixelStorei(this._GL.UNPACK_ALIGNMENT, 1);
                this._GL.texParameteri(this._GL.TEXTURE_2D, this._GL.TEXTURE_MAG_FILTER, this._GL.NEAREST);
                this._GL.texParameteri(this._GL.TEXTURE_2D, this._GL.TEXTURE_MIN_FILTER, this._GL.NEAREST);
                this._GL.texParameteri(this._GL.TEXTURE_2D, this._GL.TEXTURE_WRAP_S, this._GL.CLAMP_TO_EDGE);
                this._GL.texParameteri(this._GL.TEXTURE_2D, this._GL.TEXTURE_WRAP_T, this._GL.CLAMP_TO_EDGE);

                this._GL.texImage2D(this._GL.TEXTURE_2D, 0, this._GL.ALPHA, bitmap.w, bitmap.h, 0, this._GL.ALPHA, this._GL.UNSIGNED_BYTE, bitmap.buffer);

                font.textures[i] = texture;
            }
        }

        this._Bind(shader, font.vertexBuffer);

        this._GL.uniformMatrix4fv(shader.Uniforms.ProjectionMatrix, false, this._OrthoProjection);
        this._GL.uniformMatrix4fv(shader.Uniforms.WorldMatrix, false, this._FontWorldMatrix);   

        this._CurrentFontTexture = -1;
        //_GL.activeTexture(_GL.TEXTURE0);
        //_GL.bindTexture(_GL.TEXTURE_2D, font.texture);
        //_GL.uniform1i(shader.Uniforms.TextureSampler, 0);

        this._GL.uniform1f(shader.Uniforms.Opacity, opacity);  
        this._GL.uniform4fv(shader.Uniforms.Color, this._ColorBuffer);

        // This allows any "non" colored characters to use the default color passed in by the color argument above.
        this._LastColorIdx = 0;

        return true;
    }

    @bind
    drawText(x, y, t, offset, lastChar)
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

            var g = this._CurrentFontMap[c];
            if(!g)
            {
                g = this._CurrentFontMap[0];
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
                if(colorIdx != this._LastColorIdx)
                {
                    this._LastColorIdx = colorIdx;
                    this._GL.uniform4fv(this._SpriteShader.Uniforms.Color, this._ColorPalette[colorIdx]);
                }

                if(g.ti != this._CurrentFontTexture)
                {
                    this._CurrentFontTexture = g.ti;

                    this._GL.activeTexture(this._GL.TEXTURE0);
                    this._GL.bindTexture(this._GL.TEXTURE_2D, this._CurrentFont.textures[g.ti]);
                    this._GL.uniform1i(this._SpriteShader.Uniforms.TextureSampler, 0);
                }
                this._FontWorldMatrix[12] = x + g.hbx;
                this._FontWorldMatrix[13] = y - g.hby;
                this._GL.uniformMatrix4fv(this._SpriteShader.Uniforms.WorldMatrix, false, this._FontWorldMatrix);
                
                this._GL.drawArrays(this._GL.TRIANGLE_STRIP, g.bufferIndex*4, 4);
            }
            if(isTab)
            {
                x = startX + Math.floor(((x-startX) / (this._TabSpaces*g.ha))+1)*(this._TabSpaces*g.ha);
            }
            else
            {
                x += g.ha;    
            }
            p = c;
        }
    }

    @bind
    drawRect(x, y, width, height, opacity, color)
    {
        this._RectVertexData[0] = x;
        this._RectVertexData[1] = y + height;

        this._RectVertexData[4] = x;
        this._RectVertexData[5] = y;

        this._RectVertexData[8] = x+width;
        this._RectVertexData[9] = y+height;

        this._RectVertexData[12] = x+width;
        this._RectVertexData[13] = y;

        this._Bind(this._ColorShader, this._RectVertexBuffer);
        this._GL.bufferData(this._GL.ARRAY_BUFFER, this._RectVertexData, this._GL.DYNAMIC_DRAW);

        for(var i = 0; i < 4; i++) this._ColorBuffer[i] = color[i];

        this._GL.uniform1f(this._ColorShader.Uniforms.Opacity, opacity);  
        this._GL.uniform4fv(this._ColorShader.Uniforms.Color, this._ColorBuffer);

        this._FontWorldMatrix[12] = 0;
        this._FontWorldMatrix[13] = 0;
        this._GL.uniformMatrix4fv(this._ColorShader.Uniforms.WorldMatrix, false, this._FontWorldMatrix);
        this._GL.uniformMatrix4fv(this._ColorShader.Uniforms.ProjectionMatrix, false, this._OrthoProjection);

        this._GL.drawArrays(this._GL.TRIANGLE_STRIP, 0, 4);
    }

    @bind
    setClip(x, y, w, h)
    {
        this._GL.enable(this._GL.SCISSOR_TEST);
        this._GL.scissor(x, this._ViewportHeight-y-h, w, h);

        this._Clips = 
        [
            {x:x, y:y, w:w, h:h}
        ];
    }

    @bind
    pushClip(x,y,w,h)
    {
        //console.log("PUSH", _Clips.length);
        if(!this._Clips || this._Clips.length == 0)
        {
            //this._Clips.push({x:_ViewportX, y:_ViewportY, w:_ViewportWidth, h:_ViewportHeight})
            this._Clips.push({x:0.0, y:0.0, w:this._Canvas.width, h:this._Canvas.height});
        }

        var lastClip = this._Clips[this._Clips.length-1];
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
        this._Clips.push(clip);
        this._GL.enable(this._GL.SCISSOR_TEST);
        this._GL.scissor(clip.x, this._Canvas.height-clip.y-clip.h, clip.w < 0 ? 0 : clip.w, clip.h < 0 ? 0 : clip.h);
    }

    popClip(x,y,w,h)
    {
        if(this._Clips.length < 2)
        {
            return;
        }
        else if(this._Clips.length == 2)
        {
            this.clearClip();
            return;
        }
        this._Clips.splice(this._Clips.length-1, 1);
        var clip = this._Clips[this._Clips.length-1];

        this._GL.enable(this._GL.SCISSOR_TEST);
        this._GL.scissor(clip.x, this._ViewportHeight-clip.y-clip.h, clip.w < 0 ? 0 : clip.w, clip.h < 0 ? 0 : clip.h);
    }

    @bind
    clearClip()
    {
        this._GL.disable(this._GL.SCISSOR_TEST);
        this._Clips = [];
    }

    setTabSpaces(n)
    {
        this._TabSpaces = n;
    }
}