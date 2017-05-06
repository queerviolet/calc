'use strict'

const debug = require('debug')('compile')
    , {Map, fromJS} = require('immutable')

const reducers = {
  '*': (acc, rhs) => acc * rhs,
  '/': (acc, rhs) => acc / rhs,
  '+': (acc, rhs) => acc + rhs,
  '-': (acc, rhs) => acc - rhs,
}

const value = state => state.get('value')
    , mem = id => ['memory', id]

const evaluators = {
  Identifier({identifier}) {
    return (state=Map()) => state.set('value', state.getIn(mem(identifier)))
  },

  Assignment({lhs: {identifier}, rhs}) {
    return (state=Map()) => state.setIn(mem(identifier),
      value(compile(rhs)(state)))
  },

  Literal({sign, digits}) {
    return (state=Map()) => state.set('value',
      +`${sign}${digits}`)
  },

  Aggregate(
    {first, rest},
    initial=compile(first),
    nodes=rest.map(({operator, rhs}) => ({
      operator,
      eval: compile(rhs)
    }))
  ) {
    return (state=Map()) => state.set('value',
      nodes.reduce((acc, node) =>
        reducers[node.operator](acc, value(node.eval(state))),
        value(initial(state))
      ))
  },

  Program({lines}) {
    return (state=Map()) => lines.map(line => compile(line, state))
      .reduce((state, reduce) => reduce(state), state)
  }
}

const cacheKey = ast => ['cache', fromJS(ast)]
const compile = module.exports = (ast, state=Map()) => {
  const key = cacheKey(ast)
      , cached = state.getIn(key)
  debug('%s: cache lookup', key)
  if (cached) {
    debug('%s: cache hit', key)
    return cached
  }

  if (ast.type in evaluators) {
    const evaluator = evaluators[ast.type](ast)
    return (rtState=state) =>
      evaluator(rtState.setIn(key, evaluator))
  }
  console.error('unknown type', ast.type, 'at node', ast)
  return state => state
}
