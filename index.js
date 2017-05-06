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
      : runProgram(ok.toString()))
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

function repl(rl, state=undefined, calculation=new compile.Calculation()) {
  return input => {
    try {
      const {input: noise, match, error} = Line({input})
      if (noise) console.error('Warning: ignoring noise at end of line: "%s"', noise)
      if (error) return console.error(error)
      trace.ast(JSON.stringify(match, 0, 2))
      calculation = calculation.compile(match)      
      state = calculation.run(state)
      print(state, calculation)
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
  const calculation = compile(match)
  print(calculation.run(), calculation)
}

function print(state, calculation) {
  console.log('value:', state.get('value'), '\tmem:', state.get('memory').toJS())
  if (calculation) console.log('(%s entries in cache)', calculation.cache.size)
}