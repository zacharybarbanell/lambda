# JS Visual Lambda Calculus
### By Zachary Barbanell and Ryan Quisenbery

## Running the Script

Simply run index.html in your browser and enter input to the working string.
You can use the backslash \'\\\' character to type a lambda λ. Use appropriate
formatting such as parentheses and spacing (though spacing should be forgiving)
and assign reserved variables as all capital letter words followed by an
assignment symbol \':=\'.

## Inputting a .lc File

If you have a .lc text file (included in the project under tests), you can drag
and drop the file into the open window and the text will automatically be
transferred to the working string. Note that the first line to not have an
assignment symbol \':=\' will be the line to be parsed, no lines after such a
line will be parsed by the parser.

## Parsing

To parse the code simply hit the tilde \'\`\' character on your keyboard and 
the code will parse your Lambda Calculus for you. If no visual representation 
of the working string appears on your screen double check that the string can 
be parsed.

## Normalizing

To normalize the parsed expression press '1'. This may take some time (Lambda
Calculus is not the most efficient algorithm - Zach). If it does not seem that
the expression is normalzing, assert that your expression has a normal form.

## Current Issues

Visually the interpreter needs some work often overlapping the visual parser
with the input text. Additionally the type cursor does not follow the text at
present. We hope to fix these and a number of other minor visual issues in
later iterations of the code.
