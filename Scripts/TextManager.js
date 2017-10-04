/*
	Right now we're representing everything in the document as an array of freaking numbers, which is sadly a crazy nightmare to deal with.
	I have to do some more testing but we might need a helper class to deal with the situation and make it possible to easily and fastly change between a number representation and a textual representation in order to have also easier access to the text for faster syntax processing.
*/
export default class TextManager
{
	constructor()
	{
		this._TextLines = [];
	}

	codePointsToText(lines)
	{
		let textLines = [];

		for(let i = 0; i < lines.length; i++)
		{
			let line = lines[i];
			let t = "";
			for(let j = 0; j < line.length; j++)
			{
				// Clear old color index
				let codePoint = (line[j] << 11) >>> 11;
				let char = String.fromCodePoint(codePoint);
				t += char;
			}

			textLines.push(t);
		}

		this._TextLines = textLines;
	}

	/*
		Colors a single character `c` (represented by a Unicode Code Point)  with the color at given index in the Palette
		- 'c' Uint32 
		- 'colorIndex' int
	*/
	colorChar(c, colorIndex)
	{
		colorIndex = colorIndex || 0; // Make sure color is a value
		c = (c << 11) >>> 11; // Clear old color mask
		let colorIdx = colorIndex << 21; 
		c = c ^ colorIdx;

		return c;
	}
}