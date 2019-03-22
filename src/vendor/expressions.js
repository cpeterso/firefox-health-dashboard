/* eslint-disable linebreak-style */
/* eslint-disable no-use-before-define */

import { zip, exists, first, isString, missing, toArray } from './utils';
import {frum} from './queryOps';
import Data from './Data';





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
  const size = edges.map(e=>e.domain.partitions.length);

  const output = Cube.newInstance(size);
  rows.forEach(row=>{
    const coord = edges.map(e => e.domain.valueToIndex(e.value(row)));
    zip(coord, size, edges).forEach(([c, s, e], i)=>{
      if (e.domain.type==="value") {
        let currSize = s;
        while (c > currSize) {
          output.insertPart(i, s-1);  // last element of value domain is NULL, ensure it is still last
          currSize += 1;
        }
      }
    });

    output.add(coord, row);
  });
  return output;
}

function window(rows, {edges, sort, value}){




}



/*
return an array of arrays
size - an array of integers; number of part along each dimension
zero - a function the will be used to create an element in the multiarray
 */
function newMultiArray(size, zero){
  if (size.length===0) return zero();
  const length = size[0];
  const rest = size.slice(1);
  return Array(length).map(newMultiArray(rest, zero));
}



/*
A multidimensional array

elements are accessed via integer arrays, called coordinates.
 */
class Cube{

  constructor({dims, data, zero=Array}){
    this.dims=dims;
    this.data=data;
    this.zero=zero;
  }

  /*
  assume elements are arrays, add value to that element
   */
  add(coord, value){
    const rows = this.get(coord);
    rows.push(value);
  }

  /*
  get value for element at given coordinates
   */
  get(coord){
    function _iter(coord, data){
      if (coord.length===0) return data;
      const sub = data[coord[0]];
      return _iter(coord.slice(1), sub);
    }
    return _iter(coord, this.data);
  }

  /*
  set value of element at given coordinates
   */
  set(coord, value){
    function _iter(coord, data) {
      if (coord.length === 1) {
        data[coord[0]] = value;
      } else {
        const sub = data[coord[0]];
        return _iter(coord.slice(1), sub);
      }
    }
    return _iter(coord, this.data);
  }

  /*
  insert a new port along a single edge, expanding the cube
  and inserting zero()s everywhere.
  insert at `position` along `dimension`
   */
  insertPart(dimension, position){
    const subDims = this.dims.slice(dimension);

    function _insert(dim, data) {
      if (dim === 0) {
        data.splice(position, 0, newMultiArray(subDims, this.zero));
      } else {
        data.forEach(d => { _insert(dim - 1, d) });
      }
    }

    _insert(dimension, this.data);
  }

  /*
  return a generator of [value, coordinate] pairs
   */
  *[Symbol.iterator]() {
    function * _iter(depth, data) {
      if (depth === 1) {
        let i = 0;
        for (const v of data) {
          yield [v, [i]];
          i += 1;
        }
      } else {
        let i = 0;
        for (const d of data) {
          for (const [v, c] of _iter(depth - 1, d)) yield [v, [i] + c];
          i += 1;
        }
      }
    }
    return _iter(this.dims.length, this.data);
  }



}



Cube.newInstance = (dims, zero=Array) => {
  return Cube(dims, newMultiArray(dims, zero));
};

export { jx }; // eslint-disable-line import/prefer-default-export



