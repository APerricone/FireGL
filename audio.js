function Audio()
{
	this.context = new AudioContext();
	if( this.context == undefined ) return; 
	this.gainNode = this.context.createGain();
	this.gainNode.connect(this.context.destination);
	this.gainNode.gain.value = 2;
	
	var len = 0.1;
	var sampleRate = this.context.sampleRate;
	var bufferSize = len * sampleRate;
	var noise = [];
	noise.length = bufferSize;
	for (var i = 0; i < bufferSize; i++) {
		noise[i] = (Math.random() * 2 - 1);
	}
	this.final = LowPass(100, sampleRate, noise, bufferSize);
	this.bufferSize = bufferSize;
}


function LowPass(freq, SampleRate, input, nSample) {
	var RC = 1.0 / (freq * 2 * Math.PI);
	var dt = 1.0 / SampleRate;
	var alpha = dt / (RC + dt);
	var filteredArray = [];
	filteredArray.length = nSample;
	filteredArray[0] = input[0];
	function apply(i,im1)
	{
		filteredArray[i] = filteredArray[im1] + (alpha * (input[i] - filteredArray[im1]));
	}
	for (i = 1; i < nSample; i++) {
		apply(i,i-1)
	}
	apply(0,nSample-1);
	return filteredArray;
}

function HighPass(freq, SampleRate, input, nSample) {
	var RC = 1.0 / (freq * 2 * Math.PI);
	var dt = 1.0 / SampleRate;
	var alpha = dt / (RC + dt);
	var filteredArray = [];
	filteredArray.length = nSample;
	filteredArray[0] = input[0];
	function apply(i,im1)
	{
		filteredArray[i] = alpha * (filteredArray[im1] + input[i] - input[im1]);
	}
	for (i = 1; i < nSample; i++) {
		apply(i,i-1)
	}
	apply(0,nSample-1);
	return filteredArray;
}

Audio.prototype.setCamera = function(pos,at,up)
{
	if( this.context == undefined ) return; 
	this.context.listener.setPosition(pos[0],pos[1],pos[2]);
	this.context.listener.setOrientation(at[0],at[1],at[2],up[0],up[1],up[2]);
}

Audio.prototype.setFirePos = function(pos)
{
	if( this.context == undefined ) return; 
	if( this.fire == undefined )
	{
		var sampleRate = this.context.sampleRate;
		var bufferSize = sampleRate;
		var noiseBuffer = this.context.createBuffer(1, bufferSize, sampleRate);
		var output = noiseBuffer.getChannelData(0);
		var noise = [];
		for (var i = 0; i < bufferSize; i++) {
			noise[i] = (Math.random() * 2 - 1);
		}
		var fire = noise;
		fire = LowPass(200,sampleRate,fire,bufferSize)
		fire = HighPass(100,sampleRate,fire,bufferSize);
		for (var i = 0; i < bufferSize; i++) {
			output[i] = fire[i] * 10;
		}

		var whiteNoise = this.context.createBufferSource();
		whiteNoise.buffer = noiseBuffer;
		whiteNoise.loop = true;
		//whiteNoise.connect(this.gainNode);
		this.fire = this.context.createPanner();
		whiteNoise.connect(this.fire);
		this.fire.connect(this.gainNode);
		this.fire.setPosition(pos[0], pos[1], pos[2]);
		this.fire.refDistance = 10;
		whiteNoise.start();		
	} else
		this.fire.setPosition(pos[0], pos[1], pos[2]);
}

Audio.prototype.hit = function(volume, pos)
{
	if( this.context == undefined ) return; 
	var sampleRate = this.context.sampleRate;
	var noiseBuffer = this.context.createBuffer(1, this.bufferSize, sampleRate);
	var output = noiseBuffer.getChannelData(0);
	for (var i = 0; i < this.bufferSize; i++) {
		var vol = 1 - (i / this.bufferSize);
		output[i] = this.final[i] * vol * volume;
	}
	var whiteNoise = this.context.createBufferSource();
	whiteNoise.buffer = noiseBuffer;
	whiteNoise.loop = false;
	//whiteNoise.connect(this.gainNode);
	var panner = this.context.createPanner();
	whiteNoise.connect(panner);
	panner.connect(this.gainNode);
	panner.setPosition(pos[0], pos[1], pos[2]);
	panner.refDistance = 10;
	whiteNoise.start();
}
