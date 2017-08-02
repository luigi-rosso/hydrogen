import React from "react";
import {render} from "react-dom";
import bind from "bind";
import Hydrogen from "./Hydrogen.js";

class Main extends React.Component
{
	constructor(props)
	{
		super(props);

		this._IsDown = false;
		this._Hydrogen;
	}

	initialize(canvas)
	{
        let self = this;

        let dropZone = document.body;
        dropZone.addEventListener("dragover", this.handleDragOver, false);
        dropZone.addEventListener("drop", this.handleFileSelect, false);
        dropZone.addEventListener("paste", this.handlePaste, false);

        this._Hydrogen = new Hydrogen(canvas);

        let lastMousePosition = [0,0];

        document.body.onmousedown = function(e)
        {
            self._IsDown = true;
            lastMousePosition = [e.pageX, e.pageY];
        };

        document.body.onmousemove = function(e)
        {
            let mouseDelta = [e.pageX - lastMousePosition[0], e.pageY - lastMousePosition[1]];
            lastMousePosition = [e.pageX, e.pageY];
        };

        document.body.onmouseup = function(e)
        {
            self._IsDown = false;
        };
    }

    get isDown()
    {
		return this._IsDown;
	}

	get hydrogen()
	{
		return this._Hydrogen;
	}

	@bind
	handleDragOver(evt) 
    {
        evt.stopPropagation();
        evt.preventDefault();
        evt.dataTransfer.dropEffect = "copy";
    }

    @bind
    handlePaste(evt) 
    {
        //_UIRoot.onpaste(evt.clipboardData.getData("text"));
    }

    @bind
    handleFileSelect(evt)
    {
        return;
    }

	@bind
	setCanvas(ref)
	{
		this.canvas = ref;
		this.initialize(ref);
	}

	render()
	{
		return <canvas ref={this.setCanvas}></canvas>;
	}
}

render(<Main/>, document.getElementById("container"));