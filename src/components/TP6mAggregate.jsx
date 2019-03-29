/* eslint-disable linebreak-style */
import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid/Grid';
import CircularProgress from '@material-ui/core/CircularProgress/CircularProgress';
import { withStyles } from '@material-ui/core/styles';
import { chainFrom } from '../vendor/vectors';
import { last, missing } from '../vendor/utils';
import { geomean } from '../vendor/math';
import { TP6_TESTS, TP6M_PAGES } from '../quantum/config';
import { getData } from '../vendor/perfherder';
import generateOptions from '../utils/chartJs/generateOptions';
import { withErrorBoundary } from '../vendor/errors';
import { jx } from '../vendor/jx/expressions';
import { g5Reference } from '../config/mobileG5';
import ChartJSWrapper from './ChartJsWrapper';
import timer from '../vendor/timer';
import generateDatasetStyle from '../utils/chartJs/generateDatasetStyle';
import SETTINGS from '../settings';

const styles = () => ({
  title: {
    color: '#56565a',
    fontSize: '1rem',
    backgroundColor: '#d1d2d3',
    padding: '.2rem .3rem .3rem .3rem',
    margin: '0 1rem 0 0',
  },
  linkIcon: {
    marginLeft: '0.2rem',
    marginBottom: -5,
  },
});

class TP6mAggregate extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    // ALL LOADTIME FOR ALL SUITES IN SET
    const pages = chainFrom(TP6M_PAGES);
    // WHAT ARE THE SIGNATURES OF THE loadtime?
    const tests = chainFrom(TP6_TESTS).select('id');
    const readData = timer('read data');
    const data = await getData(pages.select('framework'), {
      and: [
        {
          in: {
            platform: [
              'android-hw-g5-7-0-arm7-api-16',
              'android-hw-g5-7-0-arm7-api-16-pgo',
            ],
          },
        },
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
    const result = data
      .filter(jx({ gte: { push_timestamp: { date: 'today-6week' } } }))
      .edges({
        name: 'measured',
        edges: [
          'test',
          {
            name: 'pushDate',
            value: 'push_timestamp',
            domain: {
              type: 'time',
              min: 'today-6week',
              max: 'today',
              interval: 'day',
            },
          },
          'suite',
          'platform',
        ],
      })
      .window({
        // INDEX OF DATE MARKS THE END OF THE DATA
        name: 'afterLastGoodDate',
        edges: ['test', 'suite', 'platform'],
        value: row =>
          row.measured.length -
          row.measured
            .slice()
            .reverse()
            .findIndex(m => m.length > 0),
      })
      .window({
        // CHECK EACH TEST/SUITE/DAY FOR MISSING VALUES
        name: 'daily',
        edges: ['test', 'suite', 'platform'],
        along: ['pushDate'],
        value: (row, num, rows) => {
          const { measured, afterLastGoodDate } = row;

          if (num > 0 && num < afterLastGoodDate && measured.length === 0) {
            return rows[num - 1];
          }

          return chainFrom(measured)
            .select('value')
            .average();
        },
      })
      .extend({ name: 'reference', cube: g5Reference })
      .window({
        name: 'result',
        edges: ['test', 'platform', 'pushDate'],
        value: row =>
          chainFrom(row.daily, row.reference.value)
            // IF NO REFERENCE VALUE FOR SUITE, DO NOT INCLUDE IN AGGREGATE
            .map((d, r) => (missing(r) ? null : d))
            .geomean(),
      })
      .window({
        name: 'ref',
        edges: ['test', 'platform'],
        value: row => {
          const lastMeasure = last(row.result);

          if (missing(lastMeasure)) return null;

          return geomean(row.reference.value);
        },
      })
      .select(['result', 'ref']);

    // SET NORMALIZATION CONSTANTS
    this.setState({ data: result });
    processData.done();
  }

  render() {
    const { classes } = this.props;
    const { data } = this.state;

    if (missing(data))
      return (
        <div
          style={{
            lineHeight: '100%',
            textAlign: 'center',
            width: '100%',
          }}>
          <CircularProgress />
        </div>
      );

    return (
      <Grid container spacing={24}>
        {chainFrom(TP6_TESTS)
          .filter(row => row.id !== 'fcp')
          .enumerate()
          .map(({ label, id }) => {
            const chartData = {
              datasets: data
                .where({ test: id })
                .along('platform')
                .enumerate()
                .map((row, i) => ({
                  label: row.getValue('platform'),
                  type: 'line',
                  data: row
                    .along('pushDate')
                    .map(row => ({
                      x: row.getValue('pushDate'),
                      y: row.getValue('result'),
                    }))
                    .toArray(),
                  ...generateDatasetStyle(SETTINGS.colors[i]),
                }))
                .append({
                  label: 'Fennec 64',
                  type: 'line',
                  backgroundColor: 'gray',
                  borderColor: 'gray',
                  fill: false,
                  pointRadius: '0',
                  pointHoverBackgroundColor: 'gray',
                  lineTension: 0,
                  data: data
                    .where({
                      test: id,
                      platform: 'android-hw-g5-7-0-arm7-api-16-pgo',
                    })
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
              <Grid item xs={6} key={label}>
                <h2 className={classes.title}>
                  <span>{label}</span>
                </h2>
                <ChartJSWrapper
                  type="line"
                  data={chartData}
                  height={200}
                  options={generateOptions()}
                />
              </Grid>
            );
          })}
      </Grid>
    );
  }
}

export default withStyles(styles)(withErrorBoundary(TP6mAggregate));
