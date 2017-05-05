'use strict'

const willExport = () => ({
  Fail,
  CharIn,
  Exactly,

  Sequence,    
  Or,
  Many,
  OneOrMore: Many,
  ZeroOrMore: read => Many(read, {min: 0}),
  As,  
  Drop,
  $,
})

// Fail(state, message) => (state => state)
//
// Return parser state object representing failure with the input
// denoted by state.
const Fail = (state, message) => Object.assign({}, state,  {
  error: new Error(message)
})

// Exactly(match: String) => (state => state)
//
// Exactly match the specified string.
const Exactly = match => state =>
  state.input.startsWith(match)?
    {input: state.input.slice(match.length), match}
    : Fail(state, `expected ${match}`)

// CharIn(min: Char, max: Char) => (state => state)
//
// Match one character in the open range [min, max].
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

// Sequence(...readers: state => state) => (state => state)
//
// Takes a sequence of readers and reduces over them, starting
// from an undefined match at the current position.
const Sequence = (...readers) => state => {
  state = Object.assign({}, state, {match: undefined})
  for (const read of readers) {
    state = read(state)
    if (state.error) return state
  }
  return state
}

// Or(...alternatives: state => state) => (state => state)
//
// Takes a sequence of alternatives and attempts each of them in
// turn. Returns the first match state to succeed, or the last failure.
const Or = (...alternatives) => state => {
  let error
  for (const attempt of alternatives) {
    const next = attempt(state)
    if (!next.error) return next
    error = next.error
  }
  return {error}
}

// Many(reader: state => state,
//      options: {min, max, reduce, initial}) => (state => state)
//
// Run reader multiple times. By default, min is 1 and max is Infinity,
// so this is equivalent to OneOrMore of the specified reader. Returns
// a state with an array of matches in match, though this can be changed
// by setting the initial and reduce options.
const Many = (
  read,
  {
    min=1,
    max=Infinity,
    reduce=(all, one) => [...all, one],
    initial=() => []
  }={}
) => state => {
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

// As(read: state => state, name: String|Symbol) => (state => state)
//
// Match the specified reader. If it fails, return the error. If
// it succeeds, return a state whose match contains the current
// match, along with a new key of `name` and a value of the match.
//
// Best used with Sequence.
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

// Drop(read: state => state) => (state => state)
//
// Run a reader and drop the result. On a successful match, only the parser's
// positon is changed.
const Drop = read => state => {
  const next = read(state)
  if (next.error) return next
  return {
    input: next.input,
    match: state.match,
  }
}

// $(read: state => state) => (state => state)
//
// Run a reader and convert the resulting match to a string.
const $ = read => state => {
  const next = read(state)
  if (next.error) return next
  console.log(state.match)
  return {
    input: next.input,
    match: next.match && next.match.join('')
  }
}

module.exports = willExport()