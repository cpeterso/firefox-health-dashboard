import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withStyles } from '@material-ui/core/styles';
import { Lock } from '@material-ui/icons';
import ChartJsWrapper from '../../components/ChartJsWrapper';
import telemetryDataToDatasets from '../../utils/chartJs/redashFormatter';
import fetchJson from '../../utils/fetchJson';
import { withErrorBoundary } from '../../vendor/errors';

const styles = {
  title: {
    color: '#56565a',
    fontSize: '1rem',
    backgroundColor: '#d1d2d3',
    padding: '.2rem .3rem .3rem .3rem',
    margin: '0 1rem 0 0',
  },
  linkContainer: {
    fontSize: '0.8rem',
  },
  middleVerticalAlignment: {
    verticalAlign: 'middle',
  },
};

class RedashContainer extends Component {
  state = {
    datasets: null,
    isLoading: false,
  };

  static propTypes = {
    options: PropTypes.shape({
      title: PropTypes.string,
      scaleLabel: PropTypes.string,
      tooltipFormat: PropTypes.bool,
      tooltips: PropTypes.shape({
        callbacks: PropTypes.object,
      }),
      ticksCallback: PropTypes.func,
    }),
    classes: PropTypes.shape().isRequired,
    dataKeyIdentifier: PropTypes.string.isRequired,
    redashDataUrl: PropTypes.string.isRequired,
    redashQueryUrl: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
  };

  static defaultProps = {
    options: {
      scaleLabel: 'Miliseconds',
      tooltipFormat: true,
      tooltips: {
        callbacks: {
          label: (tooltipItems, data) =>
            `${data.datasets[tooltipItems.datasetIndex].label}: ${
              tooltipItems.yLabel
            } ms`,
        },
      },
      ticksCallback: value => (value > 999 ? `${value / 1000}k` : value),
    },
    dataKeyIdentifier: 'label',
  };

  async componentDidMount() {
    await this.fetchSetState(this.props);
  }

  async fetchSetState({ dataKeyIdentifier, redashDataUrl }) {
    try {
      this.setState({ isLoading: true });
      const redashData = await fetchJson(redashDataUrl);

      this.setState({
        datasets: telemetryDataToDatasets(redashData, dataKeyIdentifier),
      });
    } finally {
      this.setState({ isLoading: false });
    }
  }

  render() {
    const { classes, options, redashQueryUrl, title } = this.props;
    const { datasets, isLoading } = this.state;

    return (
      <div>
        <h2 className={classes.title}>
          <span>{title}</span>
        </h2>
        <ChartJsWrapper
          type="line"
          data={datasets}
          isLoading={isLoading}
          options={options}
        />
        <div className={classes.linkContainer}>
          <a href={redashQueryUrl} target="_blank" rel="noopener noreferrer">
            <span className={classes.middleVerticalAlignment}>
              Redash query
            </span>
            <Lock
              className={classes.middleVerticalAlignment}
              style={{ height: '1rem' }}
            />
          </a>
        </div>
      </div>
    );
  }
}

export default withStyles(styles)(withErrorBoundary(RedashContainer));
