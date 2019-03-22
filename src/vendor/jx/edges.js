
import {Log} from '../logs';
import {Date} from '../dates';
import {Duration} from '../durations';
import {jx} from '../expressions';
import {isString, missing, exists, coalesce} from '../utils';
import {ValueDomain, Domain} from './domains';



class Edge {

  constructor({name, value, domain}){
    this.name=name;
    this.value = value;
    this.domain=domain;
  }

}

Edge.newInstance = (desc) =>{
  if (isString(desc)){
    return Edge({name: desc, value:jx(desc), domain: new ValueDomain(desc)})
  }
  const {name, value, domain} = desc;
  return Edge({
    name,
    value: jx(value),
    domain: Domain.newInstance(domain),
  });
};


export {Edge};
