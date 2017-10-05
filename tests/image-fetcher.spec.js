const bluebird = require('bluebird');
const expect = require('expect.js');
const fs = bluebird.promisifyAll(require('fs'));
const nock = require('nock');
const path = require('path');

const fetch = require('../src/image-fetcher');

const IMAGE_HOST = 'http://cdn.awwni.me';
const IMAGE_PATH = '/taiga.jpg';
const IMAGE_URL = `${IMAGE_HOST}${IMAGE_PATH}`;
const TEST_IMAGE_PATH = path.join(__dirname, 'images', 'taiga.jpg');

describe('image-fetcher', () => {
  it('should fetch an image and return the buffer', () => {
    let nockResponse;
    let imageBuffer;
    return fs.readFileAsync(TEST_IMAGE_PATH)
      .then(buffer => imageBuffer = buffer)
      .then(() => {
        nockResponse = nock(IMAGE_HOST)
          .get(IMAGE_PATH)
          .reply(200, imageBuffer);
      })
      .then(() => fetch(IMAGE_URL))
      .then(buffer => {
        const { headers } = nockResponse.interceptors[0].req;
        expect(buffer).to.be.a(Buffer);
        expect(buffer).to.eql(imageBuffer);
        expect(headers.referer).to.be(IMAGE_HOST);
        nockResponse.done();
      });
  });

  it('should reject when the server responds with a bad HTTP code', () => {
    const ERROR_CODE = 403;
    const nockResponse = nock(IMAGE_HOST)
      .get(IMAGE_PATH)
      .reply(ERROR_CODE);

    return fetch(IMAGE_URL)
      .then(() => {
        throw new Error('this is not the error you are looking for');
      })
      .catch(err => {
        expect(err.message).to.contain(ERROR_CODE);
        nockResponse.done();
      });
  });

  it('should reject when the network request fails', () => {
    const FAILURE_MSG = 'Request timed out';
    const nockResponse = nock(IMAGE_HOST)
      .get(IMAGE_PATH)
      .replyWithError(new Error(FAILURE_MSG));

    return fetch(IMAGE_URL)
      .then(() => {
        throw new Error('I am here, therefore I fail');
      })
      .catch(err => {
        expect(err.message).to.contain(FAILURE_MSG);
        nockResponse.done();
      });
  });
});