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
	this.seeColor = [1,1,1];
	this.__defineGetter__('colorFar', function() 
	{ return [this.seeColor[0],this.seeColor[1],this.seeColor[2],farPlane]; });
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
}