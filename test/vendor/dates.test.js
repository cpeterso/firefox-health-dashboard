/* eslint-disable linebreak-style */

import Date from '../../src/vendor/dates';

describe('dates', () => {
  it('gmt', () => {
    expect(Date('1970 jan 1')).toEqual(0);
  });

  it('today', () => {
    expect(Date.today().unix() % (24 * 60 * 60)).toEqual(0);
  });

  it('epoch', () => {
    const timezone = Date('1970 jan 1')
      .floorDay()
      .unix();

    // eslint-disable-next-line no-console
    console.log(`timezone=${timezone / (60 * 60)}hours`);
    expect(timezone).toEqual(0);
  });
});
