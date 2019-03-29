/* global window */
/* eslint-disable no-restricted-syntax */

const { isArray } = Array;
const zero = () => 0;

function array(length = 0) {
  return new Array(length).fill(null);
}

function missing(value) {
  // return true if value is null, or undefined, or not a legit value
  return (
    value == null ||
    value === '' ||
    Number.isNaN(value) ||
    value === Number.POSITIVE_INFINITY ||
    value === Number.NEGATIVE_INFINITY
  );
}

function exists(value) {
  // return false if value is null, or undefined, or not a legit value
  return !missing(value);
}

function coalesce(...args) {
  for (const a of args) {
    if (exists(a)) return a;
  }

  return null;
}

function first(list) {
  for (const v of list) return v;

  return null;
}

function last(list) {
  if (isArray(list)) return list[list.length - 1];

  let value = null;

  for (const v of list) value = v;

  return value;
}

function isString(value) {
  return typeof value === 'string';
}

function toArray(value) {
  // return a list
  if (value == null) return [];

  if (isString(value)) return [value];

  if (isArray(value)) return value;

  if (value[Symbol.iterator]) return Array.from(value);

  return [value];
}

function isNumeric(n) {
  if (isString(n)) {
    /* eslint-disable-next-line max-len */
    return /^[+-]?[0123456789]+\.?[0123456789]*([eE][+-]?[0123456789]+)?$/y.test(
      n
    );
  }

  return Number.isFinite(n);
}

function isInteger(n) {
  if (isString(n)) {
    return /^[+-]?[0123456789]+\.?0*([eE]\+?[0123456789]+)?$/y.test(n);
  }

  return Number.isInteger(n);
}

const OBJECT_CONSTRUCTOR = {}.constructor;

/*
 * objects that are best serialized as JSON objects
 */
function isData(val) {
  if (missing(val)) return false;

  return val.constructor === OBJECT_CONSTRUCTOR;
}

function isFunction(f) {
  return typeof f === 'function';
}

/*
expecting Array of Arrays, return transpose
 */
function zip(...args) {
  const length = Math.max(...args.map(a => a.length));

  return array(length).map((_, i) => args.map(a => a[i]));
}

/*
interpret a string with possible dots as a literal key, not a path
 */
function literalField(fieldname) {
  return fieldname.replace(/\./g, '\\.');
}

/*
accept dot-delimited path name
return array of keys representing the same
 */
function splitField(fieldname) {
  return fieldname
    .replace(/\\\./g, '\b')
    .split('.')
    .map(v => v.replace(/[\b]/g, '.'));
}

/*
accept an array of keys representing a path
return dot-delimited path name
 */
function joinField(path) {
  return path.map(literalField).join('.');
}

/*
join two dot-delimited path names
 */
function concatField(...many) {
  let output = '.';

  many.forEach(m => {
    if (output === '.') {
      output = m;
    } else if (m !== '.') {
      output = `${output}.${m}`;
    }
  });

  return output;
}

export {
  first,
  last,
  toArray,
  isArray,
  isNumeric,
  isInteger,
  isFunction,
  missing,
  exists,
  coalesce,
  isString,
  isData,
  splitField,
  joinField,
  literalField,
  concatField,
  zip,
  array,
  zero,
};
