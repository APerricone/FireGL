This little project is used to minify the javascript and shader part of the site, to make them quicker to load and less understandable.

It is able to parse an HTML file and minify the javascript part.
It works recurively in the included file, from HTML to included JS, from JS to included worker and shaders.

To minify the file it uses:
* [UglifyJS](https://github.com/mishoo/UglifyJS2) to compress JS
* [glslmin](https://github.com/chrisdickinson/glslmin) to compress shader files 

In the futher I think I will rewrite it in node.js making it simpler and cleaner.
