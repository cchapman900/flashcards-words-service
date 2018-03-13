"use strict";

const mongoose = require('mongoose');
const bluebird = require('bluebird');
const validator = require('validator');

const auth = require('./auth');
const Word = require('./models/Word.js');

mongoose.Promise = bluebird;

const mongoString = process.env.MONGO_URI;

const createErrorResponse = (statusCode, message) => ({
  statusCode: statusCode || 500,
  headers: { 'Content-Type': 'application/json' },
  body: {'message': message} || {'message': 'An unexpected error occurred'},
});

/**
 * GET WORDS
 * Get a list of words with the designated parameters
 *
 * @param event
 * @param context
 * @param callback
 */
module.exports.getWords = (event, context, callback) => {
  mongoose.connect(mongoString);
  const db = mongoose.connection;

  let limit = 10;
  let offset = 0;
  let query = {};
  if (event.queryStringParameters) {
    // Set the limit of words to return
    if (event.queryStringParameters.limit) {
      limit = parseInt(event.queryStringParameters.limit);
    }

    if (event.queryStringParameters.offset) {
      offset = parseInt(event.queryStringParameters.offset);
    }

    // Filter by part of speech
    const partOfSpeech = event.queryStringParameters.partOfSpeech;
    if (partOfSpeech) {
      query['partOfSpeech'] = partOfSpeech;
    }
  }

  db.once('open', () => {
    Word
      .find(query)
      .limit(limit)
      .skip(offset)
      .sort({'count': -1})
      .then((words) => {
        if (words.length < 1) {
          callback(null, createErrorResponse(404, 'Words not found'));
        } else {
          callback(null, {
            headers: {
              "Access-Control-Allow-Origin" : "*", // Required for CORS support to work
              "Access-Control-Allow-Credentials" : true // Required for cookies, authorization headers with HTTPS
            },
            statusCode: 200,
            body: JSON.stringify(words)
          });
        }

      })
      .catch((err) => {
        callback(null, createErrorResponse(err.statusCode, err.message));
      })
      .finally(() => {
        // Close db connection or node event loop won't exit , and lambda will timeout
        db.close();
      });
  });
};

module.exports.getWord = (event, context, callback) => {
  mongoose.connect(mongoString);
  const db = mongoose.connection;
  const word_id = event.pathParameters.word_id;

  if (!validator.isAlphanumeric(word_id)) {
    callback(null, createErrorResponse(400, 'Incorrect id'));
    db.close();
    return;
  }

  db.once('open', () => {
    Word
      .findById(word_id)
      .then((word) => {
        if (!word) {
          db.close();
          callback(null, createErrorResponse(404, 'Word not found'));
        } else {
          db.close();
          callback(null, { statusCode: 200, body: JSON.stringify(word) });
        }
      })
      .catch((err) => {
        db.close();
        callback(null, createErrorResponse(err.statusCode, err.message));
      })
  });
};

module.exports.getUser = (event, context, callback) => {
    callback(null, { statusCode: 200, body: JSON.stringify(event) });
};

module.exports.authenticate = (event, context) => {
    auth.authenticate(event, function (err, data) {
        if (err) {
            if (!err) context.fail("Unhandled error");
            context.fail("Unauthorized");

        }
        else context.succeed(data);
    });
};
