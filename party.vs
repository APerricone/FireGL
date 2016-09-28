attribute vec4 aVertexPosition;
uniform mat4 uPVMatrix;
varying float life;
void main() 
{ 
	gl_Position = uPVMatrix * vec4(aVertexPosition.xyz, 1.0);
	gl_PointSize = 10.0;
	life = aVertexPosition.w;
}
