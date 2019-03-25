/* eslint-disable linebreak-style */
/* eslint-disable no-underscore-dangle */

import { jx } from './expressions';
import { isString } from '../utils';
import { Domain, ValueDomain } from './domains';

class Edge {
  constructor({ name, value, domain }) {
    this.name = name;
    this.value = value;
    this.domain = domain;
  }
}

Edge.newInstance = desc => {
  if (desc instanceof Edge) return desc;

  if (isString(desc)) {
    return new Edge({
      name: desc,
      value: jx(desc),
      domain: new ValueDomain(desc),
    });
  }

  const { name, value, domain } = desc;

  return new Edge({
    name,
    value: jx(value),
    domain: Domain.newInstance(domain),
  });
};

export default Edge;
