'use strict'

const debug = require('debug')('compile')
    , {List, Map, Record, fromJS} = require('immutable')

const reducers = {
  '*': (acc, rhs) => acc * rhs,
  '/': (acc, rhs) => acc / rhs,
  '+': (acc, rhs) => acc + rhs,
  '-': (acc, rhs) => acc - rhs,
  'mod': (acc, rhs) => acc % rhs,
}

const value = state => state.get('value')
    , mem = id => ['memory', id]

const evaluators = {
  Identifier({identifier}) {
    return (state=State()) => state.set('value', state.getIn(mem(identifier)))
  },

  Assignment({lhs: {identifier}, rhs}) {
    return (state=State()) => state.setIn(mem(identifier),
      value(this.compile(rhs)(state)))
  },

  Literal({sign, digits}) {
    return (state=State()) => state.set('value',
      +`${sign}${digits}`)
  },

  Aggregate(
    {first, rest},
    initial=this.compile(first),
    nodes=rest.map(({operator, rhs}) => ({
      operator,
      eval: this.compile(rhs)
    }))
  ) {
    return (state=State()) => state.set('value',
      nodes.reduce((acc, node) =>
        reducers[node.operator](acc, value(node.eval(state))),
        value(initial(state))
      ))
  },

  Program({lines}) {
    return (state=State()) => lines.map(line => this.compile(line, state))
      .reduce((state, reduce) => reduce(state), state)
  },

  Noop() { return state => state }
}

const State = Record({
  memory: Map(),
  value: undefined,
})

class Calculation {
  constructor(cache=Map()) {
    this.cache = cache
  }

  compile(ast) {
    const {type} = ast
        , key = fromJS(ast)
        , hit = this.cache.get(key)
    if (hit) {
      debug('cache hit for key', key)
      return hit
    }
    if (type in evaluators) {
      const calculation = evaluators[type].call(this, ast)
      this.cache = this.cache.set(key, calculation)
      return calculation
    }
    console.error('invalid type: %s', type)    
    return this
  }
}

const compile = module.exports = (ast, calc=new Calculation()) => calc.compile(ast)
module.exports.Calculation = Calculation
