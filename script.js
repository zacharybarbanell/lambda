'use strict'; //this line makes JS stop you from doing dumb things you don't want to do - must be above ALL other statements

let canvas = document.getElementById("myCanvas");
let ctx = canvas.getContext("2d");

let palette = {};

palette.blue = {};
palette.blue.light = "#6C6AC3";
palette.blue.dark = "#704BC9";
palette.yellow = {};
palette.yellow.light = "#FFCF6B";
palette.yellow.dark = "#FFB969";
palette.green = {};
palette.green.light = "#66A771";
palette.green.dark = "#4F8D73";
palette.purple = {};
palette.purple.light = "#9E46B7";
palette.purple.dark = "#8C34B8";

let extra_node_properties = ["depth_memo","width_memo"];

function clean_ast(node) {
  for (let property of extra_node_properties) {
    delete node[property];
  }
  for (let child of get_children_names(node)) {
    clean_ast(node[child]);
  }
}


function sanity_check(node) {
  if (node.type === 'Variable' && node.bound) {
    let looking_at = node.parent;
    while (looking_at !== null) {
      if (looking_at === node.binding) {
        break;
      }
      looking_at = looking_at.parent;
    }
    return looking_at !== null;
  } else {
    let return_val = true;
    for (let child of get_children_names(node)) {
      return_val = return_val && sanity_check(node[child]) && node[child].parent === node;
    }
    return return_val;
  }
}



let arc_param = 1.0; //range: 0-inf, higher number is flatter
let vertical_clearance = 4;
let horizontal_clearance = vertical_clearance * arc_param; //could be bigger
let text_horizontal_clearance = 0; //could be bigger
let apply_clearance = 20;
let stroke_width = 2;
let font_size = 24;
ctx.font = font_size + "px monospace";
let metrics = ctx.measureText('.');
let font_height_lower = metrics.fontBoundingBoxDescent;
let font_height_upper = metrics.fontBoundingBoxAscent;
let font_height = font_height_lower + font_height_upper;

function draw_thing(color_scheme,x,y,width,height) {
  ctx.lineWidth = 2 * stroke_width;
  ctx.strokeStyle = color_scheme.dark;
  ctx.fillStyle = color_scheme.light;
  ctx.beginPath();
  let angle = Math.atan2(1,arc_param);
  let radius = Math.sqrt((height/2)**2+(height*arc_param/2)**2);
  ctx.arc(x + width - height * arc_param/2,y + height * 0.5, radius, 0 - angle, angle);
  ctx.arc(x + height * arc_param/2,y + height * 0.5, radius, Math.PI - angle, Math.PI + angle);
  ctx.arc(x + width - height * arc_param/2,y + height * 0.5, radius, 0 - angle, angle);
  ctx.stroke();
  ctx.rect(x,y + ctx.lineWidth * 0.5,width,height  - ctx.lineWidth);
  ctx.fill();
}

function get_depth(node) { //this would be a cute oneliner in python but we can't have nice things I guess
  if (node.depth_memo !== undefined) {
    return node.depth_memo;
  }
  let max_seen = 0;
  for (let child of get_children_names(node)) {
    let new_val = 1 + get_depth(node[child]);
    if (new_val > max_seen) {
      max_seen = new_val;
    }
  }
  if (node.collapsed_name !== undefined) {
    max_seen = 0;
  }
  node.depth_memo = max_seen;
  return max_seen;
}

function calc_height(depth) {
  return font_height + depth*vertical_clearance*2;
}

function calc_excess_width(height) {
  return Math.sqrt((height/2)**2 + (arc_param*height/2)**2) - (arc_param*height/2);
}

function get_render_width(node) {
  if (node.width_memo !== undefined) {
    return node.width_memo;
  }
  let return_val;
  if (node.collapsed_name !== undefined) {
    return_val = ctx.measureText(node.collapsed_name).width;
  } else if (node.type === 'Lambda') {
    return_val = ctx.measureText(LAMBDA + node.preferred_name + '.').width +
      text_horizontal_clearance +
      calc_excess_width(calc_height(get_depth(node.content))) +
      get_render_width(node.content) +
      horizontal_clearance;
    // return 2 * horizontal_clearance + ctx.measureText(LAMBDA + node.preferred_name + '.').width + get_render_width(node.content)
  } else if (node.type === 'Application') {
    return_val = horizontal_clearance +
    get_render_width(node.left) +
    calc_excess_width(calc_height(get_depth(node.left))) +
    apply_clearance +
    calc_excess_width(calc_height(get_depth(node.right))) +
    get_render_width(node.right) +
    horizontal_clearance;
    // return 2 * horizontal_clearance + apply_clearance + get_render_width(node.left) + get_render_width(node.right)
  } else if (node.type === 'Variable') {
    return_val = text_horizontal_clearance +
    ctx.measureText(node.binding.preferred_name).width +
    text_horizontal_clearance;
    // return 2 * horizontal_clearance + ctx.measureText(node.binding.preferred_name).width
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
  node.width_memo = return_val;
  return return_val;
}

function get_color(node) {
  if (node.collapsed_name !== undefined) {
    return palette.purple;
  } else if (node.type === 'Lambda') {
    return palette.yellow;
  } else if (node.type === 'Application') {
    return palette.blue;
  } else if (node.type === 'Variable') {
    return palette.green;
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
}

function get_ast_boxes(node, left_x, mid_y) {
  let depth = get_depth(node);
  let width = get_render_width(node);
  let color = get_color(node);
  let this_box = {};
  let top = mid_y-font_height_upper-vertical_clearance*depth;
  let height = font_height+depth*vertical_clearance*2;
  this_box.thing = [color, left_x,top,width,height];
  this_box.node_type = node.type;
  this_box.text_height = mid_y;
  this_box.node = node;
  if (node.collapsed_name !== undefined) {
    this_box.collapsed_name = node.collapsed_name;
    this_box.children = [];
  } else if (node.type === 'Lambda') {
    this_box.text = LAMBDA + node.preferred_name + '.';

    this_box.children = [get_ast_boxes(node.content,left_x + ctx.measureText(LAMBDA + node.preferred_name + '.').width
                                                           + text_horizontal_clearance
                                                           + calc_excess_width(calc_height(get_depth(node.content))), mid_y)];
  } else if (node.type === 'Application') {
    this_box.middle = left_x + horizontal_clearance
                             + get_render_width(node.left)
                             + calc_excess_width(calc_height(get_depth(node.left)))
                             + apply_clearance/2;
    this_box.children = [
      get_ast_boxes(node.left, left_x + horizontal_clearance, mid_y),
      get_ast_boxes(node.right, left_x + horizontal_clearance
                                       + get_render_width(node.left)
                                       + calc_excess_width(calc_height(get_depth(node.left)))
                                       + apply_clearance
                                       + calc_excess_width(calc_height(get_depth(node.right))),
                                       mid_y)];
  } else if (node.type === 'Variable') {
    this_box.text = node.binding.preferred_name;
    this_box.children  = [];
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
  return this_box;
}

function render_ast_boxes(box) {
  draw_thing(...box.thing);
  if (box.collapsed_name !== undefined) {
    ctx.fillStyle = "black";
    ctx.fillText(box.collapsed_name, box.thing[1], box.text_height);
  } else if (box.node_type === 'Application') {
    ctx.lineWidth = stroke_width;
    ctx.beginPath();
    ctx.moveTo(box.middle, box.thing[2]);
    ctx.lineTo(box.middle, box.thing[2] + box.thing[4]);
    ctx.stroke();
  } else if (box.node_type === 'Lambda') {
    ctx.fillStyle = "black";
    ctx.fillText(box.text, box.thing[1], box.text_height);
  } else if (box.node_type === 'Variable') {
    ctx.fillStyle = "black";
    ctx.fillText(box.text, box.thing[1], box.text_height);
  }
  for (let child of box.children) {
    render_ast_boxes(child);
  }
}

function find_containing_box(x,y,box) {
  let x_left = box.thing[1];
  let x_right = x_left + box.thing[3];
  let y_top = box.thing[2];
  let y_bottom = y_top + box.thing[4];
  let in_box;
  if (y < y_top || y > y_bottom) {
    in_box = false;
  } else if (x >= x_left && x <= x_right) {
    in_box = true;
  } else {
    let center_y = (y_top + y_bottom) / 2;
    let left_center_x = x_left + arc_param * (center_y - y_top);
    let right_center_x = x_right - arc_param * (center_y - y_top);
    if (x < x_left && Math.sqrt((x - left_center_x)**2 + (y - center_y)**2) < Math.sqrt((x_left - left_center_x)**2 + (y_top - center_y)**2)) {
      in_box = true;
    } else if ( x > x_right && Math.sqrt((x - right_center_x)**2 + (y - center_y)**2) < Math.sqrt((x_right - right_center_x)**2 + (y_top - center_y     )**2)) {
      in_box = true;
    } else {
      in_box = false;
    }
  }
  if (in_box) {
    for (let child of box.children) {
      let v = find_containing_box(x,y,child);
      if (v !== null) {
        return v;
      }
    }
    return box.node;
  } else {
    return null;
  }
}


window.addEventListener("load", _e => {
  window.dispatchEvent(new Event('resize'));
  window.requestAnimationFrame(draw);
});

let anim_counter = 0;
let work_string = "";
let work_tree = null;
let LAMBDA = "λ";
let single_char_tokens = [LAMBDA, '.', '(', ')'];

// HELPER FUNCTION
// get a nodes children as a list of strings
function get_children_names(node) {
  let children;
  if (node.type === 'Lambda') {
    children = ['content'];
  } else if (node.type === 'Application') {
    children = ['left', 'right'];
  } else if (node.type === 'Variable') {
    children = [];
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
  ctx.fillStyle = "black";
  let lines = work_string.split('\n');
  for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 100, font_height_upper + 100 + (font_height + 10)*i);
  }
  if (anim_counter % 40 <= 19) {
	   ctx.fillRect(100 + ctx.measureText(work_string).width,10,5,font_height);
  }
  if (work_tree !== null) {
    clean_ast(work_tree);
    let boxes = get_ast_boxes(work_tree,100,700);
    render_ast_boxes(boxes);
    if (wasButtonPressed("left")) {
      let clicked_node = find_containing_box(mouse.x, mouse.y, boxes);
      if (clicked_node !== null) {
        if (clicked_node.collapsed_name !== undefined) {
          delete clicked_node.collapsed_name;
        } else {
          clicked_node.collapsed_name = '...';
        }
      }
    }
  }

  anim_counter += 1;
  mouse_prev = Object.assign({}, mouse);
	window.requestAnimationFrame(draw);
}

function key_pressed(e) {
	let code = e.code;
	if (code in type_codes) {
    if (code === "Backspace") {
      work_string = work_string.substring(0,work_string.length-1);
    } else if (code === "Backquote") {
      try {
        work_tree = parse_lc(work_string);
      } catch (e) {
        console.log(e); //probably ought to do something with it but idk what
      }
    } else {
      if (e.shiftKey) {
        work_string += type_codes[code][1];
      } else {
        work_string += type_codes[code][0];
      }
    }
	}
}

let type_codes = {};
let alphabet = "abcdefghijklmnopqrstuvwxyz";
for (let i = 0; i < alphabet.length; i++) {
	type_codes["Key" + alphabet[i].toUpperCase()] = [alphabet[i],alphabet[i].toUpperCase()];
}
type_codes["Digit9"] = ["","("];
type_codes["Digit0"] = ["",")"];
type_codes["Backspace"] = [null,null];
type_codes["Backquote"] = [null,null];
type_codes["Backslash"] = [LAMBDA,LAMBDA];
type_codes["Space"] = [" "," "];
type_codes["Period"] = [".",""];
type_codes["Enter"] = ["\n","\n"];
type_codes["Semicolon"] = ["",":"];
type_codes["Equal"] = ["=",""];

document.onkeydown = key_pressed;

function drop_handler(e) {
  e.preventDefault();
  if (e.dataTransfer.items) { //will fail on Internet Explorer but who cares
    if (e.dataTransfer.items.length === 1) { //will fail if multiple files are dropped
      e.dataTransfer.items[0].getAsFile().text().then(s => work_string = s)
    }
  }
}

function drag_over_handler(e) {
  e.preventDefault();
}

// HELPER(parse_lc)
// parse a single line of a .lc file
function parse_lc_line(reserved_ast_list, str) {
  let line = str.split(':=');
  if (line.length === 2) {
    let i = 0;
    let reserved_name = ''
    for (i; i < line[0].length && line[0][i] === ' '; i++);
    for (i; i < line[0].length && alphabet.toUpperCase().includes(line[0][i]); i++) reserved_name += line[0][i];
    for (i; i < line[0].length && line[0][i] === ' '; i++);
    if (i < line[0].length) throw new Error("Unexpected symbol " + str[i] + " while tokenizing");
    i = 0;
    let reserved_ast = '';
    for (i; i < line[1].length && line[1][i] !== '\r'; i++) reserved_ast += line[1][i];
    reserved_ast_list[reserved_name] = parse(reserved_ast_list, reserved_ast);
  } else if (line.length === 1) {
    return parse(reserved_ast_list, line[0]);
  } else {
    throw new Error("Line parse error; too many assignments.");
  }
}

// FUNCTION
// parse a .lc file using parse_lc_line
function parse_lc(str) {
  let lines = str.split('\n');
  let reserved_ast_list = {};
  for (let line of lines) {
    let return_val = parse_lc_line(reserved_ast_list, line);
    if (return_val !== undefined) return return_val;
  }
}

function parse(reserved_ast_list, str) {
  let tokens = [];
  for (let i = 0; i < str.length; i++) {
    if (str[i] === ' ') {
      //pass
    } else if (single_char_tokens.includes(str[i])) {
      tokens.push(str[i]);
    } else if (alphabet.includes(str[i]) || alphabet.toUpperCase().includes(str[i])) {
      let thisname = '';
      while (i < str.length && (alphabet.includes(str[i]) || alphabet.toUpperCase().includes(str[i]))) {
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

function parse_atom(reserved_ast_list, stream, context, parent) {
  if (stream.tokens[stream.index] === '(') {
    stream.index++;
    let return_val = parse_application(reserved_ast_list, stream, {...context}, parent);
    stream.index++;
    return return_val;
  } else if (reserved_ast_list[stream.tokens[stream.index]] !== undefined) {
    let return_val = copy_subtree(reserved_ast_list[stream.tokens[stream.index]]);
    return_val.parent = parent;
    return_val.collapsed_name = stream.tokens[stream.index];
    stream.index++;
    return return_val;
  } else {
    if (single_char_tokens.includes(stream.tokens[stream.index])) {
      throw new Error("Unexpected token " + stream.tokens[stream.index] + " at index " + stream.index + ".");
    }
    if (alphabet.toUpperCase().includes(stream.tokens[stream.index][0])) {
      throw new Error("Unreserved name " + stream.tokens[stream.index] + " at index " + stream.index + ".");
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

function normalized(ast) { //doesn't necesarially halt
  let new_tree = copy_subtree(ast);
  while (true) {
    let returned_val = normalize_step(new_tree);
    if (returned_val === false) {
      break
    } else {
      new_tree = returned_val;
    }
    if (!sanity_check(new_tree)) {
      throw new Error("Sanity check failed, aborting.");
    }
  }
  return new_tree;
}

function normalize_step(node) {
  if (beta_reducable(node)) {
    return beta_reduce(node);
  } else {
    for (let child of get_children_names(node)) {
      let returned_val = normalize_step(node[child]);
      if (returned_val) {
        node[child] = returned_val;
        return node;
      }
    }
    return false;
  }
}

function alpha_equality(node_A, node_B) {
  return rec_alpha_equality(node_A, [], node_B, []);
}

function rec_alpha_equality(node_A, node_list_A, node_B, node_list_B) {
  if (ast_A.type !== ast_B.type) {
    // nodes are different type
    return false;
  } else {
    node_list_A.push(node_A);
    node_list_B.push(node_B);
    if (node_A.type === 'Application') {
      // short circuited recursive equality check
      if (alpha_equality(node_A.left, node_list_A, node_B.left, node_list_B)) {
        return alpha_equality(node_A.right, node_list_A, node_B.right, node_list_B);
      } else {
        return false;
      }
    } else if (node_A.type === 'Lambda') {
      return alpha_equality(node_A.content, node_list_A, node_B.content, node_list_B);
    } else if (node_A.type === 'Variable') {
      if (node_A.bound !== node_B.bound) {
        // one variable is bound the other is not
        return false;
      } else {
        if (node_A.bound) {
          // variables are bound
          for (let i = 0; i < len(node_list_A); i++) {
            if (node_A.binding === node_list_A[i]) {
              if (node_B.binding === node_list_B[i]) {
                // variables have the same binding
                return true;
              } else {
                // variables have different bindings
                return false;
              }
            }
          }
          throw new Error("Bound variable not in ast scope: " + node_A.binding);
        } else {
          // variables are unbound
          return true
        }
      }
    } else {
      throw new Error("Unrecognized node type: " + node_A.type);
    }
  }
}


function beta_reducable(node) {
  return node.type === 'Application' && node.left.type === 'Lambda'
}

function beta_reduce(node) {
  if (!beta_reducable(node)) {
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
  for (const child of children) {
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

function with_renamed_variables(ast) {
  let new_tree = copy_subtree(ast)
  rename_subtree(new_tree)
  return new_tree
}

function rename_subtree(node) {
  if (node.type === 'Application') {
    rename_subtree(node.left)
    rename_subtree(node.right)
  } else if (node.type === 'Lambda') {
    while (find_conflict(node.content,node.preferred_name,[node])) {
        node.preferred_name = rename_variable(node.preferred_name)
    }
    rename_subtree(node.content)
  } else if (node.type === 'Variable') {
    // nothing to do here
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
}

function find_conflict(node, name, seen) {
  if (node.type === 'Application') {
    return find_conflict(node.left, name, seen) || find_conflict(node.right, name, seen);
  } else if (node.type === 'Lambda') {
    if (node.preferred_name === name) {
      seen.push(node);
    }
    return find_conflict(node.content, name, seen);
  } else if (node.type === 'Variable' ) {
    if (node.bound) {
      return (node.binding.preferred_name === name) && (seen.indexOf(node.binding) === -1);
    } else {
      return node.name === name;
    }
  } else {
    throw new Error("Unrecognized node type: " + node.type);
  }
}

// HELPER(rename_subtree)
function rename_variable(name) {
  return name + "'"
}

// WRAPPER(copy_subtree_recursive)
function copy_subtree(node) {
  return copy_subtree_recursive(node, null, [], []);
}

// FUNCTION
// copy an AST subtree
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
      if (i !== -1) new_node.binding = new_terms[i];
    }
  } else {
    throw new Error("Unrecognized node type: " + new_node.type);
  }
  return new_node;
}

// FUNCTION
// print an ast object
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

//stolen boilerplate

window.addEventListener('mousemove', e => _mouseEvent(e));
window.addEventListener('mousedown', e => _mouseEvent(e));
window.addEventListener('mouseup', e => _mouseEvent(e));

function _mouseEvent(e) {
  let rect_thing = canvas.getBoundingClientRect()
  mouse.x = e.clientX - rect_thing.x;
  mouse.y = e.clientY - rect_thing.y;
  mouse.buttons = e.buttons;
  return false;
}

window.addEventListener('wheel', e => {
  let d = e.deltaY > 0 ? 1 : -1;
  return mouse.wheel = d;
});

let mouse = { x: 0, y: 0, buttons: 0, wheel: 0 };
let mouse_prev = Object.assign({}, mouse);

function isButtonDown(b) {
  let i = b == "left" ? 0 : b == "right" ? 1 : 2;
  return (mouse.buttons & (1 << i)) != 0;
}

function wasButtonPressed(b) {
  let i = b == "left" ? 0 : b == "right" ? 1 : 2;
  return ((mouse.buttons & (1 << i)) !== 0) && ((mouse_prev.buttons & (1 << i)) === 0);
}

function wasButtonReleased(b) {
  let i = b == "left" ? 0 : b == "right" ? 1 : 2;
  return ((mouse.buttons & (1 << i)) === 0) && ((mouse_prev.buttons & (1 << i)) !== 0);
}
