import React from "react";
import ReactDOM from "react-dom";
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
        /*let self = this;

        let dropZone = document.body;
        dropZone.addEventListener("dragover", this.handleDragOver, false);
        dropZone.addEventListener("drop", this.handleFileSelect, false);
        dropZone.addEventListener("paste", this.handlePaste, false);

        this._Hydrogen = new Hydrogen(canvas);
        this._Hydrogen.setContents("hello\nworld\nwhat\nis\nup");

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
        };*/
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

    @bind
    setContainer1(ref)
    {
        this._Hydrogen1 = new Hydrogen(ReactDOM.findDOMNode(ref));
        this._Hydrogen1.setContents("hello1\nworld\nwhat\nis\nup");
    }

    @bind
    setContainer2(ref)
    {
        this._Hydrogen2 = new Hydrogen(ReactDOM.findDOMNode(ref));
        this._Hydrogen2.setContents("hello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\nhello2\nworld\nwhat\nis\nup\n");
    }

	render()
	{
		return <div>
                <div ref={this.setContainer1} style={{width:"500px",height:"700px",border:"1px solid grey"}}></div>
                <div ref={this.setContainer2} style={{marginTop:"10px", width:"600px",height:"800px",border:"1px solid grey"}}></div>
                <canvas ref={this.setCanvas}></canvas>
            </div>;
	}
}

ReactDOM.render(<Main/>, document.getElementById("container"));