/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */

import { isNumeric, coalesce } from './utils';
import { floor, abs, round, min } from './math';
import { Date } from './dates';

const Duration = () => {
  this.milli = 0; // INCLUDES THE MONTH VALUE AS MILLISECONDS
  this.month = 0;

  return this;
};

Duration.DOMAIN = {
  type: 'duration',
  compare(a, b) {
    return a.milli - b.milli;
  },
};

Duration.MILLI_VALUES = {
  year: 52 * 7 * 24 * 60 * 60 * 1000, // 52weeks
  quarter: 13 * 7 * 24 * 60 * 60 * 1000, // 13weeks
  month: 28 * 24 * 60 * 60 * 1000, // 4weeks
  week: 7 * 24 * 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  minute: 60 * 1000,
  second: 1000,
  milli: 1,
};

Duration.MONTH_VALUES = {
  year: 12,
  quarter: 3,
  month: 1,
  week: 0,
  day: 0,
  hour: 0,
  minute: 0,
  second: 0,
  milli: 0,
};

// A REAL MONTH IS LARGER THAN THE CANONICAL MONTH
Duration.MONTH_SKEW =
  Duration.MILLI_VALUES.year / 12 - Duration.MILLI_VALUES.month;

// //////////////////////////////////////////////////////////////////////////////
// CONVERT SIMPLE <float><type> TO A DURATION OBJECT
// //////////////////////////////////////////////////////////////////////////////
Duration.String2Duration = text => {
  if (text === '' || text === 'zero') return new Duration();

  let s = 0;

  while (s < text.length && (text.charAt(s) <= '9' || text.charAt(s) === '.'))
    s += 1;

  const output = new Duration();
  const interval = text.rightBut(s);
  const amount = s === 0 ? 1 : JSON.parse(text.left(s));

  if (Duration.MILLI_VALUES[interval] === undefined)
    Log.error(
      `${interval} is not a recognized duration type (did you use the pural form by mistake?`
    );

  if (Duration.MONTH_VALUES[interval] === 0) {
    output.milli = amount * Duration.MILLI_VALUES[interval];
  } else {
    output.milli =
      amount * Duration.MONTH_VALUES[interval] * Duration.MILLI_VALUES.month;
    output.month = amount * Duration.MONTH_VALUES[interval];
  } // endif

  return output;
}; // method

Duration.parse = value => {
  let output = new Duration();
  // EXPECTING CONCAT OF <sign><integer><type>
  const plist = value.split('+');

  for (let p = 0; p < plist.length; p += 1) {
    const mlist = plist[p].split('-');

    output = output.add(Duration.String2Duration(mlist[0]));

    for (let m = 1; m < mlist.length; m += 1) {
      output = output.subtract(Duration.String2Duration(mlist[m]));
    } // for
  } // for

  return output;
}; // method

Duration.max = (a, b) => {
  if (a.month > b.month) {
    return a;
  }

  if (b.month > a.month) {
    return b;
  }

  if (a.milli > b.milli) {
    return a;
  }

  return b;
  // endif
}; // method

Duration.min = (a, b) => {
  if (a.month < b.month) {
    return a;
  }

  if (b.month < a.month) {
    return b;
  }

  if (a.milli < b.milli) {
    return a;
  }

  return b;
  // endif
}; // method

Duration.newInstance = obj => {
  if (obj === undefined) return undefined;

  if (obj === null) return null;
  let output = null;

  if (isNumeric(obj)) {
    output = new Duration();
    output.milli = obj;
  } else if (typeof obj === 'string') {
    return Duration.parse(obj);
  } else if (!(obj.milli === undefined)) {
    output = new Duration();
    output.milli = obj.milli;
    output.month = obj.month;
  } else if (isNaN(obj)) {
    // return null;
  } else {
    Log.error(`Do not know type of object {{obj}} to make a Duration`, { obj });
  } // endif

  return output;
}; // method

Duration.prototype.add = duration => {
  const output = new Duration();

  output.milli = this.milli + duration.milli;
  output.month = this.month + duration.month;

  return output;
}; // method

Duration.prototype.addDay = numDay => this.add(Duration.DAY.multiply(numDay)); // method

Duration.prototype.lt = val => this.milli < val.milli; // method

Duration.prototype.lte = val => this.milli <= val.milli; // method

Duration.prototype.seconds = () => this.milli / 1000.0; // method

Duration.prototype.multiply = amount => {
  const output = new Duration();

  output.milli = this.milli * amount;
  output.month = this.month * amount;

  return output;
}; // method

Duration.prototype.divideBy = amount => {
  if (amount.month !== undefined && amount.month !== 0) {
    let m = this.month;
    let r = this.milli;
    // DO NOT CONSIDER TIME OF DAY
    const tod = r % Duration.MILLI_VALUES.day;

    r -= tod;

    if (m === 0 && r > Duration.MILLI_VALUES.year / 3) {
      m = floor((12 * this.milli) / Duration.MILLI_VALUES.year);
      r -= (m / 12) * Duration.MILLI_VALUES.year;
    } else {
      r -= this.month * Duration.MILLI_VALUES.month;

      if (r >= Duration.MILLI_VALUES.day * 31)
        Log.error('Do not know how to handle');
    } // endif

    r = min(29 / 30, (r + tod) / (Duration.MILLI_VALUES.day * 30));

    const output = floor(m / amount.month) + r;

    return output;
  }

  if (amount.milli === undefined) {
    const output = new Duration();

    output.milli = this.milli / amount;
    output.month = this.month / amount;

    return output;
  }

  return this.milli / amount.milli;
  // endif
}; // method

Duration.prototype.subtract = duration => {
  const output = new Duration();

  output.milli = this.milli - duration.milli;
  output.month = this.month - duration.month;

  return output;
}; // method

Duration.prototype.floor = interval => {
  if (interval === undefined || interval.milli === undefined)
    Log.error('Expecting an interval as a Duration object');
  const output = new Duration();

  if (interval.month !== 0) {
    if (this.month !== 0) {
      output.month = floor(this.month / interval.month) * interval.month;
      //      let rest=(this.milli - (Duration.MILLI_VALUES.month * output.month));
      //      if (rest>Duration.MILLI_VALUES.day*31){  //WE HOPE THIS BIGGER VALUE WILL STILL CATCH POSSIBLE LOGIC PROBLEMS
      //        Log.error("This duration has more than a month's worth of millis, can not handle this rounding");
      //      }//endif
      //      while (rest<0){
      //        output.month-=interval.month;
      //        rest=(this.milli - (Duration.MILLI_VALUES.month * output.month));
      //      }//while
      // //      if (rest>Duration.MILLI_VALUES.month){ //WHEN FLOORING xmonth-1day, THE rest CAN BE 4week+1day, OR MORE.
      output.milli = output.month * Duration.MILLI_VALUES.month;

      return output;
    } // endif

    // A MONTH OF DURATION IS BIGGER THAN A CANONICAL MONTH
    output.month =
      floor((this.milli * 12) / Duration.MILLI_VALUES.year / interval.month) *
      interval.month;
    output.milli = output.month * Duration.MILLI_VALUES.month;
  } else {
    output.milli = floor(this.milli / interval.milli) * interval.milli;
  } // endif

  return output;
}; // method

Duration.prototype.mod = interval => this.subtract(this.floor(interval)); // method

const milliSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500]
  .extend([1, 2, 5, 6, 10, 15, 30].mapExists(v => v * 1000)) // SECONDS
  .extend([1, 2, 5, 6, 10, 15, 30].mapExists(v => v * 60 * 1000)) // MINUTES
  .extend([1, 2, 3, 6, 12].mapExists(v => v * 60 * 60 * 1000)) // HOURS
  .extend([1].mapExists(v => v * 24 * 60 * 60 * 1000)) // DAYS
  .extend([1, 2].mapExists(v => v * 7 * 24 * 60 * 60 * 1000)); // WEEKS
const monthSteps = [1, 2, 6, 12, 24, 60, 120];

/**
 * ROUND desiredInterval (==(max-min)/desiredSteps) TO SOMETHING REASONABLE
 * @param min -
 * @param max -
 * @param desiredSteps - Number of steps you would like to see over [min, max) range
 * @param desiredInterval - Size of the steps you would like to see over [min, max) range
 *
 * @return - Step size closest to the desired amount
 */
Duration.niceSteps = (min, max, desiredSteps, desiredInterval) => {
  const startDuration = Duration.newInstance(min);
  const endDuration = Duration.newInstance(max);
  let interval;

  if (desiredInterval !== null) {
    interval = Duration.newInstance(desiredInterval);
  } else if (desiredSteps !== null) {
    interval = Duration.newInstance(
      endDuration.subtract(startDuration).milli / desiredSteps
    );
  } else {
    interval = Duration.newInstance(
      endDuration.subtract(startDuration).milli / 7
    );
  } // endif

  let milliInterval = 0;
  let monthInterval = -1;

  milliSteps.forEach((i, m) => {
    if (interval.milli >= i) milliInterval = m;
  });

  monthSteps.forEach((i, m) => {
    if (interval.month >= i) monthInterval = m;
  });

  const output = new Duration();

  if (monthInterval >= 0) {
    output.month = monthSteps[monthInterval];
    output.milli = output.month * Duration.MILLI_VALUES.month;
  } else {
    output.milli = milliSteps[milliInterval];
  } // endif

  return output;
}; // function

// //////////////////////////////////////////////////////////////////////////////
// WHAT IS THE MOST COMPACT DATE FORMAT TO DISTINGUISH THE RANGE
// //////////////////////////////////////////////////////////////////////////////
Duration.niceFormat = (min, max, desiredSteps, desiredInterval) => {
  const startDuration = Duration.newInstance(min);
  const endDuration = Duration.newInstance(max);
  let interval;

  if (desiredInterval !== null) {
    interval = Duration.newInstance(desiredInterval);
  } else if (desiredSteps !== null) {
    interval = Duration.newInstance(
      endDuration.subtract(startDuration).milli / desiredSteps
    );
  } else {
    interval = Duration.newInstance(
      endDuration.subtract(startDuration).milli / 7
    );
  } // endif

  let minFormat = 0; // SECONDS

  if (interval.milli >= Duration.MILLI_VALUES.minute) minFormat = 1;

  if (interval.milli >= Duration.MILLI_VALUES.hour) minFormat = 2;

  if (interval.milli >= Duration.MILLI_VALUES.day) minFormat = 3;

  if (interval.milli >= Duration.MILLI_VALUES.month) minFormat = 4;

  if (interval.month >= Duration.MONTH_VALUES.month) minFormat = 4;

  if (interval.month >= Duration.MONTH_VALUES.year) minFormat = 5;

  let maxFormat = 5; // YEAR
  const span = endDuration.subtract(startDuration, interval);

  if (
    span.month < Duration.MONTH_VALUES.year &&
    span.milli < Duration.MILLI_VALUES.day * 365
  )
    maxFormat = 4; // month

  if (
    span.month < Duration.MONTH_VALUES.month &&
    span.milli < Duration.MILLI_VALUES.day * 31
  )
    maxFormat = 3; // day

  if (span.milli < Duration.MILLI_VALUES.day) maxFormat = 2;

  if (span.milli < Duration.MILLI_VALUES.hour) maxFormat = 1;

  if (span.milli < Duration.MILLI_VALUES.minute) maxFormat = 0;

  if (maxFormat <= minFormat) maxFormat = minFormat;

  // INDEX BY [minFormat][maxFormat]
  return [
    [
      'ss.000',
      'mm:ss',
      'HH:mm:ss',
      'days, HH:mm:ss',
      'days, HH:mm:ss',
      'days, HH:mm:ss',
    ],
    ['', 'HH:mm', 'HH:mm', 'days, HH:mm', 'days, HH:mm', 'days, HH:mm'],
    ['', '', 'hours', 'days, HH', 'days, HH:mm', 'days, HH:mm'],
    ['', '', '', 'days', 'days', 'days'],
    ['', '', '', '', 'days', 'days'],
    ['', '', '', '', '', 'days'],
  ][minFormat][maxFormat];
}; // method

Duration.prototype.toString = r => {
  if (this.milli === 0) return 'zero';

  let round = coalesce(r, 'milli');
  let rem;
  let output = '';
  let rest = this.milli - Duration.MILLI_VALUES.month * this.month; // DO NOT INCLUDE THE MONTH'S MILLIS
  const isNegative = rest < 0;

  rest = abs(rest);

  if (round === 'milli') {
    rem = rest % 1000;

    if (rem !== 0) output = `+${rem}milli${output}`;
    rest = floor(rest / 1000);
    round = 'second';
  } else {
    rest /= 1000;
  } // endif

  if (round === 'second') {
    rem = round(rest) % 60;

    if (rem !== 0) output = `+${rem}second${output}`;
    rest = floor(rest / 60);
    round = 'minute';
  } else {
    rest /= 60;
  } // endif

  if (round === 'minute') {
    rem = round(rest) % 60;

    if (rem !== 0) output = `+${rem}minute${output}`;
    rest = floor(rest / 60);
    round = 'hour';
  } else {
    rest /= 60;
  } // endif

  // HOUR
  if (round === 'hour') {
    rem = round(rest) % 24;

    if (rem !== 0) output = `+${rem}hour${output}`;
    rest = floor(rest / 24);
    round = 'day';
  } else {
    rest /= 24;
  } // endif

  // DAY
  if (round === 'day') {
    if (rest < 11 && rest !== 7) {
      rem = rest;
      rest = 0;
    } else {
      rem = rest % 7;
      rest = floor(rest / 7);
      round = 'week';
    } // endif

    if (rem !== 0) output = `+${rem}day${output}`;
  } else {
    rest /= 7;
  } // endif

  // WEEK
  if (round === 'week') {
    rest = round(rest);

    if (rest !== 0) output = `+${rest}week${output}`;
  } // endif

  if (isNegative) output = output.replace('+', '-');

  // MONTH AND YEAR
  if (this.month !== 0) {
    const sign = this.month < 0 ? '-' : '+';
    const month = abs(this.month);

    if (month <= 18 && month !== 12) {
      output = `${sign + month}month${output}`;
    } else {
      const m = month % 12;

      if (m !== 0) output = `${sign + m}month${output}`;
      const y = floor(month / 12);

      output = `${sign + y}year${output}`;
    } // endif
  } // endif

  if (output.charAt(0) === '+') output = output.rightBut(1);

  if (output.charAt(0) === '1' && !isNumeric(output.charAt(1)))
    output = output.rightBut(1);

  return output;
}; // method

Duration.prototype.format = _format => new Date(this.milli).format(_format); // method

// Duration.prototype.format=function(interval, rounding){
//  return this.round(Duration.newInstance(interval), rounding)+interval;
// };//method

Duration.prototype.round = (interval, rounding) => {
  const rounding_ = coalesce(rounding, 0);
  let output = this.divideBy(interval);

  output = round(output, rounding_);

  return output;
}; // method

Duration.ZERO = Duration.newInstance(0);
Duration.SECOND = Duration.newInstance('second');
Duration.MINUTE = Duration.newInstance('minute');
Duration.HOUR = Duration.newInstance('hour');
Duration.DAY = Duration.newInstance('day');
Duration.WEEK = Duration.newInstance('week');
Duration.MONTH = Duration.newInstance('month');
Duration.QUARTER = Duration.newInstance('quarter');
Duration.YEAR = Duration.newInstance('year');

Duration.COMMON_INTERVALS = [
  Duration.newInstance('second'),
  Duration.newInstance('15second'),
  Duration.newInstance('30second'),
  Duration.newInstance('minute'),
  Duration.newInstance('5minute'),
  Duration.newInstance('15minute'),
  Duration.newInstance('30minute'),
  Duration.newInstance('hour'),
  Duration.newInstance('2hour'),
  Duration.newInstance('3hour'),
  Duration.newInstance('6hour'),
  Duration.newInstance('12hour'),
  Duration.newInstance('day'),
  Duration.newInstance('2day'),
  Duration.newInstance('week'),
  Duration.newInstance('2week'),
  Duration.newInstance('month'),
  Duration.newInstance('2month'),
  Duration.newInstance('quarter'),
  Duration.newInstance('6month'),
  Duration.newInstance('year'),
];

export { Duration }; // eslint-disable-line import/prefer-default-export
