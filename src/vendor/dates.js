/* eslint-disable linebreak-style */
/* eslint-disable max-len */
/* eslint-disable no-underscore-dangle */

import { isNumeric, coalesce } from './utils';
import { Duration } from './durations';
import { sign, ceiling, floor, abs, round } from './math';

const Date = value => {
  if (value === undefined || value === null) return null;

  if (typeof value === 'string') {
    const newval = Date.tryParse(value);

    if (newval !== null) return newval;
  } // endif

  if (isNumeric(value)) {
    value -= 0;

    if (value <= 9999999999) {
      // TOO SMALL, MUST BE A UNIX TIMESTAMP
      return new Date(value * 1000);
    }

    return new Date(value);
    // endif
  } // endif

  return new Date(value);
}; // method

if (Date.now) {
  Date.currentTimestamp = Date.now;
} else {
  Date.currentTimestamp = function currentTimestamp() {
    new Date().getTime();
  }; // method
} // endif

Date.now = () => new Date(); // method

Date.eod = () => new Date().ceilingDay(); // method

Date.today = () => new Date().floorDay(); // method

Date.min = () => {
  let min = null;

  for (let i = 0; i < arguments.length; i += 1) {
    const v = arguments[i];

    if (v === undefined || v === null) continue;

    if (min === null || min > v) min = v;
  } // for

  return min;
}; // method

Date.max = (...args) => {
  let max = null;

  args.forEach(a => {
    if (a === null) return;

    if (max === null || max < arguments[i]) max = a;
  }); // for

  return max;
}; // method

Date.prototype.getMilli = Date.prototype.getTime;
Date.prototype.milli = Date.prototype.getTime;
Date.prototype.unix = () =>
  // RETURN NUMBER OF SECONDS SINCE EPOCH
  this.milli() / 1000.0; // function

Date.prototype.between = (min, max) => {
  if (min === null) return null; // NULL MEANS UNKNOWN, SO between() IS UNKNOWN

  if (max === null) return null;

  // UNDEFINED MEANS DO-NOT-CARE
  if (min !== undefined) {
    if (min.getMilli) min = min.getMilli();

    if (this.getMilli() < min) return false;
  } // endif

  if (max !== undefined) {
    if (max.getMilli) max = max.getMilli();

    if (max <= this.getMilli()) return false;
  } // endif

  return true;
}; // method

Date.prototype.add = interval => {
  if (interval === undefined || interval === null) {
    Log.error('expecting an interval to add');
  } // endif

  const i = Duration.newInstance(interval);
  const addMilli = i.milli - Duration.MILLI_VALUES.month * i.month;

  return this.addMonth(i.month).addMilli(addMilli);
}; // method

Date.prototype.subtract = (time, interval) => {
  if (typeof time === 'string')
    Log.error('expecting to subtract a Duration or Date object, not a string');

  if (interval === undefined || interval.month === 0) {
    if (time.getMilli) {
      // SUBTRACT TIME
      return Duration.newInstance(this.getMilli() - time.getMilli());
    }

    // SUBTRACT DURATION
    const residue = time.milli - Duration.MILLI_VALUES.month * time.month;

    return this.addMonth(-time.month).addMilli(-residue);
    // endif
  }

  if (time.getMilli) {
    // SUBTRACT TIME
    return Date.diffMonth(this, time);
  }

  // SUBTRACT DURATION
  return this.addMilli(-time.milli);
  // endif
  // endif
}; // method

// RETURN THE NUMBER OF WEEKDAYS BETWWEN GIVEN TIMES
Date.diffWeekday = (endTime, startTime) => {
  let out = 0;

  {
    // TEST
    if (startTime <= endTime) {
      for (
        let d = startTime;
        d.getMilli() < endTime.getMilli();
        d = d.addDay(1)
      ) {
        if (![6, 0].contains(d.dow())) out += 1;
      } // for
    } else {
      for (
        let d = endTime;
        d.getMilli() < startTime.getMilli();
        d = d.addDay(1)
      ) {
        if (![6, 0].contains(d.dow())) out -= 1;
      } // for
    } // endif
  }

  // SHIFT SO SATURDAY IS START OF WEEK
  endTime = endTime.addDay(1);
  startTime = startTime.addDay(1);

  if ([0, 1].contains(startTime.dow())) {
    startTime = startTime.floorWeek().addDay(2);
  } // endif

  if ([0, 1].contains(endTime.dow())) {
    endTime = endTime.floorWeek();
  } // endif

  const startWeek = startTime.addWeek(1).floorWeek();
  const endWeek = endTime.addMilli(-1).floorWeek();
  const output =
    (startWeek.getMilli() -
      startTime.getMilli() +
      ((endWeek.getMilli() - startWeek.getMilli()) / 7) * 5 +
      (endTime.getMilli() - endWeek.addDay(2).getMilli())) /
    Duration.DAY.milli;

  if (out !== sign(output) * ceiling(abs(output)))
    Log.error('Weekday calculation failed internal test');

  return output;
}; // method

Date.diffMonth = (endTime, startTime) => {
  // MAKE SURE WE HAVE numMonths THAT IS TOO BIG;
  let numMonths = floor(
    ((endTime.getMilli() -
      startTime.getMilli() +
      Duration.MILLI_VALUES.day * 31) /
      Duration.MILLI_VALUES.year) *
      12
  );
  let test = startTime.addMonth(numMonths);

  while (test.getMilli() > endTime.getMilli()) {
    numMonths -= 1;
    test = startTime.addMonth(numMonths);
  } // while

  // //////////////////////////////////////////////////////////////////////////
  // TEST
  let testMonth = 0;

  while (startTime.addMonth(testMonth).getMilli() <= endTime.getMilli()) {
    testMonth += 1;
  } // while

  testMonth -= 1;

  if (testMonth !== numMonths)
    Log.error(
      `Error calculating number of months between (${startTime.format(
        'yy-MM-dd HH:mm:ss'
      )}) and (${endTime.format('yy-MM-dd HH:mm:ss')})`
    );
  // DONE TEST
  // //////////////////////////////////////////////////////////////////////////

  const output = new Duration();

  output.month = numMonths;
  output.milli =
    endTime.getMilli() -
    startTime.addMonth(numMonths).getMilli() +
    numMonths * Duration.MILLI_VALUES.month;

  //  if (output.milli>=Duration.MILLI_VALUES.day*31)
  //    Log.error("problem");
  return output;
}; // method

Date.prototype.dow = Date.prototype.getUTCDay;

// CONVERT THIS GMT DATE TO LOCAL DATE
Date.prototype.addTimezone = () => this.addMinute(-this.getTimezoneOffset());

// CONVERT THIS LOCAL DATE TO GMT DATE
Date.prototype.subtractTimezone = () =>
  this.addMinute(this.getTimezoneOffset());

Date.prototype.addMilli = value => new Date(this.getMilli() + value); // method

Date.prototype.addSecond = value => {
  const output = new Date(this);

  output.setUTCSeconds(this.getUTCSeconds() + value);

  return output;
}; // method

Date.prototype.addMinute = value => {
  const output = new Date(this);

  output.setUTCMinutes(this.getUTCMinutes() + value);

  return output;
}; // method

Date.prototype.addHour = value => {
  const output = new Date(this);

  output.setUTCHours(this.getUTCHours() + value);

  return output;
}; // method

Date.prototype.addDay = value => {
  const value_ = coalesce(value, 1);
  const output = new Date(this);

  output.setUTCDate(this.getUTCDate() + value_);

  return output;
}; // method

Date.prototype.addWeekday = value => {
  let output = this.addDay(1);

  if ([0, 1].contains(output.dow())) output = output.floorWeek().addDay(2);

  const weeks = floor(value / 5);

  value -= weeks * 5;
  output = output.addDay(value);

  if ([0, 1].contains(output.dow())) output = output.floorWeek().addDay(2);

  output = output.addWeek(weeks).addDay(-1);

  return output;
}; // method

Date.prototype.addWeek = value => {
  const value_ = coalesce(value, 1);
  const output = new Date(this);

  output.setUTCDate(this.getUTCDate() + value_ * 7);

  return output;
}; // method

Date.prototype.addMonth = value => {
  if (value === 0) return this; // WHOA! SETTING MONTH IS CRAZY EXPENSIVE!!
  const output = new Date(this);

  output.setUTCMonth(this.getUTCMonth() + value);

  return output;
}; // method

Date.prototype.addYear = value => {
  const output = new Date(this);

  output.setUTCFullYear(this.getUTCFullYear() + value);

  return output;
}; // method

// RETURN A DATE ROUNDED DOWN TO THE CLOSEST FULL INTERVAL
Date.prototype.floor = (interval, minDate) => {
  if (minDate === undefined) {
    if (interval.month !== undefined && interval.month > 0) {
      if (interval.month % 12 === 0) {
        return this.addMonth(-interval.month + 12).floorYear();
      }

      if ([1, 2, 3, 4, 6].contains(interval.month)) {
        const temp = this.floorYear();

        return temp.add(this.subtract(temp).floor(interval));
      }

      Log.error(`Can not floor interval '${interval.toString()}'`);
      // endif
    } // endif

    let intervalStr;

    if (interval.milli !== undefined) {
      intervalStr = interval.toString();
    } else {
      intervalStr = interval;
      interval = Duration.newInstance(intervalStr);
    } // endif

    if (intervalStr.indexOf('year') >= 0) return this.floorYear();

    if (intervalStr.indexOf('month') >= 0) return this.floorMonth();

    if (intervalStr.indexOf('week') >= 0) return this.floorWeek();

    if (intervalStr.indexOf('day') >= 0) return this.floorDay();

    if (intervalStr.indexOf('hour') >= 0) return this.floorHour();
    Log.error(`Can not floor interval '${intervalStr}'`);
  } // endif

  return minDate.add(this.subtract(minDate).floor(interval));
}; // method

Date.prototype.floorYear = () => {
  const output = new Date(this);

  output.setUTCMonth(0, 1);
  output.setUTCHours(0, 0, 0, 0);

  return output;
}; // method

Date.prototype.floorMonth = () => {
  const output = new Date(this);

  output.setUTCDate(1);
  output.setUTCHours(0, 0, 0, 0);

  return output;
}; // method

Date.prototype.floorWeek = () => {
  const output = new Date(this);

  output.setUTCDate(this.getUTCDate() - this.getUTCDay());
  output.setUTCHours(0, 0, 0, 0);

  return output;
}; // method

Date.prototype.floorDay = () => {
  const output = new Date(this);

  output.setUTCHours(0, 0, 0, 0);

  return output;
}; // method

Date.prototype.floorHour = () => {
  const output = new Date(this);

  output.setUTCMinutes(0);

  return output;
}; // method

Date.prototype.ceilingDay = () => this.floorDay().addDay(1); // method

Date.prototype.ceilingWeek = () => this.floorWeek().addWeek(1); // method

Date.prototype.ceilingMonth = () => this.floorMonth().addMonth(1); // method

Date.prototype.ceiling = interval => this.floor(interval).add(interval); // method

// ------------------------------------------------------------------
// These functions use the same 'format' strings as the
// java.text.SimpleDateFormat class, with minor exceptions.
// The format string consists of the following abbreviations:
//
// Field        | Full Form          | Short Form
// -------------+--------------------+-----------------------
// Year         | yyyy (4 digits)    | yy (2 digits), y (2 or 4 digits)
// Month        | MMM (name or abbr.)| MM (2 digits), M (1 or 2 digits)
//              | NNN (abbr.)        |
// Day of Month | dd (2 digits)      | d (1 or 2 digits)
// Day of Week  | EE (name)          | E (abbr)
// Hour (1-12)  | hh (2 digits)      | h (1 or 2 digits)
// Hour (0-23)  | HH (2 digits)      | H (1 or 2 digits)
// Hour (0-11)  | KK (2 digits)      | K (1 or 2 digits)
// Hour (1-24)  | kk (2 digits)      | k (1 or 2 digits)
// Minute       | mm (2 digits)      | m (1 or 2 digits)
// Second       | ss (2 digits)      | s (1 or 2 digits)
// MilliSecond  | fff (3 digits)     |
// MicroSecond  | ffffff (6 digits)  |
// AM/PM        | a                  |
//
// NOTE THE DIFFERENCE BETWEEN MM and mm! Month=MM, not mm!
// Examples:
//  "MMM d, y" matches: January 01, 2000
//                      Dec 1, 1900
//                      Nov 20, 00
//  "M/d/yy"   matches: 01/20/00
//                      9/2/00
//  "MMM dd, yyyy hh:mm:ssa" matches: "January 01, 2000 12:30:45AM"
// ------------------------------------------------------------------

Date.MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
Date.DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
];
Date.LZ = x => (x < 0 || x > 9 ? '' : '0') + x;

Date.KEYS = [
  'ffffff',
  'hours',
  'yyyy',
  'days',
  'fff',
  'MMM',
  'NNN',
  'yy',
  'MM',
  'dd',
  'HH',
  'E',
  'EE',
  'hh',
  'KK',
  'kk',
  'mm',
  'ss',
  'd',
  'H',
  'h',
  'K',
  'k',
  's',
  'a',
  'm',
  'y',
  'M',
];

// ------------------------------------------------------------------
// formatDate (date_object, format)
// Returns a date in the output format specified.
// The format string uses the same abbreviations as in getDateFromFormat()
// ------------------------------------------------------------------
Date.prototype.format = format => {
  const y = `${this.getUTCFullYear()}`;
  const M = this.getUTCMonth() + 1;
  const d = this.getUTCDate();
  const E = this.getUTCDay();
  const H = this.getUTCHours();
  const m = this.getUTCMinutes();
  const s = this.getUTCSeconds();
  const f = this.getUTCMilliseconds();
  const v = {};

  v.y = y;
  v.yyyy = y;
  v.yy = y.substring(2, 4);
  v.M = M;
  v.MM = Date.LZ(M);
  v.MMM = Date.MONTH_NAMES[M - 1];
  v.NNN = Date.MONTH_NAMES[M + 11];
  v.days = (() => {
    if (d === 1) return '';

    if (d === 2) return '1 day';

    return `${d - 1} days`;
  })();
  v.d = d;
  v.dd = Date.LZ(d);
  v.E = Date.DAY_NAMES[E + 7];
  v.EE = Date.DAY_NAMES[E];
  v.H = H;
  v.HH = Date.LZ(H);
  v.h = ((H + 11) % 12) + 1;
  v.hh = Date.LZ(v.h);
  v.hours = `${(d - 1) * H} hours`;
  v.K = H % 12;
  v.KK = Date.LZ(v.K);
  v.k = H + 1;
  v.kk = Date.LZ(v.k);
  v.a = ['AM', 'PM'][floor(H / 12)];
  v.m = m;
  v.mm = Date.LZ(m);
  v.s = s;
  v.ss = Date.LZ(s);
  v.fff = f;
  v.ffffff = f * 1000;

  let output = '';

  for (let index = 0; index < format.length; index += 1) {
    let i = 0;

    for (; i < Date.KEYS.length; i += 1) {
      const k = Date.KEYS[i];

      if (format.substring(index, index + k.length) === k) {
        output += v[k];
        index += k.length - 1;
        break;
      } // endif
    } // for

    if (i === Date.KEYS.length) {
      output += format.charAt(index);
    } // endif
  } // for

  return output;
};

Date.Timezones = {
  GMT: 0,
  EST: -5,
  CST: -6,
  MST: -7,
  PST: -8,
};

Date.getTimezone = () => {
  Log.warning('Date.getTimezone is incomplete!');
  Date.getTimezone = () => {
    const offset = new Date().getTimezoneOffset();

    // CHEAT AND SIMPLY GUESS
    if (offset === 240 || offset === 300) return 'EDT';

    if (offset === 420 || offset === 480) return 'PDT';

    return `(${round(offset / 60)}GMT)`;
  };

  return Date.getTimezone();
};

// //////////////////////////////////////////////////////////////////////////////
// WHAT IS THE MOST COMPACT DATE FORMAT TO DISTINGUISH THE RANGE
// //////////////////////////////////////////////////////////////////////////////
Date.niceFormat = ({ type, min, max, interval }) => {
  if (!['date', 'time'].contains(type)) Log.error('Expecting a time domain');

  let minFormat = 0; // SECONDS

  if (interval.milli >= Duration.MILLI_VALUES.minute) minFormat = 1;

  if (interval.milli >= Duration.MILLI_VALUES.hour) minFormat = 2;

  if (interval.milli >= Duration.MILLI_VALUES.day) minFormat = 3;

  if (interval.milli >= Duration.MILLI_VALUES.month) minFormat = 4;

  if (interval.month >= Duration.MONTH_VALUES.month) minFormat = 4;

  if (interval.month >= Duration.MONTH_VALUES.year) minFormat = 5;

  let maxFormat = 5; // year
  const span = max.subtract(min, interval);

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
      'NNN dd, HH:mm:ss',
      'NNN dd, HH:mm:ss',
      'dd-NNN-yyyy HH:mm:ss',
    ],
    ['', 'HH:mm', 'HH:mm', 'E dd, HH:mm', 'NNN dd, HH:mm', 'dd-NNN-yyyy HH:mm'],
    ['', '', 'HH:mm', 'E dd, HH:mm', 'NNN dd, HH:mm', 'dd-NNN-yyyy HH:mm'],
    ['', '', '', 'E dd', 'NNN dd', 'dd-NNN-yyyy'],
    ['', '', '', '', 'NNN', 'NNN yyyy'],
    ['', '', '', '', '', 'yyyy'],
  ][minFormat][maxFormat];
}; // method

Date.getBestInterval = (minDate, maxDate, requestedInterval, { min, max }) => {
  let dur = maxDate.subtract(minDate);

  if (dur.milli > Duration.MONTH.milli * min) {
    dur = maxDate.subtract(minDate, Duration.MONTH);

    const biggest = dur.divideBy(min).month;

    return coalesce(
      Duration.COMMON_INTERVALS.reverse().find(d => biggest > d.month),
      Duration.COMMON_INTERVALS[0]
    );
  }

  const requested = requestedInterval.milli;
  const smallest = dur.divideBy(max).milli;
  const biggest = dur.divideBy(min).milli;

  if (smallest <= requested && requested < biggest) return requestedInterval;

  if (requested > biggest) {
    return coalesce(
      Duration.COMMON_INTERVALS.reverse().find(d => biggest > d.milli),
      Duration.COMMON_INTERVALS[0]
    );
  }

  if (requested < smallest) {
    coalesce(
      Duration.COMMON_INTERVALS.find(d => smallest <= d.milli),
      last(Duration.COMMON_INTERVALS)
    );
  }
};

// ------------------------------------------------------------------
// Utility functions for parsing in getDateFromFormat()
// ------------------------------------------------------------------
function _isInteger(val) {
  const digits = '1234567890';

  for (let i = 0; i < val.length; i += 1) {
    if (digits.indexOf(val.charAt(i)) === -1) {
      return false;
    }
  }

  return true;
}

function _getInt(str, i, minlength, maxlength) {
  for (let x = maxlength; x >= minlength; x -= 1) {
    const token = str.substring(i, i + x);

    if (token.length < minlength) {
      return null;
    }

    if (_isInteger(token)) {
      return token;
    }
  }

  return null;
}

function internalChecks(year, month, date, hh_, mm, ss, fff, ampm) {
  // Is date valid for month?
  if (month === 2) {
    // LEAP YEAR
    if ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) {
      if (date > 29) return 0;
    } else if (date > 28) return 0; // endif
  } // endif

  if (month === 4 || month === 6 || month === 9 || month === 11) {
    if (date > 30) return 0;
  } // endif

  // Correct hours value
  let hh = hh_;

  if (hh_ < 12 && ampm === 'PM') {
    hh = hh_ - 0 + 12;
  } else if (hh_ > 11 && ampm === 'AM') {
    hh -= 12;
  } // endif

  const newDate = new Date(Date.UTC(year, month - 1, date, hh, mm, ss, fff));

  // newDate=newDate.addMinutes(new Date().getTimezoneOffset());
  return newDate;
} // method

// ------------------------------------------------------------------
// getDateFromFormat( date_string , format_string, isPastDate )
//
// This function takes a date string and a format string. It matches
// If the date string matches the format string, it returns the
// getTime() of the date. If it does not match, it returns 0.
// isPastDate ALLOWS DATES WITHOUT YEAR TO GUESS THE RIGHT YEAR
// THE DATE IS EITHER EXPECTED TO BE IN THE PAST (true) WHEN FILLING
// OUT A TIMESHEET (FOR EXAMPLE) OR IN THE FUTURE (false) WHEN
// SETTING AN APPOINTMENT DATE
// ------------------------------------------------------------------
Date.getDateFromFormat = (val_, format_, isPastDate) => {
  const val = `${val_}`;
  const format = `${format_}`;
  let valueIndex = 0;
  let formatIndex = 0;
  let token = '';
  let x;
  let y;
  const now = new Date();
  // DATE BUILDING VARIABLES
  let year = null;
  let month = now.getMonth() + 1;
  let dayOfMonth = 1;
  let hh = 0;
  let mm = 0;
  let ss = 0;
  let fff = 0;
  let ampm = '';

  while (formatIndex < format.length) {
    // Get next token from format string
    token = '';
    const c = format.charAt(formatIndex);

    while (format.charAt(formatIndex) === c && formatIndex < format.length) {
      token += format.charAt((formatIndex += 1));
    } // while

    // Extract contents of value based on format token
    if (token === 'yyyy' || token === 'yy' || token === 'y') {
      if (token === 'yyyy') {
        x = 4;
        y = 4;
      }

      if (token === 'yy') {
        x = 2;
        y = 2;
      }

      if (token === 'y') {
        x = 2;
        y = 4;
      }

      year = _getInt(val, valueIndex, x, y);

      if (year === null) return 0;
      valueIndex += year.length;

      if (year.length === 2) {
        if (year > 70) {
          year = 1900 + (year - 0);
        } else {
          year = 2000 + (year - 0);
        }
      }
    } else if (token === 'MMM' || token === 'NNN') {
      month = 0;

      for (let i = 0; i < Date.MONTH_NAMES.length; i += 1) {
        const monthName = Date.monthNameS[i];
        let prefixLength = 0;

        while (
          val.charAt(valueIndex + prefixLength).toLowerCase() ===
          monthName.charAt(prefixLength).toLowerCase()
        ) {
          prefixLength += 1;
        } // while

        if (prefixLength >= 3) {
          if (token === 'MMM' || (token === 'NNN' && i > 11)) {
            month = i + 1;

            if (month > 12) {
              month -= 12;
            }

            valueIndex += prefixLength;
            break;
          }
        }
      }

      if (month < 1 || month > 12) {
        return 0;
      }
    } else if (token === 'EE' || token === 'E') {
      for (let i = 0; i < Date.DAY_NAMES.length; i += 1) {
        const dayName = Date.DAY_NAMES[i];

        if (
          val
            .substring(valueIndex, valueIndex + dayName.length)
            .toLowerCase() === dayName.toLowerCase()
        ) {
          valueIndex += dayName.length;
          break;
        }
      }
    } else if (token === 'MM' || token === 'M') {
      month = _getInt(val, valueIndex, token.length, 2);

      if (month === null || month < 1 || month > 12) {
        return 0;
      }

      valueIndex += month.length;
    } else if (token === 'dd' || token === 'd') {
      dayOfMonth = _getInt(val, valueIndex, token.length, 2);

      if (dayOfMonth === null || dayOfMonth < 1 || dayOfMonth > 31) {
        return 0;
      }

      valueIndex += dayOfMonth.length;
    } else if (token === 'hh' || token === 'h') {
      hh = _getInt(val, valueIndex, token.length, 2);

      if (hh === null || hh < 1 || hh > 12) {
        return 0;
      }

      valueIndex += hh.length;
    } else if (token === 'HH' || token === 'H') {
      hh = _getInt(val, valueIndex, token.length, 2);

      if (hh === null || hh < 0 || hh > 23) {
        return 0;
      }

      valueIndex += hh.length;
    } else if (token === 'KK' || token === 'K') {
      hh = _getInt(val, valueIndex, token.length, 2);

      if (hh === null || hh < 0 || hh > 11) {
        return 0;
      }

      valueIndex += hh.length;
    } else if (token === 'kk' || token === 'k') {
      hh = _getInt(val, valueIndex, token.length, 2);

      if (hh === null || hh < 1 || hh > 24) {
        return 0;
      }

      valueIndex += hh.length;
      hh -= 1;
    } else if (token === 'mm' || token === 'm') {
      mm = _getInt(val, valueIndex, token.length, 2);

      if (mm === null || mm < 0 || mm > 59) {
        return 0;
      }

      valueIndex += mm.length;
    } else if (token === 'ss' || token === 's') {
      ss = _getInt(val, valueIndex, token.length, 2);

      if (ss === null || ss < 0 || ss > 59) {
        return 0;
      }

      valueIndex += ss.length;
    } else if (token === 'fff') {
      fff = _getInt(val, valueIndex, token.length, 3);

      if (fff === null || fff < 0 || fff > 999) {
        return 0;
      }

      valueIndex += fff.length;
    } else if (token === 'ffffff') {
      fff = _getInt(val, valueIndex, token.length, 6);

      if (fff === null || fff < 0 || fff > 999999) {
        return 0;
      }

      fff /= 1000;
      valueIndex += fff.length;
    } else if (token === 'a') {
      if (val.substring(valueIndex, valueIndex + 2).toLowerCase() === 'am') {
        ampm = 'AM';
      } else if (
        val.substring(valueIndex, valueIndex + 2).toLowerCase() === 'pm'
      ) {
        ampm = 'PM';
      } else {
        return 0;
      }

      valueIndex += 2;
    } else if (token.trim() === '') {
      while (val.charCodeAt(valueIndex) <= 32) valueIndex += 1;
    } else {
      if (val.substring(valueIndex, valueIndex + token.length) !== token) {
        return 0;
      }

      valueIndex += token.length;
    } // endif
  }

  // If there are any trailing characters left in the value, it doesn't match
  if (valueIndex !== val.length) return 0;

  if (year == null) {
    // WE HAVE TO GUESS THE YEAR
    year = now.getFullYear();
    const oldDate = now.getTime() - 86400000;
    const newDate = internalChecks(
      year,
      month,
      dayOfMonth,
      hh,
      mm,
      ss,
      fff,
      ampm
    );

    if (isPastDate) {
      if (newDate !== 0 && `${newDate}` < `${oldDate}`) return newDate;

      return internalChecks(year - 1, month, dayOfMonth, hh, mm, ss, fff, ampm);
    }

    if (newDate !== 0 && `${newDate}` > `${oldDate}`) return newDate;

    return internalChecks(year + 1, month, dayOfMonth, hh, mm, ss, fff, ampm);
    // endif
  } // endif

  return internalChecks(year, month, dayOfMonth, hh, mm, ss, fff, ampm);
}; // method

// ------------------------------------------------------------------
// parseDate( date_string [,isPastDate])
//
// This function takes a date string and tries to match it to a
// number of possible date formats to get the value. It will try to
// match against the following international formats, in this order:
// y-M-d   MMM d, y   MMM d,y   y-MMM-d   d-MMM-y  MMM d
// M/d/y   M-d-y      M.d.y     MMM-d     M/d      M-d
// d/M/y   d-M-y      d.M.y     d-MMM     d/M      d-M
// ------------------------------------------------------------------
{
  const generalFormats = [
    'EE MMM d, yyyy',
    'EE MMM d, yyyy @ hh:mm a',
    'y M d',
    'y - M - d',
    'yyyy - MM - dd HH : mm : ss',
    'MMM d, y',
    'MMM d y',
    'MMM d',
    'y - MMM - d',
    'yyyyMMMd',
    'd - MMM - y',
    'd MMM y',
  ];
  const monthFirst = [
    'M / d / y',
    'M - d - y',
    'M . d . y',
    'MMM - d',
    'M / d',
    'M - d',
  ];
  const dateFirst = [
    'd / M / y',
    'd - M - y',
    'd . M . y',
    'd - MMM',
    'd / M',
    'd - M',
  ];

  Date.CheckList = []
    .extend(generalFormats)
    .extend(dateFirst)
    .extend(monthFirst);
}

Date.tryParse = (val_, isFutureDate) => {
  const val = val_.trim();
  let d = null;

  for (let i = 0; i < Date.CheckList.length; i += 1) {
    d = Date.getDateFromFormat(
      val,
      Date.CheckList[i],
      !coalesce(isFutureDate, false)
    );

    if (d !== 0) {
      const temp = Date.CheckList[i];

      Date.CheckList.splice(i, 1);
      Date.CheckList.prepend(temp);

      return d;
    } // endif
  } // for

  return null;
}; // method

Date.EPOCH = Date.newInstance('1/1/1970');

Date.range = ({ min, max, interval }) => {
  const output = [];
  const min_ = Date.newInstance(min);
  const max_ = Date.newInstance(max);
  const interval_ = Duration.newInstance(interval);
  let acc = min_;

  for (; acc < max_; acc = acc.add(interval_)) {
    output.push(acc);
  } // for

  return output;
};

export { Date }; // eslint-disable-line import/prefer-default-export
