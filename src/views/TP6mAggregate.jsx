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
import { average } from '../vendor/math';
import { reference } from '../config/mobileG5';

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
    const g5Reference = reference
      .map(row => tests.map(test => ({ test, value: row[test], ...row })))
      .flatten()
      .edges({
        edges: ['test', 'suite', 'platform'],
      });
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
        if (c > 0 && value.measured.length === 0) return values.daily[c - 1];

        return average(value);
      },
    });
    const addRef = fillHoles.leftJoin({
      name: 'reference',
      edges: ['test', 'suite', 'platform'],
      value: g5Reference,
    });
    const final = addRef.window({
      name: 'result',
      edges: ['test', 'pushDate'],
      value: row => ({
        average: row.daily.average() / row.reference.value,
        reference: row.reference.value,
      }),
    });

    // DAILY AGGREGATE

    // FOR EACH TEST
    // SET NORMALIZATION CONSTANTS
    // const minDate = Date.today().addMonths(-3);

    frum(data)
      .filter(jx({ gte: { datetime: { date: 'today-3month' } } }))
      .edges([
        'test',
        {
          name: 'timestamp',
          value: 'push_timestamp',
          domain: {
            type: 'time',
            min: 'today-3month',
            max: 'today',
            interval: 'day',
          },
        },
      ])
      .select('value')
      .aggregate('average');

    frum(TP6_TESTS);

    this.setState({ data });
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
