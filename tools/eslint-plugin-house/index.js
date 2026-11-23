/**
 * House-style ESLint rules that stock rules can't express.
 * The conventions are in the headwall-node-ts skill.
 */

const LOOP_TYPES = new Set([
  'ForStatement',
  'ForInStatement',
  'ForOfStatement',
  'WhileStatement',
  'DoWhileStatement',
]);

const FUNCTION_TYPES = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

/** Returns the nearest enclosing function or loop node of a node, or null. */
function nearestFunctionOrLoop(node) {
  let current = node.parent;
  let found = null;
  while (current && found === null) {
    if (FUNCTION_TYPES.has(current.type) || LOOP_TYPES.has(current.type)) {
      found = current;
    }
    current = current.parent;
  }
  return found;
}

/** Returns the nearest enclosing function node of a node, or null. */
function nearestFunction(node) {
  let current = node.parent;
  let found = null;
  while (current && found === null) {
    if (FUNCTION_TYPES.has(current.type)) {
      found = current;
    }
    current = current.parent;
  }
  return found;
}

/** True when every variable a node declares (a catch parameter, a function's parameters) is never read. */
function declaresOnlyUnusedVariables(context, node) {
  const variables = context.sourceCode.getDeclaredVariables(node);
  return variables.every((variable) => variable.references.length === 0);
}

/** True for a member call such as promise.catch(...) or promise.then(..., ...). */
function isMethodCall(node, methodName) {
  return node.callee.type === 'MemberExpression'
    && node.callee.property.type === 'Identifier'
    && node.callee.property.name === methodName;
}

const noReturnInLoop = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow return statements inside loops; set a result and break instead.' },
    schema: [],
    messages: { returnInLoop: 'Do not return from inside a loop. Set the result, break, and return after the loop.' },
  },
  create(context) {
    return {
      ReturnStatement(node) {
        const enclosing = nearestFunctionOrLoop(node);
        if (enclosing !== null && LOOP_TYPES.has(enclosing.type)) {
          context.report({ node, messageId: 'returnInLoop' });
        }
      },
    };
  },
};

const noForEachReturn = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow return inside a .forEach() callback; use for...of with continue.' },
    schema: [],
    messages: { forEachReturn: 'A return inside .forEach() is a continue in disguise. Use for...of with continue.' },
  },
  create(context) {
    return {
      ReturnStatement(node) {
        const enclosingFunction = nearestFunction(node);
        const call = enclosingFunction?.parent;
        const isForEachCallback = call?.type === 'CallExpression'
          && call.arguments[0] === enclosingFunction
          && isMethodCall(call, 'forEach');
        if (isForEachCallback) {
          context.report({ node, messageId: 'forEachReturn' });
        }
      },
    };
  },
};

const noSwallowedCatch = {
  meta: {
    type: 'problem',
    docs: { description: 'Require every catch, and every promise .catch() handler, to use the error it caught.' },
    schema: [],
    messages: {
      emptyCatch: 'A catch block must not be empty. Rethrow, or log and record the failure.',
      unusedError: 'The caught error is never used. Rethrow it, log it, or test it (error.code) and rethrow the rest.',
    },
  },
  create(context) {
    return {
      CatchClause(node) {
        if (node.body.body.length === 0) {
          context.report({ node, messageId: 'emptyCatch' });
        } else if (node.param === null || declaresOnlyUnusedVariables(context, node)) {
          context.report({ node, messageId: 'unusedError' });
        }
      },
      CallExpression(node) {
        const handler = isMethodCall(node, 'catch') ? node.arguments[0] : undefined;
        const isFunctionHandler = handler !== undefined
          && (handler.type === 'ArrowFunctionExpression' || handler.type === 'FunctionExpression');
        if (isFunctionHandler && (handler.params.length === 0 || declaresOnlyUnusedVariables(context, handler))) {
          context.report({ node: handler, messageId: 'unusedError' });
        }
      },
    };
  },
};

export default {
  meta: { name: 'eslint-plugin-house' },
  rules: {
    'no-return-in-loop': noReturnInLoop,
    'no-foreach-return': noForEachReturn,
    'no-swallowed-catch': noSwallowedCatch,
  },
};
