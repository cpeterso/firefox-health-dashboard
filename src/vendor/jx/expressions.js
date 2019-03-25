/* eslint-disable linebreak-style */
/* eslint-disable no-use-before-define */
/* eslint-disable no-underscore-dangle */

import { exists, first, isString, missing, toArray } from '../utils';
import Data from '../Data';
import Date from '../dates';
import { Log } from '../logs';

const jx = expr => {
  if (isString(expr)) return row => Data.get(row, expr);

  const output = first(
    Object.entries(expr).map(([op, term]) => {
      const func = expressions[op];

      if (func === undefined) {
        Log.error(`expecting a known operator,  not {{op}}${op}`);
      }

      return func(term);
    })
  );

  if (exists(output)) return output;
  Log.error(`does not look like an expression: {{expr}}${expr}`);
};

const expressions = {
  and: terms => {
    const filters = terms.map(jx);

    return row => filters.every(f => f(row));
  },

  or: terms => {
    const filters = terms.map(jx);

    return row => filters.some(f => f(row));
  },

  eq: obj => {
    const filters = Object.entries(obj).map(([k, v]) => {
      if (missing(v)) return () => true;

      return row => toArray(v).includes(Data.get(row, k));
    });

    return row => filters.every(f => f(row));
  },

  prefix: term => row =>
    Object.entries(term).every(([name, prefix]) => {
      const value = Data.get(row, name);

      if (missing(value)) return false;

      return value.startsWith(prefix);
    }),

  gte: obj => {
    const lookup = Object.entries(obj).map(([name, reference]) => [
      jx(name),
      jx(reference),
    ]);

    return row =>
      lookup.every(([a, b]) => {
        const av = a(row);
        const bv = b(row);

        if (missing(av) || missing(bv)) return false;

        return av >= bv;
      });
  },

  date: value => {
    const date = Date.tryParse(value);

    if (exists(date)) {
      const val = date.unix();

      return () => val;
    }

    return row => Date.newInstance(Data.get(row, value)).unix();
  },
};

expressions.in = expressions.eq;

export { jx }; // eslint-disable-line import/prefer-default-export
