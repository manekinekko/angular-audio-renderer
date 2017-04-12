import { Injectable, Inject } from '@angular/core';

@Injectable()
export class ModemService {
	//Audio playing or audio listening flag
	audioPlaying = false

	//Empty variables for listening state
	micInput;
	decodeNode;
	decodeFunction;
	antialias;
	sampleBuffer = [] as any;
	symbolBuffer = [] as any;
	dataBuffer = [] as any;

	analyser;

	constructor(
		private audioContext: AudioContext
	) {

		this.audioContext = audioContext;

		//Analyser to get FFT data
		this.analyser = this.audioContext.createAnalyser();
		this.analyser.smoothingTimeConstant = 0;
		this.analyser.fftSize = 512;

	}

	//Transmit a data packet (it includes one or more channels and )
	private transmit(data) {
		if (this.audioPlaying === false) {
			let channels = data.config.channels;
			let period = data.config.period;

			this.audioPlaying = true;

			setTimeout(() => {
				this.audioPlaying = false;
			}, data.data.length * period);


			for (let channel = 0; channel < channels; channel++) {
				let oscillator = this.audioContext.createOscillator();
				let gainNode = this.audioContext.createGain();

				oscillator.connect(gainNode);
				gainNode.connect(this.analyser);
				gainNode.connect(this.audioContext.destination);

				oscillator.start(0);

				for (let time = 0; time < data.data.length; time++) {
					oscillator.frequency.setValueAtTime(data.data[time][channel].frequency, this.audioContext.currentTime + (period * time) / 1000)
					gainNode.gain.setValueAtTime(data.data[time][channel].gain, this.audioContext.currentTime + (period * time) / 1000)
					
					//EXPERIMENTAL: Exponential changes between symbols in order to avoid high frequencies in changes
					//oscillator.frequency.setTargetAtTime(data["data"][time][channel]["frequency"],this.audioContext.currentTime+(period*time)/1000,0.01)
					//gainNode.gain.setTargetAtTime(data["data"][time][channel]["gain"],this.audioContext.currentTime+(period*time)/1000,0.01)

				}
				oscillator.stop(this.audioContext.currentTime + ((data.data.length) * period) / 1000);
			}
		}
	};

	//Binary Frequency Shift Keying
	BFSK(data, period, sFreq, shift) {
		data = this.dataToBin(data);
		let config = { "channels": 1, "period": period };
		let rawData = [] as any;

		while (data.length % 1 != 0) {
			data += "0";
		}
		console.log("Converted data: " + data);


		for (let i = 0; i < data.length; i++) {
			let instant = [] as any;
			for (let channel = 0; channel < config["channels"]; channel++) {
				let symbol;
				if (data[i] == "0") {
					symbol = { "frequency": sFreq, "gain": 1 };
				} else {
					symbol = { "frequency": sFreq + shift, "gain": 1 };
				}
				instant.push(symbol);
			}
			rawData.push(instant);
		}

		this.transmit({ "config": config, "data": rawData })
	}

	//Quad Frequency Shift Keying
	QFSK(data, period, sFreq, shift) {
		data = this.dataToBin(data);
		let config = { "channels": 1, "period": period };
		let rawData = [] as any;

		while (data.length % 2 != 0) {
			data += "0";
		}
		console.log("Converted data: " + data)

		for (let i = 0; i < data.length; i += 2) {
			let instant = [] as any;
			for (let channel = 0; channel < config["channels"]; channel++) {
				let symbol;
				if (data.substring(i, i + 2) == "00") {
					symbol = { "frequency": sFreq, "gain": 1 };
				} else if (data.substring(i, i + 2) == "01") {
					symbol = { "frequency": sFreq + shift, "gain": 1 };
				} else if (data.substring(i, i + 2) == "10") {
					symbol = { "frequency": sFreq + 2 * shift, "gain": 1 };
				} else if (data.substring(i, i + 2) == "11") {
					symbol = { "frequency": sFreq + 3 * shift, "gain": 1 };
				}
				instant.push(symbol);
			}
			rawData.push(instant);
		}

		this.transmit({ "config": config, "data": rawData });
	}
	// Binary Amplitude Shift Keying
	BASK(data, period, sFreq) {
		data = this.dataToBin(data);
		let config = { "channels": 1, "period": period };
		let rawData = [] as any;

		while (data.length % 1 != 0) {
			data += "0";
		}
		console.log("Converted data: " + data);

		for (let i = 0; i < data.length; i++) {
			let instant = [] as any;
			for (let channel = 0; channel < config["channels"]; channel++) {
				let symbol;
				if (data[i] == "1") {
					symbol = { "frequency": sFreq, "gain": 1 };
				} else {
					symbol = { "frequency": sFreq, "gain": 0.8 };
				}
				instant.push(symbol);
			}
			rawData.push(instant);
		}
		this.transmit({ "config": config, "data": rawData });
	}

	//Auxiliar function to convert everything to binary stream
	private dataToBin(t) {
		let output = "";
		let input = t;
		for (let i = 0; i < input.length; i++) {
			output += input[i].charCodeAt(0).toString(2);
		}
		return output;
	}

	//Receive audio info processing
	private receive(data) {
		let array = new Float32Array(this.analyser.frequencyBinCount);
		this.analyser.getFloatFrequencyData(array);

		let freq = 11000;
		let thr = this.analyser.minDecibels + 0.8 * (this.analyser.maxDecibels - this.analyser.minDecibels);
		let nyq = this.audioContext.sampleRate / 2;
		let period = 100;

		let index = Math.round(freq / nyq * array.length);
		if (array[index] > thr) {
			this.sampleBuffer.push({ "timestamp": this.audioContext.currentTime * 1000, "frequency": freq, "amplitude": array[index] });
		}
		if (this.sampleBuffer.length > 0 && (this.sampleBuffer[this.sampleBuffer.length - 1]["timestamp"] - this.sampleBuffer[0]["timestamp"]) >= period) {
			this.decodeBASK(period);
		}
	}

	private decodeBASK(period) {
		let i = 0;
		let mean = 0;
		while (this.sampleBuffer[i]["timestamp"] - this.sampleBuffer[0]["timestamp"] <= period) {
			mean += this.sampleBuffer[i]["amplitude"];
			i += 1;
		}
		mean = mean / i;
		this.symbolBuffer.push(mean);
		this.sampleBuffer.splice(0, i - 1);

		if (this.symbolBuffer.length >= 7) {
			let min = 999999;
			let max = -999999;

			//Calculate symbol amplitude threshold
			for (let i = 0; i < 7; i++) {
				if (this.symbolBuffer[i] > max) {
					max = this.symbolBuffer[i];
				}
				if (this.symbolBuffer[i] < min) {
					min = this.symbolBuffer[i];
				}
			}
			let decodeThr = (min + max) / 2;

			//Decode symbols
			for (let i = 0; i < 7; i++) {
				if (this.symbolBuffer[i] > decodeThr) {
					this.dataBuffer.push("1");
				} else {
					this.dataBuffer.push("0");
				}
			}
			this.symbolBuffer.splice(0, 8);

			if (this.dataBuffer.length >= 7) {
				this.decodeData();
				this.dataBuffer.splice(0, 8);
			}
		}
	}

	private decodeData() {
		let output = '';
		for (let i = 0; i < this.dataBuffer.length; i += 7) {
			output += String.fromCharCode(parseInt(this.dataBuffer.slice(i, i + 7), 2));
		}
		console.log("Received data: " + this.dataBuffer)
		return output
	}

	//Asking for the microphone
	listen() {
		(navigator as any).webkitGetUserMedia({
			audio: {
				optional: [{ echoCancellation: false }]
			}
		},
			this.onStream.bind(this),
			error => console.error(error)
		);

	};

	//Include microphone information in the system
	private onStream(stream) {
		this.audioPlaying = true
		this.micInput = this.audioContext.createMediaStreamSource(stream);

		//Antialias filter (is it working?)
		this.antialias = this.audioContext.createBiquadFilter();
		this.antialias.type = "lowpass"
		this.antialias.frequency.value = this.audioContext.sampleRate / 2;
		this.antialias.Q.value = 0;

		//Creating an receiver module
		this.decodeNode = this.audioContext.createScriptProcessor(0, 1, 1);
		this.decodeNode.onaudioprocess = this.receive.bind(this);

		//Web API connections
		this.micInput.connect(this.antialias);
		this.antialias.connect(this.analyser);
		this.analyser.connect(this.decodeNode);
		this.decodeNode.connect(this.audioContext.destination);
	}
}