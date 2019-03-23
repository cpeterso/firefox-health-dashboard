/* eslint-disable linebreak-style */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */

/*
return an array of arrays
size - an array of integers; number of part along each dimension
zero - a function the will be used to create an element in the multiarray
 */
import { concatField, missing, zip, array } from '../utils';
import { toPairs } from '../queryOps';
import { Log } from '../logs';
import Data from '../Data';
import Edge from './edges';

function newMultiArray(dims, zero) {
  if (dims.length === 0) return zero();
  const length = dims[0];
  const rest = dims.slice(1);

  return array(length).map(() => newMultiArray(rest, zero));
}

function subtract(a, b) {
  return a.filter(v => b.contains(v));
}

/*
A multidimensional array

elements are accessed via integer arrays, called coordinates.
 */
class Matrix {
  constructor({ dims, data = null, zero = array }) {
    this.dims = dims;
    this.data = data || newMultiArray(dims, zero);
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

      const sub = data[c];

      return _iter(coord.slice(1), sub);
    }

    const newDims = this.dims.filter((c, i) => missing(coord[i]));

    if (newDims.length === 0) {
      return _iter(coord, this.data);
    }

    return Matrix(newDims, _iter(coord, this.data));
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

/*
 * multiple named matrices of values, deferenced by edge name
 * elements are accessed via Objects, called combinations
 */
class Cube {
  constructor({ name, matrix, edges }) {
    this.name = name;
    this.edges = edges;
    this.values = Data(name, {
      edges,
      matrix,
      map: array(edges.length).map((_, i) => i), // map this.edge index to matrix dimension
    });
  }

  get(combo) {
    // find coordinates of the combo
    Log.error('incomplete');

    return [this.name, combo];
  }

  leftJoin({ name, edges, rightCube }) {
    const requestedEdges = edges;
    const mapToRight = this.edges.map(e =>
      rightCube.edges.findIndex(f => f.name === e.name)
    );

    toPairs(rightCube.values).forEach(({ edges, matrix, map }, n) => {
      const newMap = mapToRight.map(i => map[i]);

      this.values[concatField(name, n)] = { edges, matrix, map: newMap };

      const extra = subtract(requestedEdges, edges.select('name'));

      if (extra.length > 0)
        Log.error('can not find {{extra}} in {{name}}', { extra, name: n });
    });

    // check that the edges provided make some sense
    toPairs(this.values).forEach(({ e }, n) => {
      const extra = subtract(edges, e.select('name'));

      if (extra.length > 0)
        Log.error('can not find {{extra}} in {{name}}', { extra, name: n });
    });
  }

  /*
   * return a generator over all parts of all edges
   * while submitting named values, properly `sorted`
   */
  sequence({ edges, sort }) {
    const masterMap = edges.map(e =>
      this.edges.findIndex(f => f.name === e.name)
    );
    const coord = array(this.edges.length);

    function* _sequence(depth, edges, parts) {
      if (edges.length === 0) {
        const output = parts;

        Object.entries(this.values).forEach(([name, { matrix, map }]) => {
          const mCoord = array(matrix.dims.length);

          coord.forEach((c, i) => {
            mCoord[map[i]] = c;
          });
          Data.set(output, name, matrix.get(mCoord));
        });
        yield [coord.slice(), output];

        return;
      }

      const first = edges[0];
      const rest = edges.slice(1);
      let i = 0;

      for (const p of first.domain.partitions) {
        coord[masterMap[depth]] = i;

        for (const s of _sequence(
          rest,
          { ...parts, ...Data(first.name, p) },
          sort
        ))
          yield s;
        i += 1;
      }
    }

    // map from given edges to each name's edges
    return _sequence(0, edges, {});
  }

  window({ name, edges, sort, value }) {
    const edges_ = edges.map(e => this.edges.find(f => f.name === e.name));
    const matrix = Matrix({
      dims: edges_.map(e => e.domain.partitions.length),
      zero: () => null,
    });

    for (const [coord, row] of this.sequence({ edges_, sort })) {
      matrix.set(coord, value(row, coord, matrix));
    }

    this.leftJoin({
      name,
      edges,
      rightCube: new Cube({ matrix, edges_ }),
    });
  }
}

function edges(rows, [...edges_]) {
  const edges = edges_.map(Edge.newInstance);
  const dims = edges.map(e => e.domain.partitions.length);
  const matrix = new Matrix({ dims });

  rows.forEach(row => {
    const coord = edges.map(e => e.domain.valueToIndex(e.value(row)));

    zip(dims, edges).forEach(([d, e], i) => {
      if (e.domain.type === 'value' && d < e.domain.partitions.length) {
        // last element of value domain is NULL, ensure it is still last
        matrix.insertPart(i, d - 1);
        dims[i] = d + 1;
      }
    });

    matrix.add(coord, row);
  });

  const temp = new Cube({ name: '.', matrix, edges });

  return temp;
}

export { Cube, edges };
