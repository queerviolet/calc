'use strict'

// A little calculator.

const readline = require('readline')
    , debug = require('debug')
    , trace = {
      ast: debug('calc:ast'),
    }
    , fs = require('fs')
    , compile = require('./compile')
    , {Program, Line} = require('./grammar')

if (module === require.main) { main(process.argv) }

function main([_node, _self, file]) {
  // If a file was given at the command line, run it.
  if (file) {
    return fs.readFile(file, (err, ok) => err
      ? console.error('%s: %s', file, err)
      : print(runProgram(ok.toString())))
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
      trace.ast(JSON.stringify(match, 0, 2))
      state = compile(match)(state)
      print(state)
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
  return compile(match)()
}

function print(state) {
  console.log('value:', state.get('value'), '\tmem:', state.get('memory').toJS(), state.get('cache', []).length)
}