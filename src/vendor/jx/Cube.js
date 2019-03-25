/* eslint-disable linebreak-style */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */

import { array, concatField, exists } from '../utils';
import { toPairs } from '../queryOps';
import { Log } from '../logs';
import Matrix from './Matrix';
import Data from '../Data';

const subtract = (a, b) => a.filter(v => b.contains(v));

/*
 * multiple named matrices of values, deferenced by edge name
 * elements are accessed via Objects, called combinations
 */
class Cube {
  constructor({ name='.', matrix, edges }) {
    if (exists(value)){
      this.values = values;
    }else{
      this.name = name;
      this.edges = edges;
      this.values = Data(name, {
        edges,
        matrix,
        map: array(edges.length).map((_, i) => i), // map this.edge index to matrix dimension
      });

    }


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
   * it is expected `sort` has the rest of the edges
   * generator returns [coord, cube] pairs
   */
  sequence(edges, sort) {
    const masterMap = edges.map(e =>
      this.edges.findIndex(f => f.name === e.name)
    );
    const coord = array(this.edges.length);
    const self = this;

    function* _sequence(depth, edges, parts) {
      if (edges.length === 0) {
        const output = parts;

        toPairs(self.values).forEach(({ matrix, map }, name) => {
          const selfCoord = array(matrix.dims.length);

          coord.forEach((c, i) => {
            selfCoord[map[i]] = c;
          });
          output[name] = matrix.get(selfCoord);
        });
        yield [coord.slice(), new Cube({edges: sort, values: {edges: , map: ,  matrix: output}})];

        return;
      }

      const first = edges[0];
      const rest = edges.slice(1);
      let i = 0;

      for (const p of first.domain.partitions) {
        coord[masterMap[depth]] = i;

        for (const s of _sequence(depth + 1, rest, {
          ...parts,
          ...Data(first.name, Matrix({dims: [], data: p.value})),
        }))
          yield s;
        i += 1;
      }
    }

    // map from given edges to each name's edges
    return _sequence(0, edges, {});
  }

  /*
   * group by edges, then for each group
   * run name=value(element, coord, matrix) over all rows in group
   */
  window({ name, value, edges, sort }) {
    const outerEdges = edges.map(eName =>
      this.edges.find(e => e.name === eName)
    );
    const innerEdges = sort.map(eName =>
      this.edges.find(e => e.name === eName)
    );
    const outerMatrix = new Matrix({
      dims: outerEdges.map(e => e.domain.partitions.length),
      zero: () => null,
    });

    if (sort.length === 0) {
      // ZERO DIMENSION VALUE
      for (const [outerCoord, outerRow] of this.sequence(outerEdges)) {
        const v = value({ ...outerRow });

        outerMatrix.set(outerCoord, v);
      }
    } else if (sort.length === 1) {
      // SINGLE DIMENSION MATRIX IS AN ARRAY
      for (const [outerCoord, outerRow] of this.sequence(outerEdges)) {
        const innerMatrix = new Matrix({
          dims: innerEdges.map(e => e.domain.partitions.length),
          zero: () => null,
        });

        for (const [innerCoord, innerRow] of outerRow.sequence(sort)) {
          const v = value(
            { ...outerRow, ...innerRow },
            innerCoord[0],
            innerMatrix.data
          );

          innerMatrix.set(innerCoord, v);
        }

        outerMatrix.set(outerCoord, innerMatrix);
      }
    } else {
      // MULTIDIMENSIONAL CASE
      for (const [outerCoord, outerRow] of this.sequence(outerEdges)) {
        const innerMatrix = new Matrix({
          dims: innerEdges.map(e => e.domain.partitions.length),
          zero: () => null,
        });

        for (const [innerCoord, innerRow] of outerRow.sequence(sort)) {
          const v = value(
            { ...outerRow, ...innerRow },
            innerCoord,
            innerMatrix
          );

          innerMatrix.set(innerCoord, v);
        }

        outerMatrix.set(outerCoord, innerMatrix);
      }
    }

    this.leftJoin({
      name,
      edges,
      rightCube: new Cube({ matrix: outerMatrix, edges_: outerEdges }),
    });
  }
}

export default Cube;
