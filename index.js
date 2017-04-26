'use strict'

function Sequence(...readers) {
  return state => {
    for (const read of readers) {
      state = read(state)
      if (state.error) return state
    }
    return state
  }
}

function Or(...alternatives) {
  return state => {
    let error
    for (const attempt of alternatives) {
      const next = attempt(state)
      if (!next.error) return next
      error = next.error
    }
    return {error}
  }
}

function Many(
  read,
  {
    min=1,
    max=Infinity,
    reduce=(all, one) => [...all, one],
    initial=() => []
  }={}
) {
  return state => {
    let match = initial()
      , count = 0
      , next
    while (!state.error && count < max) {
      next = read(state)
      if (next.error) break
      match = reduce(match, next.match)
      console.log(match)
      ++count
      state = next
    }
    if (count < min) {
      return next
    }
    return Object.assign({}, state, {match})
  }
}

const OneOrMore = Many
    , ZeroOrMore = read => Many(read, {min: 0})

const Fail = (state, message) => Object.assign({}, state,  {
  error: new Error(message)
})

const Exactly = match => state =>
  state.input.startsWith(match)?
    {input: state.input.slice(match.length), match}
    : Fail(state, `expected ${match}`)

const CharIn = (min, max) => {
  const minCh = min.charCodeAt(0)
      , maxCh = max.charCodeAt(0)
  return state => {
    const match = state.input[0]
    if (!match) return Fail(state, `Unexpected end of input`)
    const inCh = match.charCodeAt(0)
    if (inCh >= minCh && inCh <= maxCh) {
      return {
        input: state.input.slice(1),
        match
      }
    }
    return Fail(state, `${match}: expected ${min} to ${max}`)
  }
}

const As = (read, name) => state => {
  const next = read(state)
  if (next.error) return next
  return {
    input: next.input,
    match: Object.assign({}, state.match, {
      [name]: next.match
    })
  }
}
  
const Drop = read => state => {
  const next = read(state)
  if (next.error) return next
  return {
    input: next.input,
    match: state.match,
  }
}

const $ = read => state => {
  const next = read(state)
  if (next.error) return next
  console.log(state.match)
  return {
    input: next.input,
    match: next.match && next.match.join('')
  }
}

const Identifier = $(OneOrMore(CharIn('a', 'z')))
    , __ = Drop(ZeroOrMore(Or(Exactly(' '), Exactly('\n'))))
    , AdditiveTerm = As(Sequence(__
        , As(Identifier, 'lhs'), __
        , Drop(Or(Exactly('+'), Exactly('-'))), __
        , As(Identifier, 'rhs'), __
      ), 'Sum')
    , Expression = Many(Or(AdditiveTerm, Identifier), {min: 1, max: 1})
    , Assignment = As(Sequence(__, As(Identifier, 'lhs'), __, Drop(Exactly('=')), __, As(Expression, 'rhs'), __), 'Assignment')

    , Start = OneOrMore(Or(Assignment, Expression))

console.log(JSON.stringify(Start({input: 'x = y\nx + z'}), 0, 2))

module.exports = {Many, CharIn, Start, Assignment, Expression}