attribute vec3 aVertexPosition;

uniform mat4 uModelMatrix;
uniform mat4 uPVMatrix;
uniform vec3 uCenter;
void main() 
{ 
	vec4 tPos = uModelMatrix * vec4(aVertexPosition, 1.0) - vec4(uCenter,0) ;
	gl_Position = uPVMatrix * tPos;
}
