/* eslint-disable linebreak-style */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-underscore-dangle */
/* eslint-disable max-len */
import { Log } from '../logs';
import Date from '../dates';
import { Duration } from '../durations';
import { coalesce, isString, missing } from '../utils';

const DEFAULT_FORMAT = 'yyyy-MM-dd HH:mm:ss';
// const ALGEBRAIC = ['time', 'duration', 'numeric', 'count', 'datetime']; // DOMAINS THAT HAVE ALGEBRAIC OPERATIONS DEFINED
// const KNOWN = ['set', 'boolean', 'duration', 'time', 'numeric']; // DOMAINS THAT HAVE A KNOWN NUMBER FOR PARTS AT QUERY TIME
// const PARTITION = ['set', 'boolean']; // DIMENSIONS WITH CLEAR PARTS
const NULL = { name: 'NULL', value: null }; // SPECIAL SINGLTON TO REPRESENT OUT-OF-DOMAIN VALUES

class Domain {}

class ValueDomain extends Domain {
  constructor(name) {
    super();
    this.type = 'value';
    this.name = name;
    this.map = {};
    this.partitions = [NULL];
  }

  /*
  Return index into the `partitions` array for given `value`
   */
  valueToIndex(value) {
    /*
    Return the canonical value that represents `value`, or NULL
     */
    if (missing(value)) return this.partitions.length - 1;
    const output = this.partitions.findIndex(v => v.value === value);

    if (output === -1) {
      this.partitions.splice(this.partitions.length - 1, 0, { value });

      return this.partitions.length - 2;
    }

    return output;
  }

  *[Symbol.iterator]() {
    for (const v of this.values) yield v;
  }
}

class TimeDomain extends Domain {
  constructor({ type, min, max, interval, format }) {
    super();

    if (type !== 'time') Log.error('expecting time type');
    this.min = Date.newInstance(min);
    this.max = Date.newInstance(max);
    this.interval = Duration.newInstance(interval);
    this.format = format;
    this.values = this._constructTimeRange();
  }

  _constructTimeRange = () => {
    this.map = {};
    this.partitions = [];

    for (let v = this.min; v.milli() < this.max.milli(); v = v.add(this.interval)) {
      const partition = {
        value: v,
        min: v,
        max: v.add(this.interval),
        name: v.format(coalesce(this.format, DEFAULT_FORMAT)),
      };

      this.map[v] = partition;
      this.partitions.push(partition);
    } // for

    this.partitions.push(NULL);
  };

  /*
  Return index into the `partitions` array for given `value`
   */
  valueToIndex(value) {
    const dateValue = Date.newInstance(value).milli();
    const output = this.partitions.findIndex(
      part =>
        part.min.milli() <= dateValue && dateValue < part.max.milli()
    );

    if (output === -1) return this.partitions.length - 1;

    return output;
  }

  *[Symbol.iterator]() {
    for (const v of this.partitions) yield v;
  }
}

Domain.newInstance = desc => {
  if (isString(desc)) {
    return ValueDomain(desc);
  }

  if (desc.type === 'time') {
    return new TimeDomain(desc);
  }
};

export { Domain, ValueDomain, TimeDomain };
