import app from '../src/index';
import express from '../src/providers/Express';
import chai from 'chai';
import chaiHttp = require('chai-http');
import 'mocha';

//import Environment from '../src/providers/Environment';
//Environment.init();

chai.use(chaiHttp);

//Wait for server to start
try {
    chai.request(app)
    chai.request(express.server)
} catch {
    
}

/*
describe('API test', () => {
  it('should return 200', () => {
    return chai.request(express.server).get('/')
      .then(res => {
        chai.expect(res.status).to.eql(200);
      })
  })
})
*/

describe('Google API test', () => {
  it('should return success', () => {
    return chai.request(express.server).get('/api/v1/auth/login')
      .then(res => {
        let json = JSON.parse(res.text);
        chai.expect(json.success).to.eql(true);
      })
  })
})
