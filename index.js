'use strict'

// A little calculator.

const readline = require('readline')
    , compile = require('./compile')
    , {Program, Line} = require('./grammar')

const ast = Program({input: 'x = 4\nx + 2'}).match
console.log('parse tree', JSON.stringify(ast, 0, 2))
const program = ast.map(compile).reduce((prior, func) => state => func(prior(state)))
console.log(program())
