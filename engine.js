const checks = true;

/** @constructor */
function Engine()
{
	this.c = document.createElement('canvas');
	document.body.appendChild(this.c);
	var gl = this.c.getContext("webgl");
	if( gl==null ) 
	{ 
		gl = this.c.getContext("experimental-webgl");
	}
	if( gl==null ) 
	{ 
		throw document.body.innerHTML = "Unable to create WebGL context"; 
	}
	var ext = gl.getExtension('WEBGL_depth_texture');
	if( ext==null ) 
	{ 
		throw document.body.innerHTML = "no depth texture"; 
	}
	var ext = gl.getExtension('EXT_frag_depth');
	if( ext==null ) 
	{ 
		throw document.body.innerHTML = "no frag depth"; 
	}
	 
	// this the correct way to do a read only property.
	this.__defineGetter__('gl', function() { return gl; })
	//gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	//gl.enable(gl.BLEND);
	gl.enable(gl.DEPTH_TEST);
	gl.depthFunc(gl.LEQUAL);
	gl.enable(gl.CULL_FACE);
	gl.cullFace(gl.BACK);
	
	this.camera = undefined;
	this.light = undefined;
	this.meshes = [];

	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,vBuffer)
	gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
	this.postVBuffer = vBuffer;
	
	//var depthBuffer = gl.createRenderbuffer();
	//gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
	//gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 512, 512);
	
	gl.activeTexture(gl.TEXTURE1);
	var depthTextures = [gl.createTexture(),gl.createTexture()];
	for(var i=0;i<2;i++)
	{
		gl.bindTexture(gl.TEXTURE_2D,depthTextures[i]);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}
	this.depthTexture = depthTextures;
	gl.activeTexture(gl.TEXTURE0);
	
	var colorBuffer = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D,colorBuffer);
	gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	this.colorBuffer = colorBuffer;
	this.frameBuffer = [gl.createFramebuffer(),gl.createFramebuffer()];
	//gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	//gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
	//gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorBuffer, 0);
	//gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
	//gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	var tc=this;	
	this.postProgram = null;
	LoadProgram(gl,"post.vs","post.fs",function(v) 
	{ 
		tc.postProgram = v; 
		gl.useProgram(v);
		gl.uniform1i(v.uniforms['colorBuffer'], 0);
		gl.uniform1i(v.uniforms['depthBuffer'], 1);
		gl.useProgram( null );
		tc.paint();
	});
	
	this.copyZ = null;
	LoadProgram(gl,"post.vs","copyZ.fs",function(v) 
	{ 
		tc.copyZ = v; 
		gl.useProgram(v);
		gl.uniform1i(v.uniforms['depthBuffer'], 1);
		gl.useProgram( null );
		tc.paint();
	});
	this.particles = new ParticleSystem(gl);

	function resize() 
	{
		var w = innerWidth-16;
		var h = innerHeight-16;
		tc.c.width =  w;
		tc.c.height = h;
		//gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
		//gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
		gl.bindTexture(gl.TEXTURE_2D,colorBuffer);
		gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
		for(var i=0;i<2;i++)
		{
			gl.activeTexture(gl.TEXTURE1);
			gl.bindTexture(gl.TEXTURE_2D,depthTextures[i]);
			gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,null);
			gl.activeTexture(gl.TEXTURE0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, tc.frameBuffer[i]);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorBuffer, 0);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTextures[i], 0);
			//gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);			
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		tc.paint();
	}
	window.addEventListener('resize',resize)
	resize();
}

Engine.prototype.paint = function()
{
	var gl = this.gl;
	var w = this.c.width;
	var h = this.c.height;
	if( this.camera )
	{
		this.camera.aspectRatio(w,h)
		this.camera.UpdateMatrices();
		Mesh.SetCamera(gl,this.camera,w,h);
		ParticleSystem.SetCamera(gl,this.camera,w,h);
	}
	if( this.light )
	{
		Mesh.SetLight(gl,this.light,this.particles);
		gl.depthFunc(gl.LEQUAL);
		//gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(4.,4.);
		gl.disable(gl.CULL_FACE);
		for(var j=0;j<6;j++)
		{
			this.light.Begin(gl,j);
			Mesh.SetCubeUniforms(gl,this.light,this.particles);
			for(var i=0;i<this.meshes.length;i++)
			{
				var m = this.meshes[i];
				if( m.constructor == Mesh)
					m.Draw(Mesh.PROGRAMID_CUBE);
			}
			this.light.End(gl);
		}
		gl.disable(gl.POLYGON_OFFSET_FILL);
		gl.enable(gl.CULL_FACE);
	}
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer[0]);
	gl.viewport(0,0,this.c.width,this.c.height);
	gl.clearColor(0.7,0.7,1.0,1);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)	
	// prepass
	gl.colorMask(false,false,false,false);
	gl.depthFunc(gl.LEQUAL);
	for(var i=0;i<this.meshes.length;i++)
	{
		var m = this.meshes[i];
		m.Draw(Mesh.PROGRAMID_UNLIT);
	}
	if( this.copyZ != null )
	{
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer[1]);
		
		gl.colorMask(true,false,false,false);
		gl.useProgram(this.copyZ);
		var attributes = this.copyZ.attributes;
		gl.bindBuffer(gl.ARRAY_BUFFER,this.postVBuffer);
		gl.enableVertexAttribArray(attributes['aVertexPosition']);
		gl.vertexAttribPointer(attributes['aVertexPosition'], 2, gl.FLOAT, false, 0, 0);
		//gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D,this.depthTexture[0]);

		gl.depthFunc(gl.ALWAYS);
		    
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.enable(gl.CULL_FACE);
		//gl.enable(gl.DEPTH_TEST);
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer[0]);
		gl.bindTexture(gl.TEXTURE_2D,this.depthTexture[1]);
		gl.activeTexture(gl.TEXTURE0);
		
	}
	// render
	gl.colorMask(true,true,true,true);
	gl.depthFunc(gl.EQUAL);
	for(var i=0;i<this.meshes.length;i++)
	{
		var m = this.meshes[i];
		m.Draw(Mesh.PROGRAMID_MESH);
	}
	gl.depthFunc(gl.LEQUAL);
	gl.depthMask(false);
	this.particles.draw();
	gl.depthMask(true);
	if(this.postProgram != null)
	{
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		var attributes = this.postProgram.attributes;
		var uniforms = this.postProgram.uniforms;
		gl.bindBuffer(gl.ARRAY_BUFFER,this.postVBuffer);

		gl.useProgram(this.postProgram);
		gl.enableVertexAttribArray(attributes['aVertexPosition']);
		gl.vertexAttribPointer(attributes['aVertexPosition'], 2, gl.FLOAT, false, 0, 0);
		gl.uniform2f(uniforms['zNearFar'], this.camera.nearPlane(), this.camera.farPlane());
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D,this.depthTexture[0]);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,this.colorBuffer);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
	}
}

