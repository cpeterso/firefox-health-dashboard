/* eslint-disable linebreak-style */
import React, { Component } from 'react';
import Chart from 'react-chartjs-2';
import { frum } from '../vendor/queryOps';
import { missing } from '../vendor/utils';
import { withNavigation } from '../vendor/utils/navigation';
import { TP6_TESTS, TP6M_PAGES } from '../quantum/config';
import { getData } from '../vendor/perfherder';
import generateOptions from '../utils/chartJs/generateOptions';
import { withErrorBoundary } from '../vendor/errors';
import { jx } from '../vendor/jx/expressions';
import { g5Reference } from '../config/mobileG5';
import { Log } from '../vendor/logs';

class TP6mAggregate extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    // ALL LOADTIME FOR ALL SUITES IN SET
    const pages = frum(TP6M_PAGES);
    // WHAT ARE THE SIGNATURES OF THE loadtime?
    const tests = frum(TP6_TESTS).select('id');
    const data = await getData(pages.select('framework'), {
      and: [
        { eq: { platform: 'android-hw-g5-7-0-arm7-api-16' } },
        { prefix: { suite: 'raptor-tp6m-' } },
        { in: { test: tests } },
        {
          or: pages.select({
            eq: ['suite', 'framework', 'platform'],
          }),
        },
      ],
    });
    const recent = data.filter(
      jx({ gte: { push_timestamp: { date: 'today-3month' } } })
    );
    const temp = recent.edges({
      name: 'measured',
      edges: [
        'test',
        {
          name: 'pushDate',
          value: 'push_timestamp',
          domain: {
            type: 'time',
            min: 'today-3month',
            max: 'today',
            interval: 'day',
          },
        },
        'suite',
        'platform',
      ],
    });
    // CHECK EACH TEST/SUITE/DAY FOR MISSING VALUES
    const fillHoles = temp.window({
      name: 'daily',
      edges: ['test', 'suite', 'platform'],
      sort: ['pushDate'],
      value: (value, c, values) => {
        const { measured } = value;

        if (c > 0 && measured.length === 0) return values[c - 1];

        return frum(measured)
          .select('value')
          .average();
      },
    });
    const addRef = fillHoles.extend({name: 'reference', cube: g5Reference});
    const final = addRef
      .window({
        name: 'result',
        edges: ['platform', 'test', 'pushDate'],
        value: row => {
          try {
            const suites = row.daily;
            const ref = row.reference.value;

            if (ref.length !== suites.length) {
              Log.error('not expected');
            }

            const result = frum(suites, ref)
              .map((s, r) => {
                if (r === 0) {
                  Log.warning('not expected');
                }

                return s / r;
              })
              .average();

            return result;
          } catch (error) {
            return null;
          }
        },
      })
      .select("result");

    // SET NORMALIZATION CONSTANTS
    this.setState({ data: final.select('result') });
  }

  render() {
    const { data } = this.state;

    if (missing(data)) return null;

    return frum(TP6_TESTS).map(({ label }) => (
      <Chart
        key={label}
        type="line"
        data={data}
        height="200"
        options={generateOptions()}
      />
    ));
  }
}

export default withNavigation([])(withErrorBoundary(TP6mAggregate));
