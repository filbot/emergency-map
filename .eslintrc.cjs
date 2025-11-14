module.exports = {
    root: true,
    env: {
        browser: true,
        es2022: true
    },
    extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true
        }
    },
    plugins: ['react', 'react-refresh'],
    settings: {
        react: {
            version: 'detect'
        }
    },
    rules: {
        'react/jsx-uses-react': 'off',
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        'react-refresh/only-export-components': ['warn', { allowConstantExport: true }]
    },
    overrides: [
        {
            files: ['*.config.js', '*.config.cjs'],
            env: {
                node: true
            }
        }
    ]
};
