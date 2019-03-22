/* eslint-disable linebreak-style */
/* eslint-disable no-use-before-define */

import { zip, exists, first, isString, missing, toArray } from '../utils';
import { frum } from '../queryOps';
import Data from '../Data';
import Edge from './edges';
import Matrix from './cubes';

const jx = expr => {
  if (isString(expr)) return row => Data.get(row, expr);

  const output = first(
    Object.entries(expr).map(([op, term]) => {
      const func = expressions[op];

      if (func === undefined) {
        throw new Error(`expecting a known operator,  not {{op}}${op}`);
      }

      return func(term);
    })
  );

  if (exists(output)) return output;
  throw new Error(`does not look like an expression: {{expr}}${expr}`);
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
};

expressions.in = expressions.eq;

function edges(rows, [...edges]) {
  const edges = edges.map(Edge.newInstance);
  const size = edges.map(e => e.domain.partitions.length);
  const output = Matrix.newInstance(size);

  rows.forEach(row => {
    const coord = edges.map(e => e.domain.valueToIndex(e.value(row)));

    zip(coord, size, edges).forEach(([c, s, e], i) => {
      if (e.domain.type === 'value') {
        let currSize = s;

        while (c > currSize) {
          // last element of value domain is NULL, ensure it is still last
          output.insertPart(i, s - 1);
          currSize += 1;
        }
      }
    });

    output.add(coord, row);
  });

  return output;
}

export { jx, edges }; // eslint-disable-line import/prefer-default-export
