import { frum, leaves, length, toPairs } from './queryOps';
import { isArray, isFunction, isNumeric, isObject, toArray } from './utils';
import { parse } from 'query-string';
import strings from './strings';

function FromQueryString(query) {
  const decode = v => {
    if (isArray(v)) return v.map(decode);

    if (v === null || v === 'true' || v === '') return true;

    if (v === 'false') return false;

    if (v === 'null') return null;

    if (isNumeric(v)) return Number.parseFloat(v);

    return v;
  };

  return toPairs(parse(query))
    .map(decode)
    .fromLeaves();
}

function ToQueryString(value) {
  const e = vv => encodeURIComponent(vv).replace(/[%]20/g, '+');
  const encode = (v, k) =>
    toArray(v)
      .exists()
      .map(vv => {
        if (vv === true) return e(k);

        return `${e(k)}=${e(vv)}`;
      })
      .join('&');
  const output = leaves(value)
    .map(encode)
    .concatenate('&');

  return output;
}

function json2value(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    throw new Error(`Can not parse json:\n{{json|indent}}`, { json }, e);
  }
}

function prettyJSON(json, maxDepth) {
  if (maxDepth < 0) {
    throw new Error('json is too deep');
  }

  try {
    if (Array.isArray(json)) {
      const output = frum(json)
        .map(v => {
          if (v === undefined) return;

          return prettyJSON(v, maxDepth - 1);
        })
        .exists();

      if (output.length === 0) return '[]';

      if (output.length === 1) return `[${prettyJSON(json[0], maxDepth - 1)}]`;

      const lengths = output.map(length);

      if (lengths.filter(v => v > 30).first() || lengths.sum() > 60) {
        return `[\n${strings.indent(output.concatenate(',\n'), 1)}\n]`;
      }

      return `[${output.concatenate(',')}]`;
    }

    if (isFunction(json)) {
      return 'undefined';
      // } else if (json instanceof Duration) {
      //   return convert.String2Quote(json.toString());
      // } else if (json instanceof Date) {
      //   return convert.String2Quote(json.format("dd-NNN-yyyy HH:mm:ss"));
    }

    if (isObject(json)) {
      const output = toPairs(json)
        .map((v, k) => {
          if (v === undefined) return;

          return `"${k}":${prettyJSON(v, maxDepth - 1)}`;
        })
        .exists();

      if (output.length === 0) return '{}';

      if (output.length === 1) return `{${output.first()}}`;

      const lengths = output.map(length);

      if (lengths.filter(v => v > 30).first() || lengths.sum() > 60) {
        return `{\n${strings.indent(output.concatenate(',\n'), 1)}\n}`;
      }

      return `{${output.concatenate(',')}}`;
    }

    return JSON.stringify(json);
  } catch (e) {
    throw new Error('Problem with jsonification', e);
  }
}

function value2json(json) {
  return prettyJSON(json, 30);
}

export { FromQueryString, ToQueryString, value2json, json2value };
