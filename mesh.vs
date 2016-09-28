attribute vec3 aVertexPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelMatrix;
uniform mat4 uPVMatrix;

varying vec3 pos;
varying vec3 norm;
varying vec2 tex;
		
void main() 
{ 
	vec4 tPos = uModelMatrix * vec4(aVertexPosition, 1.0);
	pos = tPos.xyz;
	gl_Position = uPVMatrix * tPos;
	norm = (uModelMatrix * vec4(aNormal, 0.0)).xyz;
	tex = aTexCoord;
}
