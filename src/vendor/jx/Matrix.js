/* eslint-disable linebreak-style */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */

import { array, missing } from '../utils';

/*
return an array of arrays
size - an array of integers; number of part along each dimension
zero - a function the will be used to create an element in the multiarray
 */
function newMultiArray(dims, zero) {
  if (dims.length === 0) return zero();
  const length = dims[0];
  const rest = dims.slice(1);

  return array(length).map(() => newMultiArray(rest, zero));
}

/*
A multidimensional array

elements are accessed via integer arrays, called coordinates.
 */
class Matrix {
  constructor({ dims, data = null, zero = array }) {
    this.dims = dims;
    this.data = missing(data) ? data : newMultiArray(dims, zero);
    this.zero = zero;
  }

  /*
  assume elements are arrays, add value to that element
   */
  add(coord, value) {
    const rows = this.get(coord);

    rows.push(value);
  }

  /*
  get value for element at given coordinates
  missing coordinates will return all of dimension
  returns Matrix
   */
  get(coord) {
    function _iter(coord, data) {
      if (coord.length === 0) return data;
      const c = coord[0];

      if (missing(c)) {
        return data.map(sub => _iter(coord.slice(1), sub));
      }

      return _iter(coord.slice(1), data[c]);
    }

    const newDims = this.dims.filter((c, i) => missing(coord[i]));
    return new Matrix({ dims: newDims, data: _iter(coord, this.data) });
  }

  /*
  set value of element at given coordinates
   */
  set(coord, value) {
    function _iter(coord, data) {
      const c = coord[0];

      if (coord.length === 1) {
        // eslint-disable-next-line no-param-reassign
        data[c] = value;
      } else {
        const sub = data[c];

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
  insertPart(dimension, position) {
    const subDims = this.dims.slice(dimension + 1);
    const _insert = (dim, data) => {
      if (dim === 0) {
        data.splice(position, 0, newMultiArray(subDims, this.zero));
      } else {
        data.forEach(d => {
          _insert(dim - 1, d);
        });
      }
    };

    _insert(dimension, this.data);
  }

  /*
  return a generator of [value, coordinate] pairs
   */
  *[Symbol.iterator]() {
    function* _iter(depth, data) {
      if (depth === 1) {
        let i = 0;

        for (const v of data) {
          yield [v, [i]];
          i += 1;
        }
      } else {
        let i = 0;

        for (const d of data) {
          for (const [v, c] of _iter(depth - 1, d)) yield [v, [i, ...c]];
          i += 1;
        }
      }
    }

    for (const v of _iter(this.dims.length, this.data)) yield v;
  }
}

export default Matrix;
