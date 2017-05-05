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
  const state = {
    identifiers: {}
  }
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })
  rl.setPrompt('>>> ')
  rl.prompt()
  rl.on('line', lineProcessor(state, rl))
}

function lineProcessor(state, rl) {
  return input => {
    try {
      const {error, match} = Line({input})
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

function runProgram(input, filename='__inputfile__') {
  const {error, match} = Program({input})
  if (error) {
    return console.error('%s: %s', filename, error)
  }
  return match.map(compile).reduce((state, reduce) => reduce(state), {
    identifiers: {}
  })
}