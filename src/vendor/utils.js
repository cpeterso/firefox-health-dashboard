/* global window */
/* eslint-disable no-restricted-syntax */
import { ArrayWrapper } from './queryOps';

const { isArray } = Array;
const zero = () => 0;

function array(length = 0) {
  return new Array(length).fill(null);
}

function missing(value) {
  // return true if value is null, or undefined, or not a legit value
  return value == null || Number.isNaN(value) || value === '';
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
  let value = null;

  for (const v of list) value = v;

  return value;
}

function toArray(value) {
  // return a list
  if (isArray(value)) {
    return value;
  }

  if (value instanceof ArrayWrapper) {
    return value.toArray();
  }

  if (value == null) {
    return [];
  }

  return [value];
}

function isString(value) {
  return typeof value === 'string';
}

function isNumeric(n) {
  if (isString(n)) {
    /* eslint-disable-next-line max-len */
    return /^[+-]?[0123456789]+\.?[0123456789]*([eE][+-]?[0123456789]+)?$/y.test(
      n
    );
  }

  return !Number.isNaN(n) && Number.isFinite(n);
}

function isInteger(n) {
  if (isString(n)) {
    return /^[+-]?[0123456789]+\.?0*([eE]\+?[0123456789]+)?$/y.test(n);
  }

  return Number.isInteger(n);
}

function isObject(val) {
  if (missing(val) || isArray(val)) {
    return false;
  }

  return typeof val === 'function' || typeof val === 'object';
}

function isData(val) {
  if (missing(val)) {
    return false;
  }

  return typeof val === 'object';
}

function isFunction(f) {
  return typeof f === 'function';
}

function literalField(fieldname) {
  return fieldname.replace(/\./g, '\\.');
}

/*
expecting Array of Arrays, return transpose
 */
function zip(...args) {
  const length = Math.max(...args.map(a => a.length));

  return array(length).map((_, i) => args.map(a => a[i]));
}

function splitField(fieldname) {
  return fieldname
    .replace(/\\\./g, '\b')
    .split('.')
    .map(v => v.replace(/[\b]/g, '.'));
}

function joinField(path) {
  return path.map(literalField).join('.');
}

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
  isObject,
  splitField,
  joinField,
  literalField,
  concatField,
  zip,
  array,
  zero,
};
