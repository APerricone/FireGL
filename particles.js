
//glEnable(0x8642) #GL_VERTEX_PROGRAM_POINT_SIZE
//glEnable(0x8861) #GL_POINT_SPRITE
function ParticleSystem(gl)
{
	this.particles = [];
	this.lastTime = Date.now();

	var glCnt = gl;
	if( 'gl' in gl ) glCnt = gl.gl;
	this.__defineGetter__('gl', function() { return glCnt; });

	LoadProgram(gl,"party.vs","party.fs",function(v) 
	{ 
		ParticleSystem.program=v; 
		glCnt.useProgram( v ); 
		glCnt.uniform1i(v.uniforms['depthBuffer'], 0);
		//if( 'paint' in gl )
		//	gl.paint();
	});
	this.vBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,this.vBuffer);
	/** @const */ ParticleSystem.N_MAX_DRAW = 2000; //global
	this.array = new Float32Array(ParticleSystem.N_MAX_DRAW*4);
	gl.bufferData(gl.ARRAY_BUFFER,this.array, gl.DYNAMIC_DRAW);
	
	this.center_posvel = [0,0,0, 0,0,0];
	this.mean = [0,0,0];
}

ParticleSystem.prototype.update = function()
{
	var now = Date.now();
	var dt = now - this.lastTime;
	this.lastTime = now;
	if(dt>1) dt = 1/60;
	if( dt> 0)
	{
		var toDel = [];
		for(var i=0;i<this.particles.length;i++)
		{
			var p = this.particles[i];
			//p[3] *= (Math.random() - 0.5) * 0.5;
			p[4] += dt * 5.0; // move up
			//p[5] *= (Math.random() - 0.5) * 0.5;
			p[0] += dt * p[3] ;
			p[1] += dt * p[4] ;
			p[2] += dt * p[5] ;
			p[6] -= dt;
			if(p[6]<=0) toDel.push(i);
			else
			{
				if(p[0]<-10) p[0] = -10;
				if(p[0]> 10) p[0] =  10;
				if(p[1]<-1 ) p[1] = -1 ;
				if(p[1]> 10) p[1] =  10;
				if(p[2]<-10) p[2] = -10;
				if(p[2]> 10) p[2] =  10;
				var dlt = [p[0]-this.center_posvel[0],p[1]-this.center_posvel[1],p[2]-this.center_posvel[2]];
				var d = dlt[0]*dlt[0]+dlt[1]*dlt[1]+dlt[2]*dlt[2];
				if(d<1)
				{
					d = 1/Math.sqrt(d) - 1;
					p[0] += dlt[0] * d;
					p[1] += dlt[1] * d;
					p[2] += dlt[2] * d;
				}
			}
		}
		for(var i=toDel.length-1;i>=0;i--)
		{
			this.particles.splice(toDel[i],1);
		}
	}
	var nNew = 20+Math.random()*10;
	for(var i=0;i<nNew;i++)
	{
		var p = [];
		var r = Math.random();
		var a = (Math.random()-0.5) * Math.PI;
		var b = (Math.random()-0.5) * 2 * Math.PI;
		var sa = Math.sin(a), ca = Math.cos(a); 
		var sb = Math.sin(b), cb = Math.cos(b); 
		p[0] = ca * sb * r 	; // posX
		p[1] = sa * r		;      // posY
		p[2] = ca * cb * r	; // posZ
		p[3] = -p[0]*(Math.random()*0.2+0.9)+ this.center_posvel[3] * 0.2; // velX
		p[4] = Math.random()-0.5 			+ this.center_posvel[4] * 0.2; // velY
		p[5] = -p[2]*(Math.random()*0.2+0.9)+ this.center_posvel[5] * 0.2; // velZ
		p[0] += this.center_posvel[0]; // posX
		p[1] += this.center_posvel[1];      // posY
		p[2] += this.center_posvel[2]; // posZ
		p[6] = Math.random()*0.5+0.5; // life
		this.particles.push(p);
	}
	var n = Math.min(this.particles.length, ParticleSystem.N_MAX_DRAW);
	for(var i=0,j=0;i<n;i++,j+=4)
	{
		var p = this.particles[i];
		this.array[j+0] = p[0];
		this.array[j+1] = p[1];
		this.array[j+2] = p[2];
		this.array[j+3] = p[6];
	}
	this.mean = [0,0,0,0];
	var n = 1000;
	for(var i=0;i<this.particles.length;i++)
	{
		var p = this.particles[i];
		this.mean[0] += p[0] - this.center_posvel[0];
		this.mean[1] += p[1] - this.center_posvel[1];
		this.mean[2] += p[2] - this.center_posvel[2];
		this.mean[3] += p[6];		
		n += p[6]<1? p[6] : 1;
	}
	this.mean[0]/=n;
	this.mean[1]/=n;
	this.mean[2]/=n;
	this.mean[3]/=this.particles.length;
	this.radius = 0;
	for(var i=0;i<this.particles.length;i++)
	{
		var p = this.particles[i];
		if(p[6]<=1)
		{
			var d = [(this.mean[0]-p[0] + this.center_posvel[0]),
					 (this.mean[1]-p[1] + this.center_posvel[1]),
					 (this.mean[2]-p[2] + this.center_posvel[2])];
			var r = d[0]*d[0]+d[1]*d[1]+d[2]*d[2];
			if(r>this.radius) this.radius = r;
		}
	}
			
	this.radius = Math.sqrt(this.radius)
	if(this.radius>2) this.radius=2;
	var gl = this.gl;
	gl.bindBuffer(gl.ARRAY_BUFFER,this.vBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER,0, this.array);	
	gl.bindBuffer(gl.ARRAY_BUFFER,null);
}

ParticleSystem.SetCamera = function(gl,cam,w,h)
{
	if( ParticleSystem.program == undefined || ParticleSystem.program == null ) return;
	if('gl' in gl) gl=gl['gl'];
	var uniforms = ParticleSystem.program.uniforms;

	gl.useProgram( ParticleSystem.program ); 
	gl.uniformMatrix4fv(uniforms['uPVMatrix'],false,cam.viewProj());
	gl.useProgram( null );
}
//var maxParticles=0;
ParticleSystem.prototype.draw = function()
{
	if( ParticleSystem.program == undefined || ParticleSystem.program == null ) return;
	var gl = this.gl;
	var attributes = ParticleSystem.program.attributes;

	gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
	gl.enable(gl.BLEND);
	gl.useProgram(ParticleSystem.program);
	gl.bindBuffer(gl.ARRAY_BUFFER,this.vBuffer);
	gl.enableVertexAttribArray(attributes['aVertexPosition']);
	gl.vertexAttribPointer(attributes['aVertexPosition'], 4, gl.FLOAT, false, 0, 0);
	if(this.selected)
		gl.uniform3f(ParticleSystem.program.uniforms['uPColor'], 0.0,0.1,1.0);
	else
		gl.uniform3f(ParticleSystem.program.uniforms['uPColor'], 1.0,0.1,0);
	
	//if(this.particles.length>maxParticles)
	//{
	//	maxParticles = this.particles.length;
	//	console.log(maxParticles);
	//}
	gl.drawArrays(gl.POINTS,0,Math.min(this.particles.length, ParticleSystem.N_MAX_DRAW));
	gl.disable(gl.BLEND);
}
