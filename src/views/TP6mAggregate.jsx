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
import { jx, edges } from '../vendor/expressions';
import {average} from '../vendor/math';

class TP6mAggregate extends Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  async componentDidMount() {
    // ALL LOADTIME FOR ALL SUITES IN SET
    const pages = frum(TP6M_PAGES);
    // WHAT ARE THE SIGNATURES OF THE loadtime?
    const data = await getData(pages.select('framework'), {
      and: [
        { eq: { platform: 'android-hw-g5-7-0-arm7-api-16' } },
        { prefix: { suite: 'raptor-tp6m-' } },
        { in: { test: frum(TP6_TESTS).select('id') } },
        {
          or: pages.select({
            eq: ['suite', 'framework', 'platform'],
          }),
        },
      ],
    });


    const grouped = edges(
      data,
      [
        "test",
        "suite",
        "platform",
        {
          value: 'datetime',
          domain: {
            type: 'time',
            min: 'today-3month',
            max: 'today',
            interval: 'day',
          },
        }
      ]
    )

    // CHECK EACH TEST/SUITE/DAY FOR MISSING VALUES
    .window(3, (value, c, values)=>{
      if (c>0 && value.length===0) return values[c-1];
      return average(value)
    })

    .window(1, (value) =>{
      value.map()


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
          value: 'datetime',
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
        id={label}
        type="line"
        data={data}
        height="200"
        options={generateOptions()}
      />
    ));
  }
}

export default withNavigation([])(withErrorBoundary(TP6mAggregate));


