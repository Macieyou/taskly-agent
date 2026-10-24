import ts from 'typescript';

function structure(node) {
  const children = [];
  ts.forEachChild(node, child => { children.push(structure(child)); });
  return [node.kind, typeof node.text === 'string' ? node.text : null, children];
}
function parse(file, text) {
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  if (source.parseDiagnostics.length) throw new Error(`Invalid TypeScript test syntax: ${file}`);
  return source;
}
function statements(source) {
  return source.statements.map(statement => JSON.stringify(structure(statement)));
}

export function validateTestIntegrity(file, content, original) {
  const source = parse(file, content);
  let assertions = 0;
  const visit = node => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) throw new Error('Generated tests must not use any');
    if (ts.isPropertyAccessExpression(node) && ['skip', 'skipIf', 'only', 'todo', 'runIf'].includes(node.name.text)) {
      throw new Error('Conditional, skipped or focused test execution is not allowed');
    }
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'expect') assertions++;
    ts.forEachChild(node, visit);
  };
  visit(source);
  if (!assertions) throw new Error('Generated test file must contain assertions');
  if (!original) return;
  const before = statements(parse(file, original));
  const after = statements(source);
  let cursor = 0;
  for (const statement of before) {
    const index = after.indexOf(statement, cursor);
    if (index === -1) throw new Error(`Existing test statements must be preserved: ${file}`);
    cursor = index + 1;
  }
}
