// Copyright 2018 Amazon.com, Inc. or its affiliates.
// SPDX-License-Identifier: MIT

const express = require('express');
const passport = require('passport');
const GitHubStrategy = require('passport-github').Strategy;
const { URL } = require('url');

const config = require('../lib/config');

const router = express.Router();

/**
 * If an OAuth token hasn't been configured, use a Personal Access Token
 * instead.
 */
function passportOrPat() {
  if (config.auth.github.clientId) {
    return passport.authenticate('github', { session: false });
  }

  return (req, res, next) => {
    req.user = { githubAccessToken: config.curation.store.github.token };
    next();
  };
}

router.get('/github', (req, res) => {
  // a shim to allow for a localhost UI to point to dev-api.
  // without this, /github/finalize won't be able to postMessage due to
  // cross-origin constraints. we're checking if the referrer (UI) is on
  // localhost, and if so, store the full origin (incl. port) in a cookie
  // to be read during /github/finalize.
  const referrer = req.get('Referrer');
  if (referrer) {
    try {
      const url = new URL(referrer);

      if (url.hostname === 'localhost') {
        res.cookie('localhostOrigin', url.origin);
      }
    } catch (err) {
      console.warn('Referrer parsing error, ignoring', err);
    }
  }

  res.redirect('github/start');
});

router.get('/github/start', passportOrPat(), (req, res) => {
  // this only runs if passport didn't kick in above, but double
  // check for sanity in case upstream changes
  if (!config.auth.github.clientId) {
    res.redirect('finalize');
  }
});

router.get('/github/finalize', passportOrPat(),
  (req, res) => {
    const safeToken = encodeURIComponent(req.user.githubAccessToken);
    let origin = config.endpoints.website;

    // allow for sending auth responses to localhost on dev site; see /github
    // route above. real origin is stored in cookie.
    if (config.endpoints.service.includes('dev-api') && req.cookies.localhostOrigin) {
      origin = req.cookies.localhostOrigin;
    }

    // passing in the 'website' endpoint below is very important;
    // using '*' instead means this page will gladly send out a
    // user's token to any site that asks for it. see:
    // https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
    res.status(200).send(`<script>
      window.opener.postMessage({
        type: 'github-token',
        token: '${safeToken}',
      }, '${origin}');
      window.close();
    </script>`);
  }
);

function setup() {
  return router;
}

setup.getStrategy = () => {
  return new GitHubStrategy({
    clientID: config.auth.github.clientId,
    clientSecret: config.auth.github.clientSecret,
    // this needs to match the callback url on the oauth app on github
    callbackURL: `${config.endpoints.service}/auth/github/finalize`,
    scope: ['public_repo', 'read:user', 'read:org']
  },
  function (access, refresh, profile, done) {
    // this only lives for one request; see the 'finalize' endpoint
    done(null, { githubAccessToken: access });
  });
};

module.exports = setup;