'use strict'

// A simple calculator grammar.

const {
        Sequence
      , Exactly
      , CharIn
      , Or
      , Many
      , OneOrMore
      , ZeroOrMore
      , Fail
      , As
      , Drop
      , $
    } = require('./parse')

const __ = Drop(ZeroOrMore(Or(Exactly(' '))))
    , Optional = read => Many(read, {min: 0, max: 1})
    , Identifier = Sequence(__
        , As($(OneOrMore(CharIn('a', 'z'))), 'identifier')
        , state => Object.assign({}, state, {
          match: Object.assign({type: 'Identifier'}, state.match)
        }))
    , Digit = CharIn('0', '9')
    , Sign = Optional(Exactly('-'))
    , Literal = Sequence(__
        , As(Sign, 'sign')
        , As($(Many(Digit)), 'digits')
        , state => Object.assign({}, state, {
          match: Object.assign({type: 'Literal'}, state.match)
        })
    )
    , Parenthesized = Sequence(__
      , Drop(Exactly('(')), __
      , state => Expression(state), __
      , Drop(Exactly(')')), __
    )
    , Primary = Or(Parenthesized, Identifier, Literal)
    , InfixOperatorPrecedenceGroup = (
        type, [...operators], NextPrecedenceGroup=Primary) =>
        Or(Sequence(__
              , As(NextPrecedenceGroup, 'first'), __
              , As(
                  OneOrMore(Sequence(
                      As(Or(...operators.map(Exactly)), 'operator'), __
                    , As(NextPrecedenceGroup, 'rhs'), __
                  )),
                  'rest')
              , state => Object.assign({}, state, {
                match: Object.assign({type}, state.match)
              })        
            )
            , NextPrecedenceGroup)
    , Multiplicative = InfixOperatorPrecedenceGroup('Aggregate', ['*', '/', 'mod'])
    , Additive = InfixOperatorPrecedenceGroup('Aggregate', ['+', '-'], Multiplicative)
    , Expression = Or(Additive, Multiplicative, Primary)
    , Assignment = Sequence(__
        , As(Identifier, 'lhs'), __
        , Drop(Exactly('=')), __
        , As(Expression, 'rhs'), __
        , state => Object.assign({}, state, {
          match: Object.assign({type: 'Assignment'}, state.match)
        })
      )
    , Line = Or(Assignment, Expression)
    , Newlines = Drop(ZeroOrMore(Exactly('\n')))
    , Program = Sequence(
        OneOrMore(Sequence(Newlines, Line, Newlines)),
        state => Object.assign({}, state, {
          match: { type: 'Program', lines: state.match }
        })
      )

if (module === require.main) {
  const input = `
    x = -2 * y
    x * z + k
    f+n
  `
  console.log(JSON.stringify(Program({input}), 0, 2))
}

module.exports = {Line, Program}