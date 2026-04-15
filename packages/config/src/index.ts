export const eslint = {
  extends: ['@gam/eslint-config'],
  root: true,
  ignorePatterns: ['dist/', '.next/', 'target/'],
};

export const prettier = {
  semi: true,
  singleQuote: true,
  tabWidth: 2,
  trailingComma: 'es5',
  printWidth: 100,
};

export const tsconfig = {
  compilerOptions: {
    target: 'ES2020',
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    moduleResolution: 'bundler',
    strict: true,
    esModuleInterop: true,
    skipLibCheck: true,
    forceConsistentCasingInFileNames: true,
    isolatedModules: true,
    jsx: 'react-jsx',
  },
};