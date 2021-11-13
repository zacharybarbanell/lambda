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

let extra_node_properties = ["depth_memo","width_memo"]



function sanity_check(node){
  if(node.type === 'Variable' && node.bound){
    let looking_at = node.parent
    while(looking_at !== null){
      if(looking_at === node.binding){
        break;
      }
      looking_at = looking_at.parent
    }
    return looking_at !== null
  }
  else{
    let return_val = true
    for(let child of get_children_names(node)){
      return_val = return_val && sanity_check(node[child]) && node[child].parent === node
    }
    return return_val
  }
}



let arc_param = 1.0 //range: 0-inf, higher number is flatter
let vertical_clearance = 7
let horizontal_clearance = vertical_clearance * arc_param //could be bigger
let text_horizontal_clearance = 0 //could be bigger
let apply_clearance = 20
let stroke_width = 3
let font_size = 36
ctx.font = font_size + "px monospace";
let metrics = ctx.measureText('.')
let font_height_lower = metrics.fontBoundingBoxDescent
let font_height_upper = metrics.fontBoundingBoxAscent
let font_height = font_height_lower + font_height_upper

function draw_thing(color_scheme,x,y,width,height){
  ctx.lineWidth = 2 * stroke_width
  ctx.strokeStyle = color_scheme.dark
  ctx.fillStyle = color_scheme.light
  ctx.beginPath()
  let angle = Math.atan2(1,arc_param)
  let radius = Math.sqrt((height/2)**2+(height*arc_param/2)**2)
  ctx.arc(x + width - height * arc_param/2,y + height * 0.5, radius, 0 - angle, angle)
  ctx.arc(x + height * arc_param/2,y + height * 0.5, radius, Math.PI - angle, Math.PI + angle)
  ctx.arc(x + width - height * arc_param/2,y + height * 0.5, radius, 0 - angle, angle)
  ctx.stroke()
  ctx.rect(x,y + ctx.lineWidth * 0.5,width,height  - ctx.lineWidth)
  ctx.fill()
}

function get_depth(node) { //this would be a cute oneliner in python but we can't have nice things I guess
  if(node.depth_memo !== undefined){
    return node.depth_memo
  }
  let max_seen = 0
  for(let child of get_children_names(node)){
    let new_val = 1 + get_depth(node[child])
    if(new_val > max_seen){
      max_seen = new_val
    }
  }
  return max_seen
}

function calc_height(depth){
  return font_height + depth*vertical_clearance*2
}

function calc_excess_width(height){
  return Math.sqrt((height/2)**2 + (arc_param*height/2)**2) - (arc_param*height/2)
}

function get_render_width(node){
  if(node.width_memo !== undefined){
    return node.width_memo
  }
  let return_val;
  if (node.type === 'Lambda') {
    return_val = ctx.measureText(LAMBDA + node.preferred_name + '.').width +
      text_horizontal_clearance +
      calc_excess_width(calc_height(get_depth(node.content))) +
      get_render_width(node.content) +
      horizontal_clearance;
    //return 2 * horizontal_clearance + ctx.measureText(LAMBDA + node.preferred_name + '.').width + get_render_width(node.content)
  } else if (node.type === 'Application') {
    return_val = horizontal_clearance +
    get_render_width(node.left) +
    calc_excess_width(calc_height(get_depth(node.left))) +
    apply_clearance +
    calc_excess_width(calc_height(get_depth(node.right))) +
    get_render_width(node.right) +
    horizontal_clearance;
    //return 2 * horizontal_clearance + apply_clearance + get_render_width(node.left) + get_render_width(node.right)
  } else if (node.type === 'Variable') {
    return_val = text_horizontal_clearance +
    ctx.measureText(node.binding.preferred_name).width +
    text_horizontal_clearance;
    //return 2 * horizontal_clearance + ctx.measureText(node.binding.preferred_name).width
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
  node.width_memo = return_val
  return return_val
}

function get_color(node) {
  if (node.type === 'Lambda') {
    return palette.yellow
  } else if (node.type === 'Application') {
    return palette.blue
  } else if (node.type === 'Variable') {
    return palette.green
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
}

function render_ast(node, left_x, mid_y){ //assumes that font and such are set up
  let depth = get_depth(node)
  let width = get_render_width(node)
  let color = get_color(node)
  draw_thing(color, left_x, mid_y - font_height_upper - vertical_clearance*depth, width, font_height + depth*vertical_clearance*2 )
  ctx.fillStyle = "black";
  if (node.type === 'Lambda') {
    ctx.fillText(LAMBDA + node.preferred_name + '.', left_x, mid_y);
    render_ast(node.content,left_x + ctx.measureText(LAMBDA + node.preferred_name + '.').width +
      text_horizontal_clearance +
      calc_excess_width(calc_height(get_depth(node.content))), mid_y)
  } else if (node.type === 'Application') {
    ctx.lineWidth = stroke_width
    ctx.beginPath()
    ctx.moveTo(left_x + horizontal_clearance + get_render_width(node.left) +
      calc_excess_width(calc_height(get_depth(node.left)))  + apply_clearance/2,
      mid_y - font_height_upper - vertical_clearance*depth)
    ctx.lineTo(left_x + horizontal_clearance + get_render_width(node.left) +
      calc_excess_width(calc_height(get_depth(node.left)))  + apply_clearance/2,
      mid_y + font_height_lower + vertical_clearance*depth)
    ctx.stroke()
    render_ast(node.left,
      left_x + horizontal_clearance,
      mid_y)
    render_ast(node.right,
      left_x + horizontal_clearance + get_render_width(node.left) +
      calc_excess_width(calc_height(get_depth(node.left))) + apply_clearance +
      calc_excess_width(calc_height(get_depth(node.right))),
      mid_y)
  } else if (node.type === 'Variable') {
    ctx.fillText(node.binding.preferred_name, left_x + text_horizontal_clearance, mid_y);
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
}


window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

let anim_counter = 0

let work_string = ""

let LAMBDA = "λ"

let single_char_tokens = [LAMBDA, '.', '(', ')']

function get_children_names(node) {
  let children;
  if (node.type === 'Lambda') {
    children = ['content']
  } else if (node.type === 'Application') {
    children = ['left', 'right']
  } else if (node.type === 'Variable') {
    children = []
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
  return children;
}

function draw() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.fillStyle = "white";
	ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.font = font_size + "px monospace";





  draw_thing(palette.blue,100,100,ctx.measureText(work_string).width,font_height)

  ctx.fillStyle = "black";
  let lines = work_string.split('\n')
  for(let i = 0; i < lines.length; i++){
      ctx.fillText(lines[i], 100, font_height_upper + 100 + (font_height + 10)*i);
  }
  if (anim_counter % 40 <= 19) {
	   ctx.fillRect(100 + ctx.measureText(work_string).width,10,5,font_height)
  }

  try {
    render_ast(parse_lc(work_string),100,700)
  } catch (e) {

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
type_codes["Period"] = [".",""]
type_codes["Enter"] = ["\n","\n"]
type_codes["Semicolon"] = ["",":"]
type_codes["Equal"] = ["=",""]

document.onkeydown = key_pressed;

function parse_lc(str) {
  let reserved_ast_list = {};
  for (let i = 0; i < str.length; i++) {
    while (str[i] === ' ' && i < str.length) i++;
    let reserved_name = '';
    for (i; i < str.length && alphabet.toUpperCase().includes(str[i]); i++) {
      reserved_name += str[i];
    }
    if (reserved_ast_list[reserved_name] !== undefined) {
      i -= reserved_name.length
      reserved_name = ''
    }
    //console.log("RESERVED NAME: |"+reserved_name+"|")
    while (str[i] === ' ' && i < str.length) i++;
    if (reserved_name !== '') {
      if (i < str.length-1 && str[i] === ':' && str[i+1] === '=') {
        i += 2;
      } else {
        throw new Error("Unexpected symbol " + str[i] + " while tokenizing");
      }
    }
    while (str[i] === ' ' && i < str.length) i++;
    let parsable_line;

    let k = i;
    for (k; k < str.length && str[k] !== '\n'; k++);
    if (str[k-1] === '\r') {
      parsable_line = str.slice(i,k-1);
    } else {
      parsable_line = str.slice(i,k);
    }
    i = k;

    if (reserved_name === '') {
      //console.log("FINAL LINE: "+parsable_line);
      console.log(reserved_ast_list);
      let return_val = parse(reserved_ast_list, parsable_line)
      console.log(return_val)
      return return_val;
    } else  {
      //console.log("RESERVED: |"+parsable_line+"|");
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
    } else if (alphabet.includes(str[i]) || alphabet.toUpperCase().includes(str[i])) {
      let thisname = '';
      while(i < str.length && (alphabet.includes(str[i]) || alphabet.toUpperCase().includes(str[i]))) {
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
    //console.log(return_val)
    return return_val;
  } else {
    if (single_char_tokens.includes(stream.tokens[stream.index])) {
      console.log(stream);
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
  while(true){
    let returned_val = normalize_step(new_tree)
    if(returned_val === false){
      break
    } else {
      new_tree = returned_val
    }
    //console.log(with_renamed_variables(new_tree))
    //console.log(print_ast(with_renamed_variables(new_tree)))
    if(!sanity_check(new_tree)){
      throw new Error("Sanity check failed, aborting.");
    }
  }
  return new_tree
}

function normalize_step(node){
  if ( beta_reducable(node) ) {
    return beta_reduce(node);
  } else {
    for(let child of get_children_names(node)){
      let returned_val = normalize_step(node[child]);
      if(returned_val){
        node[child] = returned_val;
        return node;
      }
    }
    return false;
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
    throw new Error("Unrecognized node type: " + node.type);
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
      return (node.binding.preferred_name === name) && (seen.indexOf(node.binding) === -1)
    } else {
      return node.name === name
    }
  } else {
    throw new Error("Unrecognized node type: " + node.type);
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
      } else {
        //this is ok because variables might refer to lambdas outside the subtree
      }
    }
  } else {
    console.log(new_node);
    throw new Error("Unrecognized node type: " + new_node.type);
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
    throw new Error("Unrecognized node type: " + node.type);
  }
}
