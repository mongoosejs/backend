'use strict';

const mongoose = require('mongoose');

const rateLimitSchema = new mongoose.Schema(
  {
    _id: String,
    recentRequests: [{
      date: {
        type: Date,
        required: true,
        default: () => Date.now()
      }
    }]
  },
  {
    timestamps: true,
    statics: {
      async checkRateLimit(id, max) {
        const rateLimit = await this.findOneAndUpdate(
          { _id: id },
          {
            $push: {
              recentRequests: {
                $each: [{ date: new Date() }],
                $slice: -max
              }
            }
          },
          { returnDocument: 'before', upsert: true }
        );
        const recentRequests = rateLimit?.recentRequests ?? [];

        if (recentRequests.length >= max && recentRequests[0].date > Date.now() - 1000 * 60 * 60) {
          throw new Error(`Maximum ${max} requests per hour`);
        }
      }
    }
  }
);

module.exports = rateLimitSchema;
