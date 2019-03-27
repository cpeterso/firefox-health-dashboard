/* eslint-disable linebreak-style */
import React, { Component } from 'react';
import { frum } from '../vendor/queryOps';
import { missing } from '../vendor/utils';
import { withNavigation } from '../vendor/utils/navigation';
import { TP6_TESTS, TP6M_PAGES } from '../quantum/config';
import { getData } from '../vendor/perfherder';
import generateOptions from '../utils/chartJs/generateOptions';
import { withErrorBoundary } from '../vendor/errors';
import { jx } from '../vendor/jx/expressions';
import { g5Reference } from '../config/mobileG5';
import ChartJSWrapper from '../components/ChartJsWrapper';
import timer from '../vendor/timer';

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
    const readData = timer('read data');
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

    readData.done();

    const processData = timer('process data');
    const recent = data.filter(
      jx({ gte: { push_timestamp: { date: 'today-3month' } } })
    );
    const result = recent
      .edges({
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
      })
      .window({
        // CHECK EACH TEST/SUITE/DAY FOR MISSING VALUES
        name: 'daily',
        edges: ['test', 'suite', 'platform'],
        along: ['pushDate'],
        value: (value, c, values) => {
          const { measured } = value;

          if (c > 0 && measured.length === 0) return values[c - 1];

          return frum(measured)
            .select('value')
            .average();
        },
      })
      .extend({ name: 'reference', cube: g5Reference })
      .window({
        name: 'result',
        edges: ['test', 'platform', 'pushDate'],
        value: row =>
          frum(row.daily, row.reference.value)
            // IF NO REFERENCE VALUE FOR SUITE, DO NOT INCLUDE IN AGGREGATE
            .map((d, r) => (missing(r) ? null : d))
            .average(),
      })
      .window({
        name: 'ref',
        edges: ['test', 'platform'],
        value: row =>
          frum(row.result, row.reference.value)
            // IF NO MEASUREMENT FOR SUITE, THEN DO NOT INCLUDE IN REFERENCE AGGREGATE
            .map((d, r) => {
              const lastMeasure = d[d.length - 2];

              if (missing(lastMeasure)) return null;

              return r;
            })
            .average(),
      })
      .select(['result', 'ref']);

    // SET NORMALIZATION CONSTANTS
    this.setState({ data: result });
    processData.done();
  }

  render() {
    const { data } = this.state;

    if (missing(data)) return null;

    return frum(TP6_TESTS).map(({ label, id }) => {
      const chartData = {
        datasets: data
          .get({ test: id })
          .along('platform')
          .map(row => ({
            label: row.getValue('platform'),
            type: 'line',
            data: row
              .along('pushDate')
              .map(row => ({
                x: row.getValue('pushDate'),
                y: row.getValue('result'),
              }))
              .toArray(),
          }))
          .append({
            label: 'Fennec 64',
            type: 'line',
            data: data
              .get({ test: id, platform: 'android-hw-g5-7-0-arm7-api-16' })
              .along('pushDate')
              .map(row => ({
                x: row.getValue('pushDate'),
                y: row.getValue('ref'),
              }))
              .toArray(),
          })
          .toArray(),
      };

      return (
        <ChartJSWrapper
          key={label}
          title={label}
          type="line"
          data={chartData}
          height={200}
          options={generateOptions()}
        />
      );
    });
  }
}

export default withNavigation([])(withErrorBoundary(TP6mAggregate));
