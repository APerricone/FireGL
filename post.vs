attribute vec2 aVertexPosition;
varying vec2 texCoord;
		
void main() 
{ 
	texCoord = (aVertexPosition + 1.0) / 2.0;
	gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}
