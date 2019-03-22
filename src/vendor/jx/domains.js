import { Log } from '../logs';
import { Date } from '../dates';
import { Duration } from '../durations';
import { missing, exists, coalesce } from '../utils';

const DEFAULT_FORMAT = 'yyyy-MM-dd HH:mm:ss';
const ALGEBRAIC = ['time', 'duration', 'numeric', 'count', 'datetime']; // DOMAINS THAT HAVE ALGEBRAIC OPERATIONS DEFINED
const KNOWN = ['set', 'boolean', 'duration', 'time', 'numeric']; // DOMAINS THAT HAVE A KNOWN NUMBER FOR PARTS AT QUERY TIME
const PARTITION = ['set', 'boolean']; // DIMENSIONS WITH CLEAR PARTS

const NULL = {}; // SPECIAL SINGLTON TO REPRESENT OUT-OF-DOMAIN VALUES

class Domain {}

Domain.newInstance = desc => {
  if (isString(desc)) {
    return ValueDomain(desc);
  }

  if (desc.type === 'time') {
    return TimeDomain(desc.domain);
  }
};

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
    if (missing(value)) return this.partitions.length;
    const output = this.partitions.findIndex(value);

    if (output === -1) {
      this.partitions.push(value);

      return this.partitions.length - 1;
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
    this.values = this._constructTimeRange({ min, max, interval, format });
  }

  _constructTimeRange = ({ min, max, interval, format }) => {
    this.map = {};
    this.partitions = [];

    for (let v = min; v.getMilli() < max.getMilli(); v = v.add(interval)) {
      const partition = {
        value: v,
        min: v,
        max: v.add(interval),
        name: v.format(coalesce(format, DEFAULT_FORMAT)),
      };

      this.map[v] = partition;
      this.partitions.push(partition);
    } // for

    this.partitions.push(NULL);

    return output;
  };

  /*
  Return index into the `partitions` array for given `value`
   */
  valueToIndex(value) {
    const dateValue = Date.newInstance(value).getMilli();
    const output = this.partitions.findIndex(
      part =>
        part.min.getMilli() <= dateValue && dateValue < part.max.getMilli()
    );

    if (output === -1) return this.partitions.length - 1;

    return output;
  }

  *[Symbol.iterator]() {
    for (const v of this.partitions) yield v;
  }
}

export { Domain, ValueDomain, TimeDomain };
