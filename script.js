'use strict'; //this line makes JS stop you from doing dumb things you don't want to do - must be above ALL other statements

let canvas = document.getElementById("myCanvas");
let ctx = canvas.getContext("2d");





window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

let anim_counter = 0

let work_string = ""

let LAMBDA = "λ"

let single_char_tokens = [LAMBDA, '.', '(', ')']

function draw() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;


	ctx.fillStyle = "rgb(" + (200 + (anim_counter % 60 >= 30 ? 30 - (anim_counter % 30) : (anim_counter % 30))) +
								"," + (200 + (anim_counter % 60 >= 30 ? 30 - (anim_counter % 30) : (anim_counter % 30))) +
								"," + (200 + (anim_counter % 60 >= 30 ? 30 - (anim_counter % 30) : (anim_counter % 30))) + ")";
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	anim_counter += 1;

	ctx.fillStyle = "black";
	ctx.font = "48px monospace";
  ctx.fillText(work_string, 10, 48 + 10);
  if (anim_counter % 40 <= 19) {
	   ctx.fillRect(10 + ctx.measureText(work_string).width,10,5,48)
  }

	window.requestAnimationFrame(draw);
}

function key_pressed(e){
	let code = e.code
	if( code in type_codes ) {
    if( code === "Backspace"){
      work_string = work_string.substring(0,work_string.length-1)
    } else {
      if (e.shiftKey) {
        work_string += type_codes[code][1]
      } else {
        work_string += type_codes[code][0]
      }
    }
	}
}

let type_codes = {}
let alphabet = "abcdefghijklmnopqrstuvwxyz"
for (let i = 0; i < alphabet.length; i++){
	type_codes["Key" + alphabet[i].toUpperCase()] = [alphabet[i],alphabet[i].toUpperCase()]
}
type_codes["Digit9"] = ["","("]
type_codes["Digit0"] = ["",")"]
type_codes["Backspace"] = [null,null]
type_codes["Backslash"] = [LAMBDA,LAMBDA]
type_codes["Space"] = [" "," "]
type_codes["Period"] = [".","."]

document.onkeydown = key_pressed;

function parse(str){
  let tokens = []
  for (let i = 0; i < str.length; i++) {
    if (str[i] === ' ') {
      //pass
    } else if (single_char_tokens.includes(str[i])) {
      tokens.push(str[i]);
    } else if (alphabet.includes(str[i])) {
      let thisname = '';
      while(i < str.length && alphabet.includes(str[i])) {
        thisname += str[i];
        i++;
      }
      i--; //because it's incremented in the loop
      tokens.push(thisname);
    } else {
      throw new Error("Unexpected symbol " + str[i] + " while tokenizing");
    }
  }
  tokens.push(')'); //to make it so that the logic can always assume there's another character
  let stream = {};
  stream.tokens = tokens;
  stream.index = 0;
  return parse_application(stream, {}, null);
}

function parse_application(stream, context, parent) {
  let current_node = parse_lambda(stream, { ...context }, parent);
  while (stream.tokens[stream.index] != ')'  && stream.index < stream.tokens.length) { //well, almost always, anyways
    let new_node = {};
    new_node.type = 'Application';
    new_node.left = current_node;
    new_node.right = parse_lambda(stream, { ...context }, new_node);
    current_node.parent = new_node;
    current_node = new_node;
  }
  if (stream.index >= stream.tokens.length) {
    throw new Error("Unexpected end of token stream when parsing");
  }
  current_node.parent = parent;
  return current_node;
}

function parse_lambda(stream, context, parent) {
  if (stream.tokens[stream.index] === LAMBDA) {
    stream.index++;
    if (single_char_tokens.includes(stream.tokens[stream.index])) {
      throw new Error("Unexpected token " + stream.tokens[stream.index] + " at index " + stream.index + ".");
    }
    let newname = stream.tokens[stream.index];
    stream.index++;
    if (stream.tokens[stream.index] !== '.') {
      throw new Error("Unexpected token " + stream.tokens[stream.index] + " at index " + stream.index + ".");
    }
    stream.index++;
    let new_node = {};
    new_node.type = 'Lambda';
    new_node.preferred_name = newname;
    context[newname] = new_node;
    new_node.content = parse_application( stream, {...context}, new_node);
    new_node.parent = parent;
    return new_node;
  } else {
    return parse_atom(stream, {...context}, parent);
  }
}

function parse_atom(stream, context, parent){
  if (stream.tokens[stream.index] === '(') {
    stream.index++;
    let return_val = parse_application(stream, {...context}, parent);
    stream.index++;
    return return_val;
  } else {
    if (single_char_tokens.includes(stream.tokens[stream.index])) {
      throw new Error("Unexpected token " + stream.tokens[stream.index] + " at index " + stream.index + ".");
    }
    let var_name = stream.tokens[stream.index];
    let binding = context[var_name];
    stream.index++;
    let new_node = {}
    new_node.type = 'Variable';
    new_node.parent = parent;
    if (binding === undefined) {
      new_node.bound = false;
      new_node.name = var_name;
    } else {
      new_node.bound = true;
      new_node.binding = binding;
    }
    return new_node;
  }
}

function beta_reduce(node) {
  if (node.type !== 'Application' || node.left.type !== 'Lambda') {
    throw new Error("This node is not beta reducable.");
  }
  let argument = node.right;
  let to_replace = node.left;
  substitiute(argument, to_replace, node.left);
  return node.left.content;
}

function substitiute(source, target, node) {
  if (node.type === 'Lambda') {
    if (node.content.type === 'Variable') {
      if (node.content.bound && node.content.binding === target) {
        node.content = copy_subtree(source);
      }
    } else {
      substitiute(source, target, node.content);
    }
  } else if (node.type === 'Application') {
    if (node.left.type === 'Variable') {
      if (node.left.bound && node.left.binding === target) {
        node.left = copy_subtree(source);
      }
    } else {
      substitiute(source, target, node.left);
    }
    if (node.right.type === 'Variable') {
      if (node.right.bound && node.right.binding === target) {
        node.right = copy_subtree(source);
      }
    } else {
      substitiute(source, target, node.right);
    }
  } else if (node.type === 'Variable') {
    throw new Error("Internal logic error");
  } else {
    throw new Error("Unrecognized node type");
  }
}

function copy_subtree(node) {
  return copy_subtree_recursive(node, null, [], []);
}

function copy_subtree_recursive(node, parent, terms, new_terms) {
  let new_node = {...node};
  new_node.parent = parent;
  if (new_node.type === 'Lambda') {
    terms.push(node);
    new_terms.push(new_node);
    new_node.content = copy_subtree_recursive(node.content, new_node, terms, new_terms);
  } else if (new_node.type === 'Application') {
    new_node.left = copy_subtree_recursive(node.left, new_node, terms, new_terms);
    new_node.right = copy_subtree_recursive(node.right, new_node, terms, new_terms);
  } else if (new_node.type === 'Variable') {
    if (new_node.bound) {
      let i = terms.indexOf(new_node.binding);
      if (i !== -1) {
        new_node.binding = new_terms[i];
      }
    }
  } else {
    throw new Error("Unrecognized node type");
  }
  return new_node;
}

function print_ast(node) {
  if (node.type === 'Lambda') {
    return "(" + LAMBDA + node.preferred_name + ". " + print_ast(node.content) + ")";
  } else if (node.type === 'Application') {
    return print_ast(node.left) + " " + print_ast(node.right);
  } else if (node.type === 'Variable') {
    if (node.bound) {
      return node.binding.preferred_name;
    } else {
      return node.name;
    }
  } else {
    throw new Error("Unrecognized node type");
  }
}
