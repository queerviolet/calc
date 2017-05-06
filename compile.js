'use strict'

const debug = require('debug')('compile')
    , {List, Map, Record, fromJS} = require('immutable')

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
  },

  Noop() { return state => state }
}

const State = Record({
  memory: Map(),
  value: undefined,
})

const JSValueFunction = value => new Function(`return ${value}`)
const tr = val => (debug(val), val)

const compilers = {
  Identifier({identifier}) {
    return this.set('run',
      (state=State()) => state.set('value', state.memory.get(identifier)))
  },

  Assignment({lhs: {identifier}, rhs}) {
    const rhsCalc = this.compile(rhs)
    return rhsCalc.set('run',
      (state=State()) => state.setIn(
        mem(identifier),
        rhsCalc.run(state).value))
  },

  Literal({sign, digits}) {
    const value = +`${sign}${digits}`
    return this.set('run',
      (state=Map()) => state.set('value', value))
  },

  Aggregate(
    {first, rest},
    initialCalculation=this.compile(first),
    nodes=rest.reduce((lhs, {operator, rhs}) => lhs.push({
      operator,
      calc: lhs.last().calc.compile(rhs),
    }), List([{operator: '+', calc: initialCalculation}]))
  ) {
    return nodes.last().calc.set('run',
      (state=State()) =>
        state.set('value',
          nodes.reduce((acc, node) => {
            const {operator, calc} = node
                , reduce = reducers[operator]
            return reduce(acc, calc.run(state).value)
          },
          0
        )))
  },

  Program({lines}) {
    const program = lines.reduce(
      (prior, next) => prior.push({
        statement: prior.last().statement.compile(next)
      }),
      List([{statement: this}]))
    return program.last().statement.set('run',
      (state=State()) => program.reduce(
        (state, {statement}) => {
          return statement.run(state)
        },
        state)
    )
  }  
}

class Calculation extends Record({cache: Map(), run: evaluators.Noop()}) {
  compile(ast) {
    const {type} = ast
        , key = fromJS(ast)
        , hit = this.cache.get(key)
    if (hit) {
      debug('cache hit for key', key)
      return hit
    }
    if (type in compilers) {
      const calculation = compilers[type].call(this, ast)
      return calculation.set('cache',
        this.cache.merge(calculation.cache).set(key, calculation))
    }
    console.error('invalid type: %s', type)    
    return this
  }
}

const compile = module.exports = (ast, calc=new Calculation()) => calc.compile(ast)
module.exports.Calculation = Calculation

// const compile = module.exports = (ast, state=Map()) => {
//   const key = cacheKey(ast)
//       , cached = state.getIn(key)
//   debug('%s: cache lookup', key)
//   if (cached) {
//     debug('%s: cache hit', key)
//     return cached
//   }

//   if (ast.type in evaluators) {
//     const evaluator = evaluators[ast.type](ast)
//     return (rtState=state) =>
//       evaluator(rtState.setIn(key, evaluator))
//   }
//   console.error('unknown type', ast.type, 'at node', ast)
//   return state => state
// }
