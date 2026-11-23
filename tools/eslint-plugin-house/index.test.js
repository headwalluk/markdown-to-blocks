/**
 * RuleTester cases for the house ESLint plugin.
 */
import { after, describe, it } from 'node:test';
import { RuleTester } from 'eslint';
import house from './index.js';

RuleTester.afterAll = after;
RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const ruleTester = new RuleTester({ languageOptions: { ecmaVersion: 2023, sourceType: 'module' } });

ruleTester.run('no-return-in-loop', house.rules['no-return-in-loop'], {
  valid: [
    'function first(values) { let found = null; for (const value of values) { if (value > 1) { found = value; break; } } return found; }',
    'function mapped(values) { for (const value of values) { values.map((item) => { return item + value; }); } return values; }',
  ],
  invalid: [
    { code: 'function first(values) { for (const value of values) { if (value > 1) { return value; } } return null; }', errors: [{ messageId: 'returnInLoop' }] },
    { code: 'function wait() { while (true) { return 1; } }', errors: [{ messageId: 'returnInLoop' }] },
  ],
});

ruleTester.run('no-foreach-return', house.rules['no-foreach-return'], {
  valid: [
    'values.forEach((value) => { console.log(value); });',
    'const doubled = values.map((value) => { return value * 2; });',
  ],
  invalid: [
    { code: 'values.forEach((value) => { if (value > 1) { return; } console.log(value); });', errors: [{ messageId: 'forEachReturn' }] },
  ],
});

ruleTester.run('no-swallowed-catch', house.rules['no-swallowed-catch'], {
  valid: [
    'try { work(); } catch (error) { throw error; }',
    'try { work(); } catch (error) { logger.error("Work failed", { error }); }',
    'try { work(); } catch (error) { if (error.code !== "ENOENT") { throw error; } }',
    'promise.catch((error) => logger.error("Failed", { error }));',
  ],
  invalid: [
    { code: 'try { work(); } catch (error) {}', errors: [{ messageId: 'emptyCatch' }] },
    { code: 'try { work(); } catch (error) { /* ignore */ }', errors: [{ messageId: 'emptyCatch' }] },
    { code: 'try { work(); } catch { fallback(); }', errors: [{ messageId: 'unusedError' }] },
    { code: 'function read() { try { return work(); } catch (error) { return null; } }', errors: [{ messageId: 'unusedError' }] },
    { code: 'promise.catch(() => undefined);', errors: [{ messageId: 'unusedError' }] },
    { code: 'promise.catch((unusedError) => null);', errors: [{ messageId: 'unusedError' }] },
  ],
});
