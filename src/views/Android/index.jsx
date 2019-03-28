/* eslint-disable react/no-array-index-key */
import React, { Component } from 'react';
import Grid from '@material-ui/core/Grid';
import DashboardPage from '../../components/DashboardPage';
import Section from '../../components/Section';
import BugzillaUrlContainer from '../../containers/BugzillaUrlContainer';
import BugzillaGraph from '../../containers/BugzillaGraph';
import NimbledroidSection from '../../containers/NimbledroidSection';
import PerfherderGraphContainer from '../../containers/PerfherderGraphContainer';
import RedashContainer from '../../containers/RedashContainer';
import SETTINGS from '../../settings';
import CONFIG from '../../utils/nimbledroid/config';
import TP6mAggregate from '../../components/TP6mAggregate';

class Android extends Component {
  render() {
    const nimbledroidSubTitle = `${
      CONFIG.packageIdLabels[CONFIG.baseProduct]
    } vs ${CONFIG.packageIdLabels[CONFIG.compareProduct]}`;

    return (
      <DashboardPage title="Android" subtitle="Release criteria">
        <div>
          <Grid container spacing={24}>
            <Grid item xs={6} key="bugzilla">
              <Section title="Bugzilla">
                <BugzillaUrlContainer
                  includeBugCount
                  queries={[
                    {
                      text: 'All GV Fenix MVP bugs',
                      parameters: {
                        whiteboard: '[geckoview:fenix:p',
                      },
                    },
                  ]}
                />
                <BugzillaGraph
                  queries={[
                    {
                      label: 'GV M2 bugs',
                      parameters: {
                        resolution: ['---', 'FIXED'],
                        whiteboard: '[geckoview:fenix:m2]',
                      },
                    },
                    {
                      label: 'GV M3 bugs',
                      parameters: {
                        resolution: ['---', 'FIXED'],
                        whiteboard: '[geckoview:fenix:m3]',
                      },
                    },
                    {
                      label: 'GV M4 bugs',
                      parameters: {
                        resolution: ['---', 'FIXED'],
                        whiteboard: '[geckoview:fenix:m4]',
                      },
                    },
                    {
                      label: 'GV M5 bugs',
                      parameters: {
                        resolution: ['---', 'FIXED'],
                        whiteboard: '[geckoview:fenix:m5]',
                      },
                    },
                    {
                      label: 'All GV Fenix MVP bugs',
                      parameters: {
                        resolution: ['---', 'FIXED'],
                        whiteboard: '[geckoview:fenix:m',
                      },
                    },
                  ]}
                  startDate="2019-02-01"
                  title="GeckoView Fenix bugs"
                />
              </Section>
            </Grid>

            <Grid item xs={6} key="nimbledroid">
              <Section title="Nimbledroid" subtitle={nimbledroidSubTitle}>
                <NimbledroidSection configuration={{ ...CONFIG }} />
              </Section>
            </Grid>
          </Grid>
        </div>
        <Section title="Raptor (TP6m)" more="/android/tp6m?test=loadtime">
          <TP6mAggregate />
        </Section>
        <Section title="Telemetry">
          <Grid container spacing={24}>
            <Grid item xs={6}>
              <RedashContainer
                title="Total content page load time (no 95th)"
                redashDataUrl="https://sql.telemetry.mozilla.org/api/queries/59395/results.json?api_key=2L0YcuUULtECr9bfew9OAEgtC50G4Ri8NCSPLR5F"
                redashQueryUrl="https://sql.telemetry.mozilla.org/queries/59395"
              />
            </Grid>
            <Grid item xs={6}>
              <RedashContainer
                title="Total content page load time"
                redashDataUrl="https://sql.telemetry.mozilla.org/api/queries/59397/results.json?api_key=u9eculhXgxqgsluxYGxfXaWQ6g7KCXioEvfwjK83"
                redashQueryUrl="https://sql.telemetry.mozilla.org/queries/59397"
              />
            </Grid>
          </Grid>
        </Section>
        <Section
          title="Perfherder"
          subtitle="Lower in the graph is better regardless if it is a score or execution time (read the Y label)">
          <Grid container spacing={24}>
            <Grid item xs={6}>
              <PerfherderGraphContainer
                title="Speedometer"
                series={[
                  {
                    label: 'Moto G5 (arm7)',
                    seriesConfig: {
                      framework: 10,
                      platform: 'android-hw-g5-7-0-arm7-api-16',
                      option: 'opt',
                      project: 'mozilla-central',
                      suite: 'raptor-speedometer-geckoview',
                    },
                  },
                  {
                    label: 'Pixel 2 (arm7)',
                    seriesConfig: {
                      framework: 10,
                      option: 'opt',
                      platform: 'android-hw-p2-8-0-arm7-api-16',
                      project: 'mozilla-central',
                      suite: 'raptor-speedometer-geckoview',
                    },
                  },
                  {
                    label: 'Pixel 2 (ARM64)',
                    seriesConfig: {
                      framework: 10,
                      option: 'opt',
                      platform: 'android-hw-p2-8-0-android-aarch64',
                      project: 'mozilla-central',
                      suite: 'raptor-speedometer-geckoview',
                    },
                  },
                  {
                    label: 'Moto G5 (pgo)',
                    seriesConfig: {
                      framework: 10,
                      platform: 'android-hw-g5-7-0-arm7-api-16-pgo',
                      project: 'mozilla-central',
                      suite: 'raptor-speedometer-geckoview',
                    },
                  },
                  {
                    label: 'Pixel 2 (pgo)',
                    seriesConfig: {
                      framework: 10,
                      platform: 'android-hw-p2-8-0-arm7-api-16-pgo',
                      project: 'mozilla-central',
                      suite: 'raptor-speedometer-geckoview',
                    },
                  },
                ]}
              />
            </Grid>
            <Grid item xs={6}>
              <PerfherderGraphContainer
                title="Unity WebGl"
                series={[
                  {
                    color: SETTINGS.colors[0],
                    label: 'Moto G5 (arm7)',
                    seriesConfig: {
                      framework: 10,
                      platform: 'android-hw-g5-7-0-arm7-api-16',
                      option: 'opt',
                      project: 'mozilla-central',
                      suite: 'raptor-unity-webgl-geckoview',
                    },
                  },
                  {
                    color: SETTINGS.colors[1],
                    label: 'Pixel 2 (arm7)',
                    seriesConfig: {
                      framework: 10,
                      platform: 'android-hw-p2-8-0-arm7-api-16',
                      option: 'opt',
                      project: 'mozilla-central',
                      suite: 'raptor-unity-webgl-geckoview',
                    },
                  },
                ]}
              />
            </Grid>
          </Grid>
        </Section>
      </DashboardPage>
    );
  }
}

export default Android;
