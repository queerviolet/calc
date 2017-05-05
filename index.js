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
    , IdentifierOrLiteral = Or(Identifier, Literal)
    , InfixOperatorPrecedenceGroup = (
        type, [...operators], NextPrecedenceGroup=IdentifierOrLiteral) =>
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
    , MultiplicativeTerm = InfixOperatorPrecedenceGroup('mul', ['*', '/'])
    , AdditiveTerm = InfixOperatorPrecedenceGroup('add', ['+', '-'], MultiplicativeTerm)
    , Expression = Or(AdditiveTerm, Identifier)
    , Assignment = Sequence(__
        , As(Identifier, 'lhs'), __
        , Drop(Exactly('=')), __
        , As(Expression, 'rhs'), __
        , state => Object.assign({}, state, {
          match: Object.assign({type: 'Assignment'}, state.match)
        })
      )

    , Start = ZeroOrMore(Sequence(Or(Assignment, Expression), Drop(ZeroOrMore(Exactly('\n')))))

console.log(JSON.stringify(Start({input: 'x = -2 * y\nx * z + k\nf+n\n'}), 0, 2))

module.exports = {Many, CharIn, Start, Assignment, Expression}