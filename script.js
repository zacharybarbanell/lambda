'use strict'; //this line makes JS stop you from doing dumb things you don't want to do - must be above ALL other statements

let canvas = document.getElementById("myCanvas");
let ctx = canvas.getContext("2d");





window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

let animcounter = 0

let workstring = ""

let LAMBDA = "λ"

let singlechartokens = [LAMBDA, '.', '(', ')']

function draw() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;


	ctx.fillStyle = "rgb(" + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) +
								"," + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) +
								"," + (200 + (animcounter % 60 >= 30 ? 30 - (animcounter % 30) : (animcounter % 30))) + ")";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	animcounter += 1;

	ctx.fillStyle = "black";
	ctx.font = "48px monospace";
  ctx.fillText(workstring, 10, 48 + 10);
  if (animcounter % 40 <= 19) {
	   ctx.fillRect(10 + ctx.measureText(workstring).width,10,5,48)
  }

	window.requestAnimationFrame(draw);
}

function keypressed(e){
	let code = e.code
	if( code in typablecodes ) {
    if( code === "Backspace"){
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
  let tokens = []
  for (let i = 0; i < str.length; i++) {
    if(str[i] === ' '){
      //pass
    }
    else if(singlechartokens.includes(str[i])){
      tokens.push(str[i])
    }
    else if(alphabet.includes(str[i])){
      let thisname = ''
      while(i < str.length && alphabet.includes(str[i])){
        thisname += str[i]
        i++;
      }
      i--; //because it's incremented in the loop
      tokens.push(thisname)
    }
    else{
      throw new Error("Unexpected symbol " + str[i] + " while tokenizing")
    }
  }
  tokens.push(')') //to make it so that the logic can always assume there's another character
  let stream = {}
  stream.tokens = tokens
  stream.index = 0
  return parseapplication(stream, [])
}

function parseapplication(stream, context) {
  let currentnode = parselambda(stream, [ ...context ])
  while(stream.tokens[stream.index] != ')'  && stream.index < stream.tokens.length){ //well, almost always, anyways
    let newnode = {}
    newnode.type = 'Application'
    newnode.left = currentnode
    newnode.right = parselambda(stream, [ ...context ])
    currentnode = newnode
  }
  if(stream.index >= stream.tokens.length){
    throw new Error("Unexpected end of token stream when parsing")
  }
  return currentnode
}

function parselambda(stream, context) {
  if(stream.tokens[stream.index] === LAMBDA){
    stream.index++;
    if(singlechartokens.includes(stream.tokens[stream.index])){
      throw new Error("Unexpected token " + stream.tokens[stream.index] + " at index " + stream.index + ".")
    }
    let newname = stream.tokens[stream.index]
    stream.index++;
    if(stream.tokens[stream.index] != '.'){
      throw new Error("Unexpected token " + stream.tokens[stream.index] + " at index " + stream.index + ".")
    }
    stream.index++;
    let newnode = {}
    newnode.type = 'Lambda'
    newnode.preferredname = newname
    context.unshift(newname)
    newnode.content = parseapplication( stream, [...context] )
    return newnode
  }
  else{
    return parseatom(stream, [...context])
  }
}

function parseatom(stream, context){
  if(stream.tokens[stream.index] === '('){
    stream.index++;
    let returnval = parseapplication(stream, [...context])
    stream.index++;
    return returnval
  }
  else{
    if(singlechartokens.includes(stream.tokens[stream.index])){
      throw new Error("Unexpected token " + stream.tokens[stream.index] + " at index " + stream.index + ".")
    }
    let varname = stream.tokens[stream.index]
    let varindex = context.indexOf(varname)
    stream.index++;
    let newnode = {}
    newnode.type = 'Variable'
    if(varindex === -1){
      newnode.bound = false
      newnode.name = varname
    }
    else{
      newnode.bound = true
      newnode.index = varindex + 1 // De Bruijn index, starts at 1 by spec
    }
    return newnode
  }
}

let typablecodes = {}
let alphabet = "abcdefghijklmnopqrstuvwxyz"
for (let i = 0; i < alphabet.length; i++){
	typablecodes["Key" + alphabet[i].toUpperCase()] = [alphabet[i],alphabet[i].toUpperCase()]
}
typablecodes["Digit9"] = ["","("]
typablecodes["Digit0"] = ["",")"]
typablecodes["Backspace"] = [null,null]
typablecodes["Backslash"] = [LAMBDA,LAMBDA]
typablecodes["Space"] = [" "," "]
typablecodes["Period"] = [".","."]
