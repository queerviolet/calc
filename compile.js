'use strict'

const debug = require('debug')('compile')
    , debugCache = require('debug')('compile:cache')
    , {List, Map, Record, fromJS} = require('immutable')

const reducers = {
  '*': (acc, rhs) => acc * rhs,
  '/': (acc, rhs) => acc / rhs,
  '+': (acc, rhs) => acc + rhs,
  '-': (acc, rhs) => acc - rhs,
  'mod': (acc, rhs) => acc % rhs,
}

const mem = id => ['memory', id]

const evaluators = {
  Identifier({identifier}) {
    return (state=State()) => state.set('value', state.getIn(mem(identifier)))
  },

  Assignment({lhs: {identifier}, rhs}) {
    const rhs_ = this.compile(rhs)
    return (state=State()) => state.setIn(mem(identifier), rhs_(state).value)
  },

  Literal({sign, digits}) {
    return (state=State()) => state.set('value',
      +`${sign}${digits}`)
  },

  Aggregate(
    {first, rest},
    initial=this.compile(first),
    operations=rest.map(({operator, rhs}) => ({
      operator,
      rhs: this.compile(rhs)
    }))
  ) {
    return (state=State()) => state.set('value',
      operations.reduce((lhs, {operator, rhs}) =>
        reducers[operator](lhs, rhs(state).value),
        initial(state).value
      ))
  },

  Program({lines}) {
    const program = lines.map(line => this.compile(line))
    return (state=State()) =>
      program.reduce((state, reduce) => reduce(state), state)
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
      debugCache('hit for key', key)
      return hit
    }
    if (type in evaluators) {
      debug('compiling %s node', type)
      const calculation = evaluators[type].call(this, ast)
      this.cache = this.cache.set(key, calculation)
      debugCache('inserted key', key)
      return calculation
    }
    debug('invalid type: %s', type)
    return this
  }
}

const compile = module.exports = (ast, calc=new Calculation()) => calc.compile(ast)
module.exports.Calculation = Calculation
