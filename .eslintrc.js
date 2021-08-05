module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint'],
    env: {
        jest: true
    },
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
        'prettier',
        'prettier/@typescript-eslint',
        'plugin:prettier/recommended'
    ],
    rules: {
        'prettier/prettier': [
            'error',
            {
              'endOfLine': 'auto'
            }
        ]
    }
};
