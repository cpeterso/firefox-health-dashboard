/* eslint-disable linebreak-style */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */

import {
  missing,
  array,
  exists,
  first,
  isString,
  toArray,
  concatField,
} from '../utils';
import { frum, toPairs } from '../queryOps';
import { Log } from '../logs';
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
  }

  getValue(fieldName) {
    return this.values[fieldName].matrix.value;
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
        const selfEdge = this._getEdgesByName([foreignEdge.name])[0];

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
  sequence(requestedEdges) {
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
        yield [coord.slice(), new Cube(output)];

        return;
      }

      const first = edges[0];
      const rest = edges.slice(1);
      let i = 0;

      for (const p of first.domain.partitions) {
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

  _getEdgesByName(edgeNames) {
    // TODO: Verify the edges with same name have same partitions
    return edgeNames
      .map(eName =>
        toPairs(this.values).map(({ edges: subEdges }) =>
          subEdges.find(e => e.name === eName)
        )
      )
      .map(first);
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
  window({ name, value, edges: edgeNames, sort }) {
    const sort_ = toArray(sort);

    if (sort_.length > 1) Log.error('can only handle zero/one dimension');

    const outerEdges = this._getEdgesByName(edgeNames);
    const innerEdges = this._getEdgesByName(sort_);
    const outerDims = outerEdges.map(e => e.domain.partitions.length);
    const innerDims = innerEdges.map(e => e.domain.partitions.length);
    const outerMatrix = new Matrix({
      dims: outerDims,
      zero: () => null,
    });

    for (const [outerCoord, outerRow] of this.sequence(outerEdges)) {
      // WE PEAL BACK ALL THE WRAPPING FOR THE value() FUNCTION TO OPERATE ON
      if (sort_.length === 0) {
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

        for (const [innerCoord, innerRow] of outerRow.sequence(innerEdges)) {
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
