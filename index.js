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

const Identifier = $(OneOrMore(CharIn('a', 'z')))
    , __ = Drop(ZeroOrMore(Or(Exactly(' '))))
    , InfixOperatorPrecedenceGroup = (type, [...operators], NextPrecedenceGroup=Identifier) => Sequence(__
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
    // , AdditiveTerm = Sequence(__
    //     , As(Identifier, 'first'), __
    //     , As(
    //         OneOrMore(Sequence(
    //             As(Or(Exactly('+'), Exactly('-')), 'operator'), __
    //           , As(Identifier, 'rhs'), __
    //         )),
    //         'rest')
    //     , state => Object.assign({}, state, {
    //       match: Object.assign({type: 'Add'}, state.match)
    //     })        
    //   )
    , AdditiveTerm = InfixOperatorPrecedenceGroup('additive', ['+', '-'])
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

console.log(JSON.stringify(Start({input: 'x = y\nx + z + k\nf+n\n'}), 0, 2))

module.exports = {Many, CharIn, Start, Assignment, Expression}