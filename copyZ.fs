#extension GL_EXT_frag_depth : require
#ifdef GL_ES
	precision highp float;
#endif


uniform sampler2D depthBuffer;
varying vec2 texCoord;


void main() 
{
	gl_FragColor.xyzw = vec4(0.0);
	gl_FragDepthEXT = texture2D(depthBuffer,texCoord).x;
} 
