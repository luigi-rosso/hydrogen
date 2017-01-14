## hydrogen
Lightweight code editor built entirely in JavaScript with WebGL rendering. Try it out at http://luigi-rosso.github.io/hydrogen/. Just drag and drop a text file in.

## WHY?!
Performance (at least compared to other browser based editors). This is not a feature rich text editor. It doesn't do line wrapping, code folding, or even have much coloring (yet). But it lets you edit enormous text files quickly in a web browser.

## Features
* JavaScript glyph layout + WebGL glyph rendering via a custom font texture map file (more on this soon).
* Culled glyph rendering.
* Redraws only when necessary.
* Multi-cursor editing. Command click to create a new cursor.
* Full undo/redo stack.
* Alt left/right cursor to move to token boundaries.

## Usage
Really still an experiment, needs to be modularized a bit better...For now just use index.html.

## Contributing
1. Fork it!
2. Create your feature branch: `git checkout -b my-new-feature`
3. Commit your changes: `git commit -am 'Add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request.

## License
MIT
