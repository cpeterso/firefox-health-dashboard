import { parse } from 'query-string';
import { frum, leaves, length, toPairs } from './queryOps';
import { Log } from './logs';
import {
  exists,
  isArray,
  isFunction,
  isData,
  isString,
  toArray,
} from './utils';
import strings from './strings';

function fromQueryString(query) {
  const decode = v => {
    if (isArray(v)) return v.map(decode);

    if (v === null || v === '') return true;

    try {
      return JSON.parse(v);
    } catch (e) {
      return v;
    }
  };

  return toPairs(parse(query))
    .map(decode)
    .fromLeaves();
}

function toQueryString(value) {
  const e = vv => encodeURIComponent(vv).replace(/[%]20/g, '+');
  const encode = (v, k) =>
    toArray(v)
      .filter(exists)
      .map(vv => {
        if (vv === true) return e(k);

        if (isString(vv)) {
          try {
            JSON.parse(vv);

            return `${e(k)}=${e(JSON.stringify(vv))}`;
          } catch (e) {
            // USE STANDARD ENCODING
          }
        }

        return `${e(k)}=${e(vv)}`;
      })
      .join('&');
  const temp = leaves;
  const output = temp(value)
    .map(encode)
    .concatenate('&');

  return output;
}

function json2value(json) {
  try {
    return JSON.parse(json);
  } catch (e) {
    Log.error(`Can not parse json:\n{{json|indent}}`, { json }, e);
  }
}

function prettyJSON(json, maxDepth) {
  if (maxDepth < 0) {
    Log.error('json is too deep');
  }

  try {
    if (isArray(json)) {
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

    if (isData(json)) {
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
    Log.error('Problem with jsonification', e);
  }
}

function value2json(json) {
  return prettyJSON(json, 30);
}

export { fromQueryString, toQueryString, value2json, json2value };
