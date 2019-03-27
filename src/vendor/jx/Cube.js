/* eslint-disable linebreak-style */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */

import {
  array,
  concatField,
  exists,
  isString,
  missing,
  toArray,
} from '../utils';
import { ArrayWrapper, frum, toPairs } from '../queryOps';
import { Log } from '../logs';
import { NULL } from './domains';
import Matrix from './Matrix';
import Data from '../Data';

const subtractEdges = (a, b) => a.filter(v => b.every(w => w.name !== v.name));

/*
 * multiple named matrices, deferenced by edge name
 * elements are accessed via Objects, called combinations
 */
class Cube {
  constructor(values = {}) {
    this.values = values;

    // toPairs(values).forEach((_, edgeName)=>{
    //   Object.defineProperty(this, edgeName, {
    //     get: () => {
    //       return this.getValue(edgeName)
    //     },
    //   });
    // })
  }

  getValue(fieldName) {
    return this.values[fieldName].matrix.value;
  }

  /*
   * Expecting combination object with {edge: value} pairs
   * return a (reduced dimension) cube
   */
  get(combination) {
    const selections = toPairs(combination)
      .map((value, edgeName) =>
        this._getEdgeByName(edgeName).domain.partitions.findIndex(
          p => p.value === value
        )
      )
      .fromPairs();
    const values = toPairs(this.values)
      .map(({ edges, matrix }) => ({
        edges: edges.filter(e => missing(combination[e.name])),
        matrix: matrix.get(edges.map(e => selections[e.name])),
      }))
      .fromPairs();

    return new Cube(values);
  }

  /*
   * pick one edge which you can perform more chained vector operations
   * value is a cube
   */
  along(edge, options = {}) {
    const { nulls = false } = options;

    return new ArrayWrapper(() =>
      this.sequence([this._getEdgeByName(edge)], { nulls })
    );
  }

  /*
   * Add a named matrix to this cube
   */
  leftJoin({ name, edges, matrix }) {
    // VERIFY EDGES ARE IDENTICAL
    let different = false;
    const [newEdges, ordering, dims] = frum(edges)
      .map(foreignEdge => {
        const foreignParts = foreignEdge.domain.partitions;
        const selfEdge = this._getEdgeByName(foreignEdge.name);

        if (missing(selfEdge))
          return [
            foreignEdge,
            foreignParts.map((v, i) => i),
            foreignParts.length,
          ];
        const selfParts = selfEdge.domain.partitions;
        // MAP foreignEdge PARTS TO selfEdge parts
        const valToIndex = frum(selfParts)
          .enumerate()
          .map((p, i) => [i, p.value])
          .args()
          .fromPairs();
        const newPart = frum(foreignParts)
          .select('value')
          .filter(p => missing(valToIndex[p]))
          .toArray();
        const mapping = foreignParts.map(p => valToIndex[p.value]);

        if (newPart.length > 0) {
          different = true;
          Log.warning(
            'right edge {{name|quote}} has more parts ({{newPart|json}}) than the left',
            {
              newPart,
              name: foreignEdge.name,
            }
          );
        }

        if (mapping.some((v, i) => v !== i)) {
          different = true;
        }

        return [selfEdge, mapping, selfParts.length];
      })
      .zip()
      .toArray();

    if (different) {
      this.values[name] = {
        edges: newEdges,
        matrix: matrix.reorder(dims, ordering),
      };
    } else {
      this.values[name] = {
        edges: newEdges,
        matrix,
      };
    }

    return this;
  }

  /*
   * Add other cube to this one
   */
  extend({ cube, name = '.' }) {
    toPairs(cube.values).forEach(({ edges, matrix }, n) => {
      this.leftJoin({ name: concatField(name, n), edges, matrix });
    });

    return this;
  }

  /*
   * return a generator over all parts of all given edges
   * generator returns [coord, cube] pairs
   */
  sequence(requestedEdges, options = {}) {
    const { nulls = true } = options;

    if (requestedEdges.some(isString))
      Log.error('sequence() requires edge objects');

    const self = this;
    // MAP FROM name TO (requested dimension TO matrix dimension)
    const maps = toPairs(self.values)
      .map(({ edges }) =>
        requestedEdges
          .map(e => edges.findIndex(f => f.name === e.name))
          .map(i => (i === -1 ? null : i))
      )
      .fromPairs();
    // MAP FROM name TO NOT-REQUESTED EDGES
    const residue = toPairs(self.values)
      .map(({ edges }) => subtractEdges(edges, requestedEdges))
      .fromPairs();
    const coord = array(requestedEdges.length);

    function* _sequence(depth, edges, result) {
      if (edges.length === 0) {
        const output = result;

        toPairs(self.values).forEach(({ matrix }, name) => {
          const selfCoord = array(matrix.dims.length);
          const map = maps[name];

          coord.forEach((c, i) => {
            const d = map[i];

            if (exists(d)) selfCoord[d] = c;
          });
          output[name] = {
            edges: residue[name],
            matrix: matrix.get(selfCoord),
          };
        });
        yield [new Cube(output), coord.slice()];

        return;
      }

      const first = edges[0];
      const rest = edges.slice(1);
      let i = 0;

      for (const p of first.domain.partitions) {
        // eslint-disable-next-line no-continue
        if (!nulls && p === NULL) continue;
        coord[depth] = i;

        for (const s of _sequence(depth + 1, rest, {
          ...result,
          ...Data(first.name, {
            edges: [],
            matrix: new Matrix({ dims: [], data: p.value }),
          }),
        }))
          yield s;
        i += 1;
      }
    }

    // map from given edges to each name's edges
    return _sequence(0, requestedEdges, {});
  }

  _getEdgeByName(edgeName) {
    return toPairs(this.values)
      .map(({ edges }) => edges.find(e => e.name === edgeName))
      .exists()
      .first();
  }

  select(names) {
    return new Cube(
      Data.zip(toArray(names).map(name => [name, this.values[name]]))
    );
  }

  /*
   * group by edges, then for each group
   * run name=value(element, coord, matrix) over all rows in group
   */
  window({ name, value, edges: edgeNames, along }) {
    const innerNames = toArray(along);

    if (innerNames.length > 1) Log.error('can only handle zero/one dimension');

    const outerEdges = edgeNames
      .map(n => this._getEdgeByName(n))
      .filter(exists);
    const innerEdges = innerNames
      .map(n => this._getEdgeByName(n))
      .filter(exists);
    const outerDims = outerEdges
      .map(e => e.domain.partitions.length)
      .filter(exists);
    const innerDims = innerEdges
      .map(e => e.domain.partitions.length)
      .filter(exists);
    const outerMatrix = new Matrix({
      dims: outerDims,
      zero: () => null,
    });

    for (const [outerRow, outerCoord] of this.sequence(outerEdges)) {
      // WE PEAL BACK ALL THE WRAPPING FOR THE value() FUNCTION TO OPERATE ON
      if (innerNames.length === 0) {
        const v = value(
          toPairs(outerRow.values)
            .map(d => d.matrix.data)
            .fromLeaves()
        );

        outerMatrix.set(outerCoord, v);
      } else {
        const innerMatrix = new Matrix({
          dims: innerDims,
          zero: () => null,
        });

        for (const [innerRow, innerCoord] of outerRow.sequence(innerEdges)) {
          const v = value(
            toPairs(innerRow.values)
              .map(d => d.matrix.data)
              .fromLeaves(),
            innerCoord[0],
            innerMatrix.data
          );

          innerMatrix.set(innerCoord, v);
        }

        outerMatrix.set(outerCoord, innerMatrix.data);
      }
      // for (const [innerCoord, innerRow] of outerRow.sequence(innerEdges)) {
      //   const v = value(
      //     new Cube({ ...outerRow.values, ...innerRow.values }),
      //     innerCoord,
      //     innerMatrix
      //   );
      //
      //   innerMatrix.set(innerCoord, v);
      // }
      // outerMatrix.set(outerCoord, innerMatrix.data);
    }

    return this.leftJoin({
      name,
      edges: outerEdges.concat(innerEdges),
      matrix: new Matrix({
        dims: outerDims.concat(innerDims),
        data: outerMatrix.data,
      }),
    });
  }
}

export default Cube;
