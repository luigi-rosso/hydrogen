import React from "react";
import ReactDOM from "react-dom";
import bind from "bind";
import Hydrogen from "./Hydrogen.js";

class Main extends React.Component
{
	constructor(props)
	{
		super(props);

		this._Hydrogen;
	}

	get hydrogen()
	{
		return this._Hydrogen;
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
        return <div className="HorizontalSplit" style={{position:"absolute"}}>
            <div className="FirstHorizontalSplit"></div>
            <div className="SecondHorizontalSplit">
                <div className="VerticalSplit">
                    <div ref={this.setContainer1} className="FirstVerticalSplit"></div>
                    <div ref={this.setContainer2} className="SecondVerticalSplit"></div>
                </div>
            </div>
        </div>;
	}
}

ReactDOM.render(<Main/>, document.getElementById("container"));