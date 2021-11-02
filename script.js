var canvas = document.getElementById("myCanvas");
var ctx = canvas.getContext("2d");

window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

var animcounter = 0

var workstring = ""

var LAMBDA = "λ"

function draw() {
	ctx.fillStyle = "rgb(" + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) +
								"," + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) +
								"," + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) + ")";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	animcounter += 1;

	ctx.fillStyle = "black";
	ctx.font = "48px monospace";
	ctx.fillText(workstring, 10, 48 + 10);



	window.requestAnimationFrame(draw);
}

function keypressed(e){
	code = e.code
	if( code in typablecodes ) {
    if( code == "Backspace"){
      workstring = workstring.substring(0,workstring.length-1)
    } else {
      if (e.shiftKey) {
        workstring += typablecodes[code][1]
      } else {
        workstring += typablecodes[code][0]
      }
    }
	}
}

document.onkeydown = keypressed;

function parse(str){
  stream = {}
  stream.string = str
  stream.index = 0
  return parserecursive(stream)
}

function parserecursive(stream) {

}

var typablecodes = {}
alphabet = "abcdefghijklmnopqrstuvwxyz"
for (let i = 0; i < alphabet.length; i++){
	typablecodes["Key" + alphabet[i].toUpperCase()] = [alphabet[i],alphabet[i].toUpperCase()]
}
typablecodes["Digit9"] = ["","("]
typablecodes["Digit0"] = ["",")"]
typablecodes["Backspace"] = [null,null]
typablecodes["Backslash"] = [LAMBDA,LAMBDA]
typablecodes["Space"] = [" "," "]
typablecodes["Period"] = [".","."]
