/*
return an array of arrays
size - an array of integers; number of part along each dimension
zero - a function the will be used to create an element in the multiarray
 */
import { average } from "../math";
import { concatField, missing } from "../utils";
import { toPairs } from '../queryOps';
import Data from '../Data';

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
class Matrix{

  constructor({dims, data=null, zero=Array}){
    this.dims=dims;
    this.data=data || newMultiArray(dims, zero);
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
  missing coordinates will return all of dimension
  returns Matrix
   */
  get(coord) {
    function _iter(coord, data) {
      if (coord.length === 0) return data;
      const c = coord[0];

      if (missing(c)) {
        return data.map(sub => _iter(coord.slice(1), sub));
      } else {
        const sub = data[c];
        return _iter(coord.slice(1), sub);
      }

    }

    const newDims = this.dims.filter((c, i) => missing(coord[i]));
    if (newDims.length === 0) {
      return _iter(coord, this.data);
    } else {
      return Matrix(
        newDims,
        _iter(coord, this.data)
      );
    }
  }

  /*
  set value of element at given coordinates
   */
  set(coord, value){
    function _iter(coord, data) {
      const c = coord[0];
      if (coord.length === 1) {
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


/*
 * multiple named matrices of values, deferenced by edge name
 * elements are accessed via Objects, called combinations
 */
class Cube {

  constructor({name, matrix, edges}){
    this.edges = edges;
    this.values = Data(name, {
      edges,
      matrix,
      map: Array(edges.length).map((_, i)=>i)  // map this.edge index to matrix dimension
    });
  }



  leftJoin({edges, rightCube, name}){
    const mapToRight = this.edges.map(e => rightCube.edges.findIndex(f=> f.name===e.name));


    toPairs(rightCube.values).forEach(({edges, matrix, map}, n) => {
      const newMap = mapToRight.map(i => map[i]);
      this.values[concatField(name, n)] = {edges, matrix, map: newMap};

      const extra = subtract(edges, v.edges.select("name"));
      if (extra.length > 0) Log.error("can not find {{extra}} in {{name}}", {extra, name: n});


    });



    // check that the edges provided make some sense
    toPairs(this.values).forEach(({e}, n)=>{
      const extra = subtract(edges, e.select("name"));
      if (extra.length > 0) Log.error("can not find {{extra}} in {{name}}", {extra, name: n});
    });
  }

  /*
   * return a generator over all parts of all edges
   * while submitting named values, properly `sorted`
   */
  sequence({edges, sort}){
    const masterMap=edges.map(e=>this.edges.findIndex(f=>f.name===e.name));
    const coord= Array(this.edges.length);

    function* _sequence(depth, edges, parts) {
      if (edges.length === 0) {
        const output = parts;
        Object.entries(this.values).map(([name, {edges, matrix, map}]) => {
          const m_coord = Array(matrix.dims.length);
          coord.forEach((c, i) => {m_coord[map[i]] = c;});
          Data.set(output, name, matrix.get(m_coord));
        });
        yield output;
        return;
      }
      const first = edges[0];
      const rest = edges.slice(1);

      let i = 0;
      for (const p of first.domain.partitions) {
        coord[masterMap[depth]] = i;
        for (const s of _sequence(
          rest,
          {...parts, ...Data(first.name, p)},
          sort
        )) yield s;
        i+=1;
      }
    }
    // map from given edges to each name's edges
    return _sequence(0, edges, {})



  }

  window({name, edges, sort, value}){
    // anything in edges will be accessible as named values
    // other edges will be in Cubes

    //




       name: "measured",
       edges: ["test", "suite", "platform"],
       value: (value, c, values) => {
         if (c > 0 && value.length === 0) return values[c - 1];
         return average(value)
       }
     })

}




function subtract(a, b){
  return a.filter(v=>b.contains(v))
}


export Matrix;
