var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

var animcounter = 0

var workstring = ""

function draw() {
	ctx.fillStyle = "rgb(" + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) +
								"," + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) + 
								"," + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) + ")"
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	animcounter += 1
	
	ctx.fillStyle = "black"
	ctx.font = "48px serrif"
	ctx.fillText(workstring, 10, 48 + 10)
	
	

	window.requestAnimationFrame(draw);
}

function keypressed(e){
	code = e.code
	if( code in typablecodes ) {
		workstring += typablecodes[code]
	}
}

typablecodes = {}
alphabet = "abcdefghijklmnopqrstuvwxyz"
for (let i = 0; i < alphabet.length; i++){
	typablecodes["Key" + alphabet[i].toUpperCase()] = alphabet[i]
}
typablecodes["Backslash"] = "λ"
typablecodes["Space"] = " "
typablecodes["Period"] = "."

document.onkeydown = keypressed