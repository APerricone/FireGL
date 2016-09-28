#ifdef GL_ES
	precision highp float;
#endif

uniform sampler2D colorBuffer;
varying vec2 texCoord;


void main() 
{
	vec3 f = texture2D(colorBuffer, texCoord).xyz; //ambient in post process
	gl_FragColor.xyz = pow(f, vec3(2.2) );
	gl_FragColor.w = 1.0;
} 
