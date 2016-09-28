/* ***********engine.js*********** */
const checks = true;

/** @constructor */
function Engine()
{
	this.c = document.createElement('canvas');
	document.body.appendChild(this.c);
	var gl = this.c.getContext("webgl");
	if( gl==null ) 
	{ 
		throw document.body.innerHTML = "Unable to create WebGL context"; 
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
	
	var depthBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 512, 512);
	
	//var depthTexture = gl.createTexture();
	//gl.bindTexture(gl.TEXTURE_2D,depthTexture);
	//gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
	//gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	//gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	//this.depthTexture = depthTexture;
	
	var colorBuffer = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D,colorBuffer);
	gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	this.colorBuffer = colorBuffer;
	this.frameBuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorBuffer, 0);
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	
	var tc=this;	
	this.postProgram = null;
	LoadProgram(gl,("post.min.vs"),("post.min.fs"),function(v) 
	{ 
		tc.postProgram = v; 
		gl.useProgram(v);
		gl.uniform1i(v.uniforms['fBuffer'], 0);
	
		tc.paint();
	});
	
	function resize() 
	{
		var w = innerWidth-16;
		var h = innerHeight-16;
		tc.c.width =  w;
		tc.c.height = h;
		gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
		//gl.bindTexture(gl.TEXTURE_2D,depthTexture);
		//gl.texImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT,w,h,0,gl.DEPTH_COMPONENT,gl.UNSIGNED_SHORT,null);
		gl.bindTexture(gl.TEXTURE_2D,colorBuffer);
		gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,w,h,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
		tc.frameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, tc.frameBuffer);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colorBuffer, 0);
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
	}
	if( this.light )
	{
		Mesh.SetLight(gl,this.light);
		gl.depthFunc(gl.LEQUAL);
		//gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(4.,4.);
		for(var j=0;j<6;j++)
		{
			this.light.Begin(gl,j);
			Mesh.SetCubeUniforms(gl,this.light);
			for(var i=0;i<this.meshes.length;i++)
			{
				var m = this.meshes[i];
				if( m.constructor == Mesh)
					m.Draw(Mesh.PROGRAMID_CUBE);
			}
			this.light.End(gl);
		}
		gl.disable(gl.POLYGON_OFFSET_FILL);
	}
	
	if(this.postProgram != null)
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffer);
	gl.viewport(0,0,this.c.width,this.c.height);
	gl.clearColor(0.2,0.2,0.8,1);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)	
	// prepass
	gl.colorMask(false,false,false,false);
	gl.depthFunc(gl.LEQUAL);
	for(var i=0;i<this.meshes.length;i++)
	{
		var m = this.meshes[i];
		m.Draw(Mesh.PROGRAMID_UNLIT);
	}
	//gl.activeTexture(gl.TEXTURE1);
	//gl.bindTexture(gl.TEXTURE_2D,this.depthTexture);
	//gl.activeTexture(gl.TEXTURE0);
	//gl.bindTexture(gl.TEXTURE_2D,this.depthTexture);
	//gl.copyTexSubImage2D(gl.TEXTURE_2D,0,0,0,0,0,w,h);
	//gl.copyTexImage2D(gl.TEXTURE_2D,0,gl.DEPTH_COMPONENT,0,0,w,h,0);
	// render
	Mesh.ForceProgram = undefined;
	gl.colorMask(true,true,true,true);
	gl.depthFunc(gl.EQUAL);
	for(var i=0;i<this.meshes.length;i++)
	{
		var m = this.meshes[i];
		m.Draw(Mesh.PROGRAMID_MESH);
	}
	if(this.postProgram != null)
	{
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		var attributes = this.postProgram.attributes;
		gl.bindBuffer(gl.ARRAY_BUFFER,this.postVBuffer);

		gl.useProgram(this.postProgram);
		gl.enableVertexAttribArray(attributes['aVertexPosition']);
		gl.vertexAttribPointer(attributes['aVertexPosition'], 2, gl.FLOAT, false, 0, 0);
		gl.disable(gl.DEPTH_TEST);
		gl.disable(gl.CULL_FACE);
		gl.bindTexture(gl.TEXTURE_2D,this.colorBuffer);

		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
	}
}

/* *********** ************ *********** */
/* ***********program.js*********** */
LoadProgram = function(gl,vsUrl,fsUrl,fn)
{
	var vs = undefined,fs = undefined;
	function onLoad()
	{
		if(vs==undefined || fs==undefined)
			return;
		fn(CreateProgram(gl,vs,fs));
	}
	var xhr = new XMLHttpRequest();
	xhr.open('GET', vsUrl, true);
	xhr.onload = function(e) {
		if(xhr.status==200)
		{
			vs = xhr.response;
			onLoad()
		}			
		else
			alert("unable to download "+vsUrl)
	};	 
	xhr.send();	
	var xhr2 = new XMLHttpRequest();
	xhr2.open('GET', fsUrl, true);
	xhr2.onload = function(e) {
		if(xhr2.status==200)
		{
			fs = xhr2.response;
			onLoad()
		}			
		else
			alert("unable to download "+fsUrl)
	};	 
	xhr2.send();	
}

CreateProgram = function(gl,vsCode,fsCode)
{
	if('gl' in gl) gl=gl['gl'];
	var vShader = gl.createShader(gl.VERTEX_SHADER);
	gl.shaderSource(vShader, vsCode);
	gl.compileShader(vShader);
	console.log("compile vertex shader...")
	console.log(gl.getShaderInfoLog(vShader));
	var fShader = gl.createShader(gl.FRAGMENT_SHADER);
	gl.shaderSource(fShader, fsCode);
	gl.compileShader(fShader);
	console.log("compile fragment shader...")
	console.log(gl.getShaderInfoLog(fShader));
	var program = gl.createProgram();
	gl.attachShader(program, vShader);
	gl.attachShader(program, fShader);
	gl.linkProgram(program);
	console.log("linking...")
	console.log(gl.getProgramInfoLog(program));	

	program.attributes = {};
	var nAttrib = gl.getProgramParameter(program,gl.ACTIVE_ATTRIBUTES);
	for(var idx=0;idx<nAttrib;idx++)
	{
		var attrInfo = gl.getActiveAttrib(program,idx);
		program.attributes[attrInfo.name] = gl.getAttribLocation(program,attrInfo.name);
	}
	program.uniforms = {};
	var nUniform = gl.getProgramParameter(program,gl.ACTIVE_UNIFORMS);
	for(var idx=0;idx<nUniform;idx++)
	{
		var uniformInfo = gl.getActiveUniform(program,idx);
		program.uniforms[uniformInfo.name] = gl.getUniformLocation(program,uniformInfo.name);
	}
	return program;
}
/* *********** ************ *********** */
/* ***********camera.js*********** */

/** @constructor */
function Camera()
{
	this._ortho = true;
	this._pos = [0,0,0];
	this._look = [0,0,-1];
	this._up = [0,1,0];
	this._nearPlane = -1;
	this._farPlane = 1;
	this._heightOrFov = 2;
	this._aspectRatio = 1;
	this._needCalcProj = this._needCalcView = false;
	var id = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
	this._projection = new Float32Array(id);
	this._view = new Float32Array(id);
	this._viewProj = new Float32Array(id);
}

/** Update the camera matrices if needed */
Camera.prototype.UpdateMatrices = function()
{
	function cross(a,b) { return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
	function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
	function normalize(a) { var l = Math.sqrt(dot(a,a)); return [a[0]/l,a[1]/l,a[2]/l]; }
	if(this._needCalcView)
	{
		var at = normalize([this._pos[0]-this._look[0],this._pos[1]-this._look[1],this._pos[2]-this._look[2]]);
		var rg = normalize(cross(this._up,at));
		var up = normalize(cross(at,rg));
		this._view[0] = rg[0];
		this._view[1] = up[0];
		this._view[2] = at[0];
		this._view[3] = 0.;
		this._view[4] = rg[1];
		this._view[5] = up[1];
		this._view[6] = at[1];
		this._view[7] = 0.;
		this._view[8] = rg[2];
		this._view[9] = up[2];
		this._view[10] = at[2];
		this._view[11] = 0.;
		this._view[12] = -dot(rg, this._pos);
		this._view[13] = -dot(up, this._pos);
		this._view[14] = -dot(at, this._pos);
		this._view[15] = 1.;
	}
	if(this._needCalcProj)
	{
		var t = 2. / this._heightOrFov;
		var r = t / this._aspectRatio;
		var d = (this._farPlane - this._nearPlane);
		var z, tz;
		if(this._ortho)
		{
			z = 2. / d;
			tz = (this._farPlane + this._nearPlane) / d;
			this._projection[11] = 0;
			this._projection[15] = 1;
		} else
		{
			//r *= m_nearPlane;
			//t *= m_nearPlane;
			z = (this._farPlane + this._nearPlane) / d;
			tz = (2 * this._farPlane * this._nearPlane) / d;
			this._projection[11] = -1;
			this._projection[15] = 0;
		}
		this._projection[0] = r;
		this._projection[5] = t;
		this._projection[10] = -z;
		this._projection[14] = -tz;
	}
	if(this._needCalcProj || this._needCalcView)
	{
		var i = 0;
		for(var j = 0; j < 4; j++)
			for(var k = 0; k < 4; k++)
			{
				this._viewProj[i] = 0;
				for(var l = 0; l < 4; l++)
				{
					this._viewProj[i] += this._view[l + j * 4] * this._projection[l * 4 + k];
				}
				i++;
			}
	}
	this._needCalcProj = false;
	this._needCalcView = false;
}

Camera.prototype.projection = function() { this.UpdateMatrices(); return this._projection; }
Camera.prototype.view = function() { this.UpdateMatrices(); return this._view; }
Camera.prototype.viewProj = function() { this.UpdateMatrices(); return this._viewProj; }

Camera.prototype.ortho = function(v) { if(v!=undefined) { this._needCalcProj|=this._ortho!=v; this._ortho=v; } return this._ortho; }
Camera.prototype.persp = function(v) { if(v!=undefined) { this.ortho(!v); } return !this._ortho; }

function floatDiff(a,b) { var v = b-a; return (v>=1e-3) || (v<=-1e-3);}

Camera.prototype.height = function(v) 
{ 
	if(v!=undefined) 
	{ 
		this._needCalcProj|=floatDiff(this._heightOrFov,v); 
		this._heightOrFov=v; 
	} 
	return this._heightOrFov; 
}

Camera.prototype.fovRad = function(v) { if(v!=undefined) { this.height(Math.tan(v/2)); } }
Camera.prototype.fovDeg = function(v) { if(v!=undefined) { this.height(Math.tan(Math.PI*v/360)); } }

Camera.prototype.aspectRatio = function(w,h) 
{ 
	if(w!=undefined) 
	{
		var v = w;
		if(h!=undefined) v=w/h;
		this._needCalcProj|=floatDiff(this._aspectRatio,v); 
		this._aspectRatio = v;
	}
	return this._aspectRatio;
}

/** @param {number|Array=} x
  * @param {number=} y
  * @param {number=} z
  */
Camera.prototype.pos = function(x,y,z)
{
	if(x!=undefined) 
	{ 
		var v = x;
		if(y!=undefined)
			v = [x,y,z];
		if(checks && v.length!=3) throw "invalid parameter";
		this._needCalcView|=
			floatDiff(this._pos[0],v[0]) || 
			floatDiff(this._pos[1],v[1]) || 
			floatDiff(this._pos[2],v[2]); 
		this._pos = v;
	} 
	return this._pos; 
}

/** @param {number|Array=} x
  * @param {number=} y
  * @param {number=} z
  */
Camera.prototype.look = function(x,y,z)
{
	if(x!=undefined) 
	{ 
		var v = x;
		if(y!=undefined)
			v = [x,y,z];
		if(checks && v.length!=3) throw "invalid parameter";
		this._needCalcView|=
			floatDiff(this._look[0],v[0]) || 
			floatDiff(this._look[1],v[1]) || 
			floatDiff(this._look[2],v[2]); 
		this._look = v;
	} 
	return this._look; 
}

/** @param {?number|Array=} x
  * @param {?number=} y
  * @param {?number=} z
  */
Camera.prototype.up = function(x,y,z)
{
	if(x!=undefined) 
	{ 
		var v = x;
		if(y!=undefined)
			v = [x,y,z];
		if(checks && v.length!=3) throw "invalid parameter";
		this._needCalcView|=
			floatDiff(this._up[0],v[0]) || 
			floatDiff(this._up[1],v[1]) || 
			floatDiff(this._up[2],v[2]); 
		this._up = v;
	} 
	return this._up; 
}

Camera.prototype.nearPlane = function(v)
{ 
	if(v!=undefined) 
	{ 
		this._needCalcProj|=floatDiff(this._nearPlane,v); 
		this._nearPlane=v; 
	} 
	return this._nearPlane; 
}

Camera.prototype.farPlane = function(v)
{ 
	if(v!=undefined) 
	{ 
		this._needCalcProj|=floatDiff(this._nearPlane,v); 
		this._farPlane=v; 
	} 
	return this._farPlane; 
}

/* *********** ************ *********** */
/* ***********mesh.js*********** */
/** @constructor */
function Mesh(gl)
{
	if(gl==undefined) return; //inherit
	this.use16bit = true;
	this.nIndices = 0;
	this.nVertices = 0;
	this.nBytePerVertex = 0;
	this.normalDelta = 0;
	this.texCoordsDelta = 0;
	this.vBuffer = null;
	this.iBuffer = null;
	this.materialColor = [1,1,1,1];
	if('gl' in gl) gl=gl['gl'];
	this.__defineGetter__('gl', function() { return gl; });
	this.modelMat = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
	Mesh.LoadProgram(gl);
}

Mesh.prototype.__defineGetter__('pos',function() { return [this.modelMat[12],this.modelMat[13],this.modelMat[14]]; } );
Mesh.prototype.__defineSetter__('pos',function(v) 
{
	this.modelMat[12] = v[0];
	this.modelMat[13] = v[1];
	this.modelMat[14] = v[2]; 
});

Mesh.prototype.__defineSetter__('quat',function(v)
{
	var ss= v[3] * v[3] ;
	var sx= v[3] * v[0]; sx+=sx;
	var sy= v[3] * v[1]; sy+=sy;
	var sz= v[3] * v[2]; sz+=sz;
	var xx= v[0] * v[0];
	var xy= v[0] * v[1]; xy+=xy;
	var xz= v[0] * v[2]; xz+=xz;
	var yy= v[1] * v[1];
	var yz= v[1] * v[2]; yz+=yz;
	var zz= v[2] * v[2];
	this.modelMat[0]=ss+xx-yy-zz; 
	this.modelMat[4]=   xy-sz   ; 
	this.modelMat[8]=   xz+sy   ;
	this.modelMat[1]=   xy+sz   ; 
	this.modelMat[5]=ss-xx+yy-zz; 
	this.modelMat[9]=   yz-sx   ;
	this.modelMat[2]=   xz-sy   ; 
	this.modelMat[6]=   yz+sx   ; 
	this.modelMat[10]=ss-xx-yy+zz;
});

/** @const */ Mesh.PROGRAMID_MESH = 0;
/** @const */ Mesh.PROGRAMID_UNLIT = 1;
/** @const */ Mesh.PROGRAMID_CUBE = 2;
Mesh.programs = [];
Mesh.loadRequested = false;
Mesh.LoadProgram = function(gl)
{
	if( Mesh.loadRequested ) return;
	Mesh.loadRequested = true;
	LoadProgram(gl,("mesh.min.vs"),("mesh.min.fs"),function(v) 
	{ 
		Mesh.programs[Mesh.PROGRAMID_MESH]=v; 
		var glCnt = gl;
		if( 'gl' in gl ) glCnt = gl.gl;
		glCnt.useProgram( v ); 
		glCnt.uniform1i(v.uniforms['shadowMap'], 0);
		glCnt.uniform1i(v.uniforms['depthBuffer'], 1);
		if( 'paint' in gl )
			gl.paint();
	});
	LoadProgram(gl,("mesh.min.vs"),("unlit.min.fs"),function(v) 
	{ 
		Mesh.programs[Mesh.PROGRAMID_UNLIT]=v; 
		if( 'paint' in gl )
			gl.paint();
	});
	LoadProgram(gl,("cube.min.vs"),("zbuff.min.fs"),function(v) 
	{ 
		Mesh.programs[Mesh.PROGRAMID_CUBE]=v; 
		if( 'paint' in gl )
			gl.paint();
	});
}

Mesh.SetCamera = function(gl,cam,w,h)
{
	if('gl' in gl) gl=gl['gl'];
	for(var i=0;i<2;i++)
	{
		if( Mesh.programs[i] == undefined ) continue;
		var uniforms = Mesh.programs[i].uniforms;

		gl.useProgram( Mesh.programs[i] ); 
		gl.uniformMatrix4fv(uniforms['uPVMatrix'],false,cam.viewProj());
		gl.uniform3fv(uniforms['uCamPosition'],cam.pos());
		gl.uniform2f(uniforms['uScreenSize'],w,h);		
	}
	gl.useProgram( null );
}

Mesh.SetCubeUniforms = function(gl,light)
{
	if('gl' in gl) gl=gl['gl'];
	if( Mesh.programs[Mesh.PROGRAMID_CUBE] == undefined ) return;
	var uniforms = Mesh.programs[Mesh.PROGRAMID_CUBE].uniforms;

	gl.useProgram( Mesh.programs[Mesh.PROGRAMID_CUBE] ); 
	gl.uniformMatrix4fv(uniforms['uPVMatrix'],false, light.currentPVMatrix );
	gl.uniform3fv(uniforms['uCenter'], light.pos);
	gl.useProgram( null );
}

Mesh.SetLight = function(gl,light)
{
	if( Mesh.programs[0] == undefined ) return;
	if('gl' in gl) gl=gl['gl'];
	var uniforms = Mesh.programs[0].uniforms;

	gl.useProgram( Mesh.programs[0] ); 
	
	gl.uniform4fv(uniforms['uLightColorFar'],light.colorFar);
	gl.uniform4fv(uniforms['uLightPosRadius'],light.posRadius);
  
	gl.useProgram( null );
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,light.cubeTexture);
}

Mesh.prototype.PreDraw = function(idProg)
{
	idProg = idProg || Mesh.PROGRAMID_MESH;
	if( Mesh.programs[idProg] == undefined ) return;
	var gl = this.gl;
	var attributes = Mesh.programs[idProg].attributes;
	
	gl.useProgram(Mesh.programs[idProg]);
	gl.bindBuffer(gl.ARRAY_BUFFER,this.vBuffer);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,this.iBuffer);

	gl.enableVertexAttribArray(attributes['aVertexPosition']);
	gl.vertexAttribPointer(attributes['aVertexPosition'], 3, gl.FLOAT, false, this.nBytePerVertex, 0)
	if('aNormal' in attributes)
	{
		if(this.normalDelta != 0)
		{
			gl.enableVertexAttribArray(attributes['aNormal']);
			gl.vertexAttribPointer(attributes['aNormal'], 3, gl.FLOAT, false, this.nBytePerVertex, this.normalDelta)
		} else
		{
			gl.disableVertexAttribArray(attributes['aNormal']);
			gl.vertexAttrib3f(attributes['aNormal'],0,0,0)
		}		
	}
	
	if('aTexCoord' in attributes)
	{
		if(this.texCoordsDelta != 0)
		{
			gl.enableVertexAttribArray(attributes['aTexCoord']);
			gl.vertexAttribPointer(attributes['aTexCoord'], 2, gl.FLOAT, false, this.nBytePerVertex, this.texCoordsDelta)
		} else
		{
			gl.disableVertexAttribArray(attributes['aTexCoord']);
			gl.vertexAttrib2f(attributes['aTexCoord'],0,0)
		}
	}	
}

Mesh.prototype.ReDraw = function(idProg)
{
	idProg = idProg || Mesh.PROGRAMID_MESH;
	if( Mesh.programs[idProg] == undefined ) return;
	var gl = this.gl;
	var uniforms = Mesh.programs[idProg].uniforms;
	
	gl.useProgram(Mesh.programs[idProg]);
	gl.uniformMatrix4fv(uniforms['uModelMatrix'], false, this.modelMat);
	gl.uniform4fv(uniforms['uMaterialColor'],this.materialColor);
	gl.drawElements(gl.TRIANGLES, this.nIndices, this.use16bit ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, 0);
}

Mesh.prototype.EndDraw = function(idProg)
{
	idProg = idProg || Mesh.PROGRAMID_MESH;
	if( Mesh.programs[idProg] == undefined ) return;
	var gl = this.gl;
	var attributes = Mesh.programs[idProg].attributes;
	gl.disableVertexAttribArray(attributes['aVertexPosition']);
	gl.disableVertexAttribArray(attributes['aNormal']);
	gl.disableVertexAttribArray(attributes['aTexCoord']);
	gl.bindBuffer(gl.ARRAY_BUFFER, null)
}

Mesh.prototype.Draw = function(idProg)
{
	idProg = idProg || 0;
	if( Mesh.programs[idProg] == undefined ) return;
	this.PreDraw(idProg);
	this.ReDraw(idProg);
	this.EndDraw(idProg);
}
/** @constructor */
function MeshCreator()
{
	this.Begin();
	this.creating = false;
}

/** @param {boolean=} normals
  * @param {boolean=} texCoords
  */
MeshCreator.prototype.Begin = function(normals,texCoords)
{
	this.creating = true;
	this.normals = normals || false;
	this.texCoords = texCoords || false;
	this.currentNormal = [0,0,0];
	this.currentTexture = [0,0];
	this.currentPoint = [0,0,0]
	this.points = [];
	this.mappedPoints = [];
	this.triangles = [];	  
}

/** @param {number|Array=} x
  * @param {number=} y
  * @param {number=} z
  */
MeshCreator.prototype.Normal = function(x,y,z)
{
	if(checks && !this.creating) throw "Invalid call: outside Begin/End";
	if(this.normals)
	{
		if(x!=undefined) 
		{ 
			var v = x;
			if(y!=undefined) v = [x,y,z];
			if(checks && v.length!=3) throw "Invalid parameter";
			this.currentNormal = v;
		} 
	}
	return this.currentNormal;
}

/** @param {number|Array=} x
  * @param {number=} y
  */
MeshCreator.prototype.Texture = function(x,y)
{
	if(checks && !this.creating) throw "Invalid call: outside Begin/End";
	if(this.texCoords)
	{
	  if(x!=undefined) 
	  { 
		 var v = x;
		 if(y!=undefined) v = [x,y];
		 if(checks && v.length!=2) throw "Invalid parameter";
		 this.currentTexture = v;
	  } 
	}
	return this.currentTexture;
}

/** @param {number|Array=} x
  * @param {number=} y
  * @param {number=} z
  */
MeshCreator.prototype.Point = function(x,y,z)
{
	if(checks && !this.creating) throw "Invalid call: outside Begin/End";
	if(x!=undefined) 
	{ 
		var v = x;
		if(y!=undefined) v = [x,y,z];
		if(checks && v.length!=3) throw "Invalid parameter";
		this.currentPoint = v;
		
		this.AddPoint();
	} 
	return this.currentPoint;
}

function cmpDecimalArray(a,b)
{
	for(var i=0;i<a.length;i++) 
	  if(Math.abs(a[i]-b[i])>1e-3) 
		 return false; 
	return true; 
}

MeshCreator.prototype.AddPoint = function()
{
	var key = Math.round( (
				this.currentPoint[0]*this.currentPoint[0] + 
				this.currentPoint[1]*this.currentPoint[1] + 
				this.currentPoint[2]*this.currentPoint[2] ) * 1000 );
	for(var i=key-1;i<= key+1;i++)
	{
		var vals = this.mappedPoints[i] || [];
		for(var j=0;j<vals.length;j++)
		{
			var p = this.points[vals[j]];
			if( cmpDecimalArray(p.pos,this.currentPoint) && 
				cmpDecimalArray(p.nor,this.currentNormal) && 
				cmpDecimalArray(p.tex,this.currentTexture) )
			{
				this.triangles.push(vals[j]);
				return;
			}
		}
	}
	if( this.mappedPoints[key] == undefined )
	{
		this.mappedPoints[key] = [];
	}
	var idx = this.points.length;
	this.mappedPoints[key].push(idx);
	this.points.push({pos:this.currentPoint, nor:this.currentNormal, tex:this.currentTexture});
	this.triangles.push(idx);
}

/** @param {Array=} min
  * @param {Array=} max
  * @param {boolean=} reverse
  */
MeshCreator.prototype.AddBox = function(min,max,reverse)
{
	min = min || [-1,-1,-1];
	max = max || [1,1,1];
	reverse = reverse || false;
	if(checks && min.length!=3) throw "Invalid parameter";
	if(checks && max.length!=3) throw "Invalid parameter";
	var tc = this;
	function AddQuad(a,b,c,d)
	{
		tc.Texture(0,0); tc.Point(a);
		if(!reverse)
		{
			tc.Texture(1,0); tc.Point(b);
			tc.Texture(0,1); tc.Point(c);

			tc.Texture(0,1); tc.Point(c);
			tc.Texture(1,0); tc.Point(b);
		} else
		{	
			tc.Texture(0,1); tc.Point(c);
			tc.Texture(1,0); tc.Point(b);

			tc.Texture(1,0); tc.Point(b);
			tc.Texture(0,1); tc.Point(c);
		}
		tc.Texture(1,1); tc.Point(d);
	}
	var n = reverse? -1 : 1;
	this.Normal([0,n,0]);
	AddQuad([ max[0], max[1], min[2]],
			[ min[0], max[1], min[2]],
			[ max[0], max[1], max[2]],
			[ min[0], max[1], max[2]]);
	this.Normal([0,-n,0]);
	AddQuad([ min[0], min[1], min[2]],
			[ max[0], min[1], min[2]],
			[ min[0], min[1], max[2]],
			[ max[0], min[1], max[2]]);
	this.Normal([n,0,0]);
	AddQuad([ max[0], min[1], min[2]],
			[ max[0], max[1], min[2]],
			[ max[0], min[1], max[2]],
			[ max[0], max[1], max[2]]);
	this.Normal([-n,0,0]);
	AddQuad([ min[0], max[1], min[2]],
			[ min[0], min[1], min[2]],
			[ min[0], max[1], max[2]],
			[ min[0], min[1], max[2]]);
	this.Normal([0,0,n]);
	AddQuad([ min[0], max[1], max[2]],
			[ min[0], min[1], max[2]],
			[ max[0], max[1], max[2]],
			[ max[0], min[1], max[2]]);
	this.Normal([0,0,-n]);
	AddQuad([ min[0], min[1], min[2]],
			[ min[0], max[1], min[2]],
			[ max[0], min[1], min[2]],
			[ max[0], max[1], min[2]]);
}

/** @param {Array=} center
  * @param {number=} radius
  * @param {number=} nSegment
  * @param {number=} nDivision
  */
MeshCreator.prototype.AddSphere = function(center,radius,nSegment,nDivision)
{
	center = center || [0,0,0];
	radius = radius || 1;
	nSegment = nSegment || 8;
	nDivision = nDivision || 16;
	var stepA = Math.PI/nSegment;
	var stepB = Math.PI*2/nDivision;
	var a = 0;
	var cosA = [1,1];
	var sinA = [0,0];
	var cosB = [1,1];
	var sinB = [0,0];
	for(var j=0;j<nSegment;j++)
	{
		cosA[0] = cosA[1];
		sinA[0] = sinA[1];
		a+= stepA;
		cosA[1] = Math.cos( a );
		sinA[1] = Math.sin( a );
		var b = 0;
		cosB[1] = 1;
		sinB[1] = 0;
		for(var i=0;i<nDivision;i++)
		{
			cosB[0] = cosB[1];
			sinB[0] = sinB[1];
			b+= stepB;
			cosB[1] = Math.cos( b );
			sinB[1] = Math.sin( b );
			var normals = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]]
			var points = [[0,0,0],[0,0,0],[0,0,0],[0,0,0]]
			for(var r=0;r<4;r++)
			{
				var ia = Math.floor(r/2);
				var ib = r%2;
				normals[r][0] = sinA[ia] * cosB[ib];
				normals[r][1] = cosA[ia];
				normals[r][2] = sinA[ia] * sinB[ib];
				points[r][0] = center[0] + normals[r][0] * radius;
				points[r][1] = center[1] + normals[r][1] * radius;
				points[r][2] = center[2] + normals[r][2] * radius;
			}
			if(j!=0)
			{
				this.Normal( normals[0] );
				this.Point( points[0] );
				this.Normal( normals[1] );
				this.Point( points[1] );
				this.Normal( normals[2] );
				this.Point( points[2] );
			}
			if(j!=nSegment-1)
			{
				this.Normal( normals[2] );
				this.Point( points[2] );
				this.Normal( normals[1] );
				this.Point( points[1] );
				this.Normal( normals[3] );
				this.Point( points[3] );
			}
		}
	}   
}

MeshCreator.prototype.End = function(gl,retValue) 
{
	if('gl' in gl) gl=gl['gl'];
	
	if(checks && !this.creating) throw "Invalid call: End without begin";
	this.creating = false;
	var nIgnored = (this.triangles.length%3)
	if( nIgnored != 0)
	{
		console.log("warning Mesh.End: " + nIgnored + " vertices ignored");
		this.triangles.length -= nIgnored;
	}
	retValue = retValue || new Mesh(gl);
	retValue.use16bit = this.points.length < 0xFFF0;
	retValue.nIndices = this.triangles.length ;
	retValue.nVertices = this.points.length;
	retValue.nBytePerVertex = 3;
	var delta = 3;
	if(this.normals)
	{
		retValue.nBytePerVertex += 3;
		retValue.normalDelta = delta;
		delta+=3;
	} else retValue.normalDelta = 0;
	if(this.texCoords)
	{
		retValue.nBytePerVertex += 2;
		retValue.texCoordsDelta = delta;
		delta+=2;
	} else retValue.texCoordsDelta = 0;
	
	var verticesArray = new Float32Array( retValue.nVertices * retValue.nBytePerVertex );
	for(var i=0;i<this.points.length;i++)
	{
		var v = this.points[i];
		var idxDest = i * retValue.nBytePerVertex;
		for(var j=0;j<3;j++)
			verticesArray[idxDest+j] = v.pos[j];
		if(this.normals)
		{
			for(var j=0;j<3;j++)
				verticesArray[idxDest + j + retValue.normalDelta] = v.nor[j];
		}
		if(this.texCoords)
		{
			for(var j=0;j<2;j++)
				verticesArray[idxDest + j + retValue.texCoordsDelta] = v.tex[j];
		}
	}
 	retValue.nBytePerVertex *= 4;
	retValue.normalDelta *= 4;
	retValue.texCoordsDelta *= 4;

	console.log("Created mesh with "+retValue.nVertices+" vertices and "+(retValue.nIndices/3)+" triangles");
	
	var vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,vBuffer)
	gl.bufferData(gl.ARRAY_BUFFER,verticesArray, gl.STATIC_DRAW)

	var iBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,iBuffer)
	if( retValue.use16bit )
	{
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Int16Array(this.triangles), gl.STATIC_DRAW)
	} else
	{
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Int32Array(this.triangles), gl.STATIC_DRAW)
	}
	
	gl.bindBuffer(gl.ARRAY_BUFFER, null);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	
	retValue.vBuffer = vBuffer;
	retValue.iBuffer = iBuffer;
	this.points = [];
	this.mappedPoints = [];
	this.triangles = [];
	return retValue;	
}

/* *********** ************ *********** */
/* ***********rotatingCamera.js*********** */
/** @constructor 
  * @extends {Camera}
*/
function RotatingCamera()
{
	Camera.call(this);
	this._btnDown = [false,false,false,false,false,false];
	this._alpha = 0;
	this._beta = 0;
	this._dist = 1;
	this._needCalcRotate = false;
}

RotatingCamera.prototype = new Camera();

RotatingCamera.prototype.UpdateMatrices = function()
{
	if(this._needCalcRotate)
	{
		var sa = Math.sin(this._alpha), ca = Math.cos(this._alpha); 
		var sb = Math.sin(this._beta), cb = Math.cos(this._beta); 
		var v = [0,0,0], l = this.look();
		v[0] = l[0] + ca * sb * this._dist;
		v[1] = l[1] + sa * this._dist;
		v[2] = l[2] + ca * cb * this._dist;
		this.pos(v);
		this.nearPlane(this._dist * 0.1);
		this.farPlane(this._dist * 10);
	}
	Camera.prototype.UpdateMatrices.call(this);
	this._needCalcRotate = false;
}

//function floatDiff(a,b) { var v = b-a; return (v>=1e-3) || (v<=-1e-3);}

RotatingCamera.prototype.alpha = function(v) 
{ 
	if(v!=undefined) 
	{ 
		this._needCalcRotate=floatDiff(this._alpha,v); 
		this._alpha=v; 
	} 
	return this._alpha; 
}

RotatingCamera.prototype.beta = function(v) 
{ 
	if(v!=undefined) 
	{ 
		this._needCalcRotate=floatDiff(this._beta,v); 
		this._beta=v; 
	} 
	return this._beta; 
}

RotatingCamera.prototype.dist = function(v) 
{ 
	if(v!=undefined) 
	{ 
		this._needCalcRotate=floatDiff(this._dist,v); 
		this._dist=v; 
	} 
	return this._dist; 
}

RotatingCamera.prototype.alphaDeg = function(v) { if(v!=undefined) { this.alpha(Math.PI*v/180); } }
RotatingCamera.prototype.betaDeg = function(v) { if(v!=undefined) { this.beta(Math.PI*v/180); } }

RotatingCamera.prototype.AddListeners = function(dest, paintFn)
{
	dest = dest || document.body;
   paintFn = paintFn || function() {};
   var mouseDown = false;
   var tc=this;
   var exX,exY;
   dest.addEventListener("mousedown",function(e) { 
      mouseDown = true; 
      exX = e.screenX;
      exY = e.screenY;
   });
   document.body.addEventListener("mouseup",function() { mouseDown = false; } );
   document.body.addEventListener("mousemove",function(e) 
   { 
      if( mouseDown )
      {
         var deltax = e.screenX-exX;
			var deltay = e.screenY-exY;
			exX =e.screenX;
			exY =e.screenY;

			tc._alpha += deltay / 100;
			tc._beta -= deltax / 100;
         tc._needCalcRotate=true;
			tc.UpdateMatrices();
			paintFn();         
      }
   });
   dest.addEventListener("mousewheel",function(e) 
   { 
      e.wheelDelta = e.detail ? -e.detail : e.wheelDelta;
      if( e.wheelDelta < 0)
         tc._dist *= 1.1;
      else
         tc._dist /= 1.1;
   
      tc._needCalcRotate=true;
      tc.UpdateMatrices();
      paintFn();         
   });
}
/* *********** ************ *********** */
/* ***********light.js*********** */
/** @constructor */
function Light(gl,pos,radius)
{
	if('gl' in gl) gl=gl.gl;
	pos = pos || [0,0,0];
	radius = radius || 1;
	Mesh.call(this,gl);
	
	this.pos = pos;
	this.needRecalcMatrices = true;
	this.__defineGetter__('radius', function() { return radius; });
	this.__defineSetter__('radius', function(v) { radius = v; this.needRecalcMatrices = true; });
	var farPlane = 22;
	this.__defineGetter__('farPlane', function() { return farPlane; });
	this.__defineSetter__('farPlane', function(v) { farPlane = v; this.needRecalcMatrices = true; });
	
	this.__defineGetter__('posRadius', function() 
	{ return [this.modelMat[12],this.modelMat[13],this.modelMat[14],radius]; });
	this.__defineGetter__('colorFar', function() 
	{ return [this.materialColor[0],this.materialColor[1],this.materialColor[2],farPlane]; });
	var mc = new MeshCreator();
	mc.Begin();
	mc.AddSphere([0,0,0],radius);
	mc.End(gl,this);
	this.materialColor = [1,1,1,1];

	this.cubeTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,this.cubeTexture);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	for(var i=0;i<6;i++)
	{
		gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i,0,gl.RGBA,512,512,0,
			gl.RGBA,gl.UNSIGNED_BYTE,null);
		//console.log(gl.getError());
	}
		
	var depthBuffer = gl.createRenderbuffer();
	gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
	gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, 512, 512);

	gl.bindTexture(gl.TEXTURE_CUBE_MAP, null);
	gl.bindTexture(gl.TEXTURE_2D, null);
	this.frameBuffers = [];
	this.frameBuffers.length = 6;
	for(var i=0;i<6;i++)
	{
		this.frameBuffers[i] = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers[i]);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, this.cubeTexture, 0);

		var status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if(status != gl.FRAMEBUFFER_COMPLETE )
		{
			console.log("FAIL("+status+")");
		}
	}		
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	this.matrices = [];
	this.matrices.length = 6;
	for(var i=0;i<6;i++) this.matrices[i] = new Float32Array(16);
	this.currentRenderTarget = 0;
	this.__defineGetter__('currentPVMatrix', function() { return this.matrices[this.currentRenderTarget]; });
	var c = new Camera();
	c.persp(true);
	c.height(1);
	c.aspectRatio(1);
	//c.pos(3,4,5);
	//c.look(3,4,0);
	c.pos(0,0,0);
	c.look(0,0,-1);
	c.up(0,1,0);
	c.nearPlane(0.9);
	c.farPlane(22);
	c.UpdateMatrices();
	//this.__defineGetter__('currentPVMatrix', function() { return c.viewProj(); });
}

Light.prototype = new Mesh();
Light.prototype.constructor = Light;

Light.prototype.PreDraw = function() { Mesh.prototype.PreDraw.call(this,Mesh.PROGRAMID_UNLIT); }
Light.prototype.ReDraw = function() { Mesh.prototype.ReDraw.call(this,Mesh.PROGRAMID_UNLIT); }
Light.prototype.EndDraw = function() { Mesh.prototype.EndDraw.call(this,Mesh.PROGRAMID_UNLIT); }
Light.prototype.Draw = function() { Mesh.prototype.Draw.call(this,Mesh.PROGRAMID_UNLIT); }

Light.prototype.Begin = function(gl,i)
{
	if('gl' in gl) gl=gl.gl;
	this.currentRenderTarget = i;
	if( this.needRecalcMatrices )
	{
		this.needRecalcMatrices = false;
		var n = this.radius * 0.9; //nearPlane
		var f = this.farPlane;
		var d = f-n;
		var zSc = -(f+n)/d;
		var zTr = -(2*f*n)/d;
		// 0 - positive X - rg(0,0,-1) up(0, 1,0) at( 1,0,0)
		this.matrices[0].set([	 0, 0,-zSc, 1,
								 0, 1,  0 , 0,
								 1, 0,  0 , 0,
								 0, 0, zTr, 0]);
		// 1 - negative X - rg(0,0, 1) up(0, 1,0) at(-1,0,0)
		this.matrices[1].set([	 0, 0, zSc,-1,
								 0, 1,  0 , 0,
								-1, 0,  0 , 0,
								 0, 0, zTr, 0]);
		// 2 - positive Y - rg( 1,0,0) up(0,0,-1) at(0, 1,0)
		this.matrices[2].set([	 1, 0,  0 , 0,
								 0, 0, zSc,-1,
								 0,-1,  0 , 0,
								 0, 0, zTr, 0]);
		// 3 - negative Y - rg( 1,0,0) up(0,0, 1) at(0,-1,0)
		this.matrices[3].set([	 1, 0,  0 , 0,
								 0, 0,-zSc, 1,
								 0, 1,  0 , 0,
								 0, 0, zTr, 0]);
		// 4 - positive Z - rg( 1,0,0) up(0, 1,0) at(0,0, 1)
		this.matrices[4].set([	 1, 0,  0 , 0,
								 0, 1,  0 , 0,
								 0, 0, zSc,-1,
								 0, 0, zTr, 0]);
		// 5 - negative Z - rg(-1,0,0) up(0, 1,0) at(0,0,-1)
		this.matrices[5].set([	-1, 0,  0 , 0,
								 0, 1,  0 , 0,
								 0, 0,-zSc, 1,
								 0, 0, zTr, 0]);
	}
	
	gl.bindFramebuffer(gl.FRAMEBUFFER, this.frameBuffers[i]);
	gl.viewport(0,0,512,512);
	gl.clearColor((i&1)==0? 0 : 1,(i&2)==0? 0 : 1,(i&4)==0? 0 : 1,1);
	gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT)	
}

Light.prototype.End = function(gl)
{
	if('gl' in gl) gl=gl.gl;
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}/* *********** ************ *********** */
/* ***********audio.js*********** */
function Audio()
{
	this.context = new AudioContext();
	if( this.context == undefined ) return; 
	this.gainNode = this.context.createGain();
	this.gainNode.connect(this.context.destination);
}


function LowPass(freq, SampleRate, input, nSample) {
	var RC = 1.0 / (freq * 2 * Math.PI);
	var dt = 1.0 / SampleRate;
	var alpha = dt / (RC + dt);
	var filteredArray = [];
	filteredArray.length = nSample;
	filteredArray[0] = input[0];
	for (i = 1; i < nSample; i++) {
		filteredArray[i] = filteredArray[i - 1] + (alpha * (input[i] - filteredArray[i - 1]));
	}
	return filteredArray;
}

function HighPass(freq, SampleRate, input, nSample) {
	var RC = 1.0 / (freq * 2 * Math.PI);
	var dt = 1.0 / SampleRate;
	var alpha = dt / (RC + dt);
	var filteredArray = [];
	filteredArray.length = nSample;
	filteredArray[0] = input[0];
	for (i = 1; i < nSample; i++) {
		filteredArray[i] = alpha * (filteredArray[i - 1] + input[i] - input[i - 1]);
	}
	return filteredArray;
}

Audio.prototype.hit = function()
{
	if( this.context == undefined ) return; 
	var len = 0.1;
	var sampleRate = this.context.sampleRate;
	var bufferSize = len * sampleRate;
	var noise = [];
	noise.length = bufferSize;
	for (var i = 0; i < bufferSize; i++) {
		noise[i] = (Math.random() * 2 - 1);
	}
	var final = LowPass(100, sampleRate, noise, bufferSize);
	var noiseBuffer = this.context.createBuffer(1, bufferSize, sampleRate);
	var output = noiseBuffer.getChannelData(0);
	for (var i = 0; i < bufferSize; i++) {
		var volume = 1 - (i / bufferSize);
		output[i] = final[i] * volume;
	}
	var whiteNoise = this.context.createBufferSource();
	whiteNoise.buffer = noiseBuffer;
	whiteNoise.loop = false;
	whiteNoise.connect(this.context.destination);
	whiteNoise.start();
}
/* *********** ************ *********** */
/* *********** index.html(677) *********** */

	// semi equivalent of $(document).ready()
	document.addEventListener("DOMContentLoaded", function(event) { 
		var e = new Engine();
		var gl = e.gl;

		var a = new Audio();
		Mesh.LoadProgram(e);
		var mc;
		var cubes = [];
		var colors = [
			[0.8,0.3,0.8,1],
			[0.3,0.8,0.3,1],
			[0.3,0.3,0.8,1],
			[0.8,0.8,0.3,1],
			[0.8,0.3,0.8,1],
			[0.3,0.8,0.8,1],
			[0.8,0.4,0.1,1],
			[0.8,0.1,0.4,1],
			[0.4,0.8,0.1,1],
			[0.1,0.4,0.8,1],
		];
		for(var i=0;i<10;i++)
		{
			mc = new MeshCreator();
			mc.Begin(true);
			mc.AddBox();
			var cube = mc.End(gl);
			cube.materialColor = colors[i];
			e.meshes.push(cube);
			cubes.push(cube);
		}
		mc = new MeshCreator();
		mc.Begin(true);
		mc.AddBox([-10,-1,-10],[10,10,10],true);
		var cube2 = mc.End(gl);
		cube2.materialColor = [0.65,0.65,0.65,1];
		e.meshes.push(cube2);
		var sphere = new Light(gl,[3,4,5])
		e.meshes.push(sphere);
		e.light = sphere;
		function message(v) 
		{ 
			sphere.pos = v.data[0]; 
			for(var i=0;i<10;i++)
			{
				cubes[i].pos = v.data[1+i+i];
				cubes[i].quat = v.data[2+i+i];
			}
			for(var i = 0; i<v.d