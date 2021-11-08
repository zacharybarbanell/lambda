'use strict'; //this line makes JS stop you from doing dumb things you don't want to do - must be above ALL other statements

let canvas = document.getElementById("myCanvas");
let ctx = canvas.getContext("2d");

let palette = {}

palette.blue = {}
palette.blue.light = "#6C6AC3"
palette.blue.dark = "#704BC9"
palette.yellow = {}
palette.yellow.light = "#FFCF6B"
palette.yellow.dark = "#FFB969"
palette.green = {}
palette.green.light = "#66A771"
palette.green.dark = "#4F8D73"
palette.purple = {}
palette.purple.light = "#9E46B7"
palette.purple.dark = "#8C34B8"

function sanity_check(node){ //checks if all variables are contained in their bindings
  if(node.type === 'Variable' && node.bound){
    let looking_at = node.parent
    while(looking_at !== null){
      if(looking_at === node.binding){
        break;
      }
      looking_at = looking_at.parent
    }
    if(looking_at === null){
      return false
    }
    else{
      return true
    }
  }
  else{
    let return_val = true
    for(let child of get_children_names(node)){
      return_val = return_val && sanity_check(node[child])
    }
    return return_val
  }
}

function draw_thing(color_scheme,x,y,width,height){
  let arc_param = 0.5 //range: 0-inf
  ctx.lineWidth = 10
  ctx.strokeStyle = color_scheme.dark
  ctx.fillStyle = color_scheme.light
  ctx.beginPath()
  let angle = Math.atan2(1,2*arc_param)
  let radius = Math.sqrt((height/2)**2+(height*arc_param)**2)
  ctx.arc(x + width - height * arc_param,y + height * 0.5, radius, 0 - angle, angle)
  ctx.arc(x + height * arc_param,y + height * 0.5, radius, Math.PI - angle, Math.PI + angle)
  ctx.arc(x + width - height * arc_param,y + height * 0.5, radius, 0 - angle, angle)
  ctx.stroke()
  ctx.rect(x,y + ctx.lineWidth * 0.5,width,height  - ctx.lineWidth)
  ctx.fill()
}


window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

let anim_counter = 0

let work_string = ""

let LAMBDA = "λ"

let single_char_tokens = [LAMBDA, '.', '(', ')']

function replace_object(a, b) {
  for(let key in a) {
    delete a[key];
  }
  Object.assign(a, b);
}

function get_children_names(node) {
  let children;
  if (node.type === 'Lambda') {
    children = ['content']
  } else if (node.type === 'Application') {
    children = ['left', 'right']
  } else if (node.type === 'Variable') {
    children = []
  } else {
    throw new Error("Unrecognized node type");
  }
  return children;
}

function draw() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.fillStyle = "#FFFFFF";
	ctx.fillRect(0, 0, canvas.width, canvas.height);


  ctx.fillStyle = "black";
	ctx.font = "48px monospace";
  let font_height =



  draw_thing(palette.blue,100,100,ctx.measureText(work_string).width,48)


	ctx.fillStyle = "black";
	ctx.font = "48px monospace";
  ctx.fillText(work_string, 100, 48 + 100);
  if (anim_counter % 40 <= 19) {
	   ctx.fillRect(100 + ctx.measureText(work_string).width,10,5,48)
  }





  anim_counter += 1;
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

function parse_lc(str) {
  for (let i = 0; i < str.len; i++) {
    while (str[i] === ' ' && i < str.len) i++;
    let reserved_ast_list = {};
    let reserved_name = '';
    for (let j = i; j < str.length && alphabet.toUpperCase().includes(str[j]); j++) {
      reserved_name += str[j];
    }
    if (reserved_ast_list[reserved_name] !== undefined) {
      reserved_name = ''
    } else {
      i = j - 1;
    }
    while (str[i] === ' ' && i < str.len) i++;
    if (reserved_name !== '') {
      if (i < str.len-1 && str[i] === ':' && str[i+1] === '=') {
        i += 2;
      } else {
        throw new Error("Unexpected symbol " + str[i] + " while tokenizing");
      }
    }
    while (str[i] === ' ' && i < str.len) i++;
    if (str[i] === '(' || str[i] === LAMBDA) {
      for (let j = i; j < str.len || str[j] === '\n'; j++);
      if (str[j-1] === '\r') j--;
      let parsable_line = str.slice(i,j);
      i += j;
    } else {
      throw new Error("Unexpected symbol " + str[i] + " while tokenizing");
    }
    if (reserved_name === '') {
      parse(reserved_ast_list, parsable_line);
      i = str.len;
    } else  {
      let reserved_ast = parse(reserved_ast_list, parsable_line);
      reserved_ast_list[reserved_name] = reserved_ast;
    }
  }
}

function parse(reserved_ast_list, str){
  let tokens = [];
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

    }
  }
  tokens.push(')'); //to make it so that the logic can always assume there's another character
  let stream = {};
  stream.tokens = tokens;
  stream.index = 0;
  return parse_application(reserved_ast_list, stream, {}, null);
}

function parse_application(reserved_ast_list, stream, context, parent) {
  let current_node = parse_lambda(reserved_ast_list, stream, { ...context }, parent);
  while (stream.tokens[stream.index] != ')'  && stream.index < stream.tokens.length) { //well, almost always, anyways
    let new_node = {};
    new_node.type = 'Application';
    new_node.left = current_node;
    new_node.right = parse_lambda(reserved_ast_list, stream, { ...context }, new_node);
    current_node.parent = new_node;
    current_node = new_node;
  }
  if (stream.index >= stream.tokens.length) {
    throw new Error("Unexpected end of token stream when parsing");
  }
  current_node.parent = parent;
  return current_node;
}

function parse_lambda(reserved_ast_list, stream, context, parent) {
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
    new_node.content = parse_application(reserved_ast_list, stream, {...context}, new_node);
    new_node.parent = parent;
    return new_node;
  } else {
    return parse_atom(reserved_ast_list, stream, {...context}, parent);
  }
}

function parse_atom(reserved_ast_list, stream, context, parent){
  if (stream.tokens[stream.index] === '(') {
    stream.index++;
    let return_val = parse_application(reserved_ast_list, stream, {...context}, parent);
    stream.index++;
    return return_val;
  } else if (reserved_ast_list[stream.tokens[stream.index]] !== undefined) {
    let return_val = copy_subtree(reserved_ast_list[stream.tokens[stream.index]]);
    return_val.parent = parent;
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

function normalized(ast){ //doesn't necesarially halt
  let new_tree = copy_subtree(ast)
  while(normalize_step(new_tree)){
    console.log(print_ast(with_renamed_variables(new_tree)))
    if(!sanity_check(new_tree)){
      throw new Error();
    }
  }
  return new_tree
}

function normalize_step(node){
  if (beta_reducable(node)) {
    replace_object(node,beta_reduce(node));
    return true;
  } else {
    if (node.type === 'Application') {
      return normalize_step(node.left) || normalize_step(node.right)
    } else if (node.type === 'Lambda') {
      return normalize_step(node.content);
    } else if (node.type === 'Variable') {
      return false;
    } else {
      throw new Error("Unrecognized node type");
    }
  }
}

function beta_reducable(node){
  return node.type === 'Application' && node.left.type === 'Lambda'
}

function beta_reduce(node) {
  if ( !beta_reducable(node) ) {
    throw new Error("This node is not beta reducable.");
  }
  let argument = node.right;
  let to_replace = node.left;
  substitiute(argument, to_replace, node.left);
  node.left.content.parent = node.parent;
  return node.left.content;
}

function substitiute(source, target, node) {
  let children = get_children_names(node);
  for (const child of children){
    if (node[child].type === 'Variable') {
      if (node[child].bound && node[child].binding === target) {
        node[child] = copy_subtree(source);
        node[child].parent = node;
      }
    } else {
      substitiute(source, target, node[child]);
    }
  }
}

function with_renamed_variables(ast){
  let new_tree = copy_subtree(ast)
  rename_subtree(new_tree)
  return new_tree
}

function rename_subtree(node){
  if(node.type === 'Application'){
    rename_subtree(node.left)
    rename_subtree(node.right)
  } else if (node.type === 'Lambda') {
    while(find_conflict(node.content,node.preferred_name,[node])){
        node.preferred_name = rename_variable(node.preferred_name)
    }
    rename_subtree(node.content)
  } else if (node.type === 'Variable') {
    // nothing to do here
  } else {
    throw new Error("Unrecognized node type");
  }
}

function find_conflict(node, name, seen){
  if(node.type === 'Application'){
    return find_conflict(node.left, name, seen) || find_conflict(node.right, name, seen)
  } else if (node.type === 'Lambda') {
    if (node.preferred_name === name){
      seen.push(node)
    }
    return find_conflict(node.content, name, seen)
  } else if (node.type === 'Variable' ) {
    if(node.bound){
      return node.binding.preferred_name === name && seen.indexOf(node.binding) === -1
    } else {
      return node.name === name
    }
  } else {
    throw new Error("Unrecognized node type");
  }
}

function rename_variable(name){
  return name + "'"
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
    return '(' + print_ast(node.left) + " " + print_ast(node.right) + ')' ;
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
