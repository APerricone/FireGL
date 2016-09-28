#ifdef GL_ES
	precision highp float;
#endif

uniform vec4 uMaterialColor;

void main() 
{
	gl_FragColor = uMaterialColor;
} 
