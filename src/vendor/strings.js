import { coalesce, isString } from './utils';
import { value2json } from './convert';
import { round as mathRound, roundMetric } from './math';

import Date from './dates';



const between = (v, min, max) => Math.max(min, Math.min(max, v));
const strings = {
  indent(value, amount) {
    const numTabs = coalesce(amount, 1);
    const indent = '    '.repeat(numTabs);
    const str = value.toString();
    // REMAINING WHITE IS KEPT (CASE OF CR/LF ESPECIALLY)
    const left = str.trimRight();
    const white = strings.rightBut(str, left.length);

    return indent + left.split('\n').join(`\n${indent}`) + white;
  },

  left(value, amount) {
    return value.slice(0, between(amount, 0, value.length));
  },
  right(value, amount) {
    return value.slice(between(value.length - amount, 0, value.length));
  },
  leftBut(value, amount) {
    return value.slice(0, between(value.length - amount, 0, value.length));
  },
  rightBut(value, amount) {
    return value.slice(between(amount, 0, value.length), value.length);
  },

  json(value) {
    return value2json(value);
  },
  comma(value) {
    // SNAGGED FROM http://stackoverflow.com/questions/2901102/how-to-print-a-number-with-commas-as-thousands-separators-in-javascript
    const parts = value.toString().split('.');

    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

    return parts.join('.');
  },
  quote(value) {
    return value2json(value);
  },
  round(value, digits) {
    const v = isString(value) ? Number.parseFloat(value) : value;
    const r = mathRound(v, { digits });

    return `${r}`;
  },
  metric: roundMetric,
  upper(value) {
    if (isString(value)) {
      return value.toUpperCase();
    }

    return value2json(value).toUpperCase();
  },

  lower(value) {
    if (isString(value)) {
      return value.toLowerCase();
    }

    return value2json(value).toLowerCase();
  },

  format(value, format) {
    const ff = coalesce(format, 'yyyy-MM-dd HH:mm:ss');

    return Date.newInstance(value).format(ff);
  },

  unix(value) {
    return new Date(value).valueOf();
  },

  trimLeft(value, prefix) {
    if (prefix === undefined) return value.trimLeft();
    let v = value;

    while (v.startsWith(prefix)) {
      v = v.slice(prefix.length);
    }

    return v;
  },
  trimRight(value, prefix) {
    if (prefix === undefined) return value.trimRight();

    let v = value;

    while (v.endsWith(prefix)) {
      v = strings.leftBut(v, prefix.length);
    }

    return v;
  },

  replaceAll(value, find, replace) {
    return value.split(find).join(replace);
  },
};

export default strings;
