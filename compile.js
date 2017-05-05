'use strict'

const reducers = {
  '*': (acc, rhs) => acc * rhs,
  '/': (acc, rhs) => acc / rhs,
  '+': (acc, rhs) => acc + rhs,
  '-': (acc, rhs) => acc - rhs,
}

const evaluators = {
  Identifier({identifier}) {
    return ({identifiers}={}) => ({ identifiers, value: identifiers[identifier] })
  },

  Assignment({lhs: {identifier}, rhs}) {
    return (state={}) => ({
      identifiers: Object.assign({}, state.identifiers || {}, {
        [identifier]: compile(rhs)(state).value
      })
    })
  },

  Literal({sign, digits}) {
    return ({identifiers}={}) => ({
      identifiers,
      value: +`${sign}${digits}`
    })
  },

  Aggregate(
    {first, rest},
    initial=compile(first),
    nodes=rest.map(({operator, rhs}) => ({
      operator,
      eval: compile(rhs)
    }))
  ) {
    return (state={identifiers: {}}) => ({
      identifiers: state.identifiers,
      value: nodes.reduce((acc, node) =>
        reducers[node.operator](acc, node.eval(state).value),
        initial(state).value
      )
    })
  }
}

const compile = module.exports = ast => {
  if (ast.type in evaluators)
    return evaluators[ast.type](ast)
  console.error('unknown type', ast.type, 'at node', ast)
  return state => state
}
