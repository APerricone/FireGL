#ifdef GL_ES
	precision highp float;
#endif
uniform vec3 uPColor;
varying float life;

void main() 
{
	float t = 1.0-min(life,1.0);
	float a = min(t*2.0,1.0);
	// t = 0 a=1;
	// t = 0.5 a=1; --> 2-t*2
	// t = 1.0 a=0; --> 2-t*2
	vec2 c = (gl_PointCoord - vec2(0.5))*2.0;
	float a2 = 1.0-length(c);
	gl_FragColor = vec4(uPColor,a*a2);
} 
