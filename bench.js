const { ldexp: old } = require('@stdlib/math-base-special-ldexp')
const { frexp, ldexp } = require('./dist/ddsketch/math')

for (let i = 0; i < 2e7; i++) {
    // frexp(0.02336)
    ldexp(0.5, 3)
}
