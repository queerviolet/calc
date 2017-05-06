'use strict'

// A little calculator.

const readline = require('readline')
    , fs = require('fs')
    , compile = require('./compile')
    , {Program, Line} = require('./grammar')

// const ast = Program({input: 'x = 4\nx + 2'}).match
// console.log('parse tree', JSON.stringify(ast, 0, 2))
// const program = ast.map(compile).reduce((prior, func) => state => func(prior(state)))
// console.log(program())

if (module === require.main) { main(process.argv) }

function main([_node, _self, file]) {
  // If a file was given at the command line, run it.
  if (file) {
    return fs.readFile(file, (err, ok) => err
      ? console.error('%s: %s', file, err)
      : console.log(runProgram(ok.toString())))
  }

  // Interactive mode.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.setPrompt('>>> ')
  rl.prompt()
  rl.on('line', repl(rl))
}

function repl(rl, state=undefined) {
  return input => {
    try {
      const {input: noise, match, error} = Line({input})
      if (noise) console.error('Warning: ignoring noise at end of line: "%s"', noise)
      if (error) return console.error(error)
      console.log('----- <AST> -----')
      console.log(JSON.stringify(match, 0, 2))
      console.log('----- </AST> -----')
      state = compile(match)(state)
      console.log(state)
    } finally {
      rl.prompt()
    }
  }
}

const trace = state => (console.log(state), state)

function runProgram(input, filename='__inputfile__') {
  const {error, match} = Program({input})
  if (error) {
    return console.error('%s: %s', filename, error)
  }
  return compile(match)()
}